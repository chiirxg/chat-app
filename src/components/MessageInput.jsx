import { useState, useRef, useEffect } from "react";
import { storage, rtdb } from "../firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { ref as rtdbRef, set as rtdbSet, remove as rtdbRemove } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import EmojiPicker from "emoji-picker-react";
import "./MessageInput.css";
import { Paperclip, Smile, Send, Loader2, X } from "lucide-react";

function MessageInput({ roomId, onSendMessage }) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Handle typing indicator in RTDB
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    if (!user || !roomId) return;

    // Write typing status to RTDB
    const typingRef = rtdbRef(rtdb, `typing/${roomId}/${user.uid}`);
    rtdbSet(typingRef, user.displayName || user.email?.split('@')[0] || "Someone");

    // Clear typing status after 2 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      rtdbRemove(typingRef);
    }, 2000);
  };

  const handleSendText = () => {
    if (!inputValue.trim()) return;

    onSendMessage({
      text: inputValue.trim(),
      type: "text"
    });

    setInputValue("");
    setShowEmojiPicker(false);

    // Immediately remove typing indicator on send
    if (user && roomId) {
      const typingRef = rtdbRef(rtdb, `typing/${roomId}/${user.uid}`);
      rtdbRemove(typingRef);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Image Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const imagePath = `chat-images/${roomId || "general"}/${timestamp}_${cleanFileName}`;
      const imgRef = storageRef(storage, imagePath);

      const uploadTask = uploadBytesResumable(imgRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Storage upload error:", error);
          alert("Image upload failed. Check your Firebase Storage settings.");
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onSendMessage({
            text: "📷 Sent an image",
            type: "image",
            imageUrl: downloadURL
          });
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      );
    } catch (err) {
      console.error("File upload error:", err);
      setIsUploading(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setInputValue((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="message-input-container">
      {/* Emoji Picker Popup Overlay */}
      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <div className="emoji-picker-header">
            <span>Select Emoji</span>
            <button className="close-emoji-btn" onClick={() => setShowEmojiPicker(false)}>
              <X size={16} />
            </button>
          </div>
          <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" height={350} width="100%" />
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="upload-progress-bar">
          <Loader2 className="spinner" size={16} />
          <span>Uploading image... {uploadProgress}%</span>
        </div>
      )}

      <div className="input-toolbar">
        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <button
          className="tool-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach Image"
        >
          <Paperclip size={20} />
        </button>

        <button
          className={`tool-btn ${showEmojiPicker ? "active" : ""}`}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emoji Picker"
        >
          <Smile size={20} />
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          className="main-text-input"
          disabled={isUploading}
        />

        <button
          className="send-btn"
          onClick={handleSendText}
          disabled={!inputValue.trim() || isUploading}
          title="Send Message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
