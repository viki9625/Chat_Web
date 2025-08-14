import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ users, rooms, onSelectChat, activeChat, onNewRoom, pendingRequestsCount, onOpenFriendModal }) => {
    const { user, logout } = useContext(AuthContext);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="search-bar">
                    <input type="text" placeholder="Search or start new chat" />
                </div>
                <button className="add-friend-btn" onClick={onOpenFriendModal} title="Add Friend / View Requests">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12zm10-4a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H9a1 1 0 110-2h2V9a1 1 0 011-1z" fill="currentColor"/></svg>
                    {pendingRequestsCount > 0 && <span className="notification-dot"></span>}
                </button>
            </div>

            <div className="profile-section">
                <div className="profile-avatar">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                    <h4>{user.username}</h4>
                    <span>Available</span>
                </div>
                <div className="settings-container">
                    <button className="settings-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)} title="Settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12 8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12 22.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill="currentColor"/></svg>
                    </button>
                    {isDropdownOpen && (
                        <div className="profile-dropdown">
                            <button onClick={() => { logout(); setIsDropdownOpen(false); }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M15.75 9l-3.75-3.75M15.75 9l3.75-3.75M15.75 9H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-list-container">
                <div className="chat-list-header"><h4>Chats</h4></div>
                <div className="chat-list">
                    {/* --- THIS IS THE UPDATED PART --- */}
                    {users.map((u) => (
                        <div key={u.username} className={`chat-item ${activeChat?.id === u.username ? 'active' : ''}`} onClick={() => onSelectChat({id: u.username, name: u.username, type: 'private'})}>
                            <div className="avatar">
                                {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="chat-details">
                                <div className="chat-name">{u.username}</div>
                                <div className="chat-preview">Click to chat</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="chat-list-header">
                    <h4>Group Chats</h4>
                    <button onClick={onNewRoom} className="add-room-btn">+</button>
                </div>
                <div className="chat-list">
                    {rooms.map((room) => (
                        <div key={room.name} className={`chat-item ${activeChat?.id === room.name ? 'active' : ''}`} onClick={() => onSelectChat({id: room.name, name: room.name, type: 'room'})}>
                            <div className="avatar">
                                {'#'}
                            </div>
                            <div className="chat-details">
                                <div className="chat-name">{room.name}</div>
                                <div className="chat-preview">{room.members.length} members</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;