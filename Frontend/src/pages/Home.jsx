import LandingNavbar from "../components/LandingNavbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import CTA from "../components/CTA";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 transition-colors">

      <LandingNavbar />

      <Hero />

      <Stats />

      <Features />

      <HowItWorks />

      {/* Pricing */}
      <section
        id="pricing"
        className="max-w-7xl mx-auto px-8 py-20"
      >
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Simple Pricing
        </h2>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-12">
          Start reviewing your pull requests for free.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Free */}
          <div
            className="
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-800
              rounded-2xl
              p-8
              shadow-md
              hover:shadow-xl
              transition-all duration-300
            "
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Free
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mt-2">
              For developers getting started.
            </p>

            <p className="text-4xl font-bold mt-6 text-gray-900 dark:text-white">
              $0
              <span className="text-base text-gray-500 dark:text-gray-400">
                {" "}/ month
              </span>
            </p>

            <ul className="mt-6 space-y-3 text-gray-600 dark:text-gray-300">
              <li>✓ GitHub repository integration</li>
              <li>✓ AI-powered PR reviews</li>
              <li>✓ Review history</li>
              <li>✓ Markdown export</li>
            </ul>

            <Link to="/signup">
              <button
                className="
                  w-full mt-8
                  border border-blue-600
                  text-blue-600 dark:text-blue-400
                  py-3 rounded-lg
                  hover:bg-blue-50 dark:hover:bg-blue-950/40
                  transition
                "
              >
                Get Started
              </button>
            </Link>
          </div>

          {/* Pro */}
          <div
            className="
              bg-blue-600
              text-white
              rounded-2xl
              p-8
              shadow-xl
              hover:shadow-2xl
              transition-all duration-300
            "
          >
            <h3 className="text-2xl font-bold">
              Pro
            </h3>

            <p className="text-blue-100 mt-2">
              For developers who need more.
            </p>

            <p className="text-4xl font-bold mt-6">
              Coming Soon
            </p>

            <ul className="mt-6 space-y-3 text-blue-100">
              <li>✓ Unlimited PR reviews</li>
              <li>✓ Advanced AI analysis</li>
              <li>✓ Priority processing</li>
              <li>✓ More powerful review insights</li>
            </ul>

            <button
              disabled
              className="
                w-full mt-8
                bg-white/20
                text-white
                py-3 rounded-lg
                cursor-not-allowed
              "
            >
              Coming Soon
            </button>
          </div>

        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="py-20 text-center text-gray-900 dark:text-white"
      >
        <h2 className="text-4xl font-bold mb-4">
          About AI PR Reviewer
        </h2>

        <p className="max-w-3xl mx-auto text-gray-600 dark:text-gray-400 leading-7">
          Built for developers who want better code reviews. AI PR Reviewer
          uses GitHub integration and AI-powered analysis to help identify
          bugs, security issues, performance problems, and code-quality
          improvements before merging.
        </p>
      </section>

      <CTA />

      <Footer />

    </div>
  );
}