import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase URL and anon key
const supabaseUrl = "https://ijshfaiylidljjuvrrbo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2hmYWl5bGlkbGpqdXZycmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjIxNDgsImV4cCI6MjA1Njg5ODE0OH0.AiIOVRQeBNuv94vGPQ26FAYUWlyH4BJ6IqbaVmYvIWA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Maximum file size in bytes (8MB)
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Bucket name constant
const BUCKET_NAME = "chat-media";

function Chat() {
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check auth state
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
      // Create storage bucket when user is authenticated
      createBucketIfNotExists();
    }
  }, [session]);

  // Load and subscribe to messages when a user is selected
  useEffect(() => {
    if (!session || !selectedUser) return;

    // Clear messages when changing selected user
    setMessages([]);

    // Fetch existing messages
    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`
          )
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Add parsed attachment data to messages
        const messagesWithAttachments =
          data?.map((message) => {
            // Try to parse attachment URL from content if it exists
            try {
              if (message.content && message.content.includes("[ATTACHMENT]")) {
                const parts = message.content.split("[ATTACHMENT]");
                return {
                  ...message,
                  content: parts[0].trim(),
                  attachment_url: parts[1].trim(),
                  is_attachment: true,
                };
              }
            } catch (e) {
              console.error("Error parsing attachment:", e);
            }
            return message;
          }) || [];

        setMessages(messagesWithAttachments);
        scrollToBottom();
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();

    // Subscribe to new messages with improved filter
    const channel = supabase
      .channel(`messages-${selectedUser.id}`) // Add user ID to make channel unique
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id}))`,
        },
        (payload) => {
          const newMsg = payload.new;

          // Check for attachment in message content
          let processedMsg = { ...newMsg };
          if (
            processedMsg.content &&
            processedMsg.content.includes("[ATTACHMENT]")
          ) {
            const parts = processedMsg.content.split("[ATTACHMENT]");
            processedMsg.content = parts[0].trim();
            processedMsg.attachment_url = parts[1].trim();
            processedMsg.is_attachment = true;
          }

          // Use a function to ensure we're working with the latest state
          setMessages((currentMessages) => [...currentMessages, processedMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, selectedUser]); // Only dependency should be session and selectedUser

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

  // Create Supabase storage bucket if it doesn't exist - FIXED VERSION
  async function createBucketIfNotExists() {
    try {
      // First, try to list buckets to check if ours exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error("Error listing buckets:", listError);
        return; // Exit early but don't break the app
      }
      
      // Check if our bucket exists in the list
      const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
      
      if (!bucketExists) {
        // Bucket doesn't exist, try to create it
        const { error: createError } = await supabase.storage.createBucket(
          BUCKET_NAME,
          {
            public: true,
            fileSizeLimit: MAX_FILE_SIZE,
          }
        );

        if (createError) {
          console.error("Error creating bucket:", createError);
        } else {
          console.log(`Storage bucket ${BUCKET_NAME} created successfully`);
        }
      } else {
        console.log(`Storage bucket ${BUCKET_NAME} already exists`);
      }
    } catch (error) {
      console.error("Error in bucket management:", error);
      // Continue with the application even if bucket creation fails
    }
  }

  // Scroll to bottom of messages
  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Upload file to storage - FIXED VERSION
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
        <div className="mt-2 max-w-xs overflow-hidden rounded">
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
            className="flex items-center p-2 bg-gray-800 rounded"
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

  // Send a new message - FIXED VERSION
  async function sendMessage(e) {
    e.preventDefault();

    if ((!newMessage.trim() && !filePreview) || !selectedUser) return;

    try {
      let attachmentUrl = null;
      let messageContent = newMessage.trim();

      // Handle file upload if there's a preview
      if (filePreview && fileInputRef.current && fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        attachmentUrl = await uploadFile(file);
        
        // If upload failed and no text message, don't proceed
        if (!attachmentUrl && !messageContent) return;

        // If we have an attachment, embed it in the message content
        if (attachmentUrl) {
          messageContent = `${messageContent || ""} [ATTACHMENT]${attachmentUrl}`;
        }
      }

      // Optimistically add message to UI
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_id: session.user.id,
        receiver_id: selectedUser.id,
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
      scrollToBottom();
      setNewMessage("");
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Send message to database - without the attachment_url field
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: session.user.id,
          receiver_id: selectedUser.id,
          content: messageContent,
        })
        .select();

      if (error) throw error;

      // Parse the returned message to extract attachment
      if (data && data[0]) {
        const returnedMsg = { ...data[0] };
        if (returnedMsg.content && returnedMsg.content.includes("[ATTACHMENT]")) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-300">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-gray-300">
          <h1 className="text-2xl font-bold mb-4">
            Please sign in to use the chat
          </h1>
          <button
            onClick={handleLogin}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            Sign In (Test Account)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-300">
      {/* Users sidebar */}
      <div className="w-1/4 bg-gray-800 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Contacts</h2>
          <div className="mt-2 text-sm">
            <p>Logged in as: {session.user.email}</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-red-400 hover:text-red-300"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div>
          {profiles.length === 0 ? (
            <div className="p-4 text-gray-500">
              No users found. Make sure there are other users in your profiles
              table.
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-4 cursor-pointer hover:bg-gray-700 flex items-center ${
                  selectedUser?.id === profile.id ? "bg-gray-700" : ""
                }`}
                onClick={() => setSelectedUser(profile)}
              >
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white mr-3">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    (profile.username || profile.full_name || "User")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <div className="font-medium text-white">
                    {profile.username || profile.full_name || "Anonymous User"}
                  </div>
                  {profile.username && profile.full_name && (
                    <div className="text-sm text-gray-400">
                      {profile.full_name}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white mr-3">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  (selectedUser.username || selectedUser.full_name || "User")
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div>
                <div className="font-medium text-lg text-white">
                  {selectedUser.username ||
                    selectedUser.full_name ||
                    "Anonymous User"}
                </div>
                {selectedUser.username && selectedUser.full_name && (
                  <div className="text-sm text-gray-400">
                    {selectedUser.full_name}
                  </div>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.sender_id === session.user.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
                        message.sender_id === session.user.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-300"
                      } ${message.is_optimistic ? "opacity-70" : ""}`}
                    >
                      <div>{processContent(message.content)}</div>
                      {message.attachment_url &&
                        renderAttachment(message.attachment_url)}
                      <div
                        className={`text-xs mt-1 ${
                          message.sender_id === session.user.id
                            ? "text-purple-200"
                            : "text-gray-500"
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
              {filePreview && (
                <div className="mb-2 p-2 bg-gray-700 rounded flex items-center justify-between">
                  <div className="flex items-center">
                    {filePreview.type === "image" ? (
                      <img
                        src={filePreview.url}
                        alt="Preview"
                        className="h-12 w-12 object-cover rounded mr-2"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-2 text-gray-400"
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
                    )}
                    <span
                      className="text-gray-300 truncate"
                      style={{ maxWidth: "200px" }}
                    >
                      {filePreview.name}
                    </span>
                  </div>
                  <button
                    onClick={cancelFileUpload}
                    className="text-gray-400 hover:text-gray-300"
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
              <form onSubmit={sendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={uploading}
                  className="flex-1 rounded-l-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={uploading}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 border-t border-b border-gray-700"
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
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!newMessage.trim() && !filePreview)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
                >
                  {uploading ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;