import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function FriendsList({ friends, selectedChat, onFriendSelect }) {
  const navigate = useNavigate();

  // Debug: Log friends data on component mount
  useEffect(() => {
    if (friends && friends.length > 0) {
      console.log("Friends in FriendsList:", friends);
      // Log specific avatar_url values
      friends.forEach((friend) => {
        console.log(`Friend ${friend.id} avatar:`, friend.avatar_url);
      });
    }
  }, [friends]);

  // Format last message time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Navigate to profile
  const navigateToProfile = (e, userId) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  // If no friends, show empty state
  if (!friends || friends.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No friends yet</h3>
        <p className="mb-4">Follow other users to start chatting with them</p>
        <p className="text-sm">
          You can search for users in the search bar above
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-800/50">
      {friends.map((friend) => (
        <li key={friend.id}>
          <button
            onClick={() => onFriendSelect(friend)}
            className={`w-full flex items-center p-3 hover:bg-gray-800/50 ${
              selectedChat && selectedChat.id === friend.id
                ? "bg-gray-800/70"
                : ""
            }`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 overflow-hidden">
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.username || "User"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log(
                        `Failed to load image for ${friend.id}:`,
                        friend.avatar_url
                      );
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <span>
                    {friend.username ? friend.username[0].toUpperCase() : "U"}
                  </span>
                )}
              </div>
              {friend.is_online && (
                <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3
                  className="font-medium truncate cursor-pointer hover:underline"
                  onClick={(e) => navigateToProfile(e, friend.id)}
                >
                  {friend.full_name
                    ? friend.full_name.length > 12
                      ? friend.full_name.slice(0, 12) + "..."
                      : friend.full_name
                    : friend.username
                    ? friend.username.length > 12
                      ? friend.username.slice(0, 12) + "..."
                      : friend.username
                    : friend.email}
                </h3>
                {friend.last_message_time && (
                  <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                    {formatTime(friend.last_message_time)}
                  </span>
                )}
              </div>
              {friend.username && friend.full_name && (
                <p className="text-xs text-gray-400 truncate">
                  @{friend.username}
                </p>
              )}
              {friend.last_message && (
                <p className="text-sm text-gray-400 truncate">
                  {friend.last_message}
                </p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default FriendsList;
