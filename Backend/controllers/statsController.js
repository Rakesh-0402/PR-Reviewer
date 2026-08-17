import Review from "../models/Review.js";

export async function getStats(req, res) {
    try {
        // Total reviews generated
        const totalReviews = await Review.countDocuments();

        const repoPairs = await Review.aggregate([
            {
                $group: {
                    _id: {
                        owner: "$owner",
                        repo: "$repo",
                    },
                },
            },
            {
                $count: "total",
            },
        ]);

        const repositoriesReviewed = repoPairs[0]?.total || 0;

        return res.status(200).json({
            totalReviews,
            repositoriesReviewed,
            reviewCategories: 4,
        });

    } catch (error) {
        console.error("Stats error:", error);

        return res.status(500).json({
            message: "Unable to fetch stats",
        });
    }
}