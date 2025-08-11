import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CreateRoomModal from '../components/CreateRoomModal';
import './ChatPage.css';

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  // activeChat is now an object: { id: string, name: string, type: 'private' | 'room' }
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useContext(AuthContext);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

  let usersAll;

  // Function to fetch both users and rooms
  const fetchData = useCallback(async () => {
    try {
      const friendsResponse = await axios.get(`${backendUrl}/friends/${user.username}`);
      const friendDocs = friendsResponse.data || [];

      const friendUsernames = friendDocs.map(doc => {

        return doc.from_user === user.username ? doc.to_user : doc.from_user;
      });

      const friendsList = friendUsernames.map(name => ({ username: name }));
      setUsers(friendsList);

      // Fetch rooms as before
      const roomsResponse = await axios.get(`${backendUrl}/rooms/`);
      setRooms(roomsResponse.data.rooms || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [user.username, backendUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch messages when activeChat changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChat) return;
      
      setMessages([]); // Clear previous messages
      let url = '';
      if (activeChat.type === 'private') {
        url = `${backendUrl}/private-messages/${activeChat.id}?sender=${user.username}`;
      } else if (activeChat.type === 'room') {
        url = `${backendUrl}/room-messages/${activeChat.id}`;
      }

      try {
        const response = await axios.get(url);
        setMessages(response.data.messages || []);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    fetchMessages();
  }, [activeChat, user.username, backendUrl]);
  
  // WebSocket connection for real-time messages
  useEffect(() => {
      if (!user.username) return;
      const ws = new WebSocket(`${wsUrl}/ws/${user.username}`);
      
      ws.onmessage = (event) => {
          const received = JSON.parse(event.data);
          const msgData = received.data;

          // Add message to state only if it belongs to the active chat
          if (received.event === 'private_message' && activeChat?.type === 'private' && (msgData.sender === activeChat.id || msgData.receiver === activeChat.id)) {
                setMessages(prev => [...prev, msgData]);
          } else if (received.event === 'room_message' && activeChat?.type === 'room' && msgData.room === activeChat.id) {
                setMessages(prev => [...prev, msgData]);
          }
      };

      // Cleanup on component unmount
      return () => ws.close();
  }, [user.username, activeChat, wsUrl]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };
  
  return (
    <div className="chat-page-container">
      {isModalOpen && <CreateRoomModal 
        onClose={() => setIsModalOpen(false)}
        onRoomCreated={fetchData} // Re-fetch data after a room is created
      />}
      <Sidebar 
        users={users} 
        rooms={rooms}
        onSelectChat={handleSelectChat} 
        activeChat={activeChat}
        onNewRoom={() => setIsModalOpen(true)}
      />
      <ChatWindow 
        activeChat={activeChat} 
        messages={messages} 
        setMessages={setMessages} 
      />
    </div>
  );
};

export default ChatPage;