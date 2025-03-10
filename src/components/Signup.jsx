import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const SignupForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      console.log("Auth signup successful:", authData);

      if (!authData.user) {
        throw new Error("User signup failed. Please try again.");
      }

      const userId = authData.user.id;

      // 2. Check if the user already exists in `users` table
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (userCheckError) {
        console.error("Error checking user existence:", userCheckError);
        throw new Error("Error verifying user existence");
      }

      if (!existingUser) {
        // 3. Insert user into `users` table only if they don’t exist
        const userData = {
          id: userId,
          name,
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("Creating user record:", userData);

        const { error: userError } = await supabase
          .from("users")
          .insert([userData]);

        if (userError) {
          console.error("User creation error:", userError);
          throw new Error(`User creation failed: ${userError.message}`);
        }
      } else {
        console.log("User already exists, skipping insertion.");
      }

      // 4. Check if profile exists before inserting
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileCheckError) {
        console.error("Error checking profile existence:", profileCheckError);
        throw new Error("Error verifying profile existence");
      }

      if (!existingProfile) {
        // 5. Insert into `profiles` now that user exists
        const username = `${email.split("@")[0]}_${Math.floor(
          Math.random() * 1000
        )}`;

        const profileData = {
          id: userId,
          username: username,
          full_name: name,
          created_at: new Date().toISOString(),
        };

        console.log("Creating profile record:", profileData);

        const { error: profileError } = await supabase
          .from("profiles")
          .insert([profileData]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }
      } else {
        console.log("Profile already exists, skipping insertion.");
      }

      console.log("User and profile created successfully");
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
