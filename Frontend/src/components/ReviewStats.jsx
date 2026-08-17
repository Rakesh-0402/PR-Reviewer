import {Bug, Gauge, ShieldCheck, Sparkles,} from "lucide-react";

export default function ReviewStats() {

  const stats = [
    {
      title: "Bugs",
      value: "--",
      icon: <Bug className="text-red-500" size={28} />,
    },
    {
      title: "Performance",
      value: "--",
      icon: <Gauge className="text-orange-500" size={28} />,
    },
    {
      title: "Security",
      value: "--",
      icon: <ShieldCheck className="text-green-500" size={28} />,
    },
    {
      title: "Best Practices",
      value: "--",
      icon: <Sparkles className="text-blue-500" size={28} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">

      {stats.map((stat) => (

        <div
          key={stat.title}
          className="bg-gray-50 rounded-xl p-5 shadow-sm"
        >

          {stat.icon}

          <p className="text-gray-500 mt-3 text-sm">
            {stat.title}
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {stat.value}
          </h2>

        </div>

      ))}

    </div>
  );
}