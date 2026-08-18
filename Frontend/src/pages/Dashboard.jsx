import DashboardNavbar from "../components/DashboardNavbar";
import SearchRepository from "../components/SearchRepository";
import PRCard from "../components/PRCard.jsx";
import LoadingCard from "../components/LoadingCard";
import ReviewPanel from "../components/ReviewPanel";
import {getPullRequests, getReview, getRepository} from "../services/githubService.js";
import { useEffect , useState , useRef } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import RepositoryCard from "../components/RepositoryCard";
import PRToolbar from "../components/PRToolbar";
import StatsCards from "../components/StatsCards";
import ReviewHistory from "../components/ReviewHistory";
import { jwtDecode } from "jwt-decode";

export default function Dashboard(){
    const [owner, setOwner] = useState("");
    const [repo, setRepo] = useState("");
    const [pulls, setPulls] = useState([]);
    const [review, setReview] = useState(null);//review is an object and dashboard stores the entire object in review
    const [reviewingPR, setReviewingPR] = useState(null);
    const [selectedPR, setSelectedPR] = useState(null);
    const [repoData, setRepoData] = useState(null);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("newest");
    const [filter, setFilter] = useState("all");
    const reviewLock = useRef(false);

    //create the user-specific key
    const token = localStorage.getItem("token");

    let userId = null;

    if (token) {
        const decoded = jwtDecode(token);
        userId = decoded.id;
    }
    const historyKey = userId ? `reviewHistory_${userId}` : null;
    const [reviewHistory, setReviewHistory] = useState(() => {
        const token = localStorage.getItem("token");
        if(!token) return [];

        const decoded = jwtDecode(token);
        const historyKey = `reviewHistory_${decoded.id}`;

        const savedHistory =localStorage.getItem(historyKey);

        return savedHistory ? JSON.parse(savedHistory) : [];
    });
    
    //make review history persistent- store review history in localstorage
    useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) return;

  const decoded = jwtDecode(token);
  const historyKey = `reviewHistory_${decoded.id}`;

  localStorage.setItem(
    historyKey,
    JSON.stringify(reviewHistory)
  );
}, [reviewHistory]);

    //verify JWT and load dashboard
    useEffect(() => {
        async function fetchDashBoard(){
            try {
                const token = localStorage.getItem("token");  //read the token 

                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/dashboard`,
                    {
                        headers : {
                            Authorization : `Bearer ${token}`,
                        },
                    }
                );
                console.log(response.data);
            }  
            catch (err){
                console.log(err);
            }
        }
        fetchDashBoard();
    } , []); // useEffect does not trigger on re-rendering , run this code only once

     //fetch all open pull request
    async function fetchPullRequests(currentOwner = owner, currentRepo = repo) {
        toast.success(`OWNER: ${currentOwner} | REPO: ${currentRepo}`);

        await fetchRepository(currentOwner, currentRepo); // before fetching all prs fetch repository details

        try {
            const data = await getPullRequests(owner, repo);
            setPulls(data);//add this pr in to pulls array
        } 
        catch (err) {
            console.log(err);
            toast.error("Unable to fetch pull requests");
        }   
    };

    //Review PR
    async function reviewPR(prNumber){
        if(reviewLock.current) return;

        reviewLock.current = true;
        setReviewingPR(prNumber);
        setReview(null);

        try {
            const response = await getReview(owner, repo, prNumber);
            const newReview = response.review;
            setSelectedPR(prNumber);
            setReview(newReview);

            setReviewHistory((prev) => [
                {
                    prNumber,
                    title: pulls.find((p) => p.number === prNumber)?.title,
                    review: newReview,
                    reviewedAt: new Date().toISOString(),
                },
                ...prev.filter((item) => item.prNumber !== prNumber),
    ]);

            // Auto scroll to review
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                });
            }, 200);

        } catch (err) {
            toast.error("Review failed");
        }
        finally {
            reviewLock.current = false;
            setReviewingPR(null);
        }
    }
    //fetch repository all details
    async function fetchRepository(currentOwner = owner, currentRepo = repo){
        try{;
            const repository = await getRepository(currentOwner, currentRepo);
            setRepoData(repository);
        }
        catch(err){
            console.log(err);
            toast.error("unable to fetch repository details")
        }
    }
    const filteredPRs = (pulls || [])      //api response is not guaranteed to be an array
        .filter((pr) => {
            const matchesSearch = pr.title
                .toLowerCase()
                .includes(search.toLowerCase());

                const matchesFilter =
                    filter === "all" || pr.state === filter;

                return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sort === "newest") {
                return new Date(b.created_at) - new Date(a.created_at);
            }

            return new Date(a.created_at) - new Date(b.created_at);
        });

    function deleteReviewHistory(prNumber) {
        setReviewHistory((prev) =>
        prev.filter((item) => item.prNumber !== prNumber)
    );

    // If the deleted review is currently displayed
    if (selectedPR === prNumber) {
        setReview(null);
        setSelectedPR(null);
    }
    }
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-10 transition-colors">
            <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
                <DashboardNavbar/>
            
                <SearchRepository
                    owner ={owner}
                    repo ={repo}
                    setOwner={setOwner}
                    setRepo ={setRepo}
                    fetchPullRequests={fetchPullRequests}
                />
                {/*show repository name above pr list */}
                <RepositoryCard repoData={repoData} />
                
                <PRToolbar
                    pulls={pulls}
                    search={search}
                    setSearch={setSearch}
                    sort={sort}
                    setSort={setSort}
                    filter={filter}
                    setFilter={setFilter}
                />
                {/* List all PRs */}
                <div className="space-y-5">
                    {filteredPRs.length === 0 ? (

                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-12 text-center">
                            <div className="text-6xl mb-4">📂</div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">No Pull Requests found</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-3">
                           Try changing your search or filter.</p>

                        </div>

                    ) : (
                        filteredPRs.map((pr) => (
                            <PRCard key={pr.id} pr={pr}  reviewingPR={reviewingPR} reviewPR={reviewPR}/>
                        ))

                    )}
                </div>

                {/*Better Loading card */}
                <LoadingCard loading={reviewingPR !== null}  />
                <ReviewHistory
                    reviewHistory={reviewHistory}
                    setReview={setReview}
                    setSelectedPR ={setSelectedPR}
                    deleteReviewHistory ={deleteReviewHistory}
                />
                <ReviewPanel review={review} prNumber ={selectedPR} />
            </div>
        </div>
  );
}
