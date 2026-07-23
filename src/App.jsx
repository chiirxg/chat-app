import { useState, useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

function App() {
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("soc_chat_theme") === "dark" || true; // Default dark
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

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <ProtectedRoute>
      <div className={`app-layout ${darkMode ? "dark-theme" : "light-theme"}`}>
        <Sidebar
          activeRoomId={activeRoomId}
          onSelectRoom={(id) => setActiveRoomId(id)}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          isMobileOpen={isMobileSidebarOpen}
          closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        />
        <ChatWindow
          roomId={activeRoomId}
          toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
      </div>
    </ProtectedRoute>
  );
}

export default App;
