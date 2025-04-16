import React from "react";
import PixelArt from "../PixelArt";
import { Link } from "react-router-dom";

const Portfolio = () => {
  return (
    <div className="min-h-screen bg-[#0c1425] text-white">
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
        {/* Header with friends counter and guestbook */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <span className="text-gray-300">2 friends here</span>
            <span className="ml-2 px-1 py-0.5 text-xs bg-gray-800 text-gray-400 rounded">
              N8N
            </span>
          </div>
          <button className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
            Sign my guestbook
          </button>
        </div>

        {/* Pixel Art Grid */}
        <div className="mb-8">
          <PixelArt />
        </div>

        {/* Introduction */}
        <div>
          <h1 className="text-2xl mb-4">
            Hi, I'm <span className="text-blue-400">Dhravya Shah</span>
          </h1>

          <div className="text-4xl mb-6">
            I make <span className="text-green-400">full-stack</span> products
            that
            <br />
            people <span className="text-pink-400">love.</span>
          </div>

          <p className="text-gray-300 mb-4">
            Developer, 2x acquired Founder, Indie Hacker, OSS Contributor,
            Guitarist and
            <br />
            Student. I play read, write and travel for fun.
          </p>

          <p className="text-gray-300 mb-4">
            Currently a student @{" "}
            <a href="#" className="text-blue-400">
              ASU
            </a>{" "}
            and{" "}
            <span className="text-gray-300">Devrel + building in OSS @ </span>
            <a href="#" className="text-blue-400">
              Cloudflare
            </a>
            ! I'm also a
            <br />
            <a href="#" className="text-blue-400">
              Neo
            </a>{" "}
            Scholar finalist and run{" "}
            <a href="#" className="text-blue-400">
              sunhacks
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-400">
              devlabs
            </a>{" "}
            at ASU.
          </p>

          <p className="text-gray-300 mb-8">
            Building{" "}
            <a href="#" className="text-blue-400">
              Supermemory.ai
            </a>{" "}
            on nights and weekends.
          </p>

          {/* Right side message box */}
          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-4 max-w-xs float-right">
            <div className="flex items-center mb-2">
              <span className="text-yellow-400 text-xl mr-2">👋</span>
              <span className="text-gray-400 text-sm">
                Thanks for visiting my site!
              </span>
            </div>
            <h3 className="text-white mb-2">Glad to have you here.</h3>

            <div className="border-t border-gray-700 pt-2 mt-2">
              <a
                href="#"
                className="text-blue-400 text-sm flex items-center mb-2"
              >
                Leave a message on my guestbook
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </a>

              <a
                href="#"
                className="text-blue-400 text-sm flex items-center mb-2"
              >
                Send an email
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </a>

              <a href="#" className="text-blue-400 text-sm flex items-center">
                Sponsor me on github
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
