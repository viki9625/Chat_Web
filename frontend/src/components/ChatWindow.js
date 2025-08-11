import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import './ChatWindow.css';

const ChatWindow = ({ activeChat, messages, setMessages }) => {
  const [text, setText] = useState('');
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const ws = new WebSocket(`${process.env.REACT_APP_WEBSOCKET_URL}/ws/${user.username}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;

    let messageData = {};
    let url = '';

    if (activeChat.type === 'private') {
        url = `${backendUrl}/private-message/`;
        messageData = { sender: user.username, receiver: activeChat.id, text };
    } else if (activeChat.type === 'room') {
        url = `${backendUrl}/room-message/`;
        messageData = { username: user.username, room: activeChat.id, text };
    }
    
    // Optimistic UI update
    const optimisticMessage = activeChat.type === 'private'
      ? { sender: user.username, receiver: activeChat.id, text, timestamp: new Date().toISOString() }
      : { username: user.username, room: activeChat.id, text, timestamp: new Date().toISOString(), sender: user.username };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send to WebSocket for real-time broadcast
    ws.send(JSON.stringify({ type: activeChat.type, ...optimisticMessage }));
    
    setText('');
    
    // Persist to DB
    try {
      await axios.post(url, messageData);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optional: Add logic to remove the optimistic message on failure
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
        {messages.map((msg, index) => (
          <Message key={index} message={msg} chatType={activeChat.type} />
        ))}
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