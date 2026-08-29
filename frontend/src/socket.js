import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("syncspace_token");
  const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
    /\/api\/?$/,
    ""
  );

  socket = io(baseURL, {
    auth: { token },
    autoConnect: false,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
