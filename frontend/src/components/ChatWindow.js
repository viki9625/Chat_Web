import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import './ChatWindow.css';

const formatDateSeparator = (dateString) => {
    if (!dateString) {
        return null;
    }
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
        return 'Today';
    }
    if (date.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(dateString));
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

    let messagePayload, url, wsPayload;

    if (activeChat.type === 'private') {
        url = `${backendUrl}/private-message/`;
        messagePayload = { sender: user.username, receiver: activeChat.id, text };
        wsPayload = { type: 'private', ...messagePayload };
    } else {
        url = `${backendUrl}/room-message/`;
        messagePayload = { username: user.username, room: activeChat.id, text };
        wsPayload = { type: 'room', sender: user.username, ...messagePayload };
    }
    
    ws.send(JSON.stringify(wsPayload));

    const optimisticMessage = { ...messagePayload, timestamp: new Date().toISOString(), sender: user.username };
    setMessages(prev => [...prev, optimisticMessage]);
    setText('');

    try {
      await axios.post(url, messagePayload);
    } catch (error) {
      console.error("Failed to save message:", error);
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
        {messages
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map((msg, index, sortedMessages) => {
                let showDateSeparator = false;
                if (index === 0) {
                    showDateSeparator = true;
                } else {
                    const prevDate = new Date(sortedMessages[index - 1].timestamp).toDateString();
                    const currDate = new Date(msg.timestamp).toDateString();
                    if (prevDate !== currDate) {
                        showDateSeparator = true;
                    }
                }
                
                const separatorText = formatDateSeparator(msg.timestamp);

                return (
                    <React.Fragment key={msg.timestamp + index}>
                        {showDateSeparator && separatorText && (
                            <div className="date-separator">
                                <span>{separatorText}</span>
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
          // --- THIS IS THE CORRECTED LINE ---
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your message..."
        />
        <button type="submit" className="send-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;