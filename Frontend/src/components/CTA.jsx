import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-24">
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 text-center p-12 shadow-xl">
        
        <h2 className="text-4xl font-bold text-white mb-4">
          Ready to Review Better Code?
        </h2>

        <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
          Start reviewing pull requests with AI and improve code quality
          before merging.
        </p>

        <Link to="/signup">
          <button className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition shadow-md">
            Start Reviewing Your PRs
          </button>
        </Link>

      </div>
    </section>
  );
}