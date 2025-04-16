// src/utils/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge Function helpers
export const supabaseEdgeFunctions = {
  // Process a new message (extract links, generate previews)
  processMessage: async (message) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "message-processor",
        {
          body: {
            type: "process_new_message",
            message,
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error processing message:", error);
      return { error };
    }
  },

  // Generate a link preview
  generateLinkPreview: async (url) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "message-processor",
        {
          body: {
            type: "generate_link_preview",
            message: { link_url: url },
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error generating link preview:", error);
      return null;
    }
  },

  // Send notifications to conversation participants
  sendNotification: async (message) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "message-processor",
        {
          body: {
            type: "send_notification",
            message,
          },
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending notification:", error);
      return { error };
    }
  },

  // Update user's online status
  updateUserPresence: async (userId, status = "online") => {
    try {
      const { data, error } = await supabase.functions.invoke("user-presence", {
        body: {
          user_id: userId,
          status,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating presence:", error);
      return { error };
    }
  },
};

// Database schema setup for the Snapchat-style Chat Application
export async function setupDatabase() {
  // Check localStorage for policy permission status to avoid repeated API calls
  if (localStorage.getItem("policyPermissionDenied") === "true") {
    console.log(
      "Skipping policy creation due to previously detected permission issues"
    );
    return;
  }

  try {
    // Track policy creation permission status to avoid repeated attempts
    let hasPolicyCreationPermission = true;

    // Check if tables exist and create them if they don't
    const { error: tablesError } = await supabase.rpc(
      "check_and_create_tables"
    );
    if (tablesError) {
      console.error("Error checking/creating tables:", tablesError);
      // Continue execution even if there's an error with tables
      if (tablesError.code === "42501" || tablesError.code === "403") {
        hasPolicyCreationPermission = false;
        // Remember this permission issue
        localStorage.setItem("policyPermissionDenied", "true");
      }
    }

    // Only try to create policies if we have permission
    if (hasPolicyCreationPermission) {
      // Check if policies exist and create them if they don't
      const { error: policiesError } = await supabase.rpc(
        "check_and_create_policies"
      );
      if (policiesError) {
        // If the error is about policies already existing, we can ignore it
        if (policiesError.code === "42710") {
          console.log("Policies already exist, continuing...");
        } else if (
          policiesError.code === "42501" ||
          policiesError.code === "403"
        ) {
          console.log(
            "No permission to create policies, skipping all policy creation steps..."
          );
          hasPolicyCreationPermission = false;
          // Remember this permission issue
          localStorage.setItem("policyPermissionDenied", "true");
        } else {
          console.error("Error checking/creating policies:", policiesError);
        }
      }
    }

    // Skip all policy creation if we've determined we don't have permission
    if (!hasPolicyCreationPermission) {
      console.log(
        "Database setup completed - skipped policy creation due to permission issues"
      );
      return;
    }

    // Add specific policies for user_presence
    try {
      const { error: presencePoliciesError } = await supabase.rpc(
        "create_presence_policies"
      );
      if (presencePoliciesError) {
        if (presencePoliciesError.code === "42710") {
          console.log("Presence policies already exist, continuing...");
        } else if (
          presencePoliciesError.code === "42501" ||
          presencePoliciesError.code === "403"
        ) {
          console.log(
            "No permission to create presence policies, skipping remaining policy creation..."
          );
          // Remember this permission issue
          localStorage.setItem("policyPermissionDenied", "true");
          // Exit early
          console.log(
            "Database setup completed - stopped at presence policies"
          );
          return;
        } else {
          console.error(
            "Error creating presence policies:",
            presencePoliciesError
          );
        }
      }
    } catch (error) {
      console.log("Skipping presence policies creation:", error.message);
      if (error.code === "42501" || error.code === "403") {
        localStorage.setItem("policyPermissionDenied", "true");
        return;
      }
    }

    // Add specific policies for follow_requests
    try {
      const { error: followPoliciesError } = await supabase.rpc(
        "create_follow_policies"
      );
      if (followPoliciesError) {
        if (followPoliciesError.code === "42710") {
          console.log("Follow request policies already exist, continuing...");
        } else if (
          followPoliciesError.code === "42501" ||
          followPoliciesError.code === "403"
        ) {
          console.log(
            "No permission to create follow policies, skipping remaining policy creation..."
          );
          localStorage.setItem("policyPermissionDenied", "true");
          return;
        } else {
          console.error("Error creating follow policies:", followPoliciesError);
        }
      }
    } catch (error) {
      console.log("Skipping follow policies creation:", error.message);
      if (error.code === "42501" || error.code === "403") {
        localStorage.setItem("policyPermissionDenied", "true");
        return;
      }
    }

    // Add specific policies for user_relationships
    try {
      const { error: relationshipPoliciesError } = await supabase.rpc(
        "create_relationship_policies"
      );
      if (relationshipPoliciesError) {
        if (relationshipPoliciesError.code === "42710") {
          console.log("Relationship policies already exist, continuing...");
        } else if (
          relationshipPoliciesError.code === "42501" ||
          relationshipPoliciesError.code === "403"
        ) {
          console.log(
            "No permission to create relationship policies, skipping remaining policy creation..."
          );
          localStorage.setItem("policyPermissionDenied", "true");
          return;
        } else {
          console.error(
            "Error creating relationship policies:",
            relationshipPoliciesError
          );
        }
      }
    } catch (error) {
      console.log("Skipping relationship policies creation:", error.message);
      if (error.code === "42501" || error.code === "403") {
        localStorage.setItem("policyPermissionDenied", "true");
        return;
      }
    }

    // Add specific policies for conversation_participants
    try {
      const { error: conversationPoliciesError } = await supabase.rpc(
        "create_conversation_policies"
      );
      if (conversationPoliciesError) {
        if (conversationPoliciesError.code === "42710") {
          console.log("Conversation policies already exist, continuing...");
        } else if (
          conversationPoliciesError.code === "42501" ||
          conversationPoliciesError.code === "403"
        ) {
          console.log(
            "No permission to create conversation policies, skipping..."
          );
          localStorage.setItem("policyPermissionDenied", "true");
        } else {
          console.error(
            "Error creating conversation policies:",
            conversationPoliciesError
          );
        }
      }
    } catch (error) {
      console.log("Skipping conversation policies creation:", error.message);
    }

    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up database:", error);
  }
}
