import { useState, useEffect, useRef } from "react";
import { db, rtdb } from "../firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { ref as rtdbRef, onValue } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import "./ChatWindow.css";
import { Hash, Menu, Loader2, X, Sparkles, Bot } from "lucide-react";

const chatChannel = typeof window !== "undefined" && window.BroadcastChannel
  ? new BroadcastChannel("soc_chat_app_channel")
  : null;

// Smart Helper to deduplicate messages and replace temporary local messages with real ones
const mergeMessages = (prevMsgs = [], newMsgs = []) => {
  const combined = [...prevMsgs, ...newMsgs];
  const map = new Map();

  for (const m of combined) {
    if (!m) continue;
    const cleanText = (m.text || "").trim();
    const sender = m.senderId || "user";

    // Find if an identical message from same sender exists
    let existingKey = null;
    for (const [k, existing] of map.entries()) {
      if (existing.senderId === sender && (existing.text || "").trim() === cleanText) {
        existingKey = k;
        break;
      }
    }

    if (existingKey) {
      // Prefer server message with valid Firestore ID if available
      if (m.id && !m.id.startsWith("msg_")) {
        map.delete(existingKey);
        map.set(m.id, m);
      }
    } else {
      const key = m.id || `${sender}_${cleanText}_${Date.now()}`;
      map.set(key, m);
    }
  }
  return Array.from(map.values());
};

