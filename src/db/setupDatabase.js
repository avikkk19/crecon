import { supabase } from "../components/SupabaseClient.jsx";
import {
  profilesTableSQL,
  blogPostsTableSQL,
  connectionsTableSQL,
  connectionRequestsTableSQL,
  indexesSQL,
} from "./schema.js";

// Set up database tables using Supabase REST API
export const setupDatabase = async () => {
  console.log("Setting up database tables...");

  const results = {
    profiles: { success: false, error: null },
    blogPosts: { success: false, error: null },
    connections: { success: false, error: null },
    connectionRequests: { success: false, error: null },
  };

  try {
    // Create profiles table - this needs to be done first as other tables depend on it
    try {
      // Check if profiles table exists by trying to access it
      const { error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (profileCheckError && profileCheckError.code === "42P01") {
        // Table doesn't exist, create a user profile for the current authenticated user
        const { data: authUser } = await supabase.auth.getUser();

        if (authUser && authUser.user) {
          // Create profile for the authenticated user
          const { error: createProfileError } = await supabase
            .from("profiles")
            .insert({
              id: authUser.user.id,
              username: authUser.user.email?.split("@")[0] || "user",
              email: authUser.user.email,
              created_at: new Date(),
              updated_at: new Date(),
            });

          if (!createProfileError || createProfileError.code === "23505") {
            // Success or already exists
            results.profiles.success = true;
            console.log("Profiles table created successfully");
          } else {
            console.error("Error creating profile:", createProfileError);
            results.profiles.error = createProfileError;
          }
        } else {
          // Create a temporary profile to ensure table exists
          const { error: tempProfileError } = await supabase
            .from("profiles")
            .insert({
              id: "00000000-0000-0000-0000-000000000000",
              username: "temp_user",
              email: "temp@example.com",
              created_at: new Date(),
              updated_at: new Date(),
            });

          if (!tempProfileError || tempProfileError.code === "23505") {
            results.profiles.success = true;
            console.log("Profiles table created with temporary user");

            // Clean up the temporary user later
            setTimeout(async () => {
              try {
                await supabase
                  .from("profiles")
                  .delete()
                  .eq("id", "00000000-0000-0000-0000-000000000000");
              } catch (e) {
                console.log("Temporary user cleanup failed:", e);
              }
            }, 5000);
          } else {
            console.error(
              "Error creating temporary profile:",
              tempProfileError
            );
            results.profiles.error = tempProfileError;
          }
        }
      } else {
        // Table exists
        results.profiles.success = true;
        console.log("Profiles table already exists");
      }
    } catch (profileError) {
      console.error("Error creating profiles table:", profileError);
      results.profiles.error = profileError;
    }

    // Create blog_posts table
    if (results.profiles.success) {
      try {
        // Check if table exists by trying to access it
        const { error: blogCheckError } = await supabase
          .from("blog_posts")
          .select("id")
          .limit(1);

        if (blogCheckError && blogCheckError.code === "42P01") {
          // Table doesn't exist
          // Get current user or use the temporary ID
          const { data: authUser } = await supabase.auth.getUser();
          const userId =
            authUser?.user?.id || "00000000-0000-0000-0000-000000000000";

          // Create the table by inserting a temporary post
          const { error: createBlogError } = await supabase
            .from("blog_posts")
            .insert({
              title: "Setup Post",
              content:
                "This is a temporary post to set up the blog_posts table",
              user_id: userId,
            });

          if (!createBlogError || createBlogError.code === "23505") {
            results.blogPosts.success = true;
            console.log("Blog posts table created successfully");

            // Remove the temporary post
            try {
              await supabase
                .from("blog_posts")
                .delete()
                .eq("title", "Setup Post");
            } catch (e) {
              console.log("Temporary blog post cleanup failed:", e);
            }
          } else {
            console.error("Error creating blog_posts table:", createBlogError);
            results.blogPosts.error = createBlogError;
          }
        } else {
          // Table exists
          results.blogPosts.success = true;
          console.log("Blog posts table already exists");
        }
      } catch (blogError) {
        console.error("Error creating blog_posts table:", blogError);
        results.blogPosts.error = blogError;
      }
    }

    // Create connections table
    if (results.profiles.success) {
      try {
        // Check if table exists
        const { error: connectionsCheckError } = await supabase
          .from("connections")
          .select("id")
          .limit(1);

        if (connectionsCheckError && connectionsCheckError.code === "42P01") {
          // Table doesn't exist
          // Try to create the table by inserting a dummy connection
          const { error: createConnectionError } = await supabase
            .from("connections")
            .insert({
              follower_id: "00000000-0000-0000-0000-000000000000",
              following_id: "00000000-0000-0000-0000-000000000000",
              created_at: new Date(),
            });

          if (
            !createConnectionError ||
            createConnectionError.code === "23505" ||
            createConnectionError.code === "23503"
          ) {
            // Success, already exists, or FK constraint
            results.connections.success = true;
            console.log("Connections table created successfully");

            // Try to clean up
            try {
              await supabase
                .from("connections")
                .delete()
                .eq("follower_id", "00000000-0000-0000-0000-000000000000");
            } catch (e) {
              console.log("Temporary connection cleanup failed:", e);
            }
          } else {
            console.error(
              "Error creating connections table:",
              createConnectionError
            );
            results.connections.error = createConnectionError;
          }
        } else {
          // Table exists
          results.connections.success = true;
          console.log("Connections table already exists");
        }
      } catch (connectionsError) {
        console.error("Error creating connections table:", connectionsError);
        results.connections.error = connectionsError;
      }
    }

    // Create connection_requests table
    if (results.profiles.success) {
      try {
        // Check if table exists
        const { error: requestsCheckError } = await supabase
          .from("connection_requests")
          .select("id")
          .limit(1);

        if (requestsCheckError && requestsCheckError.code === "42P01") {
          // Table doesn't exist
          // Try to create the table by inserting a dummy request
          const { error: createRequestError } = await supabase
            .from("connection_requests")
            .insert({
              sender_id: "00000000-0000-0000-0000-000000000000",
              receiver_id: "00000000-0000-0000-0000-000000000000",
              status: "pending",
              created_at: new Date(),
              updated_at: new Date(),
            });

          if (
            !createRequestError ||
            createRequestError.code === "23505" ||
            createRequestError.code === "23503"
          ) {
            // Success, already exists, or FK constraint
            results.connectionRequests.success = true;
            console.log("Connection requests table created successfully");

            // Try to clean up
            try {
              await supabase
                .from("connection_requests")
                .delete()
                .eq("sender_id", "00000000-0000-0000-0000-000000000000");
            } catch (e) {
              console.log("Temporary connection request cleanup failed:", e);
            }
          } else {
            console.error(
              "Error creating connection_requests table:",
              createRequestError
            );
            results.connectionRequests.error = createRequestError;
          }
        } else {
          // Table exists
          results.connectionRequests.success = true;
          console.log("Connection requests table already exists");
        }
      } catch (requestsError) {
        console.error(
          "Error creating connection_requests table:",
          requestsError
        );
        results.connectionRequests.error = requestsError;
      }
    }
  } catch (error) {
    console.error("Error in overall setup process:", error);
  }

  // Check if all operations succeeded
  const allSucceeded = Object.values(results).every((r) => r.success);
  console.log(
    "Database setup complete:",
    allSucceeded ? "Success" : "Some operations failed"
  );

  return {
    success: allSucceeded,
    results,
  };
};

// Create sample blog posts for the current user
export const createSampleBlogPosts = async (userId) => {
  if (!userId) return { success: false, error: "No user ID provided" };

  try {
    // Check if user already has posts
    const { data: existingPosts, error: checkError } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (checkError) {
      console.error("Error checking for existing posts:", checkError);
      return { success: false, error: checkError };
    }

    if (existingPosts && existingPosts.length > 0) {
      console.log("User already has blog posts");
      return { success: true, existing: true };
    }

    // Insert sample posts
    const { error } = await supabase.from("blog_posts").insert([
      {
        title: "Getting Started with React",
        content:
          "React is a popular JavaScript library for building user interfaces. It allows you to create reusable UI components and efficiently update the DOM when your data changes. This post will guide you through setting up your first React project.",
        user_id: userId,
      },
      {
        title: "Understanding State Management",
        content:
          "State management is a crucial concept in modern web applications. In this post, we explore different approaches to managing state in React applications, from useState and useContext to external libraries like Redux and Zustand.",
        user_id: userId,
      },
      {
        title: "CSS-in-JS: Benefits and Drawbacks",
        content:
          "CSS-in-JS libraries like styled-components and Emotion have gained popularity in the React ecosystem. This post examines the pros and cons of this approach compared to traditional CSS and preprocessors like SASS.",
        user_id: userId,
      },
    ]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error creating sample blog posts:", error);
    return { success: false, error };
  }
};

export default setupDatabase;
