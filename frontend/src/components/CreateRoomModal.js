import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './CreateRoomModal.css';

const CreateRoomModal = ({ onClose, onRoomCreated }) => {
    const [roomName, setRoomName] = useState('');
    const [error, setError] = useState('');
    const { user } = useContext(AuthContext);
    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!roomName.trim()) {
            setError('Room name cannot be empty.');
            return;
        }
        try {
            await axios.post(`${backendUrl}/room/`, {
                name: roomName,
                creator: user.username,
            });
            onRoomCreated(); // Refresh the room list in the parent
            onClose(); // Close the modal
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create room.');
            console.error(err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Create New Group Chat</h2>
                <form onSubmit={handleCreateRoom}>
                    <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name"
                        autoFocus
                    />
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-create">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoomModal;