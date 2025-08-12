import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [ws, setWs] = useState(null);
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

  // This useEffect hook manages the entire lifecycle of the WebSocket
  useEffect(() => {
    // If user logs in, create ONE WebSocket connection
    if (user && user.username) {
      const websocket = new WebSocket(`${wsUrl}/ws/${user.username}`);
      websocket.onopen = () => console.log("WebSocket Connected");
      websocket.onclose = () => console.log("WebSocket Disconnected");
      setWs(websocket);

      // This cleanup function runs when the user logs out or the component unmounts
      return () => {
        websocket.close();
      };
    } else {
      // If there is no user, ensure ws is null
      setWs(null);
    }
  }, [user, wsUrl]); // This effect only re-runs if the 'user' object changes

  // ... All your other functions (handleAuthSuccess, signup, login, etc.) remain the same ...
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('chat_user', JSON.stringify(userData));
  };

  const signup = async (username, email, password) => {
    try {
      const response = await axios.post(`${backendUrl}/signup/`, { username, email, password });
      handleAuthSuccess(response.data.user);
    } catch (error) {
      console.error("Signup failed:", error.response?.data?.detail);
      throw new Error(error.response?.data?.detail || 'Signup failed.');
    }
  };
  
  const login = async (identifier, password) => {
    try {
      // Send 'identifier' instead of 'email'
      const response = await axios.post(`${backendUrl}/login/`, { identifier, password });
      handleAuthSuccess(response.data.user);
    } catch (error) {
      console.error("Login failed:", error.response?.data?.detail);
      throw new Error(error.response?.data?.detail || 'Login failed.');
    }
  };

  const googleLogin = async (credentialResponse) => {
    try {
      const decodedToken = jwtDecode(credentialResponse.credential);
      const { email, name } = decodedToken;
      
      const response = await axios.post(`${backendUrl}/google-login/`, { 
        email, 
        username: name.replace(/\s/g, '')
      });
      
      const { action, user } = response.data;
      if (action === 'login') {
        handleAuthSuccess(user);
      }
      return response.data;
    } catch (error) {
        console.error("Google Login failed:", error.response?.data?.detail);
        throw new Error(error.response?.data?.detail || 'Google Login failed.');
    }
  };

  const logout = () => {
    // Setting user to null will trigger the useEffect cleanup, closing the WebSocket
    setUser(null);
    localStorage.removeItem('chat_user');
  };

  const contextValue = { user, ws, signup, login, googleLogin, logout };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };