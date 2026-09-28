import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePatch, splitFile, buildPatchBatches } from '../services/patchSplitter.js';
import { getCoverage, compactState } from '../services/reviewCoverage.js';
import { initialState, processTick, combineReview, publicProgress } from '../services/reviewJobCore.js';
const fitsBatch = files => Buffer.byteLength(JSON.stringify(files)) <= 800;
const large = { filename: 'large.js', additions: 60, deletions: 60,
  patch: '@@ -10,60 +10,60 @@ function example()\n' + Array.from({length:60},(_,i)=>`-old line ${i} with some content\n+new line ${i} with some content`).join('\n') };
const rows = patch => parsePatch(patch).flatMap(h=>h.rows);
const result = { overallScore:8,summary:'Checked',bugs:0,performance:0,security:0,bestPractices:0,estimatedFixTime:'0 mins',priorityIssues:[],markdown:'Checked supplied changes' };
function stateFor(plan) { return {...initialState(),prepared:true,...plan,metadata:{totalFiles:plan.fileManifest.length,fetchComplete:true},batches:plan.batches.map(files=>({files,status:'completed',result,attempts:0}))}; }

test('oversized hunk preserves every row and both coordinates exactly',()=>{
 const {units}=splitFile(large,fitsBatch);
 assert.ok(units.length>1);
 assert.deepEqual(units.flatMap(u=>rows(u.patch)),rows(large.patch));
 assert.ok(units.every(u=>fitsBatch([u])));
 assert.equal(new Set(units.map(u=>u.chunkId)).size,units.length);
 assert.deepEqual(splitFile(large,fitsBatch).units,units);
});
test('small whole hunks remain together',()=>{
 const file={filename:'a',patch:'@@ -1 +1 @@\n-a\n+b\n@@ -20 +20 @@\n-c\n+d'};
 const {units}=splitFile(file,fitsBatch); assert.equal(units.length,1);
 assert.deepEqual(rows(units[0].patch),rows(file.patch));
});
test('zero-count insertion and deletion coordinates and newline markers survive',()=>{
 for(const kind of ['+','-']) {
  const file={filename:'a',patch:(kind==='+'?'@@ -0,0 +1,60 @@':'@@ -1,60 +0,0 @@')+'\n'+Array.from({length:60},(_,i)=>kind+'text '+i+' '.repeat(20)).join('\n')+'\n\\ No newline at end of file'};
  const {units}=splitFile(file,fitsBatch); assert.ok(units.length>1);
  assert.deepEqual(units.flatMap(u=>rows(u.patch)),rows(file.patch));
 }
});
test('Unicode and escaped source use serialized byte budget',()=>{
 const file={filename:'你好.js',patch:'@@ -0,0 +1,50 @@\n'+Array(50).fill('+你好 "\\" 😊').join('\n')};
 const {units}=splitFile(file,fitsBatch); assert.ok(units.length>1);
 assert.ok(units.every(u=>fitsBatch([u]))); assert.deepEqual(units.flatMap(u=>rows(u.patch)),rows(file.patch));
});
test('malformed patches, absent patches, and unsplittable lines are explicit skips',()=>{
 const files=[{filename:'bad',patch:'@@ -1,2 +1,2 @@\n-x\n+y'}, {filename:'binary'}, {filename:'huge',patch:'@@ -0,0 +1 @@\n+'+'x'.repeat(2000)}];
 const plan=buildPatchBatches(files,{fitsBatch}); assert.equal(plan.skipped.length,3); assert.equal(plan.batches.length,0);
 assert.equal(getCoverage(stateFor(plan)).skippedFiles.length,3);
});
test('all pieces of a file count as one file; compaction preserves coverage',()=>{
 const state=stateFor(buildPatchBatches([large],{fitsBatch}));
 const coverage=getCoverage(state); assert.deepEqual(coverage.reviewedFiles,['large.js']); assert.ok(coverage.completedParts>1);
 assert.deepEqual(getCoverage(compactState(state)),coverage);
 state.batches[0].files.push(state.batches[0].files[0]); assert.deepEqual(getCoverage(state),coverage);
});
test('batch cap leaves a partially reviewed file, never a completed file',()=>{
 const plan=buildPatchBatches([large],{fitsBatch,maxBatches:1});
 assert.equal(plan.batches.length,1); assert.ok(plan.skipped.length>0);
 const coverage=getCoverage(stateFor(plan)); assert.equal(coverage.reviewedFiles.length,0); assert.deepEqual(coverage.partialFiles,['large.js']);
});
test('GitHub change-count mismatch prevents full coverage even if supplied parts succeed',()=>{
 const plan=buildPatchBatches([{...large,additions:61}],{fitsBatch}); const coverage=getCoverage(stateFor(plan));
 assert.equal(coverage.reviewedFiles.length,0); assert.deepEqual(coverage.partialFiles,['large.js']); assert.equal(coverage.files[0].sourceComplete,false);
});
test('serialized checkpoints resume after 429, keeping successful parts and accurate terminal counts',async()=>{
 const plan=buildPatchBatches([large],{fitsBatch}); let state=initialState(); let failed=false; const successes=[];
 const deps={now:1000,expiresAt:86_401_000,prepare:async()=>({...plan,metadata:{totalFiles:1,fetchComplete:true}}),reviewBatch:async files=>{
  if(successes.length && !failed) {failed=true;throw Object.assign(new Error('limit'),{status:429});}
  successes.push(...files.map(f=>f.chunkId)); return result;
 }};
 for(let i=0;i<100 && !['completed','failed','partial'].includes(state.status);i++) {
  const output=await processTick(state,deps); state=JSON.parse(JSON.stringify(output.state));
 }
 assert.ok(failed); assert.equal(state.status,'completed'); assert.equal(new Set(successes).size,successes.length);
 assert.equal(successes.length,plan.fileManifest[0].partCount);
 assert.equal(combineReview(state).review.coverage.reviewedCount,1);
 const progress=publicProgress({_id:'id',state:compactState(state),status:state.status});
 assert.equal(progress.reviewedFiles,1); assert.equal(progress.completedParts,progress.totalParts);
});
test('exhausted retries skip only the failed part and retain partial findings',async()=>{
 const state=stateFor(buildPatchBatches([large],{fitsBatch})); state.status='queued';
 state.batches.at(-1).status='pending';state.batches.at(-1).attempts=12;
 const deps={now:1,expiresAt:10000000,reviewBatch:async()=>{throw Object.assign(new Error('limit'),{status:429});}};
 let out=await processTick(state,deps); out=await processTick(out.state,deps);
 assert.equal(out.state.status,'partial'); assert.ok(out.state.skipped.every(s=>s.chunkId));
 assert.equal(combineReview(out.state).review.coverage.reviewedCount,0);
 assert.equal(publicProgress({_id:'id',state:out.state}).partialFiles,1);
});
