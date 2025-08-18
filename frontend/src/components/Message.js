import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Message.css';

const Message = ({ message, chatType }) => {
  const { user } = useContext(AuthContext);
  const sender = message.sender || message.username; 
  const isSentByCurrentUser = sender === user.username;
  const messageClass = isSentByCurrentUser ? 'sent' : 'received';

  // --- THIS IS THE CORRECTED FUNCTION ---
  // It correctly converts the UTC time from the database to Indian Standard Time.
  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    // The 'new Date()' constructor reads the UTC ISO string.
    // Intl.DateTimeFormat then formats it into the specified timezone.
    return new Intl.DateTimeFormat('en-IN', { // Use Indian English locale
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata' // Explicitly set the timezone to IST
    }).format(new Date(isoString));
  };

  return (
    <div className={`message-container ${messageClass}`}>
      {!isSentByCurrentUser && <div className="avatar">{sender.charAt(0).toUpperCase()}</div>}
      <div className="message-content">
        {chatType === 'room' && !isSentByCurrentUser && (
            <div className="sender-name">{sender}</div>
        )}
        <div className="message-bubble">
            <span className="message-text">{message.text}</span>
            <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default Message;
