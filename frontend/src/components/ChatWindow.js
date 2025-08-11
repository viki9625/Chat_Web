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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;

    const messageData = {
      sender: user.username,
      receiver: activeChat,
      text: text,
    };

    try {
      await axios.post(`${backendUrl}/private-message/`, messageData);
      
      const optimisticMessage = {
          ...messageData,
          timestamp: new Date().toISOString(),
      };
      setMessages([...messages, optimisticMessage]);
      setText('');

    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!activeChat) {
    return (
        <div className="chat-window-placeholder">
            <h2>Select a conversation to begin</h2>
            <p>You can start a new chat by selecting a user from the list on the left.</p>
        </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{activeChat}</h3>
      </div>
      <div className="message-list">
        {messages.map((msg, index) => (
          <Message key={index} message={msg} />
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