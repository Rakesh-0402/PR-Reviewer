import DashboardNavbar from "../components/DashboardNavbar";
import SearchRepository from "../components/SearchRepository";
import PRCard from "../components/PRCard.jsx";
import ReviewPanel from "../components/ReviewPanel";
import RepositoryCard from "../components/RepositoryCard";
import PRToolbar from "../components/PRToolbar";
import { getPullRequests, getRepository } from "../services/githubService.js";
import useReviewJob from "../hooks/useReviewJob";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { FileText, Loader2, History, Eye, Trash2 } from "lucide-react";
import { sameRepository, repositoryErrorMessage } from "../utils/dashboardSession.js";
function currentUserId() {
  try { return jwtDecode(localStorage.getItem("token") || "").id || null; }
  catch { return null; }
}
const validReview = value => value && typeof value === "object" && !Array.isArray(value);
function readHistory(userId) {
  if (!userId) return [];
  try {
    const rows = JSON.parse(localStorage.getItem(`reviewHistory_${userId}`) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter(r => r && Number.isInteger(r.prNumber) && validReview(r.review)).map((r, index) => ({
      ...r, historyId: r.historyId || r.jobId || r._id ||
        `legacy:${JSON.stringify([r.owner, r.repo, r.prNumber, r.reviewedAt, index])}`,
    }));
  } catch { return []; }
}
function readSession(userId) {
  if (!userId) return {};
  try {
    const data = JSON.parse(sessionStorage.getItem(`dashboardSession_v2_${userId}`) || "{}");
    const repository = data?.repository;
    const selected = data?.selected;
    return {
      repository: repository && typeof repository.owner === "string" && typeof repository.repo === "string" &&
        repository.repoData && Array.isArray(repository.pulls) ? repository : null,
      selected: selected && Number.isInteger(selected.prNumber) && validReview(selected.review) ? selected : null,
      scope: data?.scope === "repository" ? "repository" : "all",
    };
  } catch { return {}; }
}
export default function Dashboard() {
  const userId = currentUserId();
  // A different signed-in user gets fresh component state, never another user's cache.
  return userId ? <UserDashboard key={userId} userId={userId} /> : (
    <div className="p-10 text-center">Please log in to view your dashboard.</div>
  );
}
function UserDashboard({ userId }) {
  const [initial] = useState(() => readSession(userId));
  const [repository, setRepository] = useState(initial.repository || null);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [selected, setSelected] = useState(initial.selected || null);
  const [reviewHistory, setReviewHistory] = useState(() => readHistory(userId));
  const [scope, setScope] = useState(initial.repository ? initial.scope || "repository" : "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreLock = useRef(false);
  const progressRef = useRef(null);
  const progressScroll = useRef(false);
  const [fetchError, setFetchError] = useState("");
  const loadedRepoRef = useRef(repository);
  const fetchLock = useRef(false);
  const mounted = useRef(false);
  const resultRef = useRef(null);
  const scrollRequested = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const { job, start, busy, starting, restoring, connectionError } = useReviewJob(userId, finished => {
    if (finished.status === "failed") { toast.error(finished.message || "Review failed."); return; }
    if (!validReview(finished.review)) { toast.error("Review result is unavailable."); return; }
    const row = {
      historyId: finished.jobId, jobId: finished.jobId,
      owner: finished.owner, repo: finished.repo, prNumber: finished.prNumber,
      title: finished.title, review: finished.review, reviewedAt: finished.updatedAt,
    };
    setReviewHistory(previous => [row, ...previous.filter(item => item.historyId !== row.historyId && !(
      sameRepository(item, row) && item.prNumber === row.prNumber
    ))]);
    if (!fetchLock.current && sameRepository(loadedRepoRef.current, row)) {
      scrollRequested.current = true;
      setSelected(row);
    }
    if (finished.status === "partial") toast("Review finished with incomplete coverage. Check the details.");
    else toast.success(`PR #${finished.prNumber} review completed`, { id: `review-${finished.jobId}` });
  });
  useEffect(() => {
    try { localStorage.setItem(`reviewHistory_${userId}`, JSON.stringify(reviewHistory)); }
    catch { toast.error("Browser history could not be saved. Completed server reviews are unaffected.", { id: "history-storage" }); }
  }, [reviewHistory, userId]);
  useEffect(() => {
    try {
      const savedRepository = repository
  ? {
      ...repository,
      pulls: repository.pulls.slice(0, 100).map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        draft: pr.draft,
        user: {
          login: pr.user?.login,
          avatar_url: pr.user?.avatar_url,
        },
      })),
      // Restore page 2 if additional loaded PRs were omitted.
      nextPage:
        repository.pulls.length > 100
          ? 2
          : repository.nextPage,
    }
  : null;

sessionStorage.setItem(
  `dashboardSession_v2_${userId}`,
  JSON.stringify({
    repository: savedRepository,
    selected,
    scope,
  })
);
    } catch { toast.error("Could not preserve the dashboard for refresh.", { id: "dashboard-storage" }); }
  }, [repository, selected, scope, userId]);
  useEffect(() => {
    if (selected && scrollRequested.current && !fetching) {
      scrollRequested.current = false;
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected, fetching]);
  async function fetchPullRequests() {
    if (fetchLock.current || loadMoreLock.current) return;
    const requestedOwner = owner.trim();
    const requestedRepo = repo.trim();
    // Accept owner/name fields, not pasted URLs or path segments.
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(requestedOwner) ||
        !/^[a-zA-Z0-9_.-]{1,100}$/.test(requestedRepo) || [".", ".."].includes(requestedRepo)) {
      toast.error("Enter a valid owner and repository name in their separate fields.");
      return;
    }
    fetchLock.current = true;
    setFetching(true);
    setFetchError("");
    try {
      const [repoData, pageData] = await Promise.all([
        getRepository(requestedOwner, requestedRepo), getPullRequests(requestedOwner, requestedRepo),
      ]);
      if (!mounted.current) return;
      if (!repoData?.full_name || !Array.isArray(pageData?.pulls)) {
        setFetchError("The backend returned an invalid repository response.");
        toast.error("The backend returned an invalid repository response.");
        return;
      }
      const pulls = pageData.pulls;
      const next = { owner: (repoData.owner?.login || requestedOwner).toLowerCase(),
        repo: (repoData.name || requestedRepo).toLowerCase(), repoData, pulls, nextPage: pageData.nextPage };
      if (!sameRepository(loadedRepoRef.current, next) || (selected && !sameRepository(selected, next))) {
        setSelected(null);
      }
      loadedRepoRef.current = next;
      setRepository(next);
      setOwner("");
      setRepo("");
      setSearch(""); setFilter("all"); setSort("newest");
      setScope("repository");
      if (pulls.length) toast.success(`Loaded ${pulls.length} open pull requests`);
      if (!pulls.length) toast("Repository found, but no open pull requests were returned.");
    } catch (error) {
      if (!mounted.current) return;
      const message = repositoryErrorMessage(error);
      setFetchError(message);
      toast.error(message);
    } finally {
      fetchLock.current = false;
      if (mounted.current) setFetching(false);
    }
  }
  async function loadMorePRs() {
    const current = loadedRepoRef.current;
    if (!current || !current.nextPage || fetchLock.current || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    try {
      const data = await getPullRequests(current.owner, current.repo, current.nextPage);
      if (!mounted.current || loadedRepoRef.current !== current) return;
      if (!Array.isArray(data?.pulls)) throw new Error("Invalid PR response");
      const unique = new Map(current.pulls.map(pr => [pr.id, pr]));
      data.pulls.forEach(pr => unique.set(pr.id, pr));
      const next = { ...current, pulls: [...unique.values()], nextPage: data.nextPage };
      loadedRepoRef.current = next;
      setRepository(next);
    } catch (error) {
      if (mounted.current) toast.error(repositoryErrorMessage(error));
    } finally {
      loadMoreLock.current = false;
      if (mounted.current) setLoadingMore(false);
    }
  }

  async function reviewPR(prNumber) {
    if (!repository || busy || fetchLock.current) return;
    progressScroll.current = true;
    // Retain the prior result if submission fails; replace it when a result arrives.
    await start(repository.owner, repository.repo, prNumber);
  }
  const pulls = repository?.pulls || [];
  const filteredPRs = pulls.filter(pr =>
    String(pr.title || "").toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || pr.state === filter)
  ).sort((a, b) => sort === "newest" ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));
  const visibleHistory = scope === "repository" && repository
    ? reviewHistory.filter(item => sameRepository(item, repository)) : reviewHistory;
  function viewReview(row) { scrollRequested.current = true; setSelected(row); }
  function deleteReview(row) {
    setReviewHistory(previous => previous.filter(item => item.historyId !== row.historyId));
    if (selected?.historyId === row.historyId) setSelected(null);
  }
  const reviewingPR = busy ? (sameRepository(job, repository) ? job.prNumber : -1) : null;
  const showJob = Boolean(busy || starting || restoring || connectionError ||
    (job?.status === "failed" && sameRepository(job, repository)));
  useEffect(() => {
    if (showJob && progressScroll.current) {
      progressScroll.current = false;
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showJob, starting, job]);
  const emptyTitle = !repository ? "No pull requests loaded" : !pulls.length ? "No pull requests found" : "No matching pull requests";
  const emptyDescription = !repository ? "Enter a GitHub owner and repository name above. Your review history is below."
    : !pulls.length ? "This repository has no open pull requests in the fetched results." : "Try changing your search or filter.";
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <DashboardNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <fieldset disabled={fetching || loadingMore} className="m-0 min-w-0 border-0 p-0 disabled:opacity-70">
          <SearchRepository owner={owner} repo={repo} setOwner={setOwner} setRepo={setRepo} fetchPullRequests={fetchPullRequests} />
        </fieldset>
        {fetchError && <p role="alert" className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {fetchError}{repository ? " Previously loaded results are shown below." : ""}
        </p>}
        <section aria-busy={fetching} aria-label="Repository pull requests" className="my-6">
          {fetching ? <div role="status" className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <Loader2 size={40} className="animate-spin motion-reduce:animate-none text-blue-600" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Fetching repository…</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading repository details and pull requests.</p>
          </div> : <>
            <RepositoryCard repoData={repository?.repoData || null} />
            {repository && <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{pulls.length} open PRs loaded. Search and sorting apply to loaded PRs only.</p>}
            {repository && <PRToolbar pulls={pulls} search={search} setSearch={setSearch} sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} />}
            <div className="space-y-5">
              {!filteredPRs.length ? <div className="rounded-2xl border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <FileText size={52} className="mx-auto mb-4 text-yellow-500" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{emptyTitle}</h2>
                <p className="mt-3 text-gray-500 dark:text-gray-400">{emptyDescription}</p>
              </div> : filteredPRs.map(pr => <PRCard key={pr.id} pr={pr} reviewingPR={reviewingPR} reviewPR={reviewPR} />)}
            </div>
            {repository?.nextPage != null && <div className="mt-6 text-center">
              <button type="button" onClick={loadMorePRs} disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {loadingMore && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
              <p role="status" className="mt-2 text-sm text-gray-500">{loadingMore ? "Fetching the next page of open pull requests…" : ""}</p>
            </div>}
            {repository && repository.nextPage === undefined && <p className="mt-4 text-sm text-gray-500">Fetch this repository again to enable pagination for this saved session.</p>}
          </>}
        </section>
        <section className="my-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Review history">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"><History size={22} aria-hidden="true" />Review history</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter review history">
              {[['all', 'All reviews'], ['repository', 'Current repository']].map(([value, label]) => <button key={value} type="button" disabled={value === 'repository' && !repository} aria-pressed={scope === value}
                onClick={() => setScope(value)} className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${scope === value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{label}</button>)}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{scope === 'repository' && repository ? `Reviews for ${repository.owner}/${repository.repo}` : 'Reviews across all your repositories'} · {visibleHistory.length}</p>
          {!visibleHistory.length ? <p className="py-8 text-center text-gray-500 dark:text-gray-400">No saved reviews in this view yet.</p> : <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
            {visibleHistory.map(row => <li key={row.historyId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-semibold text-gray-900 dark:text-white">{row.owner && row.repo ? `${row.owner}/${row.repo}` : 'Repository unavailable (older review)'} · PR #{row.prNumber}</p>
                <p className="break-words text-sm text-gray-600 dark:text-gray-300">{row.title || 'Pull request review'}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : 'Date unavailable'}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={fetching} onClick={() => viewReview(row)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"><Eye size={16} aria-hidden="true" />View review</button>
                <button type="button" onClick={() => deleteReview(row)} aria-label={`Remove ${row.owner || ''}/${row.repo || ''} PR ${row.prNumber} from browser history`} title="Remove from this browser's history" className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-gray-800"><Trash2 size={18} aria-hidden="true" /></button>
              </div>
            </li>)}
          </ul>}
        </section>
        {showJob && <section ref={progressRef} className="scroll-mt-24 my-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-gray-900" aria-live="polite">
          <h2 className="font-semibold text-gray-900 dark:text-white">{job ? `${job.owner}/${job.repo} · PR #${job.prNumber}` : "Review status"}</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{connectionError || (restoring ? "Restoring review status…" : starting ? "Submitting review…" : job?.message)}</p>
          {job?.totalFiles != null && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {job.reviewedFiles}/{job.totalFiles} files reviewed · {job.completedBatches}/{job.totalBatches} batches completed
            {job.totalParts != null ? ` · ${job.completedParts}/${job.totalParts} parts completed` : ""}
            {job.skippedFiles > 0 ? ` · ${job.skippedFiles} files skipped` : ""}
          </p>}
          {job?.status === "waiting" && job.nextRunAt && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Next attempt no earlier than {new Date(job.nextRunAt).toLocaleString()}.</p>}
          {busy && job && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">You can leave this page and return. Your review progress is saved.</p>}
        </section>}
        {!fetching && !busy && selected && <section ref={resultRef} className="scroll-mt-24" aria-label="Selected AI review">
          <p className="mb-3 break-words text-sm font-semibold text-gray-700 dark:text-gray-300">Viewing: {selected.owner && selected.repo ? `${selected.owner}/${selected.repo}` : 'Older saved review'} · PR #{selected.prNumber}</p>
          <ReviewPanel review={selected.review} prNumber={selected.prNumber} />
        </section>}
      </main>
    </div>
  );
}

