import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './FriendManagementModal.css'; // We will create this CSS file next

const FriendManagementModal = ({ pendingRequests, onClose, onAction }) => {
    const [activeTab, setActiveTab] = useState('add'); // 'add' or 'pending'
    const [friendUsername, setFriendUsername] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user } = useContext(AuthContext);
    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    const handleSendRequest = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!friendUsername.trim()) return;

        try {
            await axios.post(`${backendUrl}/friend-request/`, {
                from_user: user.username,
                to_user: friendUsername,
            });
            setSuccess(`Friend request sent to ${friendUsername}!`);
            setFriendUsername('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send request.');
        }
    };

    const handleAccept = async (fromUser) => {
        try {
            await axios.post(`${backendUrl}/friend-accept/`, {
                from_user: fromUser,
                to_user: user.username,
            });
            onAction(); // This will trigger a data refresh in ChatPage
        } catch (err) {
            console.error("Failed to accept request:", err);
        }
    };

    const handleDecline = async (fromUser) => {
        try {
            await axios.post(`${backendUrl}/friend-decline/`, {
                from_user: fromUser,
                to_user: user.username
            });
            onAction(); // This will trigger a data refresh in ChatPage
        } catch (err) {
            console.error("Failed to decline request:", err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content friend-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-tabs">
                    <button className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
                        Add Friend
                    </button>
                    <button className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                        Pending Requests
                        {pendingRequests.length > 0 && <span className="notification-badge">{pendingRequests.length}</span>}
                    </button>
                </div>

                {activeTab === 'add' ? (
                    <form onSubmit={handleSendRequest} className="modal-form">
                        <h2>Send Friend Request</h2>
                        <input type="text" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} placeholder="Enter friend's username" autoFocus />
                        {error && <p className="error-message">{error}</p>}
                        {success && <p className="success-message">{success}</p>}
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
                            <button type="submit" className="btn-create">Send</button>
                        </div>
                    </form>
                ) : (
                    <div className="modal-form">
                        <h2>Pending Requests</h2>
                        <div className="request-list">
                            {pendingRequests.length > 0 ? (
                                pendingRequests.map(req => (
                                    <div key={req.from_user} className="request-item">
                                        <span><strong>{req.from_user}</strong> wants to be your friend.</span>
                                        <div className="request-actions">
                                            <button className="btn-accept" onClick={() => handleAccept(req.from_user)}>Accept</button>
                                            <button className="btn-decline" onClick={() => handleDecline(req.from_user)}>Decline</button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-requests">No pending friend requests.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendManagementModal;