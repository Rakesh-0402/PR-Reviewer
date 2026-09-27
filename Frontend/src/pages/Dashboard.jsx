import DashboardNavbar from "../components/DashboardNavbar";
import SearchRepository from "../components/SearchRepository";
import PRCard from "../components/PRCard.jsx";
import ReviewPanel from "../components/ReviewPanel";
import RepositoryCard from "../components/RepositoryCard";
import PRToolbar from "../components/PRToolbar";
import ReviewHistory from "../components/ReviewHistory";
import { getPullRequests, getRepository } from "../services/githubService.js";
import useReviewJob from "../hooks/useReviewJob";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

function currentUserId() {
  try { return jwtDecode(localStorage.getItem("token") || "").id || null; }
  catch { return null; }
}
function readHistory(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(`reviewHistory_${userId}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export default function Dashboard() {
  const userId = currentUserId();
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [pulls, setPulls] = useState([]);
  const [review, setReview] = useState(null);
  const [selectedPR, setSelectedPR] = useState(null);
  const [repoData, setRepoData] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");
  const [fetching, setFetching] = useState(false);
  const [loadedRepo, setLoadedRepo] = useState(null);
  const [reviewHistory, setReviewHistory] = useState(() => readHistory(userId));
  const resultRef = useRef(null);
  const searchVersion = useRef(0);

  const { job, start, busy, starting, restoring, connectionError } = useReviewJob(userId, finished => {
    if (finished.status === "failed") { toast.error(finished.message); return; }
    if (!finished.review) { toast.error("Review result is unavailable."); return; }
    setSelectedPR(finished.prNumber);
    setReview(finished.review);
    setReviewHistory(previous => [{
      jobId: finished.jobId, owner: finished.owner, repo: finished.repo,
      prNumber: finished.prNumber, title: finished.title,
      review: finished.review, reviewedAt: finished.updatedAt,
    }, ...previous.filter(item => item.jobId !== finished.jobId && !(
      item.owner === finished.owner && item.repo === finished.repo && item.prNumber === finished.prNumber
    ))]);
    if (finished.status === "partial") toast("Review finished with skipped files. Check coverage.");
    else toast.success("Review completed");
  });

  useEffect(() => {
    if (!userId) return;
    try { localStorage.setItem(`reviewHistory_${userId}`, JSON.stringify(reviewHistory)); }
    catch { toast.error("Browser history storage is full. The completed review is still saved on the server."); }
  }, [reviewHistory, userId]);

  useEffect(() => {
    if (review) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [review]);

  async function fetchPullRequests() {
    const version = ++searchVersion.current;
    const requestedOwner = owner.trim();
    const requestedRepo = repo.trim();
    if (!requestedOwner || !requestedRepo) { toast.error("Enter a repository owner and name."); return; }
    setFetching(true);
    try {
      const [repository, data] = await Promise.all([
        getRepository(requestedOwner, requestedRepo), getPullRequests(requestedOwner, requestedRepo),
      ]);
      if (version !== searchVersion.current) return;
      if (!Array.isArray(data)) throw new Error("Invalid PR list");
      setRepoData(repository);
      setPulls(data);
      setLoadedRepo({ owner: requestedOwner.toLowerCase(), repo: requestedRepo.toLowerCase() });
    } catch {
      if (version === searchVersion.current) toast.error("Unable to fetch repository or pull requests.");
    } finally { if (version === searchVersion.current) setFetching(false); }
  }

  async function reviewPR(prNumber) {
    if (!loadedRepo || busy) return;
    setReview(null);
    // Use the repository that produced the cards, not potentially edited input fields.
    await start(loadedRepo.owner, loadedRepo.repo, prNumber);
  }

  const filteredPRs = pulls.filter(pr =>
    pr.title.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || pr.state === filter)
  ).sort((a, b) => sort === "newest" ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));

  const historyRepo = loadedRepo || (job ? { owner: job.owner, repo: job.repo } : null);
  const visibleHistory = historyRepo ? reviewHistory.filter(item =>
    // Legacy rows did not store repository identity; keep them visible until replaced.
    !item.owner || (item.owner === historyRepo.owner && item.repo === historyRepo.repo)
  ) : reviewHistory;
  function deleteReviewHistory(prNumber) {
    setReviewHistory(previous => previous.filter(item => !(item.prNumber === prNumber && visibleHistory.includes(item))));
    if (selectedPR === prNumber) { setReview(null); setSelectedPR(null); }
  }

  const sameRepo = job && loadedRepo && job.owner === loadedRepo.owner && job.repo === loadedRepo.repo;
  const reviewingPR = busy ? (sameRepo ? job.prNumber : -1) : null;
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <DashboardNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SearchRepository owner={owner} repo={repo} setOwner={setOwner} setRepo={setRepo} fetchPullRequests={fetchPullRequests} />
        {fetching && <p className="my-3 text-sm text-gray-600 dark:text-gray-300" role="status">Fetching repository…</p>}
        <RepositoryCard repoData={repoData} />
        {(job || restoring || starting || connectionError) && (
          <section className="my-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-gray-900" aria-live="polite">
            <h2 className="font-semibold text-gray-900 dark:text-white">{job ? `${job.owner}/${job.repo} · PR #${job.prNumber}` : "Review status"}</h2>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {connectionError || (restoring ? "Restoring review status…" : starting ? "Submitting review…" : job?.message)}
            </p>
            {job?.totalFiles != null && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {job.reviewedFiles}/{job.totalFiles} files reviewed · {job.completedBatches}/{job.totalBatches} batches completed
              {job.skippedFiles > 0 ? ` · ${job.skippedFiles} files skipped` : ""}
            </p>}
            {job?.status === "waiting" && job.nextRunAt && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Next attempt no earlier than {new Date(job.nextRunAt).toLocaleTimeString()}.</p>}
            {busy && job && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">You can leave and return. Progress is saved on the server.</p>}
          </section>
        )}
        <PRToolbar pulls={pulls} search={search} setSearch={setSearch} sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} />
        <div className="space-y-5">
          {filteredPRs.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{loadedRepo ? "No matching pull requests" : "Choose a repository"}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-3">{loadedRepo ? "Try changing your search or filter." : "Enter its owner and name to get started."}</p>
            </div>
          ) : filteredPRs.map(pr => <PRCard key={pr.id} pr={pr} reviewingPR={reviewingPR} reviewPR={reviewPR} />)}
        </div>
        <ReviewHistory reviewHistory={visibleHistory} setReview={setReview} setSelectedPR={setSelectedPR} deleteReviewHistory={deleteReviewHistory} />
        <div ref={resultRef} className="scroll-mt-24"><ReviewPanel review={review} prNumber={selectedPR} /></div>
      </div>
    </div>
  );
}
