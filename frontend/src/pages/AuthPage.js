import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import './AuthPage.css';

const AuthPage = () => {
    const [view, setView] = useState('login');
    
    // State for all form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [identifier, setIdentifier] = useState(''); // New state for login
    const [error, setError] = useState('');
    
    const { login, signup, googleLogin } = useContext(AuthContext);

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        try {
            const result = await googleLogin(credentialResponse);
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
                await login(identifier, password); // Use identifier for login
            } else {
                await signup(username, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const renderLoginView = () => (
        <>
            <h2>Welcome Back!</h2>
            <p>Sign in to continue.</p>
            <form onSubmit={handleSubmit}>
                {/* Updated input for email or username */}
                <input 
                    type="text" 
                    value={identifier} 
                    onChange={(e) => setIdentifier(e.target.value)} 
                    placeholder="Email or Username" 
                    required 
                />
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password" 
                    required 
                />
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" className="auth-button">Login</button>
            </form>
        </>
    );

    const renderSignupView = () => (
        <>
            <h2>Create Account</h2>
            <p>Join us today!</p>
            <form onSubmit={handleSubmit}>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" className="auth-button">Sign Up</button>
            </form>
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
                <button type="submit" className="auth-button">Create Account</button>
            </form>
        </>
    );

    const isInitialView = view === 'login' || view === 'signup';

    return (
        <div className="auth-container">
            <div className="auth-box">
                {view === 'login' && renderLoginView()}
                {view === 'signup' && renderSignupView()}
                {view === 'complete_google' && renderCompleteGoogleView()}

                {isInitialView && (
                    <>
                        <div className="divider">OR</div>
                        <div className="google-login-container">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => { setError('Google Login failed.'); }}
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
                )}
            </div>
        </div>
    );
};

export default AuthPage;