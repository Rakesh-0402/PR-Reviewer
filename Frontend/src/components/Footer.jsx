export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10 mt-10">
      <div className="max-w-7xl mx-auto px-8 text-center">

        <h3 className="text-2xl font-bold mb-4">Built With</h3>

        <p className="text-gray-300 text-lg">
          ⚛ React • Tailwind CSS • Node.js • Express • Gemini AI
        </p>

        <div className="flex justify-center gap-8 my-8">
          <a href="https://github.com/Rakesh-0402" className="hover:text-blue-400 transition">GitHub</a>

          <a href="https://www.linkedin.com/in/rakesh-235623291/" className="hover:text-blue-400 transition">LinkedIn</a>

          <a href="mailto:rakesh@gmail.com" className="hover:text-blue-400 transition">Contact</a>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <p className="text-gray-400">
            © 2026 PR Reviewer. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}