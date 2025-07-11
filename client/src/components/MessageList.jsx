import React, { useRef, useEffect, useState } from "react";

function highlightText(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 px-1 rounded">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function MessageList({
  messages,
  username,
  onReaction,
  onRemoveReaction,
  searchQuery,
}) {
  const messagesEndRef = useRef(null);
  const [reactions, setReactions] = useState({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReaction = (messageId, reaction) => {
    if (onReaction) {
      onReaction(messageId, reaction);
    }
  };

  const handleRemoveReaction = (messageId, reaction) => {
    if (onRemoveReaction) {
      onRemoveReaction(messageId, reaction);
    }
  };

  const hasUserReacted = (message, reaction) => {
    return message.reactions?.[reaction]?.some(
      (user) => user.username === username
    );
  };

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-gradient-to-br from-white to-purple-50">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col ${
            msg.sender === username ? "items-end" : "items-start"
          }`}
        >
          <div
            className={`px-4 py-2 rounded-lg shadow relative ${
              msg.sender === username
                ? "bg-blue-500 text-white"
                : "bg-purple-200 text-purple-900"
            }`}
          >
            <span className="font-semibold">
              {highlightText(msg.sender, searchQuery)}
            </span>
            <span className="ml-2 text-xs text-gray-200">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
            <div>{highlightText(msg.message, searchQuery)}</div>
            {msg.image && (
              <img
                src={msg.image}
                alt="shared"
                className="mt-2 max-w-xs max-h-48 rounded border-2 border-purple-300 shadow"
              />
            )}
            {/* Delivery status for sent messages */}
            {msg.sender === username && (
              <span className="absolute bottom-1 right-2 text-xs select-none">
                {msg.status === "sending" && (
                  <span className="inline-block align-middle animate-spin text-blue-200">
                    ⏳
                  </span>
                )}
                {msg.status === "delivered" && (
                  <span className="inline-block align-middle text-green-300 font-bold">
                    ✓
                  </span>
                )}
                {msg.status === "failed" && (
                  <span className="inline-block align-middle text-red-500 font-bold">
                    ⚠️
                  </span>
                )}
              </span>
            )}
          </div>
          {/* Reaction buttons */}
          <div className="flex gap-1 mt-1">
            {reactionEmojis.map((emoji) => {
              const hasReacted = hasUserReacted(msg, emoji);
              return (
                <button
                  key={emoji}
                  onClick={() =>
                    hasReacted
                      ? handleRemoveReaction(msg.id, emoji)
                      : handleReaction(msg.id, emoji)
                  }
                  className={`text-sm rounded px-1 py-1 transition-colors ${
                    hasReacted
                      ? "bg-blue-200 hover:bg-red-200"
                      : "hover:bg-gray-200"
                  }`}
                  title={
                    hasReacted
                      ? `Remove ${emoji} reaction`
                      : `React with ${emoji}`
                  }
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          {/* Reaction counts */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {Object.entries(msg.reactions)
                .filter(([_, users]) => users.length > 0)
                .map(([reaction, users]) => (
                  <span
                    key={reaction}
                    className={`text-xs px-2 py-1 rounded-full ${
                      hasUserReacted(msg, reaction)
                        ? "bg-blue-200 text-blue-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {reaction} {users.length}
                  </span>
                ))}
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
