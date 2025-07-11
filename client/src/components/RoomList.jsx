import React, { useState } from "react";

// Add pulse animation style
const badgePulse = `
@keyframes badge-pulse {
  0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
  70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
`;

export default function RoomList({
  rooms,
  currentRoom,
  onJoinRoom,
  unreadRooms = {},
}) {
  const [newRoom, setNewRoom] = useState("");

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      onJoinRoom(newRoom.trim());
      setNewRoom("");
    }
  };

  return (
    <div className="mb-4">
      {/* Inject pulse animation style */}
      <style>{badgePulse}</style>
      <h2 className="font-bold text-lg text-purple-700 mb-2">Rooms</h2>
      <div className="flex gap-2 flex-wrap mb-2">
        {rooms.map((room) => {
          const hasUnread = unreadRooms[room] > 0;
          return (
            <button
              key={room}
              onClick={() => onJoinRoom(room)}
              className={`relative px-3 py-1 rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
                ${
                  currentRoom === room
                    ? "bg-blue-500 text-white border-2 border-blue-700"
                    : hasUnread
                    ? "bg-purple-200 text-purple-900 border-2 border-red-400 shadow-md animate-pulse"
                    : "bg-purple-200 text-purple-900 hover:bg-purple-300 border border-purple-300"
                }
              `}
              aria-label={
                hasUnread
                  ? `#${room}, ${unreadRooms[room]} unread messages`
                  : `#${room}`
              }
            >
              #{room}
              {hasUnread && (
                <span
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold shadow"
                  style={{ animation: "badge-pulse 1.5s infinite" }}
                  aria-label={`${unreadRooms[room]} unread messages`}
                >
                  {unreadRooms[room]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <form onSubmit={handleCreateRoom} className="flex gap-2 mt-2">
        <input
          className="px-2 py-1 border rounded focus:outline-none"
          placeholder="New room name"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Create
        </button>
      </form>
    </div>
  );
}
