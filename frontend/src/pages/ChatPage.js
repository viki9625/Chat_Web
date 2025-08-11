import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import './ChatPage.css';

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const { user } = useContext(AuthContext);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

  // Fetch all users to display in the sidebar
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${backendUrl}/users/`);
        // Filter out the current user from the list
        setUsers(response.data.filter(u => u.username !== user.username));
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, [user.username, backendUrl]);

  // Fetch messages for the active chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (activeChat) {
        try {
          const response = await axios.get(`${backendUrl}/private-messages/${activeChat}?sender=${user.username}`);
          setMessages(response.data.messages || []);
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      }
    };
    fetchMessages();
  }, [activeChat, user.username, backendUrl]);
  
  // WebSocket connection
  useEffect(() => {
      if (!user.username) return;

      const ws = new WebSocket(`${wsUrl}/ws/${user.username}`);
      
      ws.onopen = () => {
          console.log('WebSocket Connected');
      };

      ws.onmessage = (event) => {
          const received = JSON.parse(event.data);
          if (received.event === 'private_message') {
              const msgData = received.data;
              // Add message to state only if it belongs to the active chat
              if (msgData.sender === activeChat || msgData.receiver === activeChat) {
                  setMessages(prevMessages => [...prevMessages, msgData]);
              }
          }
      };

      ws.onclose = () => {
          console.log('WebSocket Disconnected');
      };
      
      ws.onerror = (error) => {
          console.error('WebSocket Error:', error);
      };

      // Cleanup on component unmount
      return () => {
          ws.close();
      };
  }, [user.username, activeChat, wsUrl]);


  const handleSelectChat = (username) => {
    setActiveChat(username);
  };
  
  return (
    <div className="chat-page-container">
      <Sidebar users={users} onSelectChat={handleSelectChat} activeChat={activeChat} />
      <ChatWindow activeChat={activeChat} messages={messages} setMessages={setMessages} />
    </div>
  );
};

export default ChatPage;