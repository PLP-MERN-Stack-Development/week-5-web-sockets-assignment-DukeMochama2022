import React, { useRef, useEffect } from "react";
import OnlineUsers from "./OnlineUsers";
import MessageList from "./MessageList";
import TypingIndicator from "./TypingIndicator";
import MessageInput from "./MessageInput";

export default function ChatRoom({
  username,
  onlineUsers,
  messages,
  typingUsers,
  input,
  onInputChange,
  onSend,
  onReaction,
  onRemoveReaction,
}) {
  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg flex flex-col h-[70vh]">
      <OnlineUsers onlineUsers={onlineUsers} username={username} />
      <MessageList
        messages={messages}
        username={username}
        onReaction={onReaction}
        onRemoveReaction={onRemoveReaction}
      />
      <TypingIndicator typingUsers={typingUsers} username={username} />
      <MessageInput
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
      />
    </div>
  );
}
