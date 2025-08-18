import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import FriendManagementModal from '../components/FriendManagementModal';
import RoomManagementModal from '../components/RoomManagementModal';
import { MenuIcon } from "lucide-react";
import './ChatPage.css';

const ChatPage = () => {
    const [users, setUsers] = useState([]);
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(false); // New state for sidebar
    const { user, ws } = useContext(AuthContext);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

   const fetchData = useCallback(async () => {
    if (!user) return;
    try {
        const usersResponse = await axios.get(`${backendUrl}/users/`);
        const filteredUsers = usersResponse.data.filter(u => u.username !== user.username) || [];
        
        const sortedUsers = filteredUsers.sort((a, b) => a.username.localeCompare(b.username));
        setUsers(sortedUsers);
        
        const joinedRoomsResponse = await axios.get(`${backendUrl}/rooms/${user.username}`);
        const userRooms = joinedRoomsResponse.data.rooms || [];

        
        const sortedJoinedRooms = userRooms.sort((a, b) => a.name.localeCompare(b.name));
        setJoinedRooms(sortedJoinedRooms);

        
        const allRoomsResponse = await axios.get(`${backendUrl}/rooms/`);
        const allAvailableRooms = allRoomsResponse.data.rooms || [];
        
        
        const sortedAllRooms = allAvailableRooms.sort((a, b) => a.name.localeCompare(b.name));
        setAllRooms(sortedAllRooms);

        
        const requestsResponse = await axios.get(`${backendUrl}/friend-requests/pending/${user.username}`);
        const pending = requestsResponse.data || [];
        
        
        
        setPendingRequests(pending); 

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
            } catch (error) {
                console.error("Failed to fetch messages:", error);
                setMessages([]);
            }
        };
        fetchMessages();
    }, [activeChat, user.username, backendUrl]);

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
        // On mobile, hide sidebar when a chat is selected
        if (window.innerWidth < 768) {
            setIsSidebarVisible(false);
        }
    };

    // This class controls which view is shown on mobile
    const containerClass = `chat-page-container ${activeChat ? 'show-chat-window' : 'show-sidebar'}`;

    return (
        <div className={containerClass}>

            <button className='menu-button' onClick={() => setIsSidebarVisible(prev => !prev)}>
                <MenuIcon className='menu-icon' />
            </button>

            {isRoomModalOpen && <RoomManagementModal
                allRooms={allRooms}
                onClose={() => setIsRoomModalOpen(false)}
                onActionSuccess={fetchData}
            />}
            {isFriendModalOpen && <FriendManagementModal
                pendingRequests={pendingRequests}
                onClose={() => setIsFriendModalOpen(false)}
                onAction={() => {
                    fetchData();
                    setIsFriendModalOpen(false);
                }}
            />}

            <div className={`sidebar-container ${isSidebarVisible ? 'visible' : ''}`}>
                <Sidebar
                    users={users}
                    rooms={joinedRooms}
                    onSelectChat={handleSelectChat}
                    activeChat={activeChat}
                    onNewRoom={() => setIsRoomModalOpen(true)}
                    pendingRequestsCount={pendingRequests.length}
                    onOpenFriendModal={() => setIsFriendModalOpen(true)}
                />
            </div>
            
            <ChatWindow
                activeChat={activeChat}
                messages={messages}
                setMessages={setMessages}
                onBack={() => {
                    setActiveChat(null);
                     // Show sidebar again when going back on mobile
                    setIsSidebarVisible(true);
                }}
            />
        </div>
    );
};

export default ChatPage;