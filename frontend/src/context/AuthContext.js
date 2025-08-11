import React, { createContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const login = async (username) => {
    try {
      // First, try to create the user. If they exist, the backend will return a 409.
      await axios.post(`${backendUrl}/user/`, { username });
      console.log("User created or already exists.");
    } catch (error) {
      if (error.response && error.response.status !== 409) {
        console.error("Login error:", error);
        return; // Stop if there's an actual error
      }
    }
    // Set the user in the context
    setUser({ username });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };