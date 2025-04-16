import React, { useState, useEffect } from "react";
import { supabase } from "./SupabaseClient.jsx";

const Notifications = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followRequests, setFollowRequests] = useState([]);

  // Set up auth state listener
  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };

    checkSession();

    // Set up auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch follow requests
  useEffect(() => {
    if (user) {
      fetchFollowRequests();
      setupFollowRequestsSubscription();
    }
  }, [user]);

  const fetchFollowRequests = async () => {
    try {
      // First fetch the follow requests
      const { data: requests, error: requestsError } = await supabase
        .from("follow_requests")
        .select("id, sender_id, status, created_at")
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Then fetch the sender profiles
      const senderIds = requests?.map((request) => request.sender_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", senderIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData =
        requests?.map((request) => ({
          ...request,
          sender: profiles?.find((profile) => profile.id === request.sender_id),
        })) || [];

      setFollowRequests(combinedData);
    } catch (error) {
      console.error("Error fetching follow requests:", error);
    }
  };

  const setupFollowRequestsSubscription = () => {
    const channel = supabase
      .channel("follow_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "follow_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchFollowRequests();
          } else if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "DELETE"
          ) {
            fetchFollowRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFollowRequestResponse = async (requestId, accepted) => {
    try {
      const { error: updateError } = await supabase
        .from("follow_requests")
        .update({ status: accepted ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (accepted) {
        const request = followRequests.find((r) => r.id === requestId);
        if (request) {
          // First check if relationship already exists
          const { data: existingRelationship, error: checkError } =
            await supabase
              .from("user_relationships")
              .select("id")
              .eq("user_id", user.id)
              .eq("following_id", request.sender_id)
              .single();

          if (checkError && checkError.code !== "PGRST116") {
            // PGRST116 is "no rows returned"
            throw checkError;
          }

          if (!existingRelationship) {
            const { error: relationshipError } = await supabase
              .from("user_relationships")
              .insert({
                user_id: user.id,
                following_id: request.sender_id,
              });

            if (relationshipError) throw relationshipError;
          }
        }
      }

      setFollowRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error("Error handling follow request:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <div className="spinner h-10 w-10 rounded-full border-4 border-gray-600 border-t-white animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b border-gray-800 pb-4">
          Notifications
        </h1>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Follow Requests</h2>
          {followRequests.length === 0 ? (
            <div className="p-6 bg-gray-800/40 rounded-lg text-gray-400 text-center backdrop-blur-sm">
              No pending follow requests
            </div>
          ) : (
            <div className="space-y-4">
              {followRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-800/40 rounded-lg p-4 backdrop-blur-sm border border-gray-700/30 hover:bg-gray-700/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {(request.sender?.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-lg">
                          {request.sender?.full_name ||
                            request.sender?.username ||
                            "Unknown User"}
                        </p>
                        <p className="text-sm text-gray-400">
                          Wants to follow you
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() =>
                          handleFollowRequestResponse(request.id, true)
                        }
                        className="px-4 py-2 bg-gradient-to-bl from-green-900 to-blue-900 text-white rounded-md hover:opacity-90 transition-opacity"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() =>
                          handleFollowRequestResponse(request.id, false)
                        }
                        className="px-4 py-2 bg-gray-700/60 text-white rounded-md hover:bg-gray-600/60 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Activity</h2>
          <div className="p-6 bg-gray-800/40 rounded-lg text-gray-400 text-center backdrop-blur-sm">
            No recent activity
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