function ChatWindow({ roomId, globalMessages = {}, setGlobalMessages, toggleMobileSidebar }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);

  const activeRoomId = roomId || "general";

  // Sync messages from global store
  useEffect(() => {
    if (globalMessages[activeRoomId]) {
      setMessages((prev) => mergeMessages(prev, globalMessages[activeRoomId]));
    }
  }, [activeRoomId, globalMessages]);

  // Fetch Room Info
  useEffect(() => {
    let isSubscribed = true;
    async function fetchRoom() {
      try {
        const roomDocRef = doc(db, "rooms", activeRoomId);
        const snap = await getDoc(roomDocRef);
        if (snap.exists() && isSubscribed) {
          setRoomInfo(snap.data());
        } else if (isSubscribed) {
          setRoomInfo({
            name: activeRoomId === "general" ? "General Chat" : activeRoomId === "ai-bot" ? "SOC AI Assistant" : activeRoomId === "tech" ? "Tech & Code" : "Random & Fun",
            description: activeRoomId === "ai-bot" ? "Chat live with AI Assistant Bot" : "Public discussion room for all members"
          });
        }
      } catch (err) {
        if (isSubscribed) {
          setRoomInfo({
            name: activeRoomId === "ai-bot" ? "SOC AI Assistant" : activeRoomId,
            description: "Chat Room"
          });
        }
      }
    }
    fetchRoom();
    return () => { isSubscribed = false; };
  }, [activeRoomId]);

  // Listen to BroadcastChannel for cross-tab message & typing sync
  useEffect(() => {
    if (!chatChannel) return;

    const handleBroadcast = (event) => {
      const { type, roomId: msgRoomId, message, senderId, senderName, isTyping } = event.data || {};
      
      if (msgRoomId === activeRoomId && type === "NEW_MESSAGE" && message) {
        setMessages((prev) => mergeMessages(prev, [message]));
      } else if (msgRoomId === activeRoomId && type === "TYPING" && senderId !== user?.uid) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(senderName) ? prev : [...prev, senderName];
          } else {
            return prev.filter((name) => name !== senderName);
          }
        });
      }
    };

    chatChannel.addEventListener("message", handleBroadcast);
    return () => chatChannel.removeEventListener("message", handleBroadcast);
  }, [activeRoomId, user?.uid]);

  // Real-time Firestore Messages Listener
  useEffect(() => {
    setLoading(true);
    let isLiveFromFirestore = false;

    const messagesCollectionRef = collection(db, "rooms", activeRoomId, "messages");
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      if (msgs.length > 0) {
        isLiveFromFirestore = true;
        setMessages((prev) => {
          const merged = mergeMessages(prev, msgs);
          if (setGlobalMessages) {
            setGlobalMessages((g) => ({ ...g, [activeRoomId]: merged }));
          }
          return merged;
        });
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore messages listener info:", error);
      setLoading(false);
    });

    const timer = setTimeout(() => {
      if (!isLiveFromFirestore) {
        setLoading(false);
      }
    }, 600);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [activeRoomId, setGlobalMessages]);

  // Real-time RTDB Typing Indicator Listener
  useEffect(() => {
    const typingRef = rtdbRef(rtdb, `typing/${activeRoomId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typers = Object.entries(data)
          .filter(([uid]) => uid !== user?.uid)
          .map(([, name]) => name);
        setTypingUsers(typers);
      }
    });

    return () => unsubscribe();
  }, [activeRoomId, user?.uid]);

  // Auto Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Generate AI Bot Auto-Response
  const triggerAiBotResponse = (userText) => {
    setTypingUsers(["SOC AI Assistant"]);

    setTimeout(() => {
      setTypingUsers([]);

      let botReply = "Hello! I am your SOC AI Assistant. How can I help you today?";
      const lower = userText.toLowerCase();

      if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
        botReply = `Hey ${user?.displayName || "there"}! Great to chat with you in SOC Chat. How's your project going?`;
      } else if (lower.includes("how are you")) {
        botReply = "I'm doing fantastic, thanks for asking! Ready to help with any real-time chat testing.";
      } else if (lower.includes("room") || lower.includes("direct")) {
        botReply = "To start a 1-on-1 direct chat, click '+ New' in the sidebar and choose '1-on-1 Direct Chat'!";
      } else if (lower.includes("help") || lower.includes("what can you do")) {
        botReply = "I can answer questions, test real-time chat features, and demonstrate automated bot replies!";
      }

      const botMsg = {
        id: "msg_bot_" + Date.now(),
        text: botReply,
        type: "text",
        senderId: "soc_ai_bot",
        senderName: "SOC AI Assistant",
        senderPhoto: "https://api.dicebear.com/7.x/bottts/svg?seed=SOCBotAI",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => {
        const merged = mergeMessages(prev, [botMsg]);
        if (setGlobalMessages) {
          setGlobalMessages((g) => ({ ...g, [activeRoomId]: merged }));
        }
        return merged;
      });

      if (chatChannel) {
        chatChannel.postMessage({
          type: "NEW_MESSAGE",
          roomId: activeRoomId,
          message: botMsg
        });
      }
    }, 1000);
  };

  // Send Message Handler
  const handleSendMessage = async ({ text, type = "text", imageUrl = null }) => {
    if (!user) return;

    const newMsg = {
      id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      text,
      type,
      imageUrl,
      senderId: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || "User",
      senderPhoto: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || "User"}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => {
      const merged = mergeMessages(prev, [newMsg]);
      if (setGlobalMessages) {
        setGlobalMessages((g) => ({ ...g, [activeRoomId]: merged }));
      }
      return merged;
    });

    if (chatChannel) {
      chatChannel.postMessage({
        type: "NEW_MESSAGE",
        roomId: activeRoomId,
        message: newMsg
      });
    }

    if (activeRoomId === "ai-bot" || text.toLowerCase().includes("@bot") || text.toLowerCase().includes("@ai")) {
      triggerAiBotResponse(text);
    }

    try {
      const addPromise = addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        text,
        type,
        imageUrl,
        senderId: user.uid,
        senderName: newMsg.senderName,
        senderPhoto: newMsg.senderPhoto,
        timestamp: serverTimestamp()
      });
      const timeout = new Promise((res) => setTimeout(res, 1200));
      await Promise.race([addPromise, timeout]);
    } catch (err) {
      console.info("Sent message in local real-time mode:", err);
    }
  };

  return (
    <div className="chat-window">
      {/* Room Header */}
      <div className="chat-header">
        <button className="mobile-menu-btn" onClick={toggleMobileSidebar}>
          <Menu size={22} />
        </button>

        <div className="chat-room-info">
          <div className="room-title">
            {activeRoomId === "ai-bot" ? (
              <Bot className="hash-icon bot-icon" size={20} />
            ) : (
              <Hash className="hash-icon" size={20} />
            )}
            <h2>{roomInfo?.name || activeRoomId}</h2>
          </div>
          <span className="room-subtext">{roomInfo?.description || "Real-time conversation"}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="messages-area">
        {loading ? (
          <div className="messages-loading">
            <Loader2 className="spinner" size={32} />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="messages-empty">
            <div className="empty-icon-circle">
              {activeRoomId === "ai-bot" ? <Bot size={28} /> : <Sparkles size={28} />}
            </div>
            <h3>No messages yet</h3>
            <p>
              {activeRoomId === "ai-bot"
                ? "Say hello to SOC AI Assistant!"
                : <>Be the first to say hello in <strong>#{roomInfo?.name || activeRoomId}</strong>!</>}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isSent={msg.senderId === user?.uid}
              onImageClick={(url) => setLightboxImage(url)}
            />
          ))
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
            <span className="typing-text">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Component */}
      <MessageInput roomId={activeRoomId} onSendMessage={handleSendMessage} />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
              <X size={24} />
            </button>
            <img src={lightboxImage} alt="Expanded preview" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;
