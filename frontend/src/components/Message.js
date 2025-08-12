import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Message.css';

const Message = ({ message, chatType }) => {
  const { user } = useContext(AuthContext);
  const sender = message.sender || message.username; 
  const isSentByCurrentUser = sender === user.username;
  const messageClass = isSentByCurrentUser ? 'sent' : 'received';

  // Helper function to format the timestamp into HH:MM AM/PM
  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    // Use Intl.DateTimeFormat for better localization and control
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
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