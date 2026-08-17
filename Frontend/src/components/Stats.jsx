import { useEffect, useState } from "react";
import axios from "axios";
import { Bot, FolderGit2, ShieldCheck, Sparkles } from "lucide-react";

export default function Stats() {
  const [stats, setStats] = useState({
    totalReviews: 0,
    repositoriesReviewed: 0,
    reviewCategories: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/stats`,
        );

        setStats(response.data);
      } catch (error) {
        console.error("Unable to fetch stats:", error);
      }
    }

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: Bot,
      value: stats.totalReviews,
      label: "AI Reviews Generated",
    },
    {
      icon: FolderGit2,
      value: stats.repositoriesReviewed,
      label: "Repositories Analyzed",
    },
    {
      icon: ShieldCheck,
      value: stats.reviewCategories,
      label: "Review Categories",
    },
    {
      icon: Sparkles,
      value: "AI",
      label: "Powered Code Reviews",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-8 py-16">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

        {statItems.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="
                bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-800
                rounded-2xl
                p-7
                text-center
                shadow-sm
                hover:shadow-lg
                hover:-translate-y-2
                transition-all duration-300
              "
            >
              <div
                className="
                  w-11 h-11
                  mx-auto mb-4
                  flex items-center justify-center
                  rounded-xl
                  bg-blue-50 dark:bg-blue-950/40
                  text-blue-600 dark:text-blue-400
                "
              >
                <Icon size={22} />
              </div>

              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </h3>

              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                {stat.label}
              </p>
            </div>
          );
        })}

      </div>
    </section>
  );
}