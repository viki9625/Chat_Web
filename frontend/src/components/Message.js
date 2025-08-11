import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Message.css';

const Message = ({ message, chatType }) => {
  const { user } = useContext(AuthContext);
  // The 'sender' field might be named 'username' in room messages
  const sender = message.sender || message.username; 
  const isSentByCurrentUser = sender === user.username;
  const messageClass = isSentByCurrentUser ? 'sent' : 'received';

  return (
    <div className={`message-container ${messageClass}`}>
      {!isSentByCurrentUser && <div className="avatar">{sender.charAt(0).toUpperCase()}</div>}
      <div className="message-content">
        {chatType === 'room' && !isSentByCurrentUser && <div className="sender-name">{sender}</div>}
        <div className="message-bubble">
          {message.text}
        </div>
      </div>
    </div>
  );
};

export default Message;