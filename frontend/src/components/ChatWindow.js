import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import './ChatWindow.css';

// Helper function to format the date for the separator
const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};


const ChatWindow = ({ activeChat, messages, setMessages }) => {
  const [text, setText] = useState('');
  const { user, ws } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat || !ws) return;

    let messagePayload, url;

    if (activeChat.type === 'private') {
        url = `${backendUrl}/private-message/`;
        messagePayload = { sender: user.username, receiver: activeChat.id, text };
    } else {
        url = `${backendUrl}/room-message/`;
        messagePayload = { username: user.username, room: activeChat.id, text };
    }
    
    const optimisticMessage = { ...messagePayload, timestamp: new Date().toISOString(), sender: user.username };
    setMessages(prev => [...prev, optimisticMessage]);
    setText('');

    try {
      await axios.post(url, messagePayload);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!activeChat) {
    return (
        <div className="chat-window-placeholder">
            <h2>Select a conversation to begin</h2>
            <p>You can start a new chat by selecting a user or group from the list on the left.</p>
        </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{activeChat.name}</h3>
      </div>
      <div className="message-list">
        {/* --- NEW LOGIC TO RENDER MESSAGES WITH DATE SEPARATORS --- */}
        {messages.map((msg, index) => {
            let showDateSeparator = false;
            if (index === 0) {
                showDateSeparator = true;
            } else {
                const prevDate = new Date(messages[index - 1].timestamp).toDateString();
                const currDate = new Date(msg.timestamp).toDateString();
                if (prevDate !== currDate) {
                    showDateSeparator = true;
                }
            }
            
            return (
                <React.Fragment key={index}>
                    {showDateSeparator && (
                        <div className="date-separator">
                            <span>{formatDateSeparator(msg.timestamp)}</span>
                        </div>
                    )}
                    <Message message={msg} chatType={activeChat.type} />
                </React.Fragment>
            );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your message..."
        />
        <button type="submit" className="send-button">
            {/* ... SVG Icon ... */}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;