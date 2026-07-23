import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, rtdb } from "../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { ref as rtdbRef, onValue } from "firebase/database";
import NewRoomModal from "./NewRoomModal";
import "./Sidebar.css";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  LogOut, 
  Sun, 
  Moon, 
  Users, 
  Hash,
  MessageCircle,
  Bot,
  X
} from "lucide-react";

const chatChannel = typeof window !== "undefined" && window.BroadcastChannel
  ? new BroadcastChannel("soc_chat_app_channel")
  : null;

function Sidebar({ activeRoomId, onSelectRoom, unreadCounts = {}, darkMode, toggleDarkMode, isMobileOpen, closeMobileSidebar }) {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([
    { id: "general", name: "General Chat", description: "Default discussion room" },
    { id: "ai-bot", name: "SOC AI Assistant", description: "Chat live with AI Bot", isBot: true },
    { id: "tech", name: "Tech & Code", description: "Developers hangout" },
    { id: "random", name: "Random & Fun", description: "Casual conversations" }
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userStatus, setUserStatus] = useState("online");

  // Listen to BroadcastChannel for real-time room creation across tabs
  useEffect(() => {
    if (!chatChannel) return;

    const handleBroadcast = (event) => {
      const { type, room } = event.data || {};
      if (type === "NEW_ROOM" && room) {
        setRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev;
          return [room, ...prev];
        });
      }
    };

    chatChannel.addEventListener("message", handleBroadcast);
    return () => chatChannel.removeEventListener("message", handleBroadcast);
  }, []);

  // Real-time listener for Rooms in Firestore
  useEffect(() => {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (roomList.length > 0) {
        setRooms((prev) => {
          const existingIds = new Set(roomList.map(r => r.id));
          const localOnly = prev.filter(r => !existingIds.has(r.id));
          return [...roomList, ...localOnly];
        });
      }
    }, (error) => {
      console.warn("Firestore rooms listener info:", error);
    });

    return () => unsubscribe();
  }, []);

  // Realtime Database status listener for current user
  useEffect(() => {
    if (!user || user.isDemo) return;
    const statusRef = rtdbRef(rtdb, `status/${user.uid}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val.state) {
        setUserStatus(val.state);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const filteredRooms = rooms.filter(room => 
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomClick = (roomId) => {
    onSelectRoom(roomId);
    if (closeMobileSidebar) closeMobileSidebar();
  };

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev.filter(r => r.id !== newRoom.id)]);
    
    if (chatChannel) {
      chatChannel.postMessage({
        type: "NEW_ROOM",
        room: newRoom
      });
    }

    handleRoomClick(newRoom.id);
  };

  return (
    <>
      <aside className={`sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Header with App Title & Close button on Mobile */}
        <div className="sidebar-top">
          <div className="brand">
            <MessageSquare className="brand-icon" />
            <h2>SOC Chat</h2>
          </div>
          {isMobileOpen && (
            <button className="mobile-close-btn" onClick={closeMobileSidebar}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Profile Box */}
        <div className="user-profile-box">
          <div className="avatar-wrapper">
            <img 
              src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.displayName || "User"}`} 
              alt={user?.displayName || "Profile"} 
              className="user-avatar"
            />
            <span className={`status-dot ${userStatus}`} title={`Status: ${userStatus}`} />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.displayName || user?.email?.split('@')[0] || "User"}</span>
            <span className="user-email">{user?.email || "User Account"}</span>
          </div>
        </div>

        {/* Action controls: Dark Mode & Logout */}
        <div className="user-actions">
          <button 
            className="action-btn theme-toggle" 
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button 
            className="action-btn logout-btn" 
            onClick={logout}
            title="Sign Out"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search chat rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Chat Rooms Section */}
        <div className="rooms-header">
          <div className="rooms-title">
            <Users size={16} />
            <span>CHAT ROOMS</span>
          </div>
          <button 
            className="add-room-btn"
            onClick={() => setIsModalOpen(true)}
            title="Create New Room"
          >
            <Plus size={16} />
            <span>New</span>
          </button>
        </div>

        <div className="rooms-list">
          {filteredRooms.length === 0 ? (
            <div className="no-rooms">No rooms found</div>
          ) : (
            filteredRooms.map((room) => {
              const unread = unreadCounts[room.id] || 0;
              return (
                <div
                  key={room.id}
                  className={`room-item ${activeRoomId === room.id ? "active" : ""}`}
                  onClick={() => handleRoomClick(room.id)}
                >
                  <div className="room-icon-wrapper">
                    {room.isBot ? (
                      <Bot size={18} className="room-hash bot-icon" />
                    ) : room.isDirectMessage ? (
                      <MessageCircle size={18} className="room-hash" />
                    ) : (
                      <Hash size={18} className="room-hash" />
                    )}
                  </div>
                  <div className="room-details">
                    <span className="room-name">{room.name}</span>
                    <span className="room-desc">{room.description || "Click to open chat"}</span>
                  </div>
                  {unread > 0 && (
                    <div className="unread-badge">{unread}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      <NewRoomModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </>
  );
}

export default Sidebar;
