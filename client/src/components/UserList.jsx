import React from "react";

export default function UserList({
  users,
  currentUser,
  onSelectUser,
  unreadPrivates = {},
}) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-lg text-purple-700 mb-2">Users</h2>
      <div className="flex gap-2 flex-wrap">
        {users
          .filter((u) => u.username !== currentUser)
          .map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUser(u)}
              className="relative px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              @{u.username}
              {unreadPrivates[u.id] > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold shadow">
                  {unreadPrivates[u.id]}
                </span>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}
