import React from "react";

export default function Spinner({ className = "" }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );
}
