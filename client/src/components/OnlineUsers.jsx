import React from "react";

export default function OnlineUsers({ onlineUsers, username }) {
  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-200 bg-gradient-to-r from-purple-100 to-blue-100 rounded-t-xl">
      <span className="font-semibold text-purple-700">Online:</span>
      {onlineUsers.map((u) => (
        <span
          key={u.id}
          className={`px-2 py-1 rounded text-xs font-medium ${
            u.username === username
              ? "bg-blue-200 text-blue-800"
              : "bg-purple-200 text-purple-800"
          }`}
        >
          @{u.username}
        </span>
      ))}
    </div>
  );
}
