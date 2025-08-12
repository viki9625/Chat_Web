import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import AuthPage from './pages/AuthPage'; // Import AuthPage
import ChatPage from './pages/ChatPage';
import './App.css';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <div className="App">
      {user ? <ChatPage /> : <AuthPage />} {/* Use AuthPage */}
    </div>
  );
}

export default App;