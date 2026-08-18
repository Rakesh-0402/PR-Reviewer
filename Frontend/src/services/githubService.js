import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/github`;

//fetch all open pull request
export async function getPullRequests(owner, repo) {
    const {owner, repo} = req.query;
    
    console.log("OWNER:", owner);
    console.log("REPO:", repo);

    const response = await axios.get(
        `${BASE_URL}/pulls`,
        {
            params: {
                owner,
                repo,
            },
        }
    );

    return response.data;
}

export async function getReview(owner, repo, prNumber) {
    const token = localStorage.getItem("token");

    const response = await axios.get(
        `${BASE_URL}/pulls/${owner}/${repo}/${prNumber}/files` ,
        {
            headers :{
                Authorization: `Bearer ${token}`,
            }
        }
    );

    return response.data.review;
}
export async function getRepository(owner, repo){
    const {owner, repo} = req.query;

    console.log("OWNER:", owner);
    console.log("REPO:", repo);
    
    const response = await axios.get(
        `${BASE_URL}/repository`,
        {
            params :{
                owner,
                repo,
            }
        }
    );
    return response.data;
}

