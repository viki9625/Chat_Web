import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  // --- CHANGE 1: Initialize state from localStorage ---
  // We check if a user is already saved in localStorage when the app loads.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const login = async (username) => {
    try {
      await axios.post(`${backendUrl}/user/`, { username });
      console.log("User created or already exists.");
    } catch (error) {
      if (error.response && error.response.status !== 409) {
        console.error("Login error:", error);
        return;
      }
    }
    const userData = { username };
    setUser(userData);

    // --- CHANGE 2: Save the user to localStorage on login ---
    localStorage.setItem('chat_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    // --- CHANGE 3: Remove the user from localStorage on logout ---
    localStorage.removeItem('chat_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };