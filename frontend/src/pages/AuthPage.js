import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import './AuthPage.css';

const AuthPage = () => {
    // 'initial' for the main view, 'complete_google' for the second step
    const [view, setView] = useState('login'); // 'login', 'signup', or 'complete_google'
    
    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login, signup, googleLogin } = useContext(AuthContext);

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        try {
            const result = await googleLogin(credentialResponse);
            // If backend says to complete profile, switch the view
            if (result.action === 'complete_profile') {
                setEmail(result.email);
                setUsername(result.suggested_username);
                setView('complete_google');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (view === 'login') {
                await login(email, password);
            } else { // Works for both 'signup' and 'complete_google' views
                await signup(username, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const renderInitialView = () => (
        <>
            <h2>{view === 'login' ? 'Welcome Back!' : 'Create Account'}</h2>
            <p>{view === 'login' ? 'Sign in to continue.' : 'Join us today!'}</p>
            
            <form onSubmit={handleSubmit}>
                {view === 'signup' && (
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                
                {error && <p className="auth-error">{error}</p>}
                
                <button type="submit" className="auth-button">
                    {view === 'login' ? 'Login' : 'Sign Up'}
                </button>
            </form>

            <div className="divider">OR</div>

            <div className="google-login-container">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => { setError('Google Login failed. Please try again.'); }}
                    theme="filled_blue"
                    text={view === 'login' ? "signin_with" : "signup_with"}
                    shape="rectangular"
                />
            </div>

            <p className="toggle-view">
                {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                <span onClick={() => setView(view === 'login' ? 'signup' : 'login')}>
                    {view === 'login' ? ' Sign Up' : ' Login'}
                </span>
            </p>
        </>
    );

    const renderCompleteGoogleView = () => (
        <>
            <h2>Complete Your Profile</h2>
            <p>Your email is confirmed via Google. Just set a username and password.</p>
            
            <form onSubmit={handleSubmit}>
                <input type="email" value={email} readOnly disabled />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required autoFocus />
                
                {error && <p className="auth-error">{error}</p>}
                
                <button type="submit" className="auth-button">
                    Create Account
                </button>
            </form>
        </>
    );

    return (
        <div className="auth-container">
            <div className="auth-box">
                {view === 'complete_google' ? renderCompleteGoogleView() : renderInitialView()}
            </div>
        </div>
    );
};

export default AuthPage;