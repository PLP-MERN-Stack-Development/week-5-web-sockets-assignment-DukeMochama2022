import React, { useRef, useState } from "react";
import { toast } from "react-toastify";

export default function MessageInput({ input, onInputChange, onSend }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef();

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

  return (
    <form
      onSubmit={handleSend}
      className="flex gap-2 px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-purple-100 to-blue-100 rounded-b-xl items-center"
    >
      <input
        className="flex-1 px-4 py-2 rounded border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
        placeholder="Type your message..."
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
        id="image-upload"
      />
      <label
        htmlFor="image-upload"
        className="cursor-pointer bg-purple-200 hover:bg-purple-300 text-purple-800 px-3 py-2 rounded shadow text-sm"
      >
        📷
      </label>
      <button
        type="submit"
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-6 py-2 rounded shadow hover:from-blue-600 hover:to-purple-700 transition"
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
  );
}
