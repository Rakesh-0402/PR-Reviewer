// Run from Backend after copying the supplied files. Only edits the known Groq helper exports/limit.
import fs from "node:fs";
const path = "services/groqService.js";

let text = fs.readFileSync(path, "utf8");

if (!/function buildBatches\s*\(/.test(text) || !/function reviewBatch\s*\(/.test(text)) {
  throw new Error("Expected buildBatches and reviewBatch from the previous implementation. File was not changed.");
}
const backup = `${path}.before-background.bak`;

if (!fs.existsSync(backup)) fs.copyFileSync(path, backup);

text = text.replace(/const MAX_BATCHES\s*=\s*5\s*;/, "const MAX_BATCHES = 40;");

const exports = [];

for (const name of ["buildBatches", "reviewBatch"]) {
  const declaration = new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const named = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`);
  if (!declaration.test(text) && !named.test(text)) exports.push(name);
}

if (exports.length) text += `\nexport { ${exports.join(", ")} };\n`;
fs.writeFileSync(path, text);

console.log("Groq single-batch helpers exported. Previous file backed up locally; do not commit the .bak file.");
