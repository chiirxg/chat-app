import { useState, useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

const chatChannel = typeof window !== "undefined" && window.BroadcastChannel
  ? new BroadcastChannel("soc_chat_app_channel")
  : null;

function App() {
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [globalMessages, setGlobalMessages] = useState({});
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("soc_chat_theme") === "dark" || true;
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("soc_chat_theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("soc_chat_theme", "light");
    }
  }, [darkMode]);

  // Track Unread Badges & Room Isolation across tabs
  useEffect(() => {
    if (!chatChannel) return;

    const handleBroadcast = (event) => {
      const { type, roomId, message, room } = event.data || {};

      if (type === "NEW_MESSAGE" && message && roomId) {
        setGlobalMessages((prev) => {
          const roomMsgs = prev[roomId] || [];
          if (roomMsgs.some((m) => m.id === message.id)) return prev;
          return {
            ...prev,
            [roomId]: [...roomMsgs, message]
          };
        });

        if (roomId !== activeRoomId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [roomId]: (prev[roomId] || 0) + 1
          }));
        }
      } else if (type === "NEW_ROOM" && room) {
        if (room.isDirectMessage) {
          setActiveRoomId(room.id);
        }
      }
    };

    chatChannel.addEventListener("message", handleBroadcast);
    return () => chatChannel.removeEventListener("message", handleBroadcast);
  }, [activeRoomId]);

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    setUnreadCounts((prev) => ({
      ...prev,
      [roomId]: 0
    }));
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ProtectedRoute>
      <div className={`app-layout ${darkMode ? "dark-theme" : "light-theme"}`}>
        <Sidebar
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          unreadCounts={unreadCounts}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          isMobileOpen={isMobileSidebarOpen}
          closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        />
        <ChatWindow
          roomId={activeRoomId}
          globalMessages={globalMessages}
          setGlobalMessages={setGlobalMessages}
          toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
      </div>
    </ProtectedRoute>
  );
}

export default App;
