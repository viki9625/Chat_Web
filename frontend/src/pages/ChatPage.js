import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CreateRoomModal from '../components/CreateRoomModal';
import FriendManagementModal from '../components/FriendManagementModal';
import RoomManagementModal from '../components/RoomManagementModal';
import './ChatPage.css';

const ChatPage = () => {
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
    const { user, ws } = useContext(AuthContext);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // --- THIS IS THE UPDATED PART ---
      // Call the new endpoint that includes last message data
      const chatsResponse = await axios.get(`${backendUrl}/chats/${user.username}`);
      setUsers(chatsResponse.data || []); // The 'users' state will now hold the full chat objects

      // --- END OF UPDATE ---

      // Fetch rooms and pending requests as before
      const roomsResponse = await axios.get(`${backendUrl}/rooms/`);
      setRooms(roomsResponse.data.rooms || []);

      const requestsResponse = await axios.get(`${backendUrl}/friend-requests/pending/${user.username}`);
      setPendingRequests(requestsResponse.data || []);

    } catch (error) {
      if (error.response?.status !== 404) {
           console.error("Failed to fetch data:", error);
      }
    }
  }, [user, backendUrl]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChat) return;
            setMessages([]); // Clear previous messages when chat changes
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
                setMessages([]); // Ensure messages are empty on failure
            }
        };
        fetchMessages();
    }, [activeChat, user.username, backendUrl]);
    
    // Sets up the message listener on the single WebSocket instance from context
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

        // Cleanup listener when the component unmounts or dependencies change
        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [ws, activeChat]);

    const handleSelectChat = (chat) => {
        setActiveChat(chat);
    };
    
    return (
        <div className="chat-page-container">
            {isRoomModalOpen && <CreateRoomModal 
                rooms={rooms}
                onClose={() => setIsRoomModalOpen(false)}
                onRoomCreated={fetchData} 
            />}
            {isFriendModalOpen && <FriendManagementModal 
                pendingRequests={pendingRequests}
                onClose={() => setIsFriendModalOpen(false)}
                onAction={() => {
                    fetchData(); // Refetch all data after accepting/declining
                    setIsFriendModalOpen(false);
                }}
            />}

            <Sidebar 
                users={users} 
                rooms={rooms}
                onSelectChat={handleSelectChat} 
                activeChat={activeChat}
                onNewRoom={() => setIsRoomModalOpen(true)}
                pendingRequestsCount={pendingRequests.length}
                onOpenFriendModal={() => setIsFriendModalOpen(true)}
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