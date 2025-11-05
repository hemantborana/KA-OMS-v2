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

const Spinner = () => <div style={styles.spinner}></div>;

interface CachedImage {
    id: string;
    blob: Blob;
    url: string;
}

const imageDb = {
    db: null,
    init: function(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            const request = indexedDB.open('BrandingImageCache', 3);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (db.objectStoreNames.contains('images')) {
                    db.deleteObjectStore('images');
                }
                db.createObjectStore('images', { keyPath: 'id' });
            };
            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    },
    getImage: function(id: string): Promise<CachedImage | null> {
        return new Promise(async (resolve, reject) => {
            const db = await this.init();
            const transaction = db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    },
    setImage: function(id: string, blob: Blob, url: string) {
        return new Promise(async (resolve, reject) => {
            const db = await this.init();
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.put({ id, blob, url });
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    }
};

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
    
    // Animation and loading states
    const [isMounted, setIsMounted] = useState(false);
    const [areImagesReady, setAreImagesReady] = useState(false);
    const [appLogoSrc, setAppLogoSrc] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrXxhHNWtz6a5bNCNNP2xvZorw6SC56neUCmsxVq54b4M8M7XvLUqL092zD054FW1w/exec';

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        const storedSession = localStorage.getItem('ka-oms-session');
        if (storedSession) {
            try {
                const sessionData = JSON.parse(storedSession);
                if (new Date().getTime() < sessionData.expiry) {
                    setSession(sessionData);
                    setIsLoggedIn(true);
                } else {
                    localStorage.removeItem('ka-oms-session');
                }
            } catch (e) {
                console.error("Error parsing session data", e);
                localStorage.removeItem('ka-oms-session');
            }
        }

        const loadAndCacheImage = async (key: string, url: string): Promise<string> => {
            try {
                const cachedData = await imageDb.getImage(key);
                if (cachedData && cachedData.url === url) {
                    return URL.createObjectURL(cachedData.blob);
                }
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Network error for ${url}`);
                const imageBlob = await response.blob();
                await imageDb.setImage(key, imageBlob, url);
                return URL.createObjectURL(imageBlob);
            } catch (error) {
                console.error(`Failed to load/cache image ${key}:`, error);
                return url; // Fallback to network URL
            }
        };

        const initializeApp = async () => {
            const [brandingSrc, logoSrc] = await Promise.all([
                loadAndCacheImage(
                    'branding-image', 
                    'https://i.ibb.co/sphkNfpr/Copilot-20251105-083438.png'
                ),
                loadAndCacheImage(
                    'app-logo',
                    'https://i.ibb.co/spDFy1wW/applogo-1.png'
                )
            ]);

            // Handle branding image (which is in static HTML)
            const brandingImgElement = document.querySelector('.branding-pane-img') as HTMLImageElement;
            if (brandingImgElement) {
                brandingImgElement.src = brandingSrc;
                brandingImgElement.classList.add('loaded');
            }

            // Handle app logo (which is in React) using state
            setAppLogoSrc(logoSrc);
            
            // Once all images are processed, show the form content.
            setAreImagesReady(true);
            setIsMounted(true); // Trigger entry animation
            // Remove skeleton from root after react hydrates
            document.getElementById('root')?.classList.remove('skeleton-loader');
        };

        initializeApp();

        return () => window.removeEventListener('resize', handleResize);
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
                const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
                const newSession = { userId: result.userId, role: result.role, userName: result.userName, expiry };
                localStorage.setItem('ka-oms-session', JSON.stringify(newSession));
                setSession(newSession);
                setIsLoggedIn(true);
            } else {
                setError(result.message || 'Login failed.');
            }
        } catch (err) {
            setError('An error occurred. Please check your network connection.');
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
                setError(result.message || 'Password recovery failed.');
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
    
    const titleStyles = { ...styles.title, fontSize: isMobile ? '1.5rem' : '1.75rem' };
    const subtitleStyles = { ...styles.subtitle, fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: isMobile ? '1.5rem' : '2rem' };
    const logoStyles = { ...styles.logo, opacity: areImagesReady ? 1 : 0, transition: 'opacity 0.3s ease-in' };

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
                {!areImagesReady ? <Spinner /> : (
                    <>
                        <img src={appLogoSrc} alt="KA-OMS Logo" style={logoStyles} />
                        <h1 style={titleStyles}>Kambeshwar Agencies</h1>
                        <p style={subtitleStyles}>Enamor Order Management</p>

                        {isForgotPassword ? (
                            <form onSubmit={handleForgotPassword} style={styles.form}>
                                <p style={{...styles.subtitle, marginBottom: '1.5rem', fontSize: '0.9rem'}}>Enter your email to recover your password.</p>
                                <div style={styles.inputGroup}>
                                    <label style={{ ...styles.label, ...(forgotEmail || emailFocused ? styles.labelFocused : {}) }}>Email Address</label>
                                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} style={styles.input} required />
                                </div>
                                {error && <p style={styles.error}>{error}</p>}
                                {forgotMessage && <p style={styles.success}>{forgotMessage}</p>}
                                <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Recovery Email'}</button>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setError(''); setForgotMessage(''); }} style={styles.link}>Back to Login</a>
                            </form>
                        ) : (
                            <form onSubmit={handleLogin} style={styles.form}>
                                <div style={styles.inputGroup}>
                                    <label style={{ ...styles.label, ...(userId || userIdFocused ? styles.labelFocused : {}) }}>User ID (Mobile or Email)</label>
                                    <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} onFocus={() => setUserIdFocused(true)} onBlur={() => setUserIdFocused(false)} style={styles.input} required />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={{ ...styles.label, ...(password || passwordFocused ? styles.labelFocused : {}) }}>Password</label>
                                    <input type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} style={styles.input} required />
                                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon} aria-label={isPasswordVisible ? "Hide password" : "Show password"}>
                                        <EyeIcon closed={!isPasswordVisible} />
                                    </button>
                                </div>
                                {error && <p style={styles.error}>{error}</p>}
                                <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setError(''); }} style={styles.link}>Forgot Password?</a>
                            </form>
                        )}
                    </>
                )}
             </div>
         </div>
    );
};

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
        minHeight: '580px',
        padding: '2.5rem 2rem',
        backgroundColor: 'var(--card-bg)',
        backdropFilter: 'blur(10px)',
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--box-shadow)',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transition: 'transform 0.5s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    logo: {
        width: '80px',
        height: '80px',
        marginBottom: '0.5rem',
        margin: '0 auto 0.5rem',
        opacity: 0, /* Initial state before loading */
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
    inputGroup: { position: 'relative' },
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
    labelFocused: { top: '5px', fontSize: '0.75rem', color: 'var(--brand-color)' },
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
    success: { color: '#2ecc71', fontSize: '0.85rem', textAlign: 'center' },
    spinner: {
        border: '4px solid var(--light-grey)',
        borderRadius: '50%',
        borderTop: '4px solid var(--brand-color)',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: 'auto',
    },
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><KAOMSLogin /></React.StrictMode>);
} else {
    console.error('Failed to find the root element');
}