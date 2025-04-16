import React, { useState, useEffect, useRef } from "react";
import logo from "../../public/logo.svg";
import { supabase } from "./SupabaseClient.jsx";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [unreadRequests, setUnreadRequests] = useState(0);
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

  // Fetch follow requests
  useEffect(() => {
    if (user) {
      fetchFollowRequests();
      setupFollowRequestsSubscription();
    }
  }, [user]);

  const fetchFollowRequests = async () => {
    try {
      // First fetch the follow requests
      const { data: requests, error: requestsError } = await supabase
        .from("follow_requests")
        .select("id, sender_id, status, created_at")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Then fetch the sender profiles
      const senderIds = requests?.map((request) => request.sender_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", senderIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData =
        requests?.map((request) => ({
          ...request,
          sender: profiles?.find((profile) => profile.id === request.sender_id),
        })) || [];

      setFollowRequests(combinedData);
      setUnreadRequests(combinedData.length);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
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
            setFollowRequests((prev) => [...prev, payload.new]);
            setUnreadRequests((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            setFollowRequests((prev) =>
              prev.map((request) =>
                request.id === payload.new.id ? payload.new : request
              )
            );
          } else if (payload.eventType === "DELETE") {
            setFollowRequests((prev) =>
              prev.filter((request) => request.id !== payload.old.id)
            );
            setUnreadRequests((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFollowRequestResponse = async (requestId, accepted) => {
    try {
      const { error: updateError } = await supabase
        .from("follow_requests")
        .update({ status: accepted ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (accepted) {
        const request = followRequests.find((r) => r.id === requestId);
        if (request) {
          // First check if relationship already exists
          const { data: existingRelationship, error: checkError } =
            await supabase
              .from("user_relationships")
              .select("id")
              .eq("user_id", user.id)
              .eq("following_id", request.sender_id)
              .single();

          if (checkError && checkError.code !== "PGRST116") {
            // PGRST116 is "no rows returned"
            throw checkError;
          }

          if (!existingRelationship) {
            const { error: relationshipError } = await supabase
              .from("user_relationships")
              .insert({
                user_id: user.id,
                following_id: request.sender_id,
              });

            if (relationshipError) throw relationshipError;
          }
        }
      }

      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
      setUnreadRequests((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error handling follow request:", error);
    }
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

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-700 rounded-full"
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
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-semibold">Follow Requests</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {followRequests.length === 0 ? (
                    <div className="p-4 text-gray-400 text-center">
                      No pending requests
                    </div>
                  ) : (
                    followRequests.map((request, index) => (
                      <div
                        key={`request-${request.id}-${index}`}
                        className="p-4 border-b border-gray-700 hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {(request.sender?.username || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {request.sender?.full_name ||
                                  request.sender?.username ||
                                  "Unknown User"}
                              </p>
                              <p className="text-sm text-gray-400">
                                Wants to follow you
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                handleFollowRequestResponse(request.id, true)
                              }
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleFollowRequestResponse(request.id, false)
                              }
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
