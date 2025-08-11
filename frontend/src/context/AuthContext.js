import React, { createContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // --- THIS IS THE UPDATED LOGIN FUNCTION ---
  const login = async (username) => {
    try {
      // Call the new /login/ endpoint
      const response = await axios.post(`${backendUrl}/login/`, { username });
      
      // On success, set the user and save to localStorage
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem('chat_user', JSON.stringify(userData));

    } catch (error) {
      // If login fails, re-throw the error to be handled by the component
      console.error("Login failed:", error.response?.data?.detail || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed. Please try again.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chat_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };