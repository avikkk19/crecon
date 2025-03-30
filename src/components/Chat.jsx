import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./SupabaseClient.jsx";

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
  const [darkMode, setDarkMode] = useState(true);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Conversation management
  async function getOrCreateConversation(user1Id, user2Id) {
    try {
      // Check if conversation exists
      const { data: existingConversations, error: fetchError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .in("user_id", [user1Id, user2Id])
        .order("conversation_id");

      if (fetchError) throw fetchError;

      // Group by conversation_id and find one with both users
      if (existingConversations.length > 0) {
        const conversationCounts = existingConversations.reduce((acc, curr) => {
          acc[curr.conversation_id] = (acc[curr.conversation_id] || 0) + 1;
          return acc;
        }, {});

        for (const [convId, count] of Object.entries(conversationCounts)) {
          if (count >= 2) return convId; // Found conversation with both users
        }
      }

      // Create new conversation if not found
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({})
        .select();

      if (createError) throw createError;

      // Add participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation[0].id, user_id: user1Id },
          { conversation_id: newConversation[0].id, user_id: user2Id },
        ]);

      if (participantsError) throw participantsError;

      return newConversation[0].id;
    } catch (error) {
      console.error("Error with conversation:", error);
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

    return () => subscription.unsubscribe();
  }, []);

  // Load profiles once authenticated
  useEffect(() => {
    if (session) {
      fetchProfiles();
    }
  }, [session]);

  // Fetch all user profiles except current user
  async function fetchProfiles() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session.user.id);

      if (error) throw error;

      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  }

  // Scroll to the bottom of the messages
  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Format timestamp
  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

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

  // Part 2: Message Management, Real-time Updates, and File Handling
  // Establish real-time connection with frequent polling
  const setupRealTimeUpdates = useCallback(() => {
    // Clear any existing interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    // Disconnect any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (!session || !selectedUser) return;

    // Create a new real-time channel
    const channel = supabase.channel("realtime:messages");
    channelRef.current = channel;

    // Polling function to fetch latest messages
    const pollMessages = async () => {
      try {
        const conversationId = await getOrCreateConversation(
          session.user.id,
          selectedUser.id
        );

        if (!conversationId) {
          console.error("Failed to get or create conversation");
          return;
        }

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

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

        // Update messages state, avoiding duplicates
        setMessages((prevMessages) => {
          const existingMessageIds = new Set(prevMessages.map((m) => m.id));
          const newMessages = processedMessages.filter(
            (message) => !existingMessageIds.has(message.id)
          );
          return newMessages.length > 0
            ? [...prevMessages, ...newMessages]
            : prevMessages;
        });
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    };

    // Initial poll
    pollMessages();

    // Set up interval for continuous polling (every second)
    updateIntervalRef.current = setInterval(pollMessages, 1000);

    // Real-time listener as a backup
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
              // Prevent duplicate messages
              setMessages((prevMessages) => {
                const messageExists = prevMessages.some(
                  (msg) => msg.id === newMessage.id
                );
                if (messageExists) return prevMessages;

                // Parse attachment if present
                if (
                  newMessage.content &&
                  newMessage.content.includes("[ATTACHMENT]")
                ) {
                  const parts = newMessage.content.split("[ATTACHMENT]");
                  newMessage.content = parts[0].trim();
                  newMessage.attachment_url = parts[1].trim();
                  newMessage.is_attachment = true;
                }

                return [...prevMessages, newMessage];
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

        // Fetch messages for this conversation
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

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
        // scrollToBottom();
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();
  }, [session, selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // scrollToBottom();
    }
  }, [messages]);

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
            user_id: session.user.id, // Add user_id as metadata
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
      setFilePreview(null);
    }
  }

  // Part 3: UI Components, Message Rendering and Event Handlers
  // Handle file selection
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
      reader.readAsText(file);
    }
  }

  // Cancel file upload
  function cancelFileUpload() {
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Process URLs in message content
  function processContent(content) {
    if (!content) return "";

    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    // Split the content by URL matches
    const parts = content.split(urlPattern);

    // Find all URLs in the content
    const urls = content.match(urlPattern) || [];

    // Merge parts and URLs
    const result = [];
    parts.forEach((part, index) => {
      result.push(part);
      if (urls[index]) {
        result.push(
          <a
            key={index}
            href={urls[index]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {urls[index]}
          </a>
        );
      }
    });

    return result;
  }

  // Render attachment
  function renderAttachment(url) {
    if (!url) return null;

    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      return (
        <div className="mt-2 max-w-xs overflow-hidden rounded-lg">
          <img
            src={url}
            alt="Attachment"
            className="max-w-full h-auto"
            onClick={() => window.open(url, "_blank")}
            style={{ cursor: "pointer" }}
          />
        </div>
      );
    } else {
      return (
        <div className="mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-2 bg-gray-800 rounded-lg transition-colors duration-150 hover:bg-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-gray-400"
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
            <span className="text-blue-400 hover:underline">Download File</span>
          </a>
        </div>
      );
    }
  }

  // Send a new message
  async function sendMessage(e) {
    e.preventDefault();

    if ((!newMessage.trim() && !filePreview) || !selectedUser) return;

    try {
      let attachmentUrl = null;
      let messageContent = newMessage.trim();

      // Handle file upload if there's a preview
      if (
        filePreview &&
        fileInputRef.current &&
        fileInputRef.current.files[0]
      ) {
        const file = fileInputRef.current.files[0];
        attachmentUrl = await uploadFile(file);

        // If upload failed and no text message, don't proceed
        if (!attachmentUrl && !messageContent) return;

        // If we have an attachment, embed it in the message content
        if (attachmentUrl) {
          messageContent = `${
            messageContent || ""
          } [ATTACHMENT]${attachmentUrl}`;
        }
      }

      // Get or create a conversation
      const conversationId = await getOrCreateConversation(
        session.user.id,
        selectedUser.id
      );
      if (!conversationId) {
        alert("Could not create conversation");
        return;
      }

      // Optimistically add message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
        conversation_id: conversationId,
        content: messageContent,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };

      // Extract attachment URL for UI display
      if (attachmentUrl) {
        optimisticMessage.content = newMessage.trim();
        optimisticMessage.attachment_url = attachmentUrl;
        optimisticMessage.is_attachment = true;
      }

      setMessages((messages) => [...messages, optimisticMessage]);
      // scrollToBottom();
      setNewMessage("");
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Send message to database
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: selectedUser.id,
          conversation_id: conversationId,
          content: messageContent,
        })
        .select();

      if (error) throw error;

      // Parse the returned message to extract attachment
      if (data && data[0]) {
        const returnedMsg = { ...data[0] };
        if (
          returnedMsg.content &&
          returnedMsg.content.includes("[ATTACHMENT]")
        ) {
          const parts = returnedMsg.content.split("[ATTACHMENT]");
          returnedMsg.content = parts[0].trim();
          returnedMsg.attachment_url = parts[1].trim();
          returnedMsg.is_attachment = true;
        }

        // Replace optimistic message with real one
        setMessages((messages) =>
          messages.map((msg) =>
            msg.id === optimisticMessage.id ? returnedMsg : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((messages) => messages.filter((msg) => !msg.is_optimistic));
      alert("Error sending message");
    }
  }

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const themeClass = "bg-black text-gray-100"; // Black background with light text

  const sidebarClass = "bg-black border-gray-700"; // Sidebar with black background

  const messageInputClass = "bg-black border-gray-600 focus:ring-white-500"; // Message input with dark gray background

  const buttonClass = "bg-green-600 hover:bg-indigo-700"; // Buttons with indigo color

  const myMessageClass = "bg-gray-800 text-white"; // Messages sent by the user

  const otherMessageClass = "bg-zinc-900 text-gray-100"; // Messages received from others

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
          <p className="text-xl font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-indigo-900 to-purple-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center text-white max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6">Welcome to ChatterHub</h1>
          <p className="mb-8 text-gray-300">Please sign in to continue</p>
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
    <div
      className={`flex h-screen ${themeClass} transition-colors duration-200 mt-18`}
    >
      {/* Users sidebar */}
      <div
        className={`w-1/4 ${sidebarClass} border-r overflow-y-auto transition-colors duration-200`}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">loged in as</h2>
            <div className="mt-1 text-sm opacity-75">
              <p>{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
        
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-700 transition-colors"
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

        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg ${messageInputClass} py-2 pl-10 pr-4 focus:outline-none focus:ring-2 transition-colors duration-200`}
            />
            <div className="absolute left-3 top-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
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
        </div>

        <div>
          {profiles.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              No contacts found
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {profiles
                .filter((profile) =>
                  profile.username
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((profile) => (
                  <div
                    key={profile.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                      selectedUser?.id === profile.id
                        ? darkMode
                          ? "bg-gray-900"
                          : "bg-indigo-50"
                        : "hover:bg-opacity-10 hover:bg-gray-500"
                    }`}
                    onClick={() => setSelectedUser(profile)}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white mr-3 ${
                        darkMode
                          ? "bg-gray-600"
                          : "bg-indigo-100 text-indigo-500"
                      }`}
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium">
                          {(profile.username || profile.full_name || "User")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {profile.username ||
                          profile.full_name ||
                          "Anonymous User"}
                      </div>
                      {profile.username && profile.full_name && (
                        <div className="text-sm opacity-75">
                          {profile.full_name}
                        </div>
                      )}
                    </div>
                    {selectedUser?.id === profile.id && (
                      <div className="ml-auto">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            darkMode ? "bg-indigo-400" : "bg-indigo-500"
                          }`}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div
              className={`${
                darkMode ? "bg-gray-800" : "bg-white"
              } p-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              } flex items-center transition-colors duration-200`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 ${
                  darkMode ? "bg-gray-600" : "bg-indigo-100 text-indigo-500"
                }`}
              >
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium">
                    {(selectedUser.username || selectedUser.full_name || "User")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="font-medium">
                  {selectedUser.username ||
                    selectedUser.full_name ||
                    "Anonymous User"}
                </div>
                {selectedUser.username && selectedUser.full_name && (
                  <div className="text-sm opacity-75">
                    {selectedUser.full_name}
                  </div>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div
                    className={`p-4 rounded-full ${
                      darkMode ? "bg-gray-800" : "bg-gray-100"
                    } mb-4`}
                  >
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
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm opacity-75 max-w-xs mt-2">
                    Send a message to begin chatting with{" "}
                    {selectedUser.username || "this user"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === session.user.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                          message.sender_id === session.user.id
                            ? myMessageClass
                            : otherMessageClass
                        } ${message.is_optimistic ? "opacity-50" : ""}`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {processContent(message.content)}
                        </div>
                        {message.is_attachment &&
                          renderAttachment(message.attachment_url)}
                        <div className="text-xs opacity-75 text-right mt-1">
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* File preview */}
            {filePreview && (
              <div
                className={`p-2 ${
                  darkMode ? "bg-gray-800" : "bg-gray-100"
                } border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}
              >
                <div className="flex items-center">
                  <div className="flex-1 flex items-center">
                    {filePreview.type === "image" ? (
                      <div className="w-12 h-12 mr-3">
                        <img
                          src={filePreview.url}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-12 rounded flex items-center justify-center mr-3 ${
                          darkMode ? "bg-gray-700" : "bg-gray-200"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
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
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-medium truncate">
                        {filePreview.name}
                      </div>
                      {uploading && (
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                          <div className="bg-indigo-500 h-1.5 rounded-full w-1/2 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={cancelFileUpload}
                    className="ml-2 p-1 rounded-full hover:bg-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
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
              </div>
            )}

            {/* Message input */}
            <div
              className={`p-4 ${
                darkMode ? "bg-gray-800" : "bg-white"
              } border-t ${
                darkMode ? "border-gray-700" : "border-gray-200"
              } transition-colors duration-200`}
            >
              <form onSubmit={sendMessage} className="flex items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-700 mr-2"
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
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={uploading}
                  className={`flex-1 rounded-lg ${messageInputClass} py-2 px-4 focus:outline-none focus:ring-2 transition-colors duration-200`}
                />
                <button
                  type="submit"
                  disabled={uploading || (!newMessage.trim() && !filePreview)}
                  className={`ml-2 px-4 py-2 rounded-lg text-white ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                >
                  {uploading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className={`p-6 rounded-full ${
                darkMode ? "bg-gray-800" : "bg-gray-100"
              } mb-4`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Select a Conversation</h2>
            <p className="text-gray-400 mt-2 text-center max-w-md px-4">
              Choose a contact from the sidebar to start chatting or continue a
              previous conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
