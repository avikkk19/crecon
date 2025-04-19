import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, setupDatabase } from "./SupabaseClient.jsx";
import { useNavigate } from "react-router-dom";
import FriendsList from "./FriendsList";
import { useUser } from "../context/UserContext";

// Constants
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const BUCKET_NAME = "chat-media";

// Part 1: Core Chat Component and State Management
function Chat() {
  const { user, isLoading } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const dropdownRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const channelRef = useRef(null);

  // State management
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [unreadFollowRequests, setUnreadFollowRequests] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [chatContainerRef, setChatContainerRef] = useState(null);

  // Add new state for mobile view
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Add renderFollowButton function
  const renderFollowButton = (user) => {
    // Check if this user is already in our filteredProfiles (meaning we follow them)
    const isFollowing = profiles.some((profile) => profile.id === user.id);

    // Check if there's a pending request in the followRequests state
    const hasPendingRequest = followRequests.some(
      (request) =>
        request.sender_id === session.user.id && request.receiver_id === user.id
    );

    const handleFollow = async () => {
      try {
        if (isFollowing) {
          console.log("Already following this user");
          return;
        }

        if (hasPendingRequest) {
          console.log("Request already sent");
          return;
        }

        await sendFollowRequest(user.id);

        // Update local state to reflect the pending request
        setFollowRequests((prev) => [
          ...prev,
          {
            sender_id: session.user.id,
            receiver_id: user.id,
            status: "pending",
          },
        ]);
      } catch (error) {
        console.error("Failed to send follow request:", error);
      }
    };

    if (isFollowing) {
      return (
        <button
          disabled
          className="px-4 py-2 text-sm bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
        >
          Following
        </button>
      );
    }

    if (hasPendingRequest) {
      return (
        <button
          disabled
          className="px-4 py-2 text-sm bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
        >
          Request Sent
        </button>
      );
    }

    return (
      <button
        onClick={handleFollow}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Follow
      </button>
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Add effect to handle mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Conversation management
  async function getOrCreateConversation(user1Id, user2Id) {
    try {
      // console.log(
      //   `Getting/creating conversation between ${user1Id} and ${user2Id}`
      // );

      // Validate inputs
      if (!user1Id || !user2Id) {
        console.error("Invalid user IDs for conversation", {
          user1Id,
          user2Id,
        });
        return null;
      }

      // Use the RPC function to get or create conversation
      const { data: conversationId, error } = await supabase.rpc(
        "get_or_create_conversation",
        {
          user1_id: user1Id,
          user2_id: user2Id,
        }
      );

      if (error) {
        console.error("Error with conversation:", error);
        return null;
      }

      if (!conversationId) {
        console.error("No conversation ID returned");
        return null;
      }

      // console.log(`Conversation ID: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error("Exception in getOrCreateConversation:", error);
      return null;
    }
  }

  // Authentication and session management
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Initialize database
    setupDatabase();

    return () => subscription.unsubscribe();
  }, []);

  // Check for selected user in sessionStorage (from Blog or Profile)
  useEffect(() => {
    if (session) {
      // Check if we have a selectedUser in sessionStorage (from Blog or Profile)
      const storedUserData = sessionStorage.getItem("selectedUser");
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          // Find if this user exists in our profiles
          const existsInProfiles = profiles.find((p) => p.id === userData.id);

          if (!existsInProfiles) {
            // Add to profiles if not already there
            setProfiles((prevProfiles) => {
              // Make sure we don't add duplicates
              if (!prevProfiles.some((p) => p.id === userData.id)) {
                return [
                  ...prevProfiles,
                  {
                    ...userData,
                    is_online: false, // Default status
                    last_message: "",
                    last_message_time: null,
                  },
                ];
              }
              return prevProfiles;
            });
          }

          // Set as selected user
          setSelectedUser(userData);
          setSelectedChat(userData);

          // Clear from sessionStorage so it doesn't persist on refresh
          sessionStorage.removeItem("selectedUser");

          // If there's also an initial message, prepare it
          const initialMessage = sessionStorage.getItem("initialMessage");
          if (initialMessage) {
            setNewMessage(initialMessage);
            sessionStorage.removeItem("initialMessage");
          }
        } catch (error) {
          console.error("Error parsing stored user data:", error);
        }
      }
    }
  }, [session, profiles]);

  // Fetch follow requests
  const fetchFollowRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("follow_requests")
        .select("*")
        .eq("receiver_id", session.user.id)
        .eq("status", "pending");

      if (error) throw error;

      setFollowRequests(data || []);
      setUnreadFollowRequests(data?.length || 0);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
    }
  };

  // Set up real-time updates for follow requests
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("follow_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follow_requests",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setFollowRequests((prev) => [...prev, payload.new]);
            setUnreadFollowRequests((prev) => prev + 1);
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Set up user presence
  const setupPresence = async () => {
    if (!session) return;

    try {
      // Set initial presence status
      const { error: upsertError } = await supabase
        .from("user_presence")
        .upsert({
          user_id: session.user.id,
          status: "online",
          last_seen: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      // Set up real-time presence updates
      const presenceChannel = supabase.channel("presence");

      // Subscribe to presence changes
      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState();
          // Update profiles with online status
          setProfiles((prevProfiles) =>
            prevProfiles.map((profile) => ({
              ...profile,
              status: state[profile.id]?.[0]?.status || "offline",
            }))
          );
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({
              user_id: session.user.id,
              status: "online",
              last_seen: new Date().toISOString(),
            });
          }
        });

      // Set up interval to update last_seen
      const interval = setInterval(async () => {
        const { error: updateError } = await supabase
          .from("user_presence")
          .update({ last_seen: new Date().toISOString() })
          .eq("user_id", session.user.id);

        if (updateError) console.error("Error updating presence:", updateError);
      }, 30000); // Update every 30 seconds

      // Cleanup function
      return () => {
        clearInterval(interval);
        presenceChannel.unsubscribe();
        // Set offline status when leaving
        supabase
          .from("user_presence")
          .update({ status: "offline", last_seen: new Date().toISOString() })
          .eq("user_id", session.user.id);
      };
    } catch (error) {
      console.error("Error setting up presence:", error);
    }
  };

  // Handle follow request response
  const handleFollowRequestResponse = async (requestId, accepted) => {
    try {
      const { error: updateError } = await supabase
        .from("follow_requests")
        .update({ status: accepted ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (accepted) {
        // Create relationship if accepted
        const { error: relationshipError } = await supabase
          .from("user_relationships")
          .insert({
            user_id: session.user.id,
            following_id: followRequests.find((r) => r.id === requestId)
              ?.sender_id,
          });

        if (relationshipError) throw relationshipError;
      }

      // Update local state
      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
      setUnreadFollowRequests((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error handling follow request:", error);
    }
  };

  // Send follow request
  const sendFollowRequest = async (receiverId) => {
    try {
      // First check if a relationship already exists (they're already following)
      // Use count instead of select to avoid 406 errors
      const { count, error: relationshipError } = await supabase
        .from("user_relationships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("following_id", receiverId);

      if (relationshipError) {
        console.error("Error checking relationship:", relationshipError);
      }

      // If already following, no need to send a request
      if (count && count > 0) {
        console.log("Already following this user");
        return;
      }

      // Check if a follow request already exists
      // Use count instead of select to avoid 406 errors
      const { count: requestCount, error: checkError } = await supabase
        .from("follow_requests")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", session.user.id)
        .eq("receiver_id", receiverId)
        .eq("status", "pending");

      if (checkError) {
        console.error(
          "Error checking for existing follow request:",
          checkError
        );
        throw checkError;
      }

      if (requestCount && requestCount > 0) {
        console.log("Follow request already exists");
        return; // Request already exists, do nothing
      }

      // Check for rejected requests that could be updated
      const { data: rejectedRequest, error: rejectedError } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("sender_id", session.user.id)
        .eq("receiver_id", receiverId)
        .eq("status", "rejected")
        .maybeSingle();

      if (rejectedError && rejectedError.code !== "PGRST116") {
        console.error(
          "Error checking for rejected follow request:",
          rejectedError
        );
      }

      if (rejectedRequest) {
        console.log("Updating rejected request to pending");
        const { error: updateError } = await supabase
          .from("follow_requests")
          .update({ status: "pending" })
          .eq("id", rejectedRequest.id);

        if (updateError) {
          console.error("Error updating follow request:", updateError);
          throw updateError;
        }

        console.log("Updated existing follow request to pending");
        return;
      }

      console.log("Creating new follow request");
      // Create new request if none exists
      const { error: insertError } = await supabase
        .from("follow_requests")
        .insert({
          sender_id: session.user.id,
          receiver_id: receiverId,
          status: "pending",
        });

      if (insertError) {
        console.error("Error creating follow request:", insertError);
        throw insertError;
      }

      console.log("Follow request sent successfully");
    } catch (error) {
      console.error("Error sending follow request:", error);
    }
  };

  // Handle session changes
  useEffect(() => {
    if (session) {
      setupDatabase(); // Initialize database tables
      fetchProfiles();
      fetchFollowRequests();
      setupPresence();
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchProfiles();
    }
  }, [session]);

  // Fetch all user profiles except current user
  async function fetchProfiles() {
    try {
      if (!session || !session.user) {
        console.log("No session, can't fetch profiles");
        return;
      }

      setLoadingFriends(true);
      console.log("Fetching relationships for user:", session.user.id);

      const { data: relationships, error: relationshipsError } = await supabase
        .from("user_relationships")
        .select("following_id")
        .eq("user_id", session.user.id);

      if (relationshipsError) {
        console.error("Error fetching relationships:", relationshipsError);
        setProfiles([]);
        setFriends([]);

        // Make sure we load all users anyway so they can be searched
        fetchAllUsers();
        setLoadingFriends(false);
        return;
      }

      const followedUserIds = relationships
        ? relationships.map((rel) => rel.following_id).filter(Boolean)
        : [];

      if (followedUserIds.length === 0) {
        console.log("User doesn't follow anyone yet");
        setProfiles([]);
        setFriends([]);

        // Make sure we load all users anyway so they can be searched
        fetchAllUsers();
        setLoadingFriends(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followedUserIds);

      if (error) {
        console.error("Error fetching followed profiles:", error);
        setProfiles([]);
        setFriends([]);
        setLoadingFriends(false);
        return;
      }

      console.log(`Fetched ${data?.length || 0} followed user profiles`);
      setProfiles(data || []);

      // Use the new function to enhance profiles with conversation data
      const enhancedFriends = await updateFriendsWithConversationData(
        data || []
      );
      console.log("Setting friends data:", enhancedFriends);
      setFriends(enhancedFriends);
      setLoadingFriends(false);
    } catch (error) {
      console.error("Error in fetchProfiles:", error);
      setProfiles([]);
      setFriends([]);
      setLoadingFriends(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session.user.id);

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  }

  // Filter users based on search term
  const filteredAllUsers = allUsers.filter(
    (user) =>
      user.username?.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(globalSearchTerm.toLowerCase())
  );

  // Filter followed users based on search term
  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.username?.toLowerCase().includes(query.toLowerCase()) ||
      profile.full_name?.toLowerCase().includes(query.toLowerCase())
  );

  // Fetch all users when session changes
  useEffect(() => {
    if (session) {
      fetchAllUsers();
    }
  }, [session]);

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      // second: "2-digit",
    });
  }

  const setupRealTimeUpdates = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (!session || !selectedUser) return;

    // Create a new real-time channel
    const channel = supabase.channel("realtime:messages");
    channelRef.current = channel;

    const pollMessages = async () => {
      if (!pollMessages.retryCount) {
        pollMessages.retryCount = 0;
      }

      try {
        if (!session || !selectedUser) return;

        const conversationId = await getOrCreateConversation(
          session.user.id,
          selectedUser.id
        );

        if (!conversationId) {
          console.error("Failed to get or create conversation");

          // Implement exponential backoff
          pollMessages.retryCount++;
          if (pollMessages.retryCount > 5) {
            console.warn(
              "Too many failed attempts to get conversation, giving up"
            );
            return;
          }

          return;
        }

        // Reset retry count on success
        pollMessages.retryCount = 0;

        // Use RPC function to get messages
        const { data, error } = await supabase.rpc("get_messages", {
          conversation_id_param: conversationId,
        });

        if (error) throw error;

        // Parse and update messages
        const processedMessages = (data || []).map((message) => {
          if (message.content && message.content.includes("[ATTACHMENT]")) {
            const parts = message.content.split("[ATTACHMENT]");
            return {
              ...message,
              content: parts[0].trim(),
              attachment_url: parts[1].trim(),
              is_attachment: true,
            };
          }
          return message;
        });

        setMessages((prevMessages) => {
          const existingMessageIds = new Set(prevMessages.map((m) => m.id));
          const newMessages = processedMessages.filter(
            (message) => !existingMessageIds.has(message.id)
          );
          // Only update if there are actually new messages fetched by polling
          if (newMessages.length > 0) {
            const combined = [...prevMessages, ...newMessages];
            // Re-sort just in case polling fetches something out of order
            combined.sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
            return combined;
          }
          return prevMessages;
        });
      } catch (error) {
        console.error("Error polling messages:", error);

        // Implement exponential backoff
        pollMessages.retryCount = (pollMessages.retryCount || 0) + 1;
        if (pollMessages.retryCount > 5) {
          console.warn("Too many polling errors, giving up");
          return;
        }
      }
    };

    // Initial poll
    pollMessages();

    // Set up interval for continuous polling (every second)
    updateIntervalRef.current = setInterval(pollMessages, 1000);

    // Real-time listener as a backup/complementary mechanism
    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;

          // Check if message belongs to current conversation
          if (session && selectedUser) {
            const conversationId = await getOrCreateConversation(
              session.user.id,
              selectedUser.id
            );

            if (newMessage.conversation_id === conversationId) {
              // Prevent duplicate messages potentially added by polling
              setMessages((prevMessages) => {
                const messageExists = prevMessages.some(
                  (msg) => msg.id === newMessage.id
                );
                if (messageExists) return prevMessages;

                const parsedMessage = { ...newMessage };
                if (
                  parsedMessage.content &&
                  parsedMessage.content.includes("[ATTACHMENT]")
                ) {
                  const parts = parsedMessage.content.split("[ATTACHMENT]");
                  parsedMessage.content = parts[0].trim();
                  parsedMessage.attachment_url = parts[1].trim();
                  parsedMessage.is_attachment = true;
                }

                return [...prevMessages, parsedMessage];
              });
            }
          }
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [session, selectedUser]);

  // Set up real-time updates when session or selected user changes
  useEffect(() => {
    const cleanup = setupRealTimeUpdates();
    return cleanup;
  }, [setupRealTimeUpdates]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Fetch existing messages when selected user changes
  useEffect(() => {
    if (!session || !selectedUser) return;

    // Clear messages when changing selected user
    setMessages([]);

    async function fetchMessages() {
      try {
        const conversationId = await getOrCreateConversation(
          session.user.id,
          selectedUser.id
        );

        if (!conversationId) {
          console.error("Failed to get conversation ID");
          return;
        }

        // Fetch messages using RPC function
        const { data, error } = await supabase.rpc("get_messages", {
          conversation_id_param: conversationId,
        });

        if (error) throw error;

        // Parse messages with attachments
        const messagesWithAttachments =
          data?.map((message) => {
            if (message.content && message.content.includes("[ATTACHMENT]")) {
              const parts = message.content.split("[ATTACHMENT]");
              return {
                ...message,
                content: parts[0].trim(),
                attachment_url: parts[1].trim(),
                is_attachment: true,
              };
            }
            return message;
          }) || [];

        setMessages(messagesWithAttachments);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();
  }, [session, selectedUser]);

  // Upload file to storage
  async function uploadFile(file) {
    // Add defensive check
    if (!file) {
      console.error("No file provided to uploadFile function");
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(
        `File size exceeds the limit of 8MB. Your file is ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB.`
      );
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()
      .toString(36)
      .substring(2, 15)}.${fileExt}`;
    // Include user_id in the file path to link it to the user
    const filePath = `${session.user.id}/${fileName}`;

    setUploading(true);

    try {
      // Upload to chat-media bucket
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL from chat-media bucket
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!data) throw new Error("No public URL returned");
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    if (file.size > MAX_FILE_SIZE) {
      alert(
        `File size exceeds the limit of 8MB. Your file is ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB.`
      );
      // Clear the input if file is too large
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Set preview for all file types
      if (file.type.startsWith("image/")) {
        setFilePreview({
          url: reader.result,
          type: "image",
          name: file.name,
        });
      } else {
        setFilePreview({
          type: "file",
          name: file.name,
        });
      }
    };

    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: "file", name: file.name });
    }
  }

  // Cancel file upload/preview
  function cancelFileUpload() {
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Process URLs in message content
  function processContent(content) {
    if (!content) return "";

    const urlPattern = /(https?:\/\/[^\s<>"'`]+)/g;

    const parts = content.split(urlPattern);

    const result = [];
    let urlIndex = 0;
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // It's a text part
        if (parts[i]) {
          result.push(parts[i]);
        }
      } else {
        const url = parts[i];
        if (url) {
          result.push(
            <a
              key={`url-${urlIndex++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all"
            >
              {url}
            </a>
          );
        }
      }
    }

    return result;
  }

  // Render attachment
  function renderAttachment(url) {
    if (!url) return null;

    // More comprehensive check for image file extensions
    if (/\.(jpeg|jpg|gif|png|webp|bmp|svg|avif|tiff)$/i.test(url)) {
      return (
        <div className="mt-2 max-w-xs overflow-hidden rounded-lg">
          <img
            src={url}
            alt="Attachment"
            className="max-w-full h-auto block"
            onClick={() => window.open(url, "_blank")}
            style={{ cursor: "pointer" }}
          />
        </div>
      );
    } else {
      // Extract filename from URL
      const filename = url.substring(url.lastIndexOf("/") + 1);
      // Try to determine file type from extension
      const extension = filename.split(".").pop().toLowerCase();
      let fileIcon = "document"; // default icon

      // Map common extensions to file types
      if (["pdf"].includes(extension)) fileIcon = "pdf";
      else if (["doc", "docx"].includes(extension)) fileIcon = "word";
      else if (["xls", "xlsx"].includes(extension)) fileIcon = "excel";
      else if (["ppt", "pptx"].includes(extension)) fileIcon = "powerpoint";
      else if (["zip", "rar", "7z", "tar", "gz"].includes(extension))
        fileIcon = "archive";
      else if (["mp3", "wav", "ogg", "flac"].includes(extension))
        fileIcon = "audio";
      else if (["mp4", "avi", "mov", "wmv", "mkv"].includes(extension))
        fileIcon = "video";

      return (
        <div className="mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 bg-gray-700 rounded-lg transition-colors duration-150 hover:bg-gray-600"
            download // Suggest downloading
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span
              className="text-blue-400 hover:underline truncate"
              title={filename}
            >
              {filename || "Download File"}
            </span>
          </a>
        </div>
      );
    }
  }

  // Handle selecting a friend from the friends list
  const handleFriendSelect = (friend) => {
    setSelectedUser(friend);
    setSearchingUsers(false);
    setSelectedChat(friend);

    // Mobile view navigation
    if (isMobileView) {
      setShowSidebar(false);
    }
  };

  // Handle selecting a user from search results
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchingUsers(false);
    setSelectedChat(user);
    setQuery("");
    setSearchResults([]);

    // Mobile view navigation
    if (isMobileView) {
      setShowSidebar(false);
    }
  };

  // Handle file button click
  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle canceling a file upload
  const handleCancelFileUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format timestamp for messages
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    sendMessage(e);
  };

  // Simple login function for testing
  async function handleLogin() {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      alert("Error logging in");
    }
  }

  // Send a new message
  async function sendMessage(e) {
    e.preventDefault();

    if ((!newMessage.trim() && !filePreview) || !selectedUser) return;

    let attachmentUrl = null;
    let messageContent = newMessage.trim();

    // Use selectedFile state instead of fileInputRef.current.files[0]
    if (filePreview && selectedFile) {
      setIsUploading(true);
      try {
        attachmentUrl = await uploadFile(selectedFile);

        if (!attachmentUrl && !messageContent) {
          setIsUploading(false);
          return;
        }

        if (attachmentUrl) {
          messageContent = messageContent
            ? `${messageContent} [ATTACHMENT]${attachmentUrl}`
            : `[ATTACHMENT]${attachmentUrl}`;
        }
      } catch (error) {
        console.error("File upload failed:", error);
        setIsUploading(false);
        return;
      }
    }

    if (attachmentUrl) {
      messageContent = `${messageContent || ""} [ATTACHMENT]${attachmentUrl}`;
    }

    if (!messageContent.trim()) {
      console.warn(
        "Attempted to send an empty message after failed upload or no content."
      );
      setUploading(false);
      return;
    }

    try {
      // Get or create a conversation
      const conversationId = await getOrCreateConversation(
        session.user.id,
        selectedUser.id
      );
      if (!conversationId) {
        alert("Could not establish conversation");
        return;
      }

      // UI Updates First
      const optimisticMessage = {
        id: `temp-${Date.now()}-${Math.random()}`,
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        conversation_id: conversationId,
        content: newMessage.trim(),
        attachment_url: attachmentUrl,
        is_attachment: !!attachmentUrl,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };

      setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

      // Clear input field after sending message
      setNewMessage("");

      // After successful message send, make sure to reset file states
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Use RPC function to insert message
      const { data, error } = await supabase.rpc("insert_message", {
        sender_id_param: session.user.id,
        receiver_id_param: selectedUser.id,
        conversation_id_param: conversationId,
        content_param: messageContent,
      });

      if (error) throw error;

      if (data) {
        const returnedMsg = { ...data[0] }; // Access the first element of the returned array
        if (
          returnedMsg.content &&
          returnedMsg.content.includes("[ATTACHMENT]")
        ) {
          const parts = returnedMsg.content.split("[ATTACHMENT]");
          returnedMsg.content = parts[0].trim();
          returnedMsg.attachment_url = parts[1].trim();
          returnedMsg.is_attachment = true;
        } else {
          returnedMsg.is_attachment = false;
          returnedMsg.attachment_url = null;
        }

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...returnedMsg, is_optimistic: false }
              : msg
          )
        );
      } else {
        console.warn("Message sent but no data returned from Supabase.");
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== optimisticMessage.id)
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => !msg.is_optimistic)
      );
      alert("Error sending message. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Add theme object
  const theme = {
    message: {
      sent: "bg-blue-500 text-white",
      received: "bg-gray-800 text-gray-100",
    },
  };

  // Modify the sidebar search
  const renderSidebarSearch = () => (
    <div className="p-4 border-b border-gray-700">
      <div className="relative">
        <input
          type="text"
          placeholder={
            searchingUsers ? "Search users..." : "Search conversations..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          onClick={() => setSearchingUsers(!searchingUsers)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {searchingUsers ? (
            <span className="text-xs font-medium">View Friends</span>
          ) : (
            <span className="text-xs font-medium">Find Users</span>
          )}
        </button>
      </div>
    </div>
  );

  // Additional function to populate friends with conversation data
  async function updateFriendsWithConversationData(profiles) {
    if (!profiles || profiles.length === 0) return [];

    // Skip attempting to fetch messages for now
    // Just provide the basic friend data with empty message info
    const friendsWithData = profiles.map((profile) => {
      return {
        ...profile,
        last_message: "",
        last_message_time: null,
        is_online: profile.status === "online" || false,
      };
    });

    return friendsWithData;
  }

  // Handle navigating to user profile
  const navigateToProfile = (userId) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)] text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-xl font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-[radial-gradient(ellipse_at_center,_#0f172a_40%,_#042f2e_100%,_#000000_100%)]">
        <div className="bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-2xl text-center text-white max-w-md w-full border border-gray-700">
          <h1 className="text-3xl font-bold mb-6">Welcome to Crecon</h1>
          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium text-lg transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl"
          >
            Sign In (Test Account)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#042f2e_0%,_#000000_80%)] text-white">
      <div className="w-full max-w-8xl mx-auto flex flex-col md:flex-row shadow-2xl rounded-xl overflow-hidden ">
        {/* Left sidebar (friend list) */}
        <div className="md:w-80 bg-black/30 backdrop-blur-sm border-r border-gray-800/50">
          <div className="p-4 border-b border-gray-800/50">
            <h2 className="text-lg font-semibold mb-4">Messages</h2>

            {/* Search box */}
            <div className="relative">
              <input
                type="text"
                placeholder={
                  searchingUsers ? "Search users..." : "Search conversations..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={() => setSearchingUsers(!searchingUsers)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {searchingUsers ? (
                  <span className="text-xs font-medium">View Friends</span>
                ) : (
                  <span className="text-xs font-medium">Find Users</span>
                )}
              </button>
            </div>
          </div>

          {/* Search results or friend list */}
          <div className="overflow-y-auto h-[calc(100vh-180px)]">
            {searchingUsers ? (
              <div className="p-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-2">
                  Search Results
                </h3>
                {query.trim() ? (
                  allUsers.filter(
                    (user) =>
                      user.username
                        ?.toLowerCase()
                        .includes(query.toLowerCase()) ||
                      user.full_name
                        ?.toLowerCase()
                        .includes(query.toLowerCase())
                  ).length === 0 ? (
                    <p className="text-sm text-gray-400 px-2">
                      No users found matching "{query}"
                    </p>
                  ) : (
                    <ul>
                      {allUsers
                        .filter(
                          (user) =>
                            user.username
                              ?.toLowerCase()
                              .includes(query.toLowerCase()) ||
                            user.full_name
                              ?.toLowerCase()
                              .includes(query.toLowerCase())
                        )
                        .map((user) => (
                          <li
                            key={user.id}
                            className="rounded-lg hover:bg-gray-800/50 mb-1"
                          >
                            <button
                              onClick={() => handleUserSelect(user)}
                              className="flex items-center w-full p-2 text-left"
                            >
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3">
                                {user.username
                                  ? user.username[0].toUpperCase()
                                  : "U"}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.full_name
                                    ? user.full_name.length > 10
                                      ? user.full_name.slice(0, 10) + "..."
                                      : user.full_name
                                    : user.username
                                    ? user.username.length > 10
                                      ? user.username.slice(0, 10) + "..."
                                      : user.username
                                    : user.email}
                                </div>
                                {user.username && user.full_name && (
                                  <div className="text-sm text-gray-400">
                                    @
                                    {user.username.length > 8
                                      ? user.username.slice(0, 8) + "..."
                                      : user.username}
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                    </ul>
                  )
                ) : (
                  <p className="text-sm text-gray-400 px-2">
                    Type to search for users
                  </p>
                )}
              </div>
            ) : loadingFriends ? (
              <div className="flex flex-col items-center justify-center h-full py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
                <p className="text-sm text-gray-400">
                  Loading conversations...
                </p>
              </div>
            ) : (
              <FriendsList
                friends={friends}
                selectedChat={selectedChat}
                onFriendSelect={handleFriendSelect}
              />
            )}
          </div>
        </div>

        {/* Right side (chat area) */}
        <div className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm">
          {selectedChat ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-800/50 flex items-center">
                <div
                  className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 cursor-pointer hover:opacity-80"
                  onClick={() => navigateToProfile(selectedChat.id)}
                >
                  {selectedChat.username
                    ? selectedChat.username[0].toUpperCase()
                    : "U"}
                </div>
                <div
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => navigateToProfile(selectedChat.id)}
                >
                  <div className="font-medium">
                    {selectedChat.full_name
                      ? selectedChat.full_name.length > 15
                        ? selectedChat.full_name.slice(0, 15) + "..."
                        : selectedChat.full_name
                      : selectedChat.username
                      ? selectedChat.username.length > 15
                        ? selectedChat.username.slice(0, 15) + "..."
                        : selectedChat.username
                      : selectedChat.email}
                  </div>
                  {selectedChat.username && selectedChat.full_name && (
                    <div className="text-xs text-gray-400">
                      @{selectedChat.username}
                    </div>
                  )}
                  {selectedChat.is_online ? (
                    <div className="text-xs text-green-500 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      Online
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Offline</div>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto p-4"
                style={{ maxHeight: "calc(100vh - 170px)" }}
              >
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <p>Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === session.user.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            message.sender_id === session.user.id
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-gray-700 text-white rounded-tl-none"
                          }`}
                        >
                          {message.is_attachment &&
                            message.attachment_url &&
                            renderAttachment(message.attachment_url)}
                          {message.content && (
                            <div className="mt-1">
                              {processContent(message.content)}
                            </div>
                          )}
                          <div
                            className={`text-xs mt-1 ${
                              message.sender_id === session.user.id
                                ? "text-blue-200"
                                : "text-gray-300"
                            }`}
                          >
                            {formatTimestamp(message.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message input area */}
              <div className="p-3 border-t border-gray-800/50">
                {selectedFile && (
                  <div className="mb-2 p-2 bg-gray-800 rounded-lg flex items-center">
                    <div className="mr-2 flex-shrink-0">
                      {selectedFile.type.startsWith("image/") ? (
                        <img
                          src={filePreview?.url}
                          alt="Preview"
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                    <button
                      onClick={handleCancelFileUpload}
                      className="ml-2 text-gray-400 hover:text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="mb-2 p-2 text-sm bg-red-900/50 text-red-300 rounded-lg">
                    {uploadError}
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center"
                >
                  <button
                    type="button"
                    onClick={handleFileButtonClick}
                    className="p-2 rounded-full text-gray-400 hover:text-white focus:outline-none"
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
                        strokeWidth={1.5}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-2 mx-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={isUploading || (!newMessage && !selectedFile)}
                    className={`p-2 rounded-full ${
                      isUploading || (!newMessage && !selectedFile)
                        ? "text-gray-500"
                        : "text-blue-500 hover:text-blue-400"
                    }`}
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
                        strokeWidth={1.5}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Your Messages</h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Select a chat from the list or search for users to start a new
                conversation.
              </p>
              <button
                onClick={() => setSearchingUsers(true)}
                className="px-4 py-2 bg-gradient-to-bl from-green-900 to-blue-900 rounded-lg hover:opacity-90 transition-opacity"
              >
                Find Users
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
