import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

// A simple placeholder for a logo or main icon
const AppLogo = () => (
    <div className="app-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5C21 16.7467 16.7467 21 11.5 21C6.25329 21 2 16.7467 2 11.5C2 6.25329 6.25329 2 11.5 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 22L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </div>
);


const Sidebar = ({ users, onSelectChat, activeChat }) => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <AppLogo />
                <button onClick={logout} className="logout-btn" title="Logout">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M15.75 9l-3.75-3.75M15.75 9l3.75-3.75M15.75 9H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
            </div>
            
            <div className="profile-section">
                <div className="profile-avatar">{user.username.charAt(0).toUpperCase()}</div>
                <div className="profile-info">
                    <h4>{user.username}</h4>
                    <span>Available</span>
                </div>
            </div>

            <div className="search-section">
                <input type="text" placeholder="Search" />
            </div>

            <div className="chat-list-header">
                <h4>Last chats</h4>
                <button>+</button>
            </div>

            <div className="chat-list">
                {users.map((u) => (
                    <div
                        key={u.username}
                        className={`chat-item ${activeChat === u.username ? 'active' : ''}`}
                        onClick={() => onSelectChat(u.username)}
                    >
                        <div className="avatar">{u.username.charAt(0).toUpperCase()}</div>
                        <div className="chat-details">
                            <div className="chat-name">{u.username}</div>
                            <div className="chat-preview">Click to start chatting...</div>
                        </div>
                        <div className="chat-timestamp">11:15</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;