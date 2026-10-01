import "dotenv/config";
import axios from "axios";
import jwt from "jsonwebtoken";

function appJWT() {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();

  if (!appId || !privateKey) {
    throw new Error("GitHub App credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 540,
      iss: appId,
    },
    privateKey,
    { algorithm: "RS256" }
  );
}

export async function installationToken(installationId, repositoryId) {
  const { data } = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      repository_ids: [repositoryId],
      permissions: {
        pull_requests: "write",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${appJWT()}`,
        Accept: "application/vnd.github+json",
      },
      timeout: 20_000,
    }
  );

  if (!data.token) {
    throw new Error("GitHub did not return an installation token.");
  }

  return data.token;
}

export function repositoryPath(document) {
  return (
    `/repos/${encodeURIComponent(document.owner)}` +
    `/${encodeURIComponent(document.repo)}`
  );
}

export function githubRequest(token, method, path, data, params) {
  return axios.request({
    method,
    url: `https://api.github.com${path}`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    data,
    params,
    timeout: 20_000,
    maxContentLength: 3_000_000,
  });
}
export async function getPersonalInstallation(username) {
  const { data } = await axios.get(
    `https://api.github.com/users/${encodeURIComponent(username)}/installation`,
    {
      headers: {
        Authorization: `Bearer ${appJWT()}`,
        Accept: "application/vnd.github+json",
      },
      timeout: 20_000,
    }
  );

  return data;
}