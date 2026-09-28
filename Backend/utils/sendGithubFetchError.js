// Use only for repository/PR-list fetching, not Groq review errors.
export function sendGithubFetchError(res, error) {
  const upstream = Number(error.response?.status);
  if (upstream === 404) return res.status(404).json({
    message: "Repository not found or not accessible. Check the owner and repository name."
  });
  if (upstream === 400 || upstream === 422) return res.status(400).json({ message: "Invalid repository owner or name." });
  if (upstream === 401) return res.status(502).json({
    code: "GITHUB_AUTH_FAILED", message: "The server could not authenticate with GitHub."
  });
  if (upstream === 403 || upstream === 429) return res.status(upstream).json({
    message: "GitHub access is restricted or its request limit was reached. Try again later."
  });
  return res.status(502).json({ message: "Could not fetch repository data from GitHub. Try again later." });
}
