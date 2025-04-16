import React, { useState, useEffect, useRef } from "react";
import logo from "../../public/logo.svg";
import { supabase } from "./SupabaseClient.jsx";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const location = useLocation();

  // Helper function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Set page as loaded after component mounts
  useEffect(() => {
    setPageLoaded(true);
  }, []);

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

  // Fetch unread notifications count
  useEffect(() => {
    if (user) {
      fetchUnreadRequestsCount();
      setupFollowRequestsSubscription();
    }
  }, [user]);

  const fetchUnreadRequestsCount = async () => {
    try {
      const { data, error } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      setUnreadRequests(data?.length || 0);
    } catch (error) {
      console.error("Error fetching unread requests count:", error);
    }
  };

  const setupFollowRequestsSubscription = () => {
    const channel = supabase
      .channel("follow_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follow_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setUnreadRequests((prev) => prev + 1);
          } else if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "DELETE"
          ) {
            fetchUnreadRequestsCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
    <>
      {/* Desktop Vertical Navbar */}
      <nav className="bg-black shadow-md backdrop-blur-3xl py-4 fixed left-0 top-0 bottom-0 h-full z-50 w-54 flex-col hidden md:flex items-end border-r border-gray-800/50">
        {/* Logo */}
        <a
          className={`flex items-center justify-end w-full pr-4 mb-10 transition-opacity duration-500 ease-in-out ${
            pageLoaded ? "opacity-100" : "opacity-0"
          }`}
          href="/"
        >
          <img
            src={logo}
            alt="Logo"
            className="h-6 w-auto fill-white stroke-gray-300"
          />
          <p className="text-white text-xl font-bold">crecon</p>
        </a>

        {/* Navigation Icons - Vertical Stack */}
        <div className="flex flex-col space-y-8 flex-grow items-end justify-center w-full pr-4">
          <a
            href="/"
            className={`text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-black/40 rounded-full flex items-center justify-center ${
              pageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4"
            }`}
            style={{ transitionDelay: "100ms" }}
            title="Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {isActive("/") && (
              <p className="text-sm m-2 mt-3 animate-fadeIn">HOME</p>
            )}
          </a>

          <a
            href="/chat"
            className={`text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-black/40 rounded-full flex items-center justify-center ${
              pageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4"
            }`}
            style={{ transitionDelay: "200ms" }}
            title="Chat"
          >
            <svg
              className="w-4 h-4 fill-current text-slate-400"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
              <path fillOpacity=".16" d="m13.4 18-3-7.4-7.4-3L19 2z"></path>
            </svg>
            {isActive("/chat") && (
              <p className="text-sm m-2 mt-3 animate-fadeIn">CHAT</p>
            )}
          </a>

          <a
            href="/blog"
            className={`text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-black/40 rounded-full flex items-center justify-center ${
              pageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4"
            }`}
            style={{ transitionDelay: "300ms" }}
            title="Blog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            {isActive("/blog") && (
              <p className="text-sm m-2 mt-3 animate-fadeIn">BLOG</p>
            )}
          </a>

          <a
            href="/notifications"
            className={`text-gray-400 hover:text-white transition-all duration-300 p-2 hover:bg-black/40 rounded-full relative flex items-center justify-center ${
              pageLoaded
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-4"
            }`}
            style={{ transitionDelay: "400ms" }}
            title="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {isActive("/notifications") && (
              <p className="text-sm m-2 mt-3 animate-fadeIn">NOTIFICATIONS</p>
            )}
            {unreadRequests > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {unreadRequests}
              </span>
            )}
          </a>
        </div>

        {/* User Profile Section - At bottom */}
        <div
          className={`mt-auto flex flex-col items-end space-y-4 w-full pr-4 mb-4 transition-all duration-500 ${
            pageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-600 animate-pulse"></div>
            ) : user ? (
              <>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`rounded-full bg-blue-500 flex items-center justify-center text-white overflow-hidden transition-all duration-300 ease-in-out ${
                    isProfileOpen ? "h-10 w-10 ring-2 ring-white/30" : "h-8 w-8"
                  }`}
                  title={user.email?.split("@")[0] || "User"}
                >
                  {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                </button>

                {/* Profile Dropdown Menu */}
                <div
                  className={`absolute bottom-full mb-2 w-48 bg-black/30 backdrop-blur-lg text-white rounded-md shadow-lg py-1 z-10 border border-zinc-700/50 right-0 overflow-hidden transition-all duration-400 ease-in-out ${
                    isProfileOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 py-2 border-b border-gray-700/50">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      {user.user_metadata?.full_name || "Account Settings"}
                    </p>
                  </div>
                  <a
                    href="/profile"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                  >
                    Profile
                  </a>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-3 items-end">
                <a
                  href="/signin"
                  className="p-2 hover:bg-black/40 rounded-full text-gray-400 hover:text-white"
                  title="Sign in"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </a>
                <a
                  href="/signup"
                  className="p-2 bg-gradient-to-bl from-green-900 to-blue-900 rounded-full text-white hover:opacity-90"
                  title="Sign up"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Floating Bottom Navbar */}
      <nav
        className={`md:hidden fixed bottom-4 left-4 right-4 bg-[#0f172a]/80 backdrop-blur-xl rounded-full shadow-lg h-16 z-50 border border-gray-800/30 transition-all duration-500 ${
          pageLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
      >
        <div className="flex items-center justify-around h-full px-2">
          <a href="/" className="text-gray-400 hover:text-white p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
          <a href="/chat" className="text-gray-400 hover:text-white p-2">
            <svg
              className="w-4 h-4 fill-current text-slate-400"
              viewBox="0 0 16 16"
            >
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
              <path fillOpacity=".16" d="m13.4 18-3-7.4-7.4-3L19 2z"></path>
            </svg>
          </a>
          <a href="/blog" className="text-gray-400 hover:text-white p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </a>
          <a
            href="/notifications"
            className="relative text-gray-400 hover:text-white p-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadRequests > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadRequests}
              </span>
            )}
          </a>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-400 hover:text-white p-2"
          >
            {user ? (
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {user.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed inset-0 bg-black bg-opacity-75 z-[55]"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="fixed left-0 bottom-20 right-0 max-h-[70vh] bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)] p-4 rounded-t-2xl backdrop-blur-lg border-t border-gray-800/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-2">
              <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
            </div>

            <div className="flex flex-col h-full">
              {loading ? (
                <div className="py-2">
                  <div className="h-8 w-8 rounded-full bg-gray-600 animate-pulse"></div>
                </div>
              ) : user ? (
                <>
                  <div className="py-2 flex items-center">
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
                  <div className="mt-3 space-y-1">
                    <a
                      href="/profile"
                      className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/40"
                    >
                      Profile
                    </a>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700/40"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-2 flex flex-col space-y-3">
                  <a
                    href="/signin"
                    className="text-center text-gray-300 hover:text-white py-2"
                  >
                    Sign in
                  </a>
                  <a
                    href="/signup"
                    className="text-center bg-gradient-to-bl from-green-900 to-blue-900 text-white px-4 py-2 rounded-md hover:opacity-90"
                  >
                    Sign up
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
