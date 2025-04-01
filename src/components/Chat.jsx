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
  // Removed darkMode state

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
  // async function handleLogin() {
  //   try {
  //     const { data, error } = await supabase.auth.signInWithPassword({
  //       email: "test@example.com", // Replace with your test email or use a proper auth form
  //       password: "password123", // Replace with your test password
  //     });

  //     if (error) throw error;
  //   } catch (error) {
  //     console.error("Login error:", error);
  //     alert("Error logging in");
  //   }
  // }

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
        scrollToBottom(); // Scroll after initial fetch
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();
  }, [session, selectedUser]); // Removed

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
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
      scrollToBottom();
      setNewMessage("");
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Database 
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: selectedUser.id,
          conversation_id: conversationId,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const returnedMsg = { ...data };
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

  const sidebarClass = "bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_100%,_#000000_100%)]border-r border-gray-700";
  const messageInputClass =
    "bg-gray-900 border-gray-600 focus:ring-indigo-500 text-gray-100 placeholder-gray-500"; 
  const buttonClass = "bg-indigo-600 hover:bg-indigo-700";
  const myMessageClass = "bg-indigo-700 text-white";
  const otherMessageClass = "bg-gray-800 text-gray-100";

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
          {" "}
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
    <div className="bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_100%,_#000000_100%)]">
    <div className="flex h-screen text-gray-100 bg-transparent backdrop-blur-3xl ">
      {/* Users sidebar */}
      <div className={`w-1/4 ${sidebarClass} overflow-y-auto flex flex-col mt-18`}>
        

        <div className="p-4 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg ${messageInputClass} py-2 pl-10 pr-4 focus:outline-none focus:ring-2 transition-colors duration-200`}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
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

        <div className="flex-grow overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="p-4 text-gray-500 text-center mt-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-600 mb-2"
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
            <div className="space-y-1 px-2 pb-2">
              {profiles
                .filter((profile) =>
                  (profile.username || profile.full_name || "")
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((profile) => (
                  <div
                    key={profile.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-center ${
                      selectedUser?.id === profile.id
                        ? "bg-gray-700"
                        : "hover:bg-gray-800"
                    }`}
                    onClick={() => setSelectedUser(profile)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 bg-gray-600 flex-shrink-0" // Fixed dark style, size adjusted, flex-shrink
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username || profile.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-medium">
                          {(profile.username || profile.full_name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-medium truncate">
                        {profile.username ||
                          profile.full_name ||
                          "Anonymous User"}
                      </div>
                      {profile.full_name &&
                        profile.username !== profile.full_name && (
                          <div className="text-sm opacity-75 truncate">
                            {profile.full_name}
                          </div>
                        )}
                    </div>
                    {selectedUser?.id === profile.id && (
                      <div className="ml-auto pl-2 flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Logged in as:</h2>
            <div
              className="mt-1 text-sm opacity-75 truncate"
              title={session.user.email}
            >
              <p>{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sign Out"
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
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-900/50 mt-18">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center transition-colors duration-200 flex-shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 bg-gray-600 flex-shrink-0">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.username || selectedUser.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium">
                    {(selectedUser.username || selectedUser.full_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {selectedUser.username ||
                    selectedUser.full_name ||
                    "Anonymous User"}
                </div>
                {selectedUser.full_name &&
                  selectedUser.username !== selectedUser.full_name && (
                    <div className="text-sm opacity-75 truncate">
                      {selectedUser.full_name}
                    </div>
                  )}
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={chatContainerRef}
              className="flex-1 p-4 overflow-y-auto space-y-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                  <div className="p-4 rounded-full bg-gray-800 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10"
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
                  <p className="text-lg font-medium text-gray-300">
                    Start a conversation
                  </p>
                  <p className="text-sm opacity-75 max-w-xs mt-2">
                    Send a message to begin chatting with{" "}
                    {selectedUser.username ||
                      selectedUser.full_name ||
                      "this user"}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id} // Use the message ID as key
                      className={`flex ${
                        message.sender_id === session.user.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] md:max-w-[60%] lg:max-w-[50%] px-4 py-2 rounded-xl shadow-md ${
                          // Adjusted max-width, rounded-xl, shadow
                          message.sender_id === session.user.id
                            ? myMessageClass
                            : otherMessageClass
                        } ${message.is_optimistic ? "opacity-60" : ""}`}
                      >
                        {/* Render text content only if it exists */}
                        {message.content && (
                          <div className="whitespace-pre-wrap break-words">
                            {processContent(message.content)}
                          </div>
                        )}
                        {/* Render attachment if it exists */}
                        {message.is_attachment &&
                          renderAttachment(message.attachment_url)}
                        <div
                          className={`text-xs opacity-75 text-right mt-1 ${
                            message.sender_id === session.user.id
                              ? "text-indigo-200"
                              : "text-gray-400"
                          }`}
                        >
                          {" "}
                          {/* Conditional timestamp color */}
                          {formatTime(message.created_at)}
                          {/* Optionally show optimistic indicator */}
                          {message.is_optimistic && (
                            <span className="ml-1">(Sending...)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} className="h-1" />{" "}
                  {/* Reference div */}
                </>
              )}
            </div>

            {/* File preview */}
            {filePreview && (
              <div className="p-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                <div className="flex items-center bg-gray-700 rounded p-2">
                  <div className="flex-1 flex items-center min-w-0">
                    {filePreview.type === "image" ? (
                      <div className="w-10 h-10 mr-3 flex-shrink-0">
                        <img
                          src={filePreview.url}
                          alt="Preview"
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded flex items-center justify-center mr-3 bg-gray-600 flex-shrink-0">
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
                    <div className="flex-grow truncate">
                      <div className="font-medium truncate text-sm text-gray-200">
                        {filePreview.name}
                      </div>
                      {uploading && (
                        <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                          <div
                            className="bg-indigo-500 h-1 rounded-full"
                            style={{
                              width: "100%",
                              animation:
                                "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={cancelFileUpload}
                    disabled={uploading} // Disable cancel while uploading
                    className="ml-2 p-1 rounded-full hover:bg-gray-600 disabled:opacity-50"
                    title="Cancel upload"
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
              className="p-4 bg-gray-800 border-t border-gray-700 transition-colors duration-200 flex-shrink-0" // Fixed dark style, added flex-shrink
            >
              <form onSubmit={sendMessage} className="flex items-end space-x-2">
                {" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading} // Disable while uploading
                  className="p-2 rounded-full text-gray-400 hover:text-indigo-400 hover:bg-gray-700 disabled:opacity-50 flex-shrink-0" // Added flex-shrink
                  title="Attach file"
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
                  disabled={uploading}
                />
                <textarea
                  rows={1} // Start with 1 row
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    // Send on Enter, new line on Shift+Enter
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault(); 
                      sendMessage(e); 
                    }
                  }}
                  disabled={uploading}
                  className={`flex-1 rounded-lg ${messageInputClass} py-2 px-4 focus:outline-none focus:ring-2 resize-none overflow-y-auto max-h-24`} // Added resize-none, overflow-y-auto, max-h
                  style={{ height: "auto" }} 
                />
                <button
                  type="submit"
                  disabled={uploading || (!newMessage.trim() && !filePreview)}
                  className={`px-4 py-2 rounded-lg text-white ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0 h-10`} // Fixed height, added flex-shrink
                  title="Send message"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center w-5 h-5">
                      {" "}
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg> 
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div
              className="p-6 rounded-full bg-gray-800 mb-6" 
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14" 
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5} 
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-300">
              Select a Conversation
            </h2>
            <p className="mt-2 text-center max-w-sm">
              {" "}
              {/* Wider max-width */}
              Choose a contact from the sidebar to start chatting or continue a
              previous conversation.
            </p>
          </div>
        )}
      </div>
    </div></div>
  );
}

export default Chat;
