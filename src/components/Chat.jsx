import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, setupDatabase } from "./SupabaseClient.jsx";

// Constants
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const BUCKET_NAME = "chat-media";

// Part 1: Core Chat Component and State Management
function Chat() {
  // State management
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [unreadFollowRequests, setUnreadFollowRequests] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const chatContainerRef = useRef(null);
  const dropdownRef = useRef(null);

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
      console.log(
        `Getting/creating conversation between ${user1Id} and ${user2Id}`
      );

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

      console.log(`Conversation ID: ${conversationId}`);
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
      // Don't rethrow the error to prevent UI disruption
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

      console.log("Fetching relationships for user:", session.user.id);

      // First get the list of users that the current user follows
      const { data: relationships, error: relationshipsError } = await supabase
        .from("user_relationships")
        .select("following_id")
        .eq("user_id", session.user.id);

      if (relationshipsError) {
        console.error("Error fetching relationships:", relationshipsError);
        // Continue with empty relationships if there's an error
        setProfiles([]);
        return;
      }

      // Extract the IDs of followed users, safely handling null/undefined
      const followedUserIds = relationships
        ? relationships.map((rel) => rel.following_id).filter(Boolean)
        : [];

      // If the user doesn't follow anyone yet, return empty profiles
      if (followedUserIds.length === 0) {
        console.log("User doesn't follow anyone yet");
        setProfiles([]);
        return;
      }

      // Then fetch only the profiles of followed users
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followedUserIds);

      if (error) {
        console.error("Error fetching followed profiles:", error);
        setProfiles([]);
        return;
      }

      console.log(`Fetched ${data?.length || 0} followed user profiles`);
      setProfiles(data || []);
    } catch (error) {
      console.error("Error in fetchProfiles:", error);
      setProfiles([]);
    }
  }

  // Fetch all users for global search
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
      profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          metadata: {
            user_id: session.user.id,
          },
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
      // Only set preview for images
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

    // Robust check for image file extensions
    if (/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(url)) {
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
      const filename = url.substring(url.lastIndexOf("/") + 1);
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

  // Send a new message
  async function sendMessage(e) {
    e.preventDefault();

    if ((!newMessage.trim() && !filePreview) || !selectedUser) return;

    let attachmentUrl = null;
    let messageContent = newMessage.trim();
    const fileToSend = fileInputRef.current?.files[0];

    if (filePreview && fileToSend) {
      attachmentUrl = await uploadFile(fileToSend);

      if (!attachmentUrl && !messageContent) {
        setUploading(false);
        return;
      }

      if (attachmentUrl) {
        messageContent = `${messageContent || ""} [ATTACHMENT]${attachmentUrl}`;
      }
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
      setNewMessage("");
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

  // Add global search UI
  const renderGlobalSearch = () => (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search all users..."
          value={globalSearchTerm}
          onChange={(e) => setGlobalSearchTerm(e.target.value)}
          onFocus={() => setShowGlobalSearch(true)}
          className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 absolute left-3 top-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      {showGlobalSearch && globalSearchTerm && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {filteredAllUsers.length === 0 ? (
            <div className="p-4 text-gray-400">No users found</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredAllUsers.map((user, index) => (
                <div
                  key={`global-user-${user.id}-${index}`}
                  className="p-4 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-700 mr-3 overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username || user.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-300">
                          {(user.username || user.full_name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {user.username || user.full_name || "Anonymous User"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.status === "online" ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                  {renderFollowButton(user)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Modify the sidebar search
  const renderSidebarSearch = () => (
    <div className="p-4 border-b border-gray-700">
      <div className="relative">
        <input
          type="text"
          placeholder="Search followed users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-700 text-gray-100 px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 absolute left-3 top-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );

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
    <div className="bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)] h-screen w-screen overflow-hidden">
      {renderGlobalSearch()}
      <div className="flex h-full text-gray-100 relative backdrop-blur-3xl">
        {/* Mobile Header */}
        {isMobileView && selectedUser && (
          <div className="fixed top-0 left-0 right-0 z-10 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-3 flex items-center">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center ml-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-2 overflow-hidden">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.username || selectedUser.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-300">
                    {(selectedUser.username || selectedUser.full_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="font-medium text-sm text-white">
                  {selectedUser.username ||
                    selectedUser.full_name ||
                    "Anonymous User"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div
          className={`${
            isMobileView
              ? "fixed inset-0 z-20 transform transition-transform duration-300 ease-in-out"
              : "w-1/4"
          } ${
            showSidebar ? "translate-x-0" : "-translate-x-full"
          } bg-gray-800/50 backdrop-blur-sm border-r border-gray-700 flex flex-col`}
        >
          {/* User Profile */}
          <div className="p-4 border-b border-gray-700 mt-22">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
                {session?.user?.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium text-gray-300">
                    {(session?.user?.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-grow">
                <div className="font-medium text-white">
                  {session?.user?.user_metadata?.full_name ||
                    session?.user?.email}
                </div>
                <div className="text-sm text-gray-400"></div>
              </div>
              {isMobileView && (
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>

          {renderSidebarSearch()}

          {/* Conversations List */}
          <div className="flex-grow overflow-y-auto">
            {filteredProfiles.map((profile, index) => (
              <div
                key={`profile-${profile.id}-${index}`}
                className={`p-4 flex items-center cursor-pointer transition-colors ${
                  selectedUser?.id === profile.id
                    ? "bg-gray-700/50"
                    : "hover:bg-gray-700/50"
                }`}
                onClick={() => {
                  setSelectedUser(profile);
                  if (isMobileView) {
                    setShowSidebar(false);
                  }
                }}
              >
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username || profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-gray-300">
                      {(profile.username || profile.full_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="font-medium text-white">
                    {profile.username || profile.full_name || "Anonymous User"}
                  </div>
                  <div className="text-sm text-gray-400">
                    {profile.status === "online" ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className={`flex-1 flex flex-col ${
            isMobileView ? "w-full" : ""
          } md: mt-18`}
        >
          {selectedUser ? (
            <>
              {!isMobileView && (
                <div className="p-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
                      {selectedUser.avatar_url ? (
                        <img
                          src={selectedUser.avatar_url}
                          alt={selectedUser.username || selectedUser.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium text-gray-300">
                          {(
                            selectedUser.username ||
                            selectedUser.full_name ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {selectedUser.username ||
                          selectedUser.full_name ||
                          "Anonymous User"}
                      </div>
                      <div className="text-sm text-gray-400">
                        {selectedUser.status === "online" ? (
                          <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                            ""
                          </span>
                        ) : (
                          ""
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className={`flex-grow overflow-y-auto p-4 space-y-4 ${
                  isMobileView ? "mt-14 mb-20" : ""
                }`}
              >
                {messages.map((message, index) => {
                  const isMyMessage = message.sender_id === session.user.id;
                  return (
                    <div
                      key={`message-${message.id}-${index}`}
                      className={`flex ${
                        isMyMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          isMyMessage
                            ? `${theme.message.sent} rounded-tr-none`
                            : `${theme.message.received} rounded-tl-none`
                        }`}
                      >
                        {message.content}
                        {message.is_attachment &&
                          renderAttachment(message.attachment_url)}
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div
                className={`p-4 border-t border-gray-700 bg-gray-800/50 backdrop-blur-sm ${
                  isMobileView ? "fixed bottom-0 left-0 right-0" : ""
                }`}
              >
                {filePreview && (
                  <div className="mb-4 p-3 bg-gray-700/50 rounded-lg flex items-center">
                    <div className="flex-grow">
                      <div className="text-sm font-medium text-white">
                        {filePreview.name}
                      </div>
                      <div className="text-xs text-gray-400">Ready to send</div>
                    </div>
                    <button
                      onClick={cancelFileUpload}
                      className="text-gray-300 hover:text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                    disabled={uploading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow mx-4 bg-gray-700 text-gray-100 px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-600"
                    disabled={uploading}
                  />
                  <button
                    type="submit"
                    disabled={uploading || (!newMessage.trim() && !filePreview)}
                    className={`p-2 rounded-full ${
                      !newMessage.trim() && !filePreview
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    } transition-colors`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>

                {isMobileView ? (
                  ""
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-2 text-zinc-200">
                      Welcome to Crecon
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Select a conversation to start chatting
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
