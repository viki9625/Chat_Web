import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Message.css';

const Message = ({ message }) => {
  const { user } = useContext(AuthContext);
  const isSentByCurrentUser = message.sender === user.username;
  const messageClass = isSentByCurrentUser ? 'sent' : 'received';

  return (
    <div className={`message-container ${messageClass}`}>
      {!isSentByCurrentUser && <div className="avatar">{message.sender.charAt(0).toUpperCase()}</div>}
      <div className="message-content">
        {!isSentByCurrentUser && <div className="sender-name">{message.sender}</div>}
        <div className="message-bubble">
          {message.text}
        </div>
      </div>
    </div>
  );
};

export default Message;