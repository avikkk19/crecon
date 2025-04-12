import { useState, useEffect, useRef } from "react";
import { supabase } from "./SupabaseClient.jsx";
import { useNavigate } from "react-router-dom"; // Changed from Navigate to useNavigate

// Maximum file size in bytes (8MB) - same as Chat.jsx
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Bucket name constant
const BUCKET_NAME = "blog-images";

function Blog() {
  const navigate = useNavigate(); // Initialize the navigate function
  const [session, setSession] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadError, setUploadError] = useState(null); // Added to track upload errors
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
    }
  }, [session]);

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
      console.error("No file provided for upload");
      setUploadError("No file was selected for upload");
      return null;
    }

    console.log(
      "Uploading file:",
      file.name,
      "Size:",
      (file.size / (1024 * 1024)).toFixed(2) + "MB"
    );

    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()
      .toString(36)
      .substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    setUploading(true);

    try {
      console.log(
        "Attempting upload to bucket:",
        BUCKET_NAME,
        "Path:",
        filePath
      );

      // Proceed with upload
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Upload failed:", error.message, error);
        setUploadError(`Upload failed: ${error.message}`);
        return null;
      }

      console.log("Upload successful:", data);

      // Get public URL
      const { data: urlData, error: urlError } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (urlError) {
        console.error("Error getting public URL:", urlError);
        setUploadError(
          `Could not get URL for uploaded file: ${urlError.message}`
        );
        return null;
      }

      const publicUrl = urlData.publicUrl;
      console.log("Public URL generated:", publicUrl);

      return publicUrl;
    } catch (err) {
      console.error("Unexpected error during upload:", err);
      setUploadError(`Unexpected error: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  }

  // Modify handleImageSelect to store the file
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `File size exceeds the limit of 8MB. Your file is ${(
        file.size /
        (1024 * 1024)
      ).toFixed(2)}MB.`;
      alert(errorMsg);
      setUploadError(errorMsg);
      return;
    }

    // Only allow image files
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files are allowed for blog posts");
      alert("Only image files are allowed for blog posts");
      return;
    }

    // Store the file object
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview({
        url: reader.result,
        name: file.name,
      });
    };

    reader.readAsDataURL(file);
  }

  // Clear the file when canceling upload
  function cancelImageUpload() {
    setImagePreview(null);
    setSelectedFile(null);
    setUploadError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  // Handle form input changes
  function handleInputChange(e) {
    const { name, value } = e.target;
    setNewBlog((prev) => ({ ...prev, [name]: value }));
  }
  const [selectedFile, setSelectedFile] = useState(null);
  // Submit new blog
  async function handleSubmitBlog(e) {
    e.preventDefault();

    if (!newBlog.title || !newBlog.content) {
      alert("Title and content are required");
      return;
    }

    setCreating(true);
    setUploadError(null);

    try {
      let imageUrl = null;

      // Use the stored file instead of checking the input element
      if (selectedFile) {
        console.log("Using stored file for upload:", selectedFile.name);
        imageUrl = await uploadImage(selectedFile);

        if (!imageUrl) {
          console.error("Image upload failed or was cancelled");
          // Allow the blog creation to continue without an image
        } else {
          console.log("Successfully uploaded image:", imageUrl);
        }
      } else {
        console.log("No image selected for upload");
      }

      console.log("Creating blog entry with image URL:", imageUrl);

      const { data, error } = await supabase
        .from("blogs")
        .insert({
          title: newBlog.title,
          summary: newBlog.summary,
          content: newBlog.content,
          image_url: imageUrl,
          author_id: session.user.id,
        })
        .select();

      if (error) {
        throw error;
      }
      console.log("Blog created successfully:", data);
      alert("Blog created successfully");

      // Update UI and reset form
      setBlogs([...blogs, ...data]);
      setNewBlog({ title: "", summary: "", content: "" });
      setImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setCreating(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error creating blog:", error);
      setUploadError(`Error creating blog: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  // Navigate to Chat with author and prepare blog for attachment
  function startChatWithAuthor(blog, authorId) {
    console.log("Received blog:", blog);
    console.log("Received authorId:", authorId);

    if (!blog || !authorId) {
      console.error("Missing blog or author data for chat");
      return;
    }

    console.log("Starting chat with author:", authorId, "about blog:", blog.id);

    const authorData = {
      id: authorId,
      username: profiles[authorId]?.username || "Anonymous",
      avatar_url: profiles[authorId]?.avatar_url || null,
    };

    sessionStorage.setItem("selectedUser", JSON.stringify(authorData));
    console.log("Set selectedUser in sessionStorage:", authorData);

    navigate(`/chat/${authorId}`); // Use navigate function instead of Navigate component
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
            className="bg-black hover:bg-zinc-700 text-white px-4 py-2 rounded"
          >
            Sign In (Test Account)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_100%,_#000000_100%)]">
      <div className="min-h-screen text-gray-300">
        {/* Header */}
        <header className="bg-transparent backdrop-blur-lg shadow-md p-4 border-b border-gray-700">
          <div className="max-w-6xl mx-auto flex justify-between items-center mt-20">
            <h1 className="text-2xl font-bold text-white">Community Blog</h1>
            <div className="flex items-center space-x-4 ">
              <p className="text-[0.6rem]">
                Logged in as: {session.user.email}
              </p>
              <a
                href="/chat"
                className="text-white hover:text-zinc-300 text-xs bg-black rounded-4xl p-2 flex justify-center items-center w-auto "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  stroke="white"
                >
                  <path
                    d="M19 12H5M12 5l-7 7 7 7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                chat
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
                className="bg-zinc-900 hover:bg-gray-800 hover:text-white text-white px-4 py-2 rounded-lg w-full sm:w-auto"
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
                className="flex items-center text-white hover:text-zinc-300 w-full sm:w-auto justify-center sm:justify-start"
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
            <div className="mb-8 bg-black rounded-lg p-4 sm:p-6 shadow-lg border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New Blog Post
              </h2>

              {/* Show upload error if any */}
              {uploadError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                  <p className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {uploadError}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitBlog}>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">
                    Title <span className="text-sm">(required)</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={newBlog.title}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
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
                    className="w-full rounded-lg border `border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">
                    Content <span className="text-sm">(required)</span>
                  </label>
                  <textarea
                    name="content"
                    value={newBlog.content}
                    onChange={handleInputChange}
                    required
                    rows="6"
                    className="w-full rounded-lg border border-gray-700 bg-gray-700 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-white"
                  ></textarea>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">
                    Featured Image (optional)
                  </label>

                  {imagePreview ? (
                    <div className="mb-2 p-2 bg-black rounded flex items-center justify-between">
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
                        className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg flex items-center w-full sm:w-auto justify-center"
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

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewBlog({ title: "", summary: "", content: "" });
                      setImagePreview(null);
                      setUploadError(null);
                      if (imageInputRef.current)
                        imageInputRef.current.value = "";
                    }}
                    className="bg-gray-600 hover:bg-gray-600 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
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
                    className="bg-white hover:bg-zinc-700 text-black px-6 py-2 rounded-lg disabled:opacity-50 w-full sm:w-auto"
                  >
                    {uploading || creating ? "Submit Blog" : "Publish"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Blog detail view */}
          {selectedBlog && (
            <div className="bg-black rounded-lg shadow-lg overflow-hidden border border-zinc-700">
              {/* Cover image */}
              {selectedBlog.image_url && (
                <div className="w-full h-48 sm:h-64 md:h-96 overflow-hidden">
                  <img
                    src={selectedBlog.image_url}
                    alt={selectedBlog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4 sm:p-6">
                {/* Title and metadata */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  {selectedBlog.title}
                </h1>

                <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 text-gray-400">
                  <div className="flex items-center mb-2 sm:mb-0">
                    {profiles[selectedBlog.author_id] && (
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white mr-3">
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
                          "Anonymous"}
                      </div>
                      <div className="text-sm">
                        {formatDate(selectedBlog.created_at)}
                      </div>
                    </div>
                  </div>
                  {selectedBlog.author_id !== session.user.id && (
                    <button
                      onClick={() =>
                        startChatWithAuthor(
                          selectedBlog,
                          selectedBlog.author_id
                        )
                      }
                      className="ml-auto bg-dark hover:bg-zinc-700 text-white px-4 py-2 rounded-lg flex items-center w-full sm:w-auto justify-center mt-2 sm:mt-0"
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Chat with Author
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="prose prose-invert max-w-none">
                  {selectedBlog.summary && (
                    <p className="text-gray-400 italic text-lg mb-6">
                      {selectedBlog.summary}
                    </p>
                  )}

                  <div className="whitespace-pre-line text-gray-300">
                    {selectedBlog.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blog grid */}
          {!selectedBlog && !creating && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {blogs.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 mb-4">No blog posts yet</p>
                  <button
                    onClick={() => setCreating(true)}
                    className="bg-black hover:bg-zinc-700 text-white px-4 py-2 rounded-lg"
                  >
                    Create the first post
                  </button>
                </div>
              ) : (
                blogs.map((blog) => (
                  <div
                    key={blog.id}
                    className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col hover:border-gray-900 transition-colors duration-200"
                  >
                    {/* Blog card image */}
                    <div
                      className="h-48 overflow-hidden relative cursor-pointer"
                      onClick={() => openBlogDetail(blog)}
                    >
                      {blog.image_url ? (
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 text-gray-500"
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
                        </div>
                      )}
                    </div>

                    {/* Card content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h2
                        className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-zinc-400"
                        onClick={() => openBlogDetail(blog)}
                      >
                        {blog.title}
                      </h2>

                      {blog.summary && (
                        <p className="text-gray-400 mb-3 line-clamp-2">
                          {blog.summary}
                        </p>
                      )}

                      <p className="text-gray-300 mb-4 line-clamp-3">
                        {blog.content}
                      </p>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-700">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center text-white mr-2">
                            {profiles[blog.author_id]?.avatar_url ? (
                              <img
                                src={profiles[blog.author_id].avatar_url}
                                alt={profiles[blog.author_id].username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              (profiles[blog.author_id]?.username || "A")
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {profiles[blog.author_id]?.username || "Anonymous"}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(blog.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-transparent py-6 text-center text-gray-500 text-sm mt-12">
          <p>&copy; {new Date().getFullYear()} Community Blog Platform</p>
        </footer>
      </div>
    </div>
  );
}

export default Blog;
