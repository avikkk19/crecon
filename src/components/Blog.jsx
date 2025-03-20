import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Use the same Supabase config from Chat.jsx
const supabaseUrl = "https://ijshfaiylidljjuvrrbo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2hmYWl5bGlkbGpqdXZycmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjIxNDgsImV4cCI6MjA1Njg5ODE0OH0.AiIOVRQeBNuv94vGPQ26FAYUWlyH4BJ6IqbaVmYvIWA";
const supabase = createClient(supabaseUrl, supabaseKey);

// Maximum file size in bytes (8MB) - same as Chat.jsx
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Bucket name constant
const BUCKET_NAME = "blog-images";

function Blog() {
  const [session, setSession] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);

  // Blog detail view state
  const [selectedBlog, setSelectedBlog] = useState(null);

  // New blog form state
  const [newBlog, setNewBlog] = useState({
    title: "",
    summary: "",
    content: "",
  });

  // Check auth state - similar to Chat.jsx
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

  // Load blogs once authenticated
  useEffect(() => {
    if (session) {
      fetchBlogs();
      ensureBucketAccess();
    }
  }, [session]);

  // Create Supabase storage bucket if it doesn't exist - based on Chat.jsx
  async function ensureBucketAccess() {
    try {
      // Just check if we can list files in the bucket, not creating it
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

      if (error) {
        console.warn("Storage bucket access check failed:", error);
        // Still continue as the bucket might exist but user can't list files
      } else {
        console.log(`Successfully accessed ${BUCKET_NAME} bucket`);
      }
    } catch (error) {
      console.error("Error checking bucket access:", error);
    }
  }

  // Fetch all blogs
  async function fetchBlogs() {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBlogs(data || []);

      // Fetch profile information for all unique author IDs
      const authorIds = [...new Set(data.map((blog) => blog.author_id))];
      fetchProfiles(authorIds);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    }
  }

  // Fetch profiles for blog authors
  async function fetchProfiles(authorIds) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", authorIds);

      if (error) throw error;

      // Create a map of id -> profile for easy lookup
      const profileMap = {};
      data.forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  }

  // Upload image to storage - based on Chat.jsx's uploadFile
  async function uploadImage(file) {
    if (!file) {
      console.error("No file provided to uploadImage function");
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

    // Only allow image files
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed for blog posts");
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
      // Upload to blog-images bucket
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          metadata: {
            user_id: session.user.id, // Add user_id as metadata
          },
        });

      if (uploadError) throw uploadError;

      // Get public URL from blog-images bucket
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!data) throw new Error("No public URL returned");
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error uploading image");
      return null;
    } finally {
      setUploading(false);
    }
  }

  // Handle image selection
  function handleImageSelect(e) {
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

    // Only allow image files
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed for blog posts");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview({
        url: reader.result,
        name: file.name,
      });
    };

    reader.readAsDataURL(file);
  }

  // Cancel image upload
  function cancelImageUpload() {
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  // Handle form input changes
  function handleInputChange(e) {
    const { name, value } = e.target;
    setNewBlog((prev) => ({ ...prev, [name]: value }));
  }

  // Submit new blog
  async function handleSubmitBlog(e) {
    e.preventDefault();

    if (!newBlog.title.trim() || !newBlog.content.trim()) {
      alert("Title and content are required");
      return;
    }

    setCreating(true);

    try {
      let imageUrl = null;

      // Upload image if selected
      if (
        imagePreview &&
        imageInputRef.current &&
        imageInputRef.current.files[0]
      ) {
        imageUrl = await uploadImage(imageInputRef.current.files[0]);
      }

      // Create blog entry in database
      const { data, error } = await supabase
        .from("blogs")
        .insert({
          title: newBlog.title.trim(),
          summary: newBlog.summary.trim(),
          content: newBlog.content.trim(),
          image_url: imageUrl,
          author_id: session.user.id,
        })
        .select();

      if (error) throw error;

      // Add new blog to state with author profile
      if (data && data[0]) {
        // Clear form
        setNewBlog({
          title: "",
          summary: "",
          content: "",
        });
        setImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = "";

        // Refresh blogs
        fetchBlogs();

        // Close form
        setCreating(false);
      }
    } catch (error) {
      console.error("Error creating blog:", error);
      alert("Error creating blog post");
    } finally {
      setCreating(false);
    }
  }

  // Navigate to Chat with author and prepare blog for attachment
  function startChatWithAuthor(blog, authorId) {
    // Store blog data in sessionStorage to be picked up by the Chat component
    const blogData = {
      id: blog.id,
      title: blog.title,
      authorId: authorId,
      previewText: blog.summary || blog.content.substring(0, 100) + "...",
      type: "blog",
    };

    sessionStorage.setItem("pendingAttachment", JSON.stringify(blogData));

    // Navigate to chat with this user
    window.location.href = `/chat?user=${authorId}`;
  }

  // Open blog detail view
  function openBlogDetail(blog) {
    setSelectedBlog(blog);
    // Scroll to top when opening blog detail
    window.scrollTo(0, 0);
  }

  // Format date
  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Simple login function for testing - from Chat.jsx
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
            Please sign in to view and create blogs
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
    <div className="min-h-screen bg-gray-900 text-gray-300">
      {/* Header */}
      <header className="bg-gray-800 shadow-md p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Community Blog</h1>
          <div className="flex items-center space-x-4">
            <p className="text-sm">Logged in as: {session.user.email}</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Sign Out
            </button>
            <a
              href="/chat"
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              Go to Chat
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto p-4">
        {/* Create blog button */}
        {!creating && !selectedBlog && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setCreating(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Create New Blog Post
            </button>
          </div>
        )}

        {/* Back button when viewing a single blog */}
        {selectedBlog && (
          <div className="mb-6">
            <button
              onClick={() => setSelectedBlog(null)}
              className="flex items-center text-purple-400 hover:text-purple-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to All Posts
            </button>
          </div>
        )}

        {/* Blog creation form */}
        {creating && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Create New Blog Post
            </h2>
            <form onSubmit={handleSubmitBlog}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={newBlog.title}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Summary (optional)
                </label>
                <input
                  type="text"
                  name="summary"
                  value={newBlog.summary}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Content</label>
                <textarea
                  name="content"
                  value={newBlog.content}
                  onChange={handleInputChange}
                  required
                  rows="6"
                  className="w-full rounded-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                ></textarea>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  Featured Image (optional)
                </label>

                {imagePreview ? (
                  <div className="mb-2 p-2 bg-gray-700 rounded flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={imagePreview.url}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded mr-2"
                      />
                      <span
                        className="text-gray-300 truncate"
                        style={{ maxWidth: "200px" }}
                      >
                        {imagePreview.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={cancelImageUpload}
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
                ) : (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        imageInputRef.current && imageInputRef.current.click()
                      }
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Upload Image
                    </button>
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewBlog({ title: "", summary: "", content: "" });
                    setImagePreview(null);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    uploading ||
                    !newBlog.title.trim() ||
                    !newBlog.content.trim()
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  {uploading || creating ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2 text-white"
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
                      Publishing...
                    </div>
                  ) : (
                    "Publish"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Blog detail view */}
        {selectedBlog && (
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            {/* Cover image */}
            {selectedBlog.image_url && (
              <div className="w-full h-64 md:h-96 overflow-hidden">
                <img
                  src={selectedBlog.image_url}
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              {/* Title and metadata */}
              <h1 className="text-3xl font-bold text-white mb-4">
                {selectedBlog.title}
              </h1>

              <div className="flex items-center mb-6 text-gray-400">
                <div className="flex items-center">
                  {profiles[selectedBlog.author_id] && (
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white mr-3">
                      {profiles[selectedBlog.author_id].avatar_url ? (
                        <img
                          src={profiles[selectedBlog.author_id].avatar_url}
                          alt={profiles[selectedBlog.author_id].username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        (profiles[selectedBlog.author_id].username || "A")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-300">
                      {profiles[selectedBlog.author_id]?.username ||
                        profiles[selectedBlog.author_id]?.full_name ||
                        "Anonymous"}
                    </div>
                    <div className="text-sm">
                      {formatDate(selectedBlog.created_at)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    startChatWithAuthor(selectedBlog, selectedBlog.author_id)
                  }
                  className="ml-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
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
                  Chat with Author
                </button>
              </div>

              {/* Summary if available */}
              {selectedBlog.summary && (
                <div className="text-lg text-gray-300 mb-6 italic border-l-4 border-gray-600 pl-4">
                  {selectedBlog.summary}
                </div>
              )}

              {/* Blog content - render with simple formatting */}
              <div className="prose prose-invert max-w-none">
                {selectedBlog.content.split("\n").map((paragraph, index) =>
                  paragraph ? (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ) : (
                    <br key={index} />
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Blog posts grid */}
        {!creating &&
          !selectedBlog &&
          (blogs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No blog posts yet. Be the first to create one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => {
                const author = profiles[blog.author_id] || {
                  username: "Anonymous",
                };
                return (
                  <div
                    key={blog.id}
                    className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 flex flex-col"
                  >
                    {/* Blog image - now properly sized and displayed */}
                    {blog.image_url ? (
                      <div
                        className="h-48 w-full overflow-hidden cursor-pointer"
                        onClick={() => openBlogDetail(blog)}
                      >
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity duration-300"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-48 bg-gray-700 flex items-center justify-center cursor-pointer"
                        onClick={() => openBlogDetail(blog)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-16 w-16 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Blog content */}
                    <div
                      className="p-4 flex-1 flex flex-col cursor-pointer"
                      onClick={() => openBlogDetail(blog)}
                    >
                      <h2 className="text-xl font-bold text-white mb-2 line-clamp-2">
                        {blog.title}
                      </h2>

                      {blog.summary && (
                        <p className="text-gray-400 mb-4 line-clamp-2">
                          {blog.summary}
                        </p>
                      )}

                      <div className="flex items-center mt-auto pt-4 border-t border-gray-700">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white mr-2">
                            {author.avatar_url ? (
                              <img
                                src={author.avatar_url}
                                alt={author.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              (author.username || "A").charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm text-gray-400">
                            {author.username || author.full_name || "Anonymous"}
                          </span>
                        </div>

                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDate(blog.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="bg-gray-700 p-3 flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startChatWithAuthor(blog, blog.author_id);
                        }}
                        className="text-purple-400 hover:text-purple-300 flex items-center text-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        Chat
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openBlogDetail(blog);
                        }}
                        className="text-gray-300 hover:text-white flex items-center text-sm"
                      >
                        Read Post
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </main>
    </div>
  );
}

export default Blog;
