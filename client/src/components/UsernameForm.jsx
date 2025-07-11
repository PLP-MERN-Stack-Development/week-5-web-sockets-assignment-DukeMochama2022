import React from "react";

export default function UsernameForm({
  usernameInput,
  setUsernameInput,
  usernameError,
  onSubmit,
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
          Welcome to ChatMax 🚀
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            className="px-4 py-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Enter your username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            autoFocus
          />
          {usernameError && (
            <div className="text-red-500 text-sm">{usernameError}</div>
          )}
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold py-2 rounded shadow hover:from-purple-700 hover:to-blue-600 transition"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}
