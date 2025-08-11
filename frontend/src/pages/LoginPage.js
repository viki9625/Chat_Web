import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(''); // State to hold login error messages
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
        setError("Username cannot be empty.");
        return;
    }
    
    try {
      // Clear previous errors
      setError('');
      await login(username.trim());
    } catch (err) {
      // Set the error message from the AuthContext
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome Back!</h2>
        <p>Please sign in to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="login-input"
          />
          
          {/* Display the error message if it exists */}
          {error && <p className="login-error">{error}</p>}
          
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;