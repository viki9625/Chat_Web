import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import './ChatWindow.css';

const formatDateSeparator = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(dateString));
};

const ChatWindow = ({ activeChat, messages, setMessages, onBack }) => {
  const [text, setText] = useState('');
  const { user, ws } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // New useEffect to handle the Escape key press for backing out of a chat
  useEffect(() => {
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            onBack();
        }
    };

    // Add event listener only when a chat is active
    if (activeChat) {
        document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup function to remove the event listener
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeChat, onBack]); // Dependencies ensure the effect is managed correctly

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat || !ws) return;

    const messagePayload = {
        sender: user.username,
        text: text.trim(),
        timestamp: new Date().toISOString()
    };
    
    let apiPayload, wsPayload, url;

    if (activeChat.type === 'private') {
        url = `${backendUrl}/private-message/`;
        apiPayload = { sender: user.username, receiver: activeChat.id, text: text.trim() };
        wsPayload = { type: 'private', ...apiPayload };
    } else {
        url = `${backendUrl}/room-message/`;
        apiPayload = { username: user.username, room: activeChat.id, text: text.trim() };
        wsPayload = { type: 'room', ...apiPayload };
    }
    
    ws.send(JSON.stringify(wsPayload));
    setMessages(prev => [...prev, messagePayload]);
    setText('');

    try {
      await axios.post(url, apiPayload);
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  if (!activeChat) {
    return (
        <div className="chat-window-placeholder">
            <h2>Select a conversation to begin</h2>
        </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack} title="Back to chat list (Esc)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h3>{activeChat.name}</h3>
      </div>
      <div className="message-list">
        {messages
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map((msg, index, sortedMessages) => {
                let showDateSeparator = false;
                if (index === 0 || new Date(sortedMessages[index - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString()) {
                    showDateSeparator = true;
                }
                const separatorText = formatDateSeparator(msg.timestamp);
                return (
                    <React.Fragment key={msg.timestamp + index}>
                        {showDateSeparator && separatorText && (
                            <div className="date-separator"><span>{separatorText}</span></div>
                        )}
                        <Message message={msg} chatType={activeChat.type} />
                    </React.Fragment>
                );
            })}
        <div ref={messagesEndRef} />
      </div>
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your message..." />
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
