import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import FriendManagementModal from '../components/FriendManagementModal';
import RoomManagementModal from '../components/RoomManagementModal';
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
    const { user, ws } = useContext(AuthContext);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    // 🔹 Fetch sidebar data (users, rooms, requests)
    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const chatsResponse = await axios.get(`${backendUrl}/chats/${user.username}`);
            setUsers(chatsResponse.data || []);

            const joinedRoomsResponse = await axios.get(`${backendUrl}/rooms/${user.username}`);
            setJoinedRooms(joinedRoomsResponse.data.rooms || []);

            const allRoomsResponse = await axios.get(`${backendUrl}/rooms/`);
            setAllRooms(allRoomsResponse.data.rooms || []);

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

    // 🔹 Fetch history when chat changes
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

    // 🔹 Real-time WebSocket listener
    useEffect(() => {
        if (!ws) return;

        const handleMessage = (event) => {
            try {
                const received = JSON.parse(event.data);
                const msgData = received.data;

                if (received.event === 'private_message' || received.event === 'room_message') {
                    fetchData(); // keep sidebar previews updated
                }

                // ✅ Show message immediately if it belongs to current chat
                if (
                    received.event === 'private_message' &&
                    activeChat?.type === 'private' &&
                    (msgData.sender === activeChat.id || msgData.receiver === activeChat.id)
                ) {
                    setMessages((prev) => [...prev, msgData]);
                } else if (
                    received.event === 'room_message' &&
                    activeChat?.type === 'room' &&
                    msgData.room === activeChat.id
                ) {
                    setMessages((prev) => [...prev, msgData]);
                }
            } catch (err) {
                console.error("WS parse error:", err);
            }
        };

        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [ws, activeChat, fetchData]);

    const handleSelectChat = (chat) => {
        setActiveChat(chat);
    };

    const containerClass = `chat-page-container ${activeChat ? 'show-chat-window' : 'show-sidebar'}`;

    return (
        <div className={containerClass}>
            {isRoomModalOpen && (
                <RoomManagementModal
                    allRooms={allRooms}
                    onClose={() => setIsRoomModalOpen(false)}
                    onActionSuccess={fetchData}
                />
            )}
            {isFriendModalOpen && (
                <FriendManagementModal
                    pendingRequests={pendingRequests}
                    onClose={() => setIsFriendModalOpen(false)}
                    onAction={() => {
                        fetchData();
                        setIsFriendModalOpen(false);
                    }}
                />
            )}

            <Sidebar
                users={users}
                rooms={joinedRooms}
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
                onBack={() => setActiveChat(null)}
            />
        </div>
    );
};

export default ChatPage;
