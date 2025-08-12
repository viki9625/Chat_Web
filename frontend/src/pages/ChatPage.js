import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CreateRoomModal from '../components/CreateRoomModal';
import './ChatPage.css';
import FriendManagementModal from '../components/FriendManagementModal';

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, ws } = useContext(AuthContext); // Get 'ws' from context
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const friendsResponse = await axios.get(`${backendUrl}/friends/${user.username}`);
      const friendDocs = friendsResponse.data || [];
      const friendUsernames = friendDocs.map(doc => doc.from_user === user.username ? doc.to_user : doc.from_user);
      const friendsList = friendUsernames.map(name => ({ username: name }));
      setUsers(friendsList);

      const roomsResponse = await axios.get(`${backendUrl}/rooms/`);
      setRooms(roomsResponse.data.rooms || []);

      const requestsResponse = await axios.get(`${backendUrl}/friend-requests/pending/${user.username}`);
      setPendingRequests(requestsResponse.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [user, backendUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChat) return;
      setMessages([]);
      let url = '';
      if (activeChat.type === 'private') {
        url = `${backendUrl}/private-messages/${activeChat.id}?sender=${user.username}`;
      } else if (activeChat.type === 'room') {
        url = `${backendUrl}/room-messages/${activeChat.id}`;
      }
      try {
        const response = await axios.get(url);
        setMessages(response.data.messages || []);
      } catch (error) { console.error("Failed to fetch messages:", error); }
    };
    fetchMessages();
  }, [activeChat, user.username, backendUrl]);
  
  // This useEffect sets up the message listener on the single 'ws' instance
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
        const received = JSON.parse(event.data);
        const msgData = received.data;

        if (received.event === 'private_message' && activeChat?.type === 'private' && (msgData.sender === activeChat.id || msgData.receiver === activeChat.id)) {
            setMessages(prev => [...prev, msgData]);
        } else if (received.event === 'room_message' && activeChat?.type === 'room' && msgData.room === activeChat.id) {
            setMessages(prev => [...prev, msgData]);
        }
    };
    
    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, activeChat]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };
  
  return (
<>
  <div className="chat-page-container">
      {isModalOpen && <CreateRoomModal /* ...props... */ />}
      {isFriendModalOpen && <FriendManagementModal 
          pendingRequests={pendingRequests}
          onClose={() => setIsFriendModalOpen(false)}
          onAction={() => {
            fetchData(); // Refetch all data after an action
            setIsFriendModalOpen(false); // Close modal on action
     }}
    />}
    <Sidebar 
      pendingRequests={pendingRequests.length}
      onOpenFriendModal={() => setIsFriendModalOpen(true)}
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
</>
  );
};

export default ChatPage;