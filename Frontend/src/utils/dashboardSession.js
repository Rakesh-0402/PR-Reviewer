// Call BEFORE removing the login token. Keep history and active-job IDs intact.
export function clearDashboardSession(userId) {
  if (!userId) return;
  for (const prefix of ["repositorySession", "selectedReview", "dashboardSession_v2"]) {
    try { sessionStorage.removeItem(`${prefix}_${userId}`); } catch { /* Storage unavailable. */ }
  }
}

export const sameRepository = (a, b) => Boolean(a?.owner && a?.repo && b?.owner && b?.repo &&
  a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase());

export function repositoryErrorMessage(error) {
  // Support both corrected HTTP statuses and the earlier backend's nested error status.
  if (error.response?.data?.code === "GITHUB_AUTH_FAILED") return "The server GitHub token is invalid or expired. Contact the app owner.";
  const status = Number(error.response?.data?.error?.status || error.response?.status);
  if (status === 404) return "Repository not found or not accessible. Check the owner and repository name.";
  if (status === 400 || status === 422) return "Enter a valid GitHub owner and repository name.";
  if (status === 401) return "Authentication failed. Check your session or the server's GitHub credentials.";
  if (status === 403 || status === 429) return "GitHub access is restricted or its request limit was reached. Try again later.";
  if (!error.response) return "Could not reach the backend. Check your connection and that the server is running.";
  return "Unable to fetch this repository right now. Please try again.";
}
