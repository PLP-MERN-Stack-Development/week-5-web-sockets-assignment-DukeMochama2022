import React from "react";

export default function TypingIndicator({ typingUsers, username }) {
  const others = typingUsers.filter((u) => u !== username);
  if (others.length === 0) return null;
  return (
    <div className="px-6 py-1 min-h-[24px] text-sm text-purple-600">
      {others.join(", ")} {others.length > 1 ? "are" : "is"} typing...
    </div>
  );
}
