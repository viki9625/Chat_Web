import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import './AuthPage.css';

const AuthPage = () => {
    const [isLoginView, setIsLoginView] = useState(false); // Start on Sign Up view
    
    // State for all form fields
    const [identifier, setIdentifier] = useState(''); // For login
    const [username, setUsername] = useState('');   // For signup
    const [email, setEmail] = useState('');         // For signup
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const { login, signup, googleLogin } = useContext(AuthContext);

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        try {
            await googleLogin(credentialResponse);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLoginView) {
                await login(identifier, password);
            } else { // This block will now run correctly for Sign Up
                await signup(username, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    // This function toggles between the Login and Sign Up forms
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError('');
        // Clear all form fields when toggling
        setIdentifier('');
        setUsername('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="shape1"></div>
                <div className="shape2"></div>
            </div>
            <div className="auth-wrapper">
                <div className="auth-panel welcome-panel">
                    <h2>Welcome</h2>
                    <p>Enter your personal details and start your journey with us.</p>
                    <button className="panel-btn" onClick={toggleView}>
                        {isLoginView ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
                <div className="auth-panel form-panel">
                    <h3>{isLoginView ? 'Sign In' : 'Create Account'}</h3>
                    <form onSubmit={handleSubmit}>
                        {!isLoginView && (
                             <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
                        )}
                        
                        <input 
                            type="text" 
                            value={isLoginView ? identifier : email} 
                            onChange={(e) => isLoginView ? setIdentifier(e.target.value) : setEmail(e.target.value)} 
                            placeholder={isLoginView ? "Username or Email" : "Email"}
                            required 
                        />
                        
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                        
                        {error && <p className="auth-error">{error}</p>}
                        
                        <button type="submit" className="form-btn">
                            {isLoginView ? 'Sign In' : 'Sign Up'}
                        </button>
                    </form>
                    <div className="divider">OR</div>
                    <div className="google-login-container">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => { setError('Google Login failed.'); }}
                            theme="outline" size="large"
                            text={isLoginView ? "signin_with" : "signup_with"}
                            shape="rectangular" logo_alignment="center"
                        />
                    </div>
                     {isLoginView && <a href="#" className="forgot-password">forgot password?</a>}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;