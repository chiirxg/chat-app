import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./NewRoomModal.css";
import { X, PlusCircle, MessageSquare } from "lucide-react";

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

    try {
      setLoading(true);
      setError("");
      const docRef = await addDoc(collection(db, "rooms"), {
        name: roomName.trim(),
        description: description.trim() || "General discussion room",
        createdBy: user.uid,
        createdByName: user.displayName || user.email?.split('@')[0] || "User",
        createdAt: serverTimestamp()
      });

      setRoomName("");
      setDescription("");
      onClose();
      if (onRoomCreated) {
        onRoomCreated(docRef.id);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Failed to create room. Please try again.");
    } finally {
      setLoading(false);
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
          <button className="close-btn" onClick={onClose}>
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
