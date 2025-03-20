import React from "react";

const HeroSection = () => {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24">
        {/* Hero content */}
        <div className="text-center pt-16 sm:pt-24 pb-16">
          <h1 className="text-6xl sm:text-7xl font-bold mb-8 leading-tight">
            Open Source
            <br />
            Collaboration
            <br />
            Platform
          </h1>

          <div className="max-w-4xl mx-auto">
            <p className="text-2xl sm:text-3xl mb-6">
              <span className="underline">Traces</span>,{" "}
              <span className="underline">evals</span>,{" "}
              <span className="underline"> management</span> and{" "}
              <span className="underline">metrics</span>
              <br />
              to look for other opportunity finders
            </p>
          </div>

          <div className="flex gap-4 justify-center mt-10">
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Start your journey
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium border border-gray-700 transition-colors">
              View docs
            </button>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">
              Tools for the full development workflow
            </h2>
            <p className="text-xl">
              All features are tightly integrated with Tracing.
            </p>
            <button className="mt-6 bg-transparent hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium border border-gray-700 transition-colors inline-flex items-center">
              Explore docs <span className="ml-2">→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tool Card 1 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🔧</span>
                <h3 className="text-xl font-bold">Prompt Management</h3>
              </div>
              <p className="text-gray-300">
                Version and deploy prompts collaboratively and retrieve them
                with low latency.
              </p>
            </div>

            {/* Tool Card 2 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">👍</span>
                <h3 className="text-xl font-bold">Evaluation</h3>
              </div>
              <p className="text-gray-300">
                Collect user feedback, annotate results, and run evaluation
                functions.
              </p>
            </div>

            {/* Tool Card 3 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-xl font-bold">Metrics</h3>
              </div>
              <p className="text-gray-300">
                Track cost, latency, and quality metrics across your
                applications.
              </p>
            </div>

            {/* Tool Card 4 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🧪</span>
                <h3 className="text-xl font-bold">Playground</h3>
              </div>
              <p className="text-gray-300">
                Test different prompts and models right in the UI.
              </p>
            </div>

            {/* Tool Card 5 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🔍</span>
                <h3 className="text-xl font-bold">Tracing</h3>
              </div>
              <p className="text-gray-300">
                Detailed production traces to debug applications faster.
              </p>
            </div>

            {/* Tool Card 6 */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">💾</span>
                <h3 className="text-xl font-bold">Datasets</h3>
              </div>
              <p className="text-gray-300">
                Derive datasets from production data to fine-tune models for
                your application.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Open Source Section */}
      <div className="bg-black text-white py-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4">Proudly Open Source</h2>
            <p className="text-xl mb-6">
              Committed to open source.
              <br />
              You can also run it locally or self-hosted.
            </p>

            <a
              href="https://github.com/avikkk19/notyetnamed"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium border border-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              github.com/avikk19/notyetnamed
              <span className="ml-2 bg-gray-800 px-2 py-1 rounded text-xs">
                '<></>'
              </span>
            </a>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 max-w-3xl mx-auto border border-gray-800">
            <div className="text-gray-300 text-sm mb-2">Changelog</div>
            <div className="space-y-4">
              <div className="flex items-start border-b border-gray-800 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">New Prompt View</span>
                    <span className="text-xs text-gray-400 ml-2">
                      by Maxime
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">2 days ago</div>
              </div>

              <div className="flex items-start border-b border-gray-800 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">New Trace View</span>
                    <span className="text-xs text-gray-400 ml-2">
                      by Maxime
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">2 days ago</div>
              </div>

              <div className="flex items-start border-b border-gray-800 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      OpenAI Response API support
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      by Hasibix
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">4 days ago</div>
              </div>

              <div className="text-center mt-4">
                <a
                  href="/changelog"
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Read the full changelog →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
