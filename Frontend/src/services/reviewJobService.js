import axios from "axios";
const BASE_URL = `${import.meta.env.VITE_API_URL}/api/github/reviews`;
function config(signal) {
  return { signal, timeout: 15_000, headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  } };
}
export async function startReviewJob(owner, repo, prNumber) {
  return (await axios.post(BASE_URL, { owner, repo, prNumber }, config())).data.job;
}
export async function loadReviewJob(id, signal) {
  return (await axios.get(`${BASE_URL}/${encodeURIComponent(id)}`, config(signal))).data.job;
}
export async function loadActiveReviewJob(signal) {
  return (await axios.get(`${BASE_URL}/active`, config(signal))).data.job;
}
