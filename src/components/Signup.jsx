import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const SignupForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Email validation function
  const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    // Validate inputs
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }
  
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }
  
    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      });
  
      if (authError) {
        console.error("Auth error:", authError);
        throw new Error(authError.message);
      }
  
      console.log("Auth signup successful:", authData);
  
      if (!authData.user) {
        throw new Error("User signup failed. Please try again.");
      }
  
      // Get the user ID
      const userId = authData.user.id;
      
      // Create username from email with random suffix
      const username = `${email.split("@")[0]}_${Math.floor(Math.random() * 1000)}`;
      const currentTime = new Date().toISOString();
  
      // First, try to insert the user record
      const { error: userError } = await supabase
        .from("users")
        .insert([{
          id: userId,
          name,
          email,
          role,
          created_at: currentTime,
          updated_at: currentTime
        }]);
  
      if (userError) {
        console.error("Failed to create user record:", userError);
        // Don't throw here, but log for debugging
      } else {
        console.log("User record created successfully");
      }
  
      // Next, try to insert the profile record
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{
          id: userId,
          username,
          full_name: name,
          created_at: currentTime
        }]);
  
      if (profileError) {
        console.error("Failed to create profile record:", profileError);
        
        // If we get a unique constraint violation, try with a different username
        if (profileError.code === '23505') { // Postgres unique violation code
          const retryUsername = `${email.split("@")[0]}_${Math.floor(Math.random() * 10000)}`;
          console.log("Trying again with a different username:", retryUsername);
          
          const { error: retryError } = await supabase
            .from("profiles")
            .insert([{
              id: userId,
              username: retryUsername,
              full_name: name,
              created_at: currentTime
            }]);
            
          if (retryError) {
            console.error("Second attempt to create profile failed:", retryError);
          } else {
            console.log("Profile created successfully on second attempt");
          }
        }
      } else {
        console.log("Profile record created successfully");
      }
  
      // Handle email confirmation case
      if (authData.user && !authData.session) {
        console.log("Email verification required - no session established yet");
        setSuccess(true);
        setError("Please check your email to verify your account before signing in.");
        setLoading(false);
        return;
      }
  
      // If we reached here, consider the signup successful
      setSuccess(true);
      
    } catch (error) {
      console.error("Error during signup:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // The user will be redirected to the OAuth provider
      console.log("OAuth signup initiated", data);
    } catch (error) {
      console.error(`Error signing up with ${provider}:`, error.message);
      setError(error.message);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600">Sign up to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            Account created successfully! Please sign in to continue.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your full name"
              required
              disabled={loading || success}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
              required
              disabled={loading || success}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              What best describes you?
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading || success}
            >
              <option value="" disabled>Select your role</option>
              <option value="editor">Editor</option>
              <option value="graphic_designer">Graphic Designer</option>
              <option value="content_creator">Content Creator</option>
              <option value="web_designer">Web Designer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
              disabled={loading || success}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
              disabled={loading || success}
            />
          </div>

          <div className="flex items-center mb-6">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
              disabled={loading || success}
            />
            <label
              htmlFor="agreeTerms"
              className="ml-2 block text-sm text-gray-700"
            >
              I agree to the{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-800">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              loading || success ? "opacity-70 cursor-not-allowed" : ""
            }`}
            disabled={loading || success}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href="/signin"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in
            </a>
          </p>
        </div>

        <div className="mt-8 border-t pt-6">
          <p className="text-center text-xs text-gray-600 mb-4">
            Or continue with
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleSocialSignup("google")}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={loading || success}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialSignup("github")}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={loading || success}
            >
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;