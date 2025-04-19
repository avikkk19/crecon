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

    // Get author profile data
    const authorData = {
      id: authorId,
      username: profiles[authorId]?.username || "Anonymous",
      full_name: profiles[authorId]?.full_name || null,
      avatar_url: profiles[authorId]?.avatar_url || null,
      email: profiles[authorId]?.email || null,
    };

    // Store the selected user in session storage for the chat component to use
    sessionStorage.setItem("selectedUser", JSON.stringify(authorData));
    console.log("Set selectedUser in sessionStorage:", authorData);

    // Create an initial message about the blog post if desired
    const blogLink = `Hey! I saw your post about: "${blog.title}" and I wanted to say hi! and discuss a few things with you about it.`;
    sessionStorage.setItem("initialMessage", blogLink);

    // Navigate to the chat with this user
    navigate(`/chat/${authorId}`);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#0f172a_0%,_#042f2e_0%,_#000000_80%)] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* If no session, show login button */}
        {!session ? (
          <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-800/30 backdrop-blur-sm rounded-2xl p-10 text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Crecon Blogs</h1>
            <p className="mb-8 text-gray-300">
              Sign in to read and create blog posts
            </p>
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-gradient-to-bl from-green-900 to-blue-900 rounded-lg shadow-lg hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : selectedBlog ? (
          /* Blog Detail View */
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <button
              onClick={() => setSelectedBlog(null)}
              className="text-gray-400 hover:text-white mb-4 flex items-center"
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
              Back to blogs
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{selectedBlog.title}</h1>
              <div className="flex justify-between items-center text-gray-400 mb-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
                    {profiles[selectedBlog.author_id]?.username?.charAt(0) ||
                      "U"}
                  </div>
                  <span>
                    {profiles[selectedBlog.author_id]?.username || "Anonymous"}{" "}
                    • {formatDate(selectedBlog.created_at)}
                  </span>
                </div>
                {session.user.id !== selectedBlog.author_id && (
                  <button
                    onClick={() =>
                      startChatWithAuthor(selectedBlog, selectedBlog.author_id)
                    }
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Chat with Author
                  </button>
                )}
              </div>
              {selectedBlog.image_url && (
                <img
                  src={selectedBlog.image_url}
                  alt={selectedBlog.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <div className="text-lg text-gray-300 mb-6">
                {selectedBlog.summary}
              </div>
              <div className="prose prose-invert max-w-none">
                {selectedBlog.content.split("\n").map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : creating ? (
          /* New Blog Form */
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Blog Post</h2>
              <button
                onClick={() => setCreating(false)}
                className="text-gray-400 hover:text-white"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitBlog}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={newBlog.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="Enter blog title"
                  required
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
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  placeholder="Brief summary of your blog"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Content</label>
                <textarea
                  name="content"
                  value={newBlog.content}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white h-64"
                  placeholder="Write your blog post here..."
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Featured Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current.click()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    disabled={uploading}
                  >
                    Select Image
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={cancelImageUpload}
                      className="ml-4 text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {uploadError && (
                  <p className="text-red-400 mt-2 text-sm">{uploadError}</p>
                )}
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview.url}
                      alt="Preview"
                      className="w-full max-h-60 object-cover rounded-lg"
                    />
                    <p className="text-gray-400 mt-1 text-sm">
                      {imagePreview.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg mr-4 hover:bg-gray-600"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-bl from-green-900 to-blue-900 text-white rounded-lg hover:opacity-90"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Publish Blog"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Blog List View */
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Blog Posts</h1>
              <button
                onClick={() => setCreating(true)}
                className="px-4 py-2 bg-gradient-to-bl from-green-900 to-blue-900 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                New Post
              </button>
            </div>

            {blogs.length === 0 ? (
              <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-10 text-center border border-gray-700/50">
                <h2 className="text-xl font-medium mb-4">No blogs yet</h2>
                <p className="text-gray-400 mb-6">
                  Be the first to create a blog post!
                </p>
                <button
                  onClick={() => setCreating(true)}
                  className="px-4 py-2 bg-gradient-to-bl from-green-900 to-blue-900 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create New Blog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map((blog) => (
                  <div
                    key={blog.id}
                    className="bg-gray-800/40 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700/50 transition-transform hover:transform hover:scale-[1.02] cursor-pointer"
                    onClick={() => openBlogDetail(blog)}
                  >
                    {blog.image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={blog.image_url}
                          alt={blog.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gray-700/50 flex items-center justify-center">
                        <span className="text-gray-400">No image</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                        {blog.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                        {blog.summary || blog.content.substring(0, 100) + "..."}
                      </p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center mr-2 text-white text-xs">
                            {profiles[blog.author_id]?.username?.charAt(0) ||
                              "U"}
                          </div>
                          <span>
                            {profiles[blog.author_id]?.username || "Anonymous"}
                          </span>
                        </div>
                        <span>{formatDate(blog.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog;
