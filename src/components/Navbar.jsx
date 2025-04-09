import React, { useState, useEffect, useRef } from "react";
import logo from "../../public/logo.svg";
import { supabase } from "./SupabaseClient.jsx";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Set up auth state listener
  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };

    checkSession();

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  return (
    <nav className="bg-transparent shadow-xs backdrop-blur-3xl py-4 px-4 sm:px-6 fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex justify-between items-center">
        {/* Logo - Fixed width to prevent shifting */}
        <a className="flex items-center w-1/4" href="/">
          <div className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-5 w-auto fill-white stroke-gray-300"
            />

            <span className="ml-2 font-semibold text-gray-300">Crecon</span>
          </div>
        </a>

        {/* Navigation Links - Fixed position in center */}
        <div className="hidden md:flex items-center justify-center w-2/4">
          <div className="flex space-x-8">
            <a
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Home
            </a>

            <a
              href="/chat"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Chat
            </a>
            {/* <a
              href="/blog"
              className="text-gray-400 hover:text-white transition-colors"
            >
            blog
            </a> */}
            <a
              href="/blog"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Blog
            </a>
          </div>
        </div>

        {/* Mobile Menu Button and User Profile - Fixed width container */}
        <div className="flex justify-end w-1/4">
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-400 hover:text-white focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* User Profile (Desktop) - Min height to prevent layout shift */}
          <div className="hidden md:block relative h-10" ref={dropdownRef}>
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-600 animate-pulse"></div>
            ) : user ? (
              <>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="ml-2 text-gray-300">
                    {user.email?.split("@")[0] || "User"}
                  </span>
                  <svg
                    className={`ml-1 h-4 w-4 text-gray-400 transition-transform ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </button>

                {/* Desktop Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <p className="text-sm font-medium truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.user_metadata?.full_name || "Account Settings"}
                      </p>
                    </div>
                    {/* <a href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-700">
                      Your Profile
                    </a>
                    <a href="/settings" className="block px-4 py-2 text-sm hover:bg-gray-700">
                      Settings
                    </a> */}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <a href="/signin" className="text-gray-300 hover:text-white">
                  Sign in
                </a>
                <a
                  href="/signup"
                  className="bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-zinc-500"
                >
                  Sign up
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed top-16 left-0 right-0 bg-black border-t border-gray-700 z-50"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a
              href="/"
              className="block px-3 py-2 text-gray-300 hover:text-white"
            >
              Home
            </a>
            <a
              href="/chat"
              className="block px-3 py-2 text-gray-300 hover:text-white"
            >
              Chat
            </a>

            <a
              href="/blog"
              className="block px-3 py-2 text-gray-300 hover:text-white"
            >
              Blogs
            </a>
          </div>

          {/* Mobile User Controls */}
          <div className="pt-4 pb-3 border-t border-gray-700">
            {loading ? (
              <div className="px-4 py-2">
                <div className="h-8 w-8 rounded-full bg-gray-600 animate-pulse mx-auto"></div>
              </div>
            ) : user ? (
              <>
                <div className="px-4 py-2 flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-300">
                      {user.email?.split("@")[0] || "User"}
                    </div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4 py-2 flex flex-col space-y-3">
                <a
                  href="/signin"
                  className="text-center text-gray-300 hover:text-white py-2"
                >
                  Sign in
                </a>
                <a
                  href="/signup"
                  className="text-center bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600"
                >
                  Sign up
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
