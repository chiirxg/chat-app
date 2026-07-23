import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./NewRoomModal.css";
import { X, PlusCircle, Users, User } from "lucide-react";

function NewRoomModal({ isOpen, onClose, onRoomCreated }) {
  const { user } = useAuth();
  const [chatType, setChatType] = useState("group"); // "group" or "direct"
  const [roomName, setRoomName] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let name = "";
    let desc = "";

    if (chatType === "group") {
      if (!roomName.trim()) {
        setError("Please enter a room name.");
        return;
      }
      name = roomName.trim();
      desc = description.trim() || "Group discussion room";
    } else {
      if (!targetUser.trim()) {
        setError("Please enter the user's name or email.");
        return;
      }
      const myName = user?.displayName || user?.email?.split('@')[0] || "User";
      name = `Direct: ${myName} & ${targetUser.trim()}`;
      desc = `1-on-1 private chat with ${targetUser.trim()}`;
    }

    setLoading(true);
    setError("");

    const newRoomObj = {
      id: "room_" + Math.floor(1000 + Math.random() * 9000),
      name: name,
      description: desc,
      isDirectMessage: chatType === "direct",
      createdBy: user?.uid || "user",
      createdByName: user?.displayName || user?.email?.split('@')[0] || "User"
    };

    try {
      const addRoomPromise = addDoc(collection(db, "rooms"), {
        name: name,
        description: desc,
        isDirectMessage: chatType === "direct",
        createdBy: user?.uid || "user",
        createdByName: user?.displayName || user?.email?.split('@')[0] || "User",
        createdAt: serverTimestamp()
      });

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));

      const docRef = await Promise.race([addRoomPromise, timeoutPromise]);

      if (docRef && docRef.id) {
        newRoomObj.id = docRef.id;
      }
    } catch (err) {
      console.info("Created room in local demo mode:", err);
    }

    setRoomName("");
    setTargetUser("");
    setDescription("");
    setLoading(false);
    onClose();

    if (onRoomCreated) {
      onRoomCreated(newRoomObj);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <PlusCircle className="modal-icon" />
            <h3>Create New Chat</h3>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        {/* Chat Type Selection Tabs */}
        <div className="chat-type-tabs">
          <button
            type="button"
            className={`type-tab ${chatType === "group" ? "active" : ""}`}
            onClick={() => { setChatType("group"); setError(""); }}
          >
            <Users size={16} />
            <span>Group Room</span>
          </button>
          <button
            type="button"
            className={`type-tab ${chatType === "direct" ? "active" : ""}`}
            onClick={() => { setChatType("direct"); setError(""); }}
          >
            <User size={16} />
            <span>1-on-1 Direct Chat</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {chatType === "group" ? (
            <>
              <div className="modal-field">
                <label>Room Name *</label>
                <input
                  type="text"
                  placeholder="e.g. General, Project Discussions"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="modal-field">
                <label>Description</label>
                <textarea
                  placeholder="What is this room about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          ) : (
            <div className="modal-field">
              <label>Other Person's Name or Email *</label>
              <input
                type="text"
                placeholder="e.g. Chirag, Alex, or user@example.com"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                required
                autoFocus
              />
              <span className="field-hint">This will create a dedicated 1-on-1 room between you two.</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={loading}>
              {loading ? "Creating..." : chatType === "direct" ? "Start 1-on-1 Chat" : "Create Group Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewRoomModal;
