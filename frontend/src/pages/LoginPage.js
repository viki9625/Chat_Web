import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      login(username.trim());
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome to Chat</h2>
        <p>Please enter your username to start.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="login-input"
          />
          <button type="submit" className="login-button">
            Enter Chat
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;