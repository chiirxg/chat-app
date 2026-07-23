import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./NewRoomModal.css";
import { X, PlusCircle } from "lucide-react";

function NewRoomModal({ isOpen, onClose, onRoomCreated }) {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Please enter a room name.");
      return;
    }

    setLoading(true);
    setError("");

    const name = roomName.trim();
    const desc = description.trim() || "General discussion room";
    const newRoomObj = {
      id: "room_" + Math.floor(1000 + Math.random() * 9000),
      name: name,
      description: desc,
      createdBy: user?.uid || "user",
      createdByName: user?.displayName || user?.email?.split('@')[0] || "User"
    };

    try {
      // Create Firestore write with 1.2 second timeout safety for demo mode
      const addRoomPromise = addDoc(collection(db, "rooms"), {
        name: name,
        description: desc,
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
      console.info("Creating room in local demo mode:", err);
    }

    setRoomName("");
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
            <h3>Create New Chat Room</h3>
          </div>
          <button className="close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label>Room Name *</label>
            <input
              type="text"
              placeholder="e.g. General, Tech Talks, Random"
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
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="create-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewRoomModal;
