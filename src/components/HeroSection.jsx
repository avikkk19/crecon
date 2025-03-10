import React from "react";
import microsoft from '../assets/microsoft.svg';
import google from '../assets/google.svg';
import github from '../assets/github.svg';
import notion from '../assets/notion.svg';

const HeroSection = () => {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Hero content with 3D objects */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">
        {/* 3D Objects - Hidden on mobile, visible on larger screens */}
        <div className="hidden sm:block absolute left-0 top-1/4 w-1/2 h-full pointer-events-none">
          <div className="absolute left-12 top-0 w-16 sm:w-24 bg-emerald-200 h-16 sm:h-24 rounded-lg opacity-80"></div>
          <div className="absolute left-80 bottom-35 w-auto sm:w-[40rem] h-16 bg-white sm:h-2 rounded-xl opacity-20"></div>
          {/* <div className="absolute left-32 sm:left-48 bottom-36 w-36 sm:w-48 h-16 sm:h-24 bg-gray-400 opacity-80"></div> */}
        </div>

        {/* 3D Objects - Hidden on mobile, visible on larger screens */}
        <div className="hidden sm:block absolute right-0 top-1/4 w-1/2 h-full pointer-events-none">
          <div className="absolute rounded-bl-xl right-24 top-12 w-24 sm:w-32 h-24 sm:h-32 bg-white opacity-80"></div>
          {/* <div className="absolute rounded-b-full right-36 bottom-24 w-28 sm:w-36 h-28 sm:h-36 bg-white opacity-80"></div> */}
        </div>

        {/* Central content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto pt-10 sm:pt-20">
          <div className="text-pink-500 mb-4">Welcome to notnamedyet</div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Expand your skillset and
            <br className="hidden sm:inline" />
            <span className="sm:inline"> increase your Learning potential</span>
          </h1>

          <p className="text-gray-400 mb-8 mx-auto max-w-2xl px-4">
            *Currently in beta, sign up to get early access.*
          </p>

          <a href="/">
          <button className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-pink-500 hover:text-white transition-colors">
            Start your journey
          </button>
          </a>
        </div>

        {/* Company logos - Scrollable on mobile */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-gray-400 mb-6">
            WE SUPPORT WORKFLOWS AROUND THE WORLD
          </p>
          <div className="flex overflow-x-auto pb-4 sm:pb-0 sm:justify-center items-center space-x-8 sm:space-x-14 px-4">
            <img src={google} alt="Google" className="h-6 sm:h-8 flex-shrink-0" />
            <img src={microsoft} alt="Microsoft" className="h-6 sm:h-8 flex-shrink-0" />
            <img src={github} alt="GitHub" className="h-6 sm:h-8 flex-shrink-0" />
            <img src={google} alt="Uber" className="h-6 sm:h-8 flex-shrink-0" />
            <img src={notion} alt="Notion" className="h-6 sm:h-8 flex-shrink-0 bg-amber-50" />
          </div>
        </div>
      </div>

      {/* Member section */}
      <div className="relative z-10 text-center mt-16 sm:mt-24 pb-16 sm:pb-24">
        <div className="text-pink-500 mb-4">Member-only content</div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold max-w-lg mx-auto px-4">
          Unlock hours of
          <br className="hidden sm:inline" />
          <span className="sm:inline"> our Works</span>
        </h2>
      </div>

      {/* Product badge - Repositioned for mobile */}
      <div className="fixed sm:absolute bottom-4 left-4 sm:bottom-12 sm:left-12 z-20">
        <div className="bg-black border border-gray-700 rounded-lg px-3 sm:px-4 py-2 flex items-center">
          <span className="text-yellow-400 mr-2">🏆</span>
          <a href="">
            <div>
              <div className="text-xs text-gray-400">PRODUCT HUNT</div>
              <div className="text-sm sm:text-base font-medium">#1 Product of the Day</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;