
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const EyeIcon = ({ closed }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {closed ? (
            <>
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                <line x1="2" y1="2" x2="22" y2="22"></line>
            </>
        ) : (
            <>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </>
        )}
    </svg>
);

const KAOMSLogin = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [session, setSession] = useState(null);

    const [userIdFocused, setUserIdFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [emailFocused, setEmailFocused] = useState(false);
    
    // Animation state
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrXxhHNWtz6a5bNCNNP2xvZorw6SC56neUCmsxVq54b4M8M7XvLUqL092zD054FW1w/exec';

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setIsMounted(true); // Trigger entry animation
        try {
            const storedSession = localStorage.getItem('ka-oms-session');
            if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                if (new Date().getTime() < sessionData.expiry) {
                    setSession(sessionData);
                    setIsLoggedIn(true);
                } else {
                    localStorage.removeItem('ka-oms-session');
                }
            }
        } catch (e) {
            console.error("Error parsing session data from localStorage", e);
            localStorage.removeItem('ka-oms-session');
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({ action: 'login', userId, password }),
            });

            const result = await response.json();

            if (result.success) {
                const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days
                const newSession = { userId: result.userId, role: result.role, userName: result.userName, expiry };
                localStorage.setItem('ka-oms-session', JSON.stringify(newSession));
                setSession(newSession);
                setIsLoggedIn(true);
            } else {
                 let errorMessage = result.message;
                if (result.error && result.error.message) {
                    errorMessage += ` (Details: ${result.error.message})`;
                }
                setError(errorMessage);
            }
        } catch (err) {
            setError('An error occurred. Please check your network connection.');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setForgotMessage('');
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({ action: 'forgotPassword', email: forgotEmail }),
            });
            const result = await response.json();
            if (result.success) {
                setForgotMessage(result.message);
                setForgotEmail('');
            } else {
                let errorMessage = result.message;
                if (result.error && result.error.message) {
                    errorMessage += ` (Details: ${result.error.message})`;
                }
                setError(errorMessage);
            }
        } catch (err) {
            setError('An error occurred. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('ka-oms-session');
        setIsLoggedIn(false);
        setSession(null);
        setUserId('');
        setPassword('');
    };
    
    const cardStyles = {
        ...styles.card,
        padding: isMobile ? '2.5rem 1.5rem' : '2.5rem 2rem',
        boxShadow: isMobile ? '0 4px 15px rgba(0, 0, 0, 0.06)' : 'var(--box-shadow)',
        transform: isMounted ? 'translateY(0)' : 'translateY(20px)',
        opacity: isMounted ? 1 : 0,
    };
    
    const titleStyles = {
        ...styles.title,
        fontSize: isMobile ? '1.5rem' : '1.75rem',
    };

    const subtitleStyles = {
        ...styles.subtitle,
        fontSize: isMobile ? '0.9rem' : '1rem',
        marginBottom: isMobile ? '1.5rem' : '2rem',
    };


    if (isLoggedIn && session) {
        return (
            <div style={styles.loginContainer}>
                <div style={cardStyles}>
                    <h1 style={titleStyles}>Welcome, {session.userName || session.userId}</h1>
                    <p style={subtitleStyles}>Homepage Coming Soon!</p>
                    <button onClick={handleLogout} style={styles.button}>Logout</button>
                </div>
            </div>
        );
    }

    return (
         <div style={styles.loginContainer}>
             <div style={cardStyles}>
                 <img src="https://i.ibb.co/ZR2m6c7/applogo-1.png" alt="KA-OMS Logo" style={styles.logo} />
                 <h1 style={titleStyles}>KA-OMS</h1>
                 <p style={subtitleStyles}>Enamor Order Management</p>

                {isForgotPassword ? (
                    <form onSubmit={handleForgotPassword} style={styles.form}>
                         <p style={{...styles.subtitle, marginBottom: '1.5rem', fontSize: '0.9rem'}}>Enter your email to recover your password.</p>
                         <div style={styles.inputGroup}>
                            <label style={{
                                ...styles.label,
                                ...(forgotEmail || emailFocused ? styles.labelFocused : {})
                            }}>Email Address</label>
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                style={styles.input}
                                required
                            />
                        </div>
                         {error && <p style={styles.error}>{error}</p>}
                         {forgotMessage && <p style={styles.success}>{forgotMessage}</p>}
                         <button type="submit" style={styles.button} disabled={isLoading}>
                             {isLoading ? 'Sending...' : 'Send Recovery Email'}
                         </button>
                         <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setError(''); setForgotMessage(''); }} style={styles.link}>Back to Login</a>
                    </form>
                ) : (
                    <form onSubmit={handleLogin} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={{
                                ...styles.label,
                                ...(userId || userIdFocused ? styles.labelFocused : {})
                            }}>User ID (Mobile or Email)</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                onFocus={() => setUserIdFocused(true)}
                                onBlur={() => setUserIdFocused(false)}
                                style={styles.input}
                                required
                            />
                        </div>
                        <div style={styles.inputGroup}>
                             <label style={{
                                ...styles.label,
                                ...(password || passwordFocused ? styles.labelFocused : {})
                            }}>Password</label>
                            <input
                                type={isPasswordVisible ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                style={styles.input}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                style={styles.eyeIcon}
                                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                                <EyeIcon closed={!isPasswordVisible} />
                            </button>
                        </div>
                        {error && <p style={styles.error}>{error}</p>}
                        <button type="submit" style={styles.button} disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setError(''); }} style={styles.link}>Forgot Password?</a>
                    </form>
                )}
             </div>
         </div>
    );
};

// FIX: Add type annotation to the styles object to fix CSSProperties type errors.
const styles: { [key: string]: React.CSSProperties } = {
    loginContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem 2rem',
        backgroundColor: 'var(--card-bg)',
        backdropFilter: 'blur(10px)',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--box-shadow)',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'transform 0.5s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out',
    },
    logo: {
        width: '80px',
        height: '80px',
        marginBottom: '0.5rem',
    },
    title: {
        color: 'var(--dark-grey)',
        fontWeight: 600,
        marginBottom: '0.25rem',
    },
    subtitle: {
        color: 'var(--text-color)',
        marginBottom: '2rem',
        fontSize: '1rem',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    inputGroup: {
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        paddingTop: '18px',
        fontSize: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff',
        color: 'var(--dark-grey)',
        transition: 'border-color 0.3s ease',
    },
    label: {
        position: 'absolute',
        left: '15px',
        top: '15px',
        color: 'var(--text-color)',
        pointerEvents: 'none',
        transition: 'all 0.2s ease-out',
    },
    labelFocused: {
        top: '5px',
        fontSize: '0.75rem',
        color: 'var(--brand-color)',
    },
    eyeIcon: {
        position: 'absolute',
        top: '50%',
        right: '15px',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-color)',
        padding: '0',
    },
    button: {
        padding: '15px',
        fontSize: '1rem',
        fontWeight: 500,
        color: '#fff',
        backgroundColor: 'var(--brand-color)',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, transform 0.1s ease',
        marginTop: '0.5rem',
    },
    link: {
        color: 'var(--brand-color)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        marginTop: '0.5rem',
    },
    error: {
        color: '#e74c3c',
        fontSize: '0.85rem',
        textAlign: 'center',
        marginTop: '-0.5rem',
        marginBottom: '0.5rem',
    },
    success: {
        color: '#2ecc71',
        fontSize: '0.85rem',
        textAlign: 'center',
    },
};

// --- RENDER ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><KAOMSLogin /></React.StrictMode>);
} else {
    console.error('Failed to find the root element');
}