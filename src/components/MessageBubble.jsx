import "./MessageBubble.css";

function MessageBubble({ message, isSent, onImageClick }) {
  const { text, type, imageUrl, senderName, senderPhoto, timestamp } = message;

  // Format timestamp safely
  const formattedTime = timestamp?.toDate
    ? timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : timestamp || "Just now";

  return (
    <div className={`message-bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <img
          src={senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`}
          alt={senderName || "Sender"}
          className="bubble-avatar"
        />
      )}

      <div className="bubble-content">
        {!isSent && senderName && (
          <span className="bubble-sender-name">{senderName}</span>
        )}

        <div className="bubble-body">
          {type === "image" ? (
            <div className="bubble-image-container" onClick={() => onImageClick && onImageClick(imageUrl)}>
              <img src={imageUrl} alt="Uploaded attachment" className="bubble-image" />
            </div>
          ) : (
            <p className="bubble-text">{text}</p>
          )}

          <span className="bubble-timestamp">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
