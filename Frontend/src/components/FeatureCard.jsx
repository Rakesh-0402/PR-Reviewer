export default function FeatureCard({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div
      className="
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-xl
        p-6
        shadow-md
        hover:shadow-2xl
        hover:-translate-y-2
        transition-all duration-300
        cursor-pointer
      "
    >
      <div
        className="
          w-11 h-11
          rounded-xl
          bg-blue-50 dark:bg-blue-950/40
          flex items-center justify-center
          mb-4
        "
      >
        <Icon
          size={22}
          className="text-blue-600 dark:text-blue-400"
        />
      </div>

      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}