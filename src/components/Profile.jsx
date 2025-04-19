import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./SupabaseClient.jsx";
import FriendsList from "./FriendsList.jsx";
import { setupDatabase } from "../db/setupDatabase.js";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedChat, setSelectedChat] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [error, setError] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const fileInputRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [initialSetupComplete, setInitialSetupComplete] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    friends: 0,
    following: 0,
    followers: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [updatedBio, setUpdatedBio] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      }
    };

    fetchCurrentUser();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to blogs
    const postsSubscription = supabase
      .channel("public:blogs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blogs",
          filter: `author_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Blog post changed:", payload);
          // Refresh posts when changes happen
          fetchUserPosts(user.id);
        }
      )
      .subscribe();

    // Subscribe to user_relationships (followers/following)
    const connectionsSubscription = supabase
      .channel("public:user_relationships")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_relationships",
          filter: `user_id=eq.${user.id},following_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Connection changed:", payload);
          // Refresh connections when changes happen
          fetchUserConnections(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(connectionsSubscription);
    };
  }, [user]);

  // Initialize database if needed
  const initializeDatabase = async () => {
    setIsSettingUp(true);
    setError(null);
    setSetupStatus(null);

    try {
      console.log("Starting database setup process...");

      // Try to set up the database structure
      const { success, results } = await setupDatabase();
      console.log("Database setup result:", success, results);

      setSetupStatus({
        success,
        results,
        timestamp: new Date().toISOString(),
      });

      if (success && user) {
        // Refresh data
        await fetchProfileData();

        // Show success message
        setError(null);
      } else {
        // Analyze failure reasons
        const failedTables = [];
        for (const [table, result] of Object.entries(results)) {
          if (!result.success) {
            failedTables.push(table);
          }
        }

        if (failedTables.length > 0) {
          setError(
            `Database setup partially failed. Issues with: ${failedTables.join(
              ", "
            )}. You may not have sufficient database permissions.`
          );
        } else {
          setError(
            "Database setup failed for unknown reasons. Please contact support."
          );
        }
      }
    } catch (error) {
      console.error("Error setting up database:", error);
      setError(
        `Failed to set up database: ${error.message}. You may not have sufficient database permissions.`
      );
      setSetupStatus({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  // Fetch user posts
  const fetchUserPosts = async (userId) => {
    try {
      console.log(`Fetching blog posts for user: ${userId}`);

      // Using the same approach as Blog.jsx
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching blog posts:", error);
        return;
      }

      console.log(`Found ${data?.length || 0} blog posts`);

      if (data) {
        setPosts(data);
        setStats((prev) => ({ ...prev, posts: data.length }));
      }
    } catch (error) {
      console.error("Exception fetching blog posts:", error);
      setPosts([]);
      setStats((prev) => ({ ...prev, posts: 0 }));
    }
  };

  // Fetch user connections (following/followers)
  const fetchUserConnections = async (userId) => {
    try {
      console.log(`Fetching connections for user: ${userId}`);

      // Get connections where user is following someone (user is follower)
      const { data: followingData, error: followingError } = await supabase
        .from("user_relationships")
        .select("following_id")
        .eq("user_id", userId);

      if (followingError) {
        console.error("Error fetching following data:", followingError);
        return;
      }

      console.log(`Found ${followingData?.length || 0} following connections`);

      // Get connections where user is followed by someone (user is being followed)
      const { data: followerData, error: followerError } = await supabase
        .from("user_relationships")
        .select("user_id")
        .eq("following_id", userId);

      if (followerError) {
        console.error("Error fetching follower data:", followerError);
        return;
      }

      console.log(`Found ${followerData?.length || 0} follower connections`);

      // Initialize to empty arrays
      setFollowing([]);
      setFollowers([]);
      setFriends([]);
      setStats((prev) => ({
        ...prev,
        following: 0,
        friends: 0,
        followers: 0,
      }));

      // Get profiles for following (people the user follows)
      if (followingData && followingData.length > 0) {
        const followingIds = followingData
          .map((f) => f.following_id)
          .filter((id) => id !== userId);
        console.log("Following IDs:", followingIds);

        if (followingIds.length > 0) {
          const { data: followingProfiles, error: profilesError } =
            await supabase
              .from("profiles")
              .select("id, username, email, avatar_url, is_online")
              .in("id", followingIds);

          if (profilesError) {
            console.error("Error fetching following profiles:", profilesError);
            return;
          }

          console.log(
            `Found ${followingProfiles?.length || 0} following profiles`
          );

          if (followingProfiles) {
            setFollowing(followingProfiles);
            setFriends(followingProfiles);
            setStats((prev) => ({
              ...prev,
              following: followingProfiles.length,
              friends: followingProfiles.length,
            }));
          }
        }
      }

      // Get profiles for followers (people who follow the user)
      if (followerData && followerData.length > 0) {
        const followerIds = followerData
          .map((f) => f.user_id)
          .filter((id) => id !== userId);
        console.log("Follower IDs:", followerIds);

        if (followerIds.length > 0) {
          const { data: followerProfiles, error: profilesError } =
            await supabase
              .from("profiles")
              .select("id, username, email, avatar_url, is_online")
              .in("id", followerIds);

          if (profilesError) {
            console.error("Error fetching follower profiles:", profilesError);
            return;
          }

          console.log(
            `Found ${followerProfiles?.length || 0} follower profiles`
          );

          if (followerProfiles) {
            setFollowers(followerProfiles);
            setStats((prev) => ({
              ...prev,
              followers: followerProfiles.length,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Exception fetching connections:", error);
    }
  };

  // Fetch profile data
  const fetchProfileData = async () => {
    if (initialSetupComplete) return; // Skip if already done
    setLoading(true);
    setError(null);

    try {
      // If no userId provided, use current user's profile
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      // Fetch profile information
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", targetUserId)
          .single();

        if (profileError) {
          // If profile doesn't exist, create one
          if (
            profileError.code === "PGRST116" &&
            user &&
            user.id === targetUserId
          ) {
            // Create profile for current user
            try {
              const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: user.id,
                  username: user.email?.split("@")[0],
                  email: user.email,
                  created_at: new Date(),
                  updated_at: new Date(),
                })
                .select("*")
                .single();

              if (createError) throw createError;
              if (newProfile) setProfile(newProfile);
            } catch (createProfileError) {
              console.error("Error creating profile:", createProfileError);
            }
          } else {
            console.error("Error fetching profile:", profileError);
          }
        } else if (profileData) {
          setProfile(profileData);
          setAvatarUrl(profileData.avatar_url);
        }
      } catch (profileError) {
        console.error("Error in profile operation:", profileError);
      }

      // Fetch friend status if viewing someone else's profile
      if (user && targetUserId !== user.id) {
        try {
          const { data: connectionData } = await supabase
            .from("user_relationships")
            .select("*")
            .eq("user_id", user.id)
            .eq("following_id", targetUserId)
            .single();

          setIsFriend(!!connectionData);

          if (!connectionData) {
            // Check for pending request
            const { data: requestData } = await supabase
              .from("connection_requests")
              .select("*")
              .eq("sender_id", user.id)
              .eq("receiver_id", targetUserId)
              .eq("status", "pending")
              .single();

            setIsPending(!!requestData);
          }
        } catch (error) {
          // Most likely no connection exists
          setIsFriend(false);
          setIsPending(false);
        }
      }

      // Fetch blog posts
      await fetchUserPosts(targetUserId);

      // Fetch connections
      await fetchUserConnections(targetUserId);

      // Mark setup as complete to avoid repeated attempts
      setInitialSetupComplete(true);
    } catch (error) {
      console.error("Error in profile data setup:", error);
      setError("Some profile features may be limited. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user || userId) {
      fetchProfileData();
    }
  }, [user, userId, initialSetupComplete]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      setError(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      // Instead of uploading to Supabase Storage, use a data URL approach for simplicity
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result;

          // Update local state
          setAvatarUrl(dataUrl);

          // Try to update in database if possible
          try {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                avatar_url: dataUrl,
                updated_at: new Date(),
              })
              .eq("id", user.id);

            if (updateError) throw updateError;

            // Update local profile state
            setProfile((prev) => ({
              ...prev,
              avatar_url: dataUrl,
            }));
          } catch (dbError) {
            console.error("Unable to save avatar to database:", dbError);
            // Still keep the avatar in local state
          }

          setUploading(false);
        } catch (error) {
          console.error("Error processing image:", error);
          setError("Failed to process image.");
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read image file.");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error handling avatar:", error);
      setError("Failed to upload avatar. Please try again.");
      setUploading(false);
    }
  };

  const handleImageClick = () => {
    // Only allow the current user to update their own profile picture
    if (user && profile && user.id === profile.id) {
      fileInputRef.current?.click();
    }
  };

  const handleFriendRequest = async () => {
    if (!user || !profile) return;

    try {
      if (isFriend) {
        // Unfollow logic
        try {
          const { error } = await supabase
            .from("user_relationships")
            .delete()
            .eq("user_id", user.id)
            .eq("following_id", profile.id);

          if (error) throw error;
          setIsFriend(false);
        } catch (error) {
          console.error("Error unfollowing:", error);
          setError("Unable to unfollow. Please try again.");
        }
      } else if (isPending) {
        // Cancel request logic
        try {
          const { error } = await supabase
            .from("connection_requests")
            .delete()
            .eq("sender_id", user.id)
            .eq("receiver_id", profile.id);

          if (error) throw error;
          setIsPending(false);
        } catch (error) {
          console.error("Error canceling request:", error);
          setError("Unable to cancel request. Please try again.");
        }
      } else {
        // Try direct connection first
        try {
          const { error } = await supabase.from("user_relationships").insert({
            user_id: user.id,
            following_id: profile.id,
            created_at: new Date(),
          });

          if (error) throw error;
          setIsFriend(true);
        } catch (directError) {
          // If direct connection fails, try request
          try {
            const { error } = await supabase
              .from("connection_requests")
              .insert({
                sender_id: user.id,
                receiver_id: profile.id,
                status: "pending",
                created_at: new Date(),
              });

            if (error) throw error;
            setIsPending(true);
          } catch (requestError) {
            console.error("Error sending friend request:", requestError);
            setError("Unable to send friend request. Please try again.");
          }
        }
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      setError("Unable to process your request. Please try again.");
    }
  };

  const handleFriendSelect = (friend) => {
    setSelectedChat(friend);
    navigate(`/chat/${friend.id}`);
  };

  // Start direct chat with user
  const startDirectChat = (userId, username, fullName) => {
    if (!userId) return;

    // Store user data for chat component to use
    const userData = {
      id: userId,
      username: username || "User",
      full_name: fullName,
      avatar_url: profile?.avatar_url || null,
      email: profile?.email || null,
    };

    // Set in session storage for the Chat component to pick up
    sessionStorage.setItem("selectedUser", JSON.stringify(userData));

    // Navigate to chat with this user
    navigate(`/chat/${userId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Function to update user profile
  const updateProfile = async () => {
    try {
      if (!user || !profile) {
        setError("You need to be logged in to update your profile");
        return;
      }

      setUploading(true); // Reuse the uploading state for any update

      console.log("Updating profile with bio:", updatedBio);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          bio: updatedBio,
          updated_at: new Date(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        setError(`Error updating profile: ${updateError.message}`);
        setUploading(false);
        return;
      }

      console.log("Profile updated successfully!");

      // Update local state
      setProfile((prev) => ({
        ...prev,
        bio: updatedBio,
      }));

      setIsEditing(false);
      setUploading(false);
    } catch (error) {
      console.error("Exception updating profile:", error);
      setError(`Exception updating profile: ${error.message}`);
      setUploading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    // Use debounce to avoid too many requests
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, full_name, email, avatar_url")
          .or(
            `username.ilike.%${value}%, full_name.ilike.%${value}%, email.ilike.%${value}%`
          )
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching for users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const navigateToUserProfile = (userId) => {
    navigate(`/profile/${userId}`);
    setShowSearchResults(false);
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-pulse bg-black">
        <div className="flex flex-col md:flex-row items-center mb-8 bg-black">
          <div className="w-32 h-32 bg-black rounded-full mb-4 md:mb-0 md:mr-8"></div>
          <div className="flex-1">
            <div className="h-8 bg-gray-700 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-64 mb-6"></div>
            <div className="h-10 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="h-10 bg-gray-700 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 h-48"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 bg-black">
      {/* Search bar */}
      <div ref={searchRef} className="mb-6 relative bg-black">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for users..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Search results dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="px-4 py-2 cursor-pointer hover:bg-gray-700 flex items-center"
                onClick={() => navigateToUserProfile(result.id)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mr-2">
                  {result.username ? result.username[0].toUpperCase() : "U"}
                </div>
                <div>
                  <div className="font-medium">
                    {result.full_name || result.username || result.email}
                  </div>
                  {result.username && result.full_name && (
                    <div className="text-xs text-gray-400">
                      @{result.username}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSearchResults &&
          searchTerm &&
          searchResults.length === 0 &&
          !isSearching && (
            <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 text-center">
              <p className="text-gray-400">
                No users found matching "{searchTerm}"
              </p>
            </div>
          )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {posts.length === 0 &&
        following.length === 0 &&
        followers.length === 0 && (
          <div className="bg-blue-900/30 border border-blue-700 text-blue-100 px-4 py-3 rounded mb-6">
            <p className="font-medium mb-2">
              Database tables may not be set up. Initialize your database to
              enable all features.
            </p>

            {setupStatus && (
              <div className="mb-3 text-sm bg-black">
                <p>
                  Last setup attempt:{" "}
                  {new Date(setupStatus.timestamp).toLocaleString()}
                </p>
                <p>
                  Status: {setupStatus.success ? "✅ Success" : "❌ Failed"}
                </p>
                {setupStatus.results && (
                  <div className="mt-2 text-xs space-y-1 bg-black">
                    <p>Tables:</p>
                    <ul className="list-disc pl-5">
                      {Object.entries(setupStatus.results).map(
                        ([table, result]) => (
                          <li key={table}>
                            {table}:{" "}
                            {result.success ? "✅ Success" : "❌ Failed"}
                            {result.error && (
                              <span className="text-red-300">
                                {" "}
                                - {result.error.message || "Unknown error"}
                              </span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4 bg-black">
              <button
                onClick={initializeDatabase}
                disabled={isSettingUp}
                className="mt-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white font-medium disabled:opacity-50 flex items-center"
              >
                {isSettingUp ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Setting up database...
                  </>
                ) : (
                  <>Initialize Database</>
                )}
              </button>

              {setupStatus && !setupStatus.success && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        )}

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center mb-8 bg-black">
        {/* Profile Picture */}
        <div
          className={`w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold mb-4 md:mb-0 md:mr-8 overflow-hidden relative ${
            user && profile && user.id === profile.id
              ? "cursor-pointer group"
              : ""
          }`}
          onClick={handleImageClick}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : profile?.username ? (
            profile.username[0].toUpperCase()
          ) : (
            "U"
          )}

          {/* Overlay for own profile */}
          {user && profile && user.id === profile.id && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="ml-2 text-sm font-medium">
                {uploading ? "Uploading..." : "Change Photo"}
              </span>
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left bg-black">
          <h1 className="text-2xl font-bold text-white mb-1">
            {profile?.username || profile?.email?.split("@")[0] || "User"}
          </h1>
          <p className="text-gray-400 mb-4">{profile?.email}</p>
          <p className="text-gray-300 mb-6">{profile?.bio || "No bio yet"}</p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-start bg-black">
            {user && profile && user.id !== profile.id ? (
              <>
                <button
                  onClick={handleFriendRequest}
                  className={`px-4 py-2 rounded-full font-medium text-sm ${
                    isFriend
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : isPending
                      ? "bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-200"
                      : "bg-blue-700 hover:bg-blue-600 text-white"
                  }`}
                >
                  {isFriend
                    ? "Unfollow"
                    : isPending
                    ? "Request Sent"
                    : "Follow"}
                </button>
                {isFriend && (
                  <button
                    onClick={() =>
                      startDirectChat(
                        profile.id,
                        profile.username,
                        profile.full_name
                      )
                    }
                    className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-full font-medium text-sm"
                  >
                    Message
                  </button>
                )}
              </>
            ) : isEditing ? (
              <div className="space-y-3 bg-black">
                <textarea
                  value={updatedBio}
                  onChange={(e) => setUpdatedBio(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white"
                  placeholder="Write something about yourself..."
                  rows={3}
                  disabled={uploading}
                ></textarea>
                <div className="flex space-x-2 bg-black">
                  <button
                    onClick={updateProfile}
                    disabled={uploading}
                    className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-full font-medium text-sm disabled:opacity-50"
                  >
                    {uploading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={uploading}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full font-medium text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setUpdatedBio(profile.bio || "");
                  setIsEditing(true);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full font-medium text-sm"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700/30 bg-black">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.posts}</p>
          <p className="text-sm text-gray-400">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.friends}</p>
          <p className="text-sm text-gray-400">Following</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats.followers}</p>
          <p className="text-sm text-gray-400">Followers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700/50 mb-6 bg-black">
        <button
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "posts"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Blog Posts
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "friends"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setActiveTab("followers")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "followers"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Followers
        </button>
      </div>

      {/* Tab Content */}
      <div className="mb-8 bg-black">
        {activeTab === "posts" && (
          <div className="space-y-4 bg-black">
            {posts.length === 0 ? (
              <div className="text-center py-8 bg-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-lg text-gray-400">No blog posts yet</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30"
                >
                  <h3 className="text-xl font-medium text-white mb-2">
                    {post.title}
                  </h3>
                  <div className="text-sm text-gray-400 mb-3">
                    {formatDate(post.created_at)}
                  </div>
                  <p className="text-gray-300 mb-4 line-clamp-3">
                    {post.content?.substring(0, 150)}
                    {post.content?.length > 150 ? "..." : ""}
                  </p>
                  <div className="flex justify-end">
                    <a
                      href={`/blog`}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Read more
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "friends" && (
          <div className="bg-gray-800/30 rounded-lg overflow-hidden">
            {following.length === 0 ? (
              <div className="text-center py-8 bg-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-lg text-gray-400">
                  Not following anyone yet
                </p>
              </div>
            ) : (
              <FriendsList
                friends={following}
                selectedChat={selectedChat}
                onFriendSelect={handleFriendSelect}
              />
            )}
          </div>
        )}

        {activeTab === "followers" && (
          <div className="bg-gray-800/30 rounded-lg overflow-hidden">
            {followers.length === 0 ? (
              <div className="text-center py-8 bg-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <p className="text-lg text-gray-400">No followers yet</p>
              </div>
            ) : (
              <FriendsList
                friends={followers}
                selectedChat={selectedChat}
                onFriendSelect={handleFriendSelect}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
