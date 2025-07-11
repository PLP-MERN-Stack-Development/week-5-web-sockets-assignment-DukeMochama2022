import React, { useRef, useEffect, useState } from "react";
import { toast } from "react-toastify";

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

export default function PrivateChat({
  messages,
  input,
  onInputChange,
  onSend,
  recipient,
  onClose,
  onReaction,
  onRemoveReaction,
  searchQuery,
}) {
  const messagesEndRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB
        toast.error("Image is too large (max 2MB)");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target.result);
        setPreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() || image) {
      onSend(e, image);
      setImage(null);
      setPreview(null);
      fileInputRef.current.value = "";
    }
  };

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
      (user) => user.username === recipient.username
    );
  };

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-2xl p-0 w-full max-w-md relative">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">
            Private chat with{" "}
            <span className="text-yellow-200">@{recipient.username}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-white hover:text-red-300 font-bold focus:outline-none ml-4"
            title="Close"
          >
            &times;
          </button>
        </div>
        <div className="border-b border-blue-200" />
        <div className="h-64 overflow-y-auto mb-4 bg-blue-50 rounded-b-xl p-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${msg.isMe ? "text-right" : "text-left"}`}
            >
              <span
                className={`inline-block px-3 py-1 rounded-lg shadow-sm relative ${
                  msg.isMe
                    ? "bg-blue-500 text-white"
                    : "bg-purple-200 text-purple-900"
                }`}
              >
                {highlightText(msg.message, searchQuery)}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="shared"
                    className="mt-2 max-w-xs max-h-48 rounded border-2 border-purple-300 shadow"
                  />
                )}
                {/* Delivery status for sent messages */}
                {msg.isMe && (
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
                {/* Read receipt for sent messages */}
                {msg.isMe && msg.read && (
                  <span className="absolute bottom-0 right-1 text-green-300 text-xs font-bold select-none">
                    ✓
                  </span>
                )}
              </span>
              <div className="text-xs text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString()}
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
        <form
          onSubmit={handleSend}
          className="flex gap-2 px-4 pb-4 items-center"
        >
          <input
            className="flex-1 px-3 py-2 border rounded focus:outline-none"
            placeholder="Type a private message..."
            value={input}
            onChange={onInputChange}
            autoFocus
          />
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            id="private-image-upload"
          />
          <label
            htmlFor="private-image-upload"
            className="cursor-pointer bg-purple-200 hover:bg-purple-300 text-purple-800 px-3 py-2 rounded shadow text-sm"
          >
            📷
          </label>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
          >
            Send
          </button>
          {preview && (
            <img
              src={preview}
              alt="preview"
              className="w-10 h-10 object-cover rounded ml-2 border-2 border-purple-400"
            />
          )}
        </form>
      </div>
    </div>
  );
}
