import React, { useContext, useEffect, useState, useRef } from "react";
import { SocketContext } from "../context/SocketContext";
import UsernameForm from "../components/UsernameForm";
import ChatRoom from "../components/ChatRoom";
import RoomList from "../components/RoomList";
import UserList from "../components/UserList";
import PrivateChat from "../components/PrivateChat";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import Spinner from "../components/Spinner";
import { v4 as uuidv4 } from "uuid";

const playNotificationSound = () => {
  const audio = new window.Audio("/notification.wav");
  audio.play();
};

const showBrowserNotification = (title, body) => {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, { body });
    notification.onclick = () => window.focus();
  }
};

export default function Home() {
  const { socket } = useContext(SocketContext);

  // Auth and input
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // Chat state
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [input, setInput] = useState("");
  const [rooms, setRooms] = useState(["general"]);
  const [currentRoom, setCurrentRoom] = useState("general");

  // Private chat state
  const [privateChatUser, setPrivateChatUser] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateInput, setPrivateInput] = useState("");

  // Unread message counts
  const [unreadRooms, setUnreadRooms] = useState({});
  const [unreadPrivates, setUnreadPrivates] = useState({});
  const [isConnected, setIsConnected] = useState(true);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const PAGE_SIZE = 20;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for latest state values
  const usernameRef = useRef("");
  const currentRoomRef = useRef("general");
  const privateChatUserRef = useRef(null);
  const onlineUsersRef = useRef([]);

  // Keep refs in sync with state
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);
  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);
  useEffect(() => {
    privateChatUserRef.current = privateChatUser;
  }, [privateChatUser]);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  // Handle socket events (register only once)
  useEffect(() => {
    socket.on("username_error", (msg) => setUsernameError(msg));
    socket.on("user_list", setOnlineUsers);
    socket.on("receive_message", (msg) => {
      if (msg.room === currentRoomRef.current) {
        setMessages((prev) => {
          const existingIdx = prev.findIndex(
            (m) => (msg.tempId && m.tempId === msg.tempId) || m.id === msg.id
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              ...msg,
              status: "delivered",
            };
            return updated;
          } else {
            return [...prev, msg];
          }
        });
      } else {
        playNotificationSound();
        toast.info(
          `New message in #${msg.room} from ${msg.sender}: ${msg.message}`
        );
        if (document.visibilityState !== "visible") {
          showBrowserNotification(
            `New message in #${msg.room} from ${msg.sender}`,
            msg.message
          );
        }
        setUnreadRooms((prev) => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1,
        }));
      }
    });
    socket.on("typing_users", setTypingUsers);
    socket.on("room_list", setRooms);
    socket.on("user_joined_room", ({ room, username: joinedUsername }) => {
      setCurrentRoom(room);
      setMessages([]);
      if (
        room === currentRoomRef.current &&
        joinedUsername &&
        joinedUsername !== usernameRef.current
      ) {
        toast.success(`${joinedUsername} joined #${room}`);
      }
    });
    socket.on("user_joined", ({ username: joinedUsername }) => {
      if (joinedUsername && joinedUsername !== usernameRef.current) {
        toast.success(`${joinedUsername} joined the chat!`);
      }
    });
    socket.on("user_left", ({ username: leftUsername }) => {
      if (leftUsername && leftUsername !== usernameRef.current) {
        toast.warn(`${leftUsername} left the chat.`);
      }
    });
    socket.on("private_message", (msg) => {
      const mySocketId = socket.id;
      const otherUserId = msg.senderId === mySocketId ? msg.to : msg.senderId;
      const user = onlineUsersRef.current.find((u) => u.id === otherUserId);
      setPrivateMessages((prev) => {
        const existingIdx = prev.findIndex(
          (m) => (msg.tempId && m.tempId === msg.tempId) || m.id === msg.id
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...msg,
            status: "delivered",
            isMe: msg.senderId === socket.id,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: msg.id,
              tempId: msg.tempId,
              message: msg.message,
              image: msg.image,
              isMe: msg.senderId === socket.id,
              senderId: msg.senderId,
              to: msg.to,
              read: msg.read,
              timestamp: msg.timestamp,
              status:
                msg.status ||
                (msg.senderId === socket.id ? "delivered" : undefined),
              reactions: msg.reactions || {},
            },
          ];
        }
      });
      if (
        !privateChatUserRef.current ||
        privateChatUserRef.current.id !== otherUserId
      ) {
        if (user) setPrivateChatUser(user);
        playNotificationSound();
        toast.info(`New private message from @${msg.sender}: ${msg.message}`);
        if (document.visibilityState !== "visible") {
          showBrowserNotification(
            `New private message from @${msg.sender}`,
            msg.message
          );
        }
        setUnreadPrivates((prev) => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || 0) + 1,
        }));
      }
    });
    socket.on("private_message_read", ({ messageId, readerId }) => {
      setPrivateMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
      );
    });
    socket.on("message_reaction", (reactionData) => {
      const { messageId, reaction, userId, username, action } = reactionData;
      if (action === "add") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    ...m.reactions,
                    [reaction]: [
                      ...(m.reactions?.[reaction] || []),
                      { userId, username },
                    ],
                  },
                }
              : m
          )
        );
        setPrivateMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    ...m.reactions,
                    [reaction]: [
                      ...(m.reactions?.[reaction] || []),
                      { userId, username },
                    ],
                  },
                }
              : m
          )
        );
      } else if (action === "remove") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    ...m.reactions,
                    [reaction]: (m.reactions?.[reaction] || []).filter(
                      (user) => user.userId !== userId
                    ),
                  },
                }
              : m
          )
        );
        setPrivateMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    ...m.reactions,
                    [reaction]: (m.reactions?.[reaction] || []).filter(
                      (user) => user.userId !== userId
                    ),
                  },
                }
              : m
          )
        );
      }
    });
    return () => {
      socket.off("username_error");
      socket.off("user_list");
      socket.off("receive_message");
      socket.off("typing_users");
      socket.off("room_list");
      socket.off("user_joined_room");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("private_message");
      socket.off("private_message_read");
      socket.off("message_reaction");
    };
  }, []); // Only run once on mount

  // Emit read receipts when opening a private chat
  useEffect(() => {
    if (privateChatUser && privateMessages.length > 0) {
      privateMessages.forEach((msg) => {
        if (!msg.isMe && !msg.read) {
          socket.emit("private_message_read", {
            messageId: msg.id,
            recipientId: msg.senderId,
          });
        }
      });
    }
    // eslint-disable-next-line
  }, [privateChatUser, privateMessages]);

  // Join chat when username is set
  useEffect(() => {
    if (username) {
      socket.emit("user_join", username);
      setCurrentRoom("general");
      setMessages([]);
    }
  }, [username, socket]);

  // Reset unread count when entering a room
  useEffect(() => {
    setUnreadRooms((prev) => ({ ...prev, [currentRoom]: 0 }));
  }, [currentRoom]);

  // Reset unread count when opening a private chat
  useEffect(() => {
    if (privateChatUser) {
      setUnreadPrivates((prev) => ({ ...prev, [privateChatUser.id]: 0 }));
    }
  }, [privateChatUser]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Reconnection logic and user feedback
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      toast.success("Reconnected to server!");
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      toast.error("Disconnected from server. Trying to reconnect...");
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  // Fetch initial messages for the current room
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingOlder(true);
      try {
        const res = await axios.get(
          `/api/messages?room=${currentRoom}&offset=0&limit=${PAGE_SIZE}`
        );
        setMessages(res.data.messages || []);
        setHasMore(res.data.hasMore);
        setMessageOffset(0);
      } catch (err) {
        // Optionally show error
      }
      setLoadingOlder(false);
    };
    fetchMessages();
  }, [currentRoom]);

  // Load older messages
  const loadOlderMessages = async () => {
    setLoadingOlder(true);
    try {
      const res = await axios.get(
        `/api/messages?room=${currentRoom}&offset=${
          messageOffset + PAGE_SIZE
        }&limit=${PAGE_SIZE}`
      );
      setMessages((prev) => [...res.data.messages, ...prev]);
      setHasMore(res.data.hasMore);
      setMessageOffset((prev) => prev + PAGE_SIZE);
    } catch (err) {
      // Optionally show error
    }
    setLoadingOlder(false);
  };

  // Handle sending a message (now supports image and delivery ack)
  const sendMessage = (e, image) => {
    e.preventDefault();
    if (input.trim() || image) {
      const tempId = uuidv4();
      const newMsg = {
        id: tempId,
        tempId,
        message: input,
        image,
        sender: username,
        senderId: socket.id,
        room: currentRoom,
        timestamp: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, newMsg]);
      socket.emit(
        "send_message",
        { message: input, room: currentRoom, image, tempId },
        (ack) => {
          if (ack && ack.delivered && ack.tempId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.tempId === ack.tempId
                  ? { ...m, id: ack.id, status: "delivered" }
                  : m
              )
            );
          }
        }
      );
      // Fallback: mark as failed if not delivered in 5s
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId && m.status === "sending"
              ? { ...m, status: "failed" }
              : m
          )
        );
      }, 5000);
      setInput("");
      socket.emit("typing", false);
    }
  };

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket.emit("typing", e.target.value.length > 0);
  };

  // Handle username form
  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      setUsernameError("");
      setUsername(usernameInput.trim());
      setUsernameInput("");
    }
  };

  // Handle joining/creating a room
  const handleJoinRoom = (room) => {
    if (room !== currentRoom) {
      socket.emit("join_room", room);
      setCurrentRoom(room);
      setMessages([]);
    }
  };

  // Handle opening a private chat
  const handleSelectUser = (user) => {
    setPrivateChatUser(user);
    setPrivateMessages([]);
    setPrivateInput("");
  };

  // Handle sending a private message (now supports image and delivery ack)
  const handleSendPrivate = (e, image) => {
    e.preventDefault();
    if ((privateInput.trim() || image) && privateChatUser) {
      const tempId = uuidv4();
      const newMsg = {
        id: tempId,
        tempId,
        message: privateInput,
        image,
        sender: username,
        senderId: socket.id,
        to: privateChatUser.id,
        timestamp: new Date().toISOString(),
        isMe: true, // <-- change to senderId === socket.id for consistency
        status: "sending",
      };
      setPrivateMessages((prev) => [...prev, newMsg]);
      socket.emit(
        "private_message",
        { to: privateChatUser.id, message: privateInput, image, tempId },
        (ack) => {
          if (ack && ack.delivered && ack.tempId) {
            setPrivateMessages((prev) =>
              prev.map((m) =>
                m.tempId === ack.tempId
                  ? { ...m, id: ack.id, status: "delivered" }
                  : m
              )
            );
          }
        }
      );
      // Fallback: mark as failed if not delivered in 5s
      setTimeout(() => {
        setPrivateMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId && m.status === "sending"
              ? { ...m, status: "failed" }
              : m
          )
        );
      }, 5000);
      setPrivateInput("");
    }
  };

  // Handle closing private chat
  const handleClosePrivate = () => {
    setPrivateChatUser(null);
    setPrivateMessages([]);
    setPrivateInput("");
  };

  // Handle reaction clicks
  const handleReaction = (messageId, reaction) => {
    socket.emit("message_reaction", {
      messageId,
      reaction,
      room: currentRoom,
      isPrivate: false,
    });
  };

  // Handle private reaction clicks
  const handlePrivateReaction = (messageId, reaction) => {
    if (privateChatUser) {
      socket.emit("message_reaction", {
        messageId,
        reaction,
        isPrivate: true,
        recipientId: privateChatUser.id,
      });
    }
  };

  // Handle reaction removal
  const handleRemoveReaction = (messageId, reaction) => {
    socket.emit("remove_reaction", {
      messageId,
      reaction,
      room: currentRoom,
      isPrivate: false,
    });
  };

  // Handle private reaction removal
  const handlePrivateRemoveReaction = (messageId, reaction) => {
    if (privateChatUser) {
      socket.emit("remove_reaction", {
        messageId,
        reaction,
        isPrivate: true,
        recipientId: privateChatUser.id,
      });
    }
  };

  // Filtered messages for room
  const filteredMessages = searchQuery
    ? messages.filter(
        (msg) =>
          (msg.message &&
            msg.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (msg.sender &&
            msg.sender.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : messages;

  // Filtered messages for private chat
  const filteredPrivateMessages = searchQuery
    ? privateMessages.filter(
        (msg) =>
          msg.message &&
          msg.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : privateMessages;

  if (!username) {
    return (
      <UsernameForm
        usernameInput={usernameInput}
        setUsernameInput={setUsernameInput}
        usernameError={usernameError}
        onSubmit={handleUsernameSubmit}
      />
    );
  }

  return (
    <>
      {!isConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center py-2 z-50">
          Disconnected. Trying to reconnect...
        </div>
      )}
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
        <header className="py-4 bg-white shadow flex flex-col sm:flex-row justify-between items-center px-4 sm:px-8">
          <h1 className="text-xl sm:text-2xl font-bold text-purple-700 mb-2 sm:mb-0">
            ChatMax
          </h1>
          <span className="text-gray-600 text-sm sm:text-base">
            Logged in as <b className="text-blue-600">{username}</b>
          </span>
        </header>
        {/* Responsive main layout: sidebar on md+, stacked on mobile */}
        <main className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 py-2 sm:py-6 px-1 sm:px-4 w-full max-w-7xl mx-auto">
          {/* Sidebar for users and rooms */}
          <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 flex flex-col gap-2 mb-2 md:mb-0">
            <div className="bg-white/80 rounded-lg shadow p-2 md:p-4 flex flex-col gap-2 h-full min-h-0">
              <UserList
                users={onlineUsers}
                currentUser={username}
                onSelectUser={handleSelectUser}
                unreadPrivates={unreadPrivates}
              />
              <RoomList
                rooms={rooms}
                currentRoom={currentRoom}
                onJoinRoom={handleJoinRoom}
                unreadRooms={unreadRooms}
              />
            </div>
          </aside>
          {/* Main chat area */}
          <section className="flex-1 flex flex-col min-h-0">
            {/* Search input */}
            <div className="mb-2 flex justify-center">
              <input
                type="text"
                className="px-3 py-2 rounded border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full max-w-md text-sm sm:text-base"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Show spinner for initial load */}
            {loadingOlder && messages.length === 0 && (
              <Spinner className="my-8" />
            )}
            {/* Load older messages button and spinner */}
            {hasMore && (
              <div className="flex flex-col items-center mb-2">
                {loadingOlder && messages.length > 0 && (
                  <Spinner className="mb-2" />
                )}
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="bg-purple-200 hover:bg-purple-300 text-purple-800 px-3 sm:px-4 py-1 rounded shadow text-xs sm:text-sm font-semibold"
                >
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}
            {/* Chat area with scrollable messages */}
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              <ChatRoom
                username={username}
                onlineUsers={onlineUsers}
                messages={filteredMessages}
                typingUsers={typingUsers}
                input={input}
                onInputChange={handleInputChange}
                onSend={sendMessage}
                onReaction={handleReaction}
                onRemoveReaction={handleRemoveReaction}
                searchQuery={searchQuery}
              />
            </div>
          </section>
          {/* Private chat modal (remains fixed and centered) */}
          {privateChatUser && (
            <PrivateChat
              messages={filteredPrivateMessages}
              input={privateInput}
              onInputChange={(e) => setPrivateInput(e.target.value)}
              onSend={handleSendPrivate}
              recipient={privateChatUser}
              onClose={handleClosePrivate}
              onReaction={handlePrivateReaction}
              onRemoveReaction={handlePrivateRemoveReaction}
              searchQuery={searchQuery}
            />
          )}
        </main>
        <footer className="text-center text-white py-2 opacity-80 text-xs sm:text-base">
          &copy; {new Date().getFullYear()} ChatMax &mdash; Real-time chat
          powered by Socket.io & React
        </footer>
      </div>
    </>
  );
}
