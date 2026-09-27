import { useEffect, useRef, useState } from "react";
import { startReviewJob, loadReviewJob, loadActiveReviewJob } from "../services/reviewJobService";
const TERMINAL = new Set(["completed", "partial", "failed"]);

export default function useReviewJob(userId, onComplete) {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const key = userId ? `activeReviewJob_${userId}` : null;
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const locked = useRef(false);
  const completed = useRef(new Set());
  const mounted = useRef(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;

  function remember(id) {
    if (!key) return;
    try { localStorage.setItem(key, id); } catch { /* Server active endpoint is fallback. */ }
  }
  const accept = useRef(null);
  accept.current = next => {
    setJob(next);
    setConnectionError("");
    if (!next) return;
    if (TERMINAL.has(next.status)) {
      try { localStorage.removeItem(key); } catch { /* Storage may be blocked. */ }
      if (!completed.current.has(next.jobId)) {
        completed.current.add(next.jobId);
        callback.current(next);
      }
    } else remember(next.jobId);
  };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    let timer;
    setRestoring(true);
    setJob(null);
    async function restore() {
      if (!userId) { setRestoring(false); return; }
      try {
        let stored;
        try { stored = localStorage.getItem(key); } catch { /* optional storage */ }
        let next = null;
        if (stored) {
          try { next = await loadReviewJob(stored, controller.signal); }
          catch (error) {
            if (error.response?.status !== 404 && error.response?.status !== 400) throw error;
            try { localStorage.removeItem(key); } catch { /* optional */ }
          }
        }
        if (!next) next = await loadActiveReviewJob(controller.signal);
        if (!stopped) { accept.current(next); setRestoring(false); }
      } catch (error) {
        if (stopped) return;
        const authError = error.response?.status === 401;
        setConnectionError(authError ? "Session expired. Please log in again." : "Reconnecting to review status…");
        if (!authError) timer = setTimeout(restore, 5000);
        else setRestoring(false);
      }
    }
    restore();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [key, userId]);

  const activeId = job && !TERMINAL.has(job.status) ? job.jobId : null;
  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    let stopped = false;
    let timer;
    async function poll() {
      try {
        const next = await loadReviewJob(activeId, controller.signal);
        if (stopped) return;
        accept.current(next);
        if (!TERMINAL.has(next.status)) timer = setTimeout(poll, 3000);
      } catch (error) {
        if (stopped) return;
        if (error.response?.status === 401) {
          setConnectionError("Session expired. Log in again to check the review.");
          return;
        }
        if (error.response?.status === 404) {
          try { localStorage.removeItem(key); } catch { /* optional */ }
          setJob(null);
          setConnectionError("Review job is no longer available.");
          return;
        }
        setConnectionError("Connection interrupted. Your saved job is unaffected; reconnecting…");
        timer = setTimeout(poll, 5000);
      }
    }
    poll();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [activeId, key]);

  async function start(owner, repo, prNumber) {
    if (locked.current || restoring || activeId) return;
    locked.current = true;
    setStarting(true);
    const requestedUser = userId;
    try {
      const next = await startReviewJob(owner, repo, prNumber);
      remember(next.jobId);
      if (mounted.current && currentUser.current === requestedUser) accept.current(next);
    } catch (error) {
      if (!mounted.current || currentUser.current !== requestedUser) return;
      const existing = error.response?.data?.job;
      if (existing) accept.current(existing);
      else {
        // POST may have succeeded even when its response was lost.
        try {
          const active = await loadActiveReviewJob();
          if (mounted.current && currentUser.current === requestedUser && active) { accept.current(active); return; }
        } catch { /* Show the original error, no automatic duplicate POST. */ }
        if (mounted.current) setConnectionError(error.response?.data?.message || "Could not confirm the review. Refresh to restore any saved job.");
      }
    } finally {
      locked.current = false;
      if (mounted.current && currentUser.current === requestedUser) setStarting(false);
    }
  }
  return { job, start, busy: Boolean(starting || restoring || activeId), starting, restoring, connectionError };
}
