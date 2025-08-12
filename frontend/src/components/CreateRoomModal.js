import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './CreateRoomModal.css';

const CreateRoomModal = ({ rooms, onClose, onRoomCreated }) => {
    const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
    const [roomName, setRoomName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [error, setError] = useState('');
    const { user } = useContext(AuthContext);
    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    // When the component opens, if there are rooms, pre-select the first one for the join tab
    useEffect(() => {
        if (rooms && rooms.length > 0) {
            setSelectedRoom(rooms[0].name);
        }
    }, [rooms]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setError('');
        if (!roomName.trim()) return setError('Room name cannot be empty.');
        
        try {
            await axios.post(`${backendUrl}/room/`, {
                name: roomName,
                creator: user.username,
            });
            onRoomCreated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create room.');
        }
    };
    
    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setError('');
        if (!selectedRoom) return setError('Please select a room to join.');
        
        try {
            await axios.post(`${backendUrl}/rooms/${selectedRoom}/join`, {
                username: user.username,
            });
            onRoomCreated(); // Re-fetch data to update member counts, etc.
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to join room.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-tabs">
                    <button className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                        Create Room
                    </button>
                    <button className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`} onClick={() => setActiveTab('join')}>
                        Join Room
                    </button>
                </div>

                {activeTab === 'create' ? (
                    <form onSubmit={handleCreateRoom} className="modal-form">
                        <h2>Create New Group Chat</h2>
                        <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Enter new room name" autoFocus />
                        {error && <p className="error-message">{error}</p>}
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-create">Create</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleJoinRoom} className="modal-form">
                        <h2>Join Existing Group</h2>
                        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                            {rooms.length > 0 ? (
                                rooms.map(room => <option key={room.name} value={room.name}>{room.name}</option>)
                            ) : (
                                <option disabled>No rooms available to join</option>
                            )}
                        </select>
                        {error && <p className="error-message">{error}</p>}
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-create">Join</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateRoomModal;