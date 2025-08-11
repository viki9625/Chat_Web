import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import './App.css';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <div className="App">
      {user ? <ChatPage /> : <LoginPage />}
    </div>
  );
}

export default App;