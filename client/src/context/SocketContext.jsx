import React, { createContext } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();


export const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket"],
});

export const SocketProvider = ({ children }) => (
  <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
);
