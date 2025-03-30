import React from "react";
import { Link } from "react-router-dom";

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
              <span className="hover:underline">connect</span>,{" "}
              <span className="hover:underline">evolve</span>,{" "}
              <span className="hover:underline"> managing</span> and{" "}
              <span className="hover:underline">metrics</span>
              <br />
              to look for other opportunities.
            </p>
          </div>

          <div className="flex gap-4 justify-center mt-10">
            <Link to="/chat">
              <button className="bg-zinc-900 hover:bg-gradient-to-r from-zinc-500 to-blue-900 text-white px-6 py-3 rounded-3xl font-medium transition-colors">
                Start a conversation
              </button>
            </Link>
           
          </div> 
        </div>
      </div>

      {/* Tools Section */}
      <div className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">
             Website that your searching ffor
            </h2>
            <h1 className="text-xl">
              All features are tightly integrated.
            </h1>
            <button className="mt-6 bg-transparent hover:bg-zinc-900 text-white px-6 py-2 rounded-lg font-medium border border-gray-700 transition-colors inline-flex items-center">
              {/* Explore docs <span className="ml-2">→</span> */}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tool Card 1 */}
            <div className="bg-black rounded-lg p-5 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📂</span>
                <h3 className="text-xl font-bold">
                  Transparent and Customizable
                </h3>
              </div>
              <h1 className="text-gray-300 ">
                <p className="font-bold">Transparent and Customizable</p>
                Our app is open source, allowing you to inspect, modify, and
                enhance the code to fit your specific needs.
              </h1>
            </div>

            {/* Tool Card 2 */}
            <div className="bg-black rounded-lg p-6 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">👍</span>
                <h3 className="text-xl font-bold">Real-Time Chat:</h3>
              </div>
              <h1 className="text-gray-300">
                <p className="font-bold">Instant Communication</p>
                Enjoy seamless real-time messaging with friends, family, or
                colleagues, ensuring you stay connected at all times.
              </h1>
            </div>

            {/* Tool Card 3 */}
            <div className="bg-black rounded-lg p-6 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-xl font-bold">Secure and Private</h3>
              </div>
              <h1 className="text-gray-300">
                <p className="font-bold">Your Data, Your Control</p>
                We prioritize your privacy with robust security measures,
                ensuring your conversations and data remain safe and private.
              </h1>
            </div>

            {/* Tool Card 4 */}
            <div className="bg-black rounded-lg p-6 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🧪</span>
                <h3 className="text-xl font-bold">User-Friendly Interface</h3>
              </div>
              <h1 className="text-gray-300">
                <p className="font-bold">Easy to Use</p>
                Our intuitive design ensures a smooth user experience, making it
                easy for anyone to navigate and use the app.
              </h1>
            </div>

            {/* Tool Card 5 */}
            <div className="bg-black rounded-lg p-6 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🔍</span>
                <h3 className="text-xl font-bold">Feature-Rich</h3>
              </div>
              <h1 className="text-gray-300">
                <p className="font-bold">Your Data, Your Control</p>
                Detailed production traces to debug applications faster.
              </h1>
            </div>

            {/* Tool Card 6 */}
            <div className="bg-black rounded-lg p-6 border border-zinc-900">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">💾</span>
                <h3 className="text-xl font-bold">Community Support</h3>
              </div>
              <h1 className="text-gray-300">
                <p className="font-bold">Packed with Features</p>
                From file sharing to group chats, our app offers a wide range of
                features to enhance your communication experience.
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Open Source Section */}
      <div className="bg-black text-white py-20 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4">Proudly Open Source</h2>
            <h1 className="text-xl mb-6">
              Committed to open source.
              <br />
              Trusted by few used my none
            </h1>

            <a
              href="https://github.com/avikkk19/notyetnamed"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-black hover:bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium border border-gray-700 transition-colors"
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
              <span className="ml-2 bg-zinc-900 px-2 py-1 rounded text-xs">
                '<></>'
              </span>
            </a>
          </div>

          <div className="bg-black rounded-lg p-4 max-w-3xl mx-auto border border-zinc-900">
            <div className="text-gray-300 text-sm mb-2">Changelog</div>
            <div className="space-y-4">
              <div className="flex items-start border-b border-zinc-900 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">Added blogs</span>
                    <span className="text-xs text-gray-400 ml-2">
                    by appalrvu
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">2 days ago</div>
              </div>

              <div className="flex items-start border-b border-zinc-900 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">integrated chats</span>
                    <span className="text-xs text-gray-400 ml-2">
                      by ballaldevah
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">2 days ago</div>
              </div>

              <div className="flex items-start border-b border-zinc-900 pb-4">
                <div className="flex-grow">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">
                      Debugged errors
                    </span>chat
                    <span className="text-xs text-gray-400 ml-2">
                      by kondaReddy
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">4 days ago</div>
              </div>

              <div className="text-center mt-4">
                <a
                  href="/"
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
