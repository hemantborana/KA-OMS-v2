import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- ICON COMPONENTS ---
const EyeIcon = ({ closed }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {closed ? (<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></>) : (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></>)} </svg>);
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const NavIcon = ({ name }) => { const icons = { Entry: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>, Pending: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>, Billing: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, Billed: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>, Stock: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"></path><path d="M20 13H4"></path><path d="M10 3L4 9"></path><path d="M14 3l6 6"></path></svg>, Update: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, Deleted: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>, Expired: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, Users: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, Approval: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg> }; return icons[name] || null; };
const Spinner = () => <div style={styles.spinner}></div>;

// --- DATABASE LOGIC ---
interface CachedImage { id: string; blob: Blob; url: string; }
const imageDb = {
    db: null,
    init: function(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { if (this.db) { resolve(this.db); return; } const request = indexedDB.open('BrandingImageCache', 3); request.onupgradeneeded = (event) => { const db = (event.target as IDBOpenDBRequest).result; if (db.objectStoreNames.contains('images')) { db.deleteObjectStore('images'); } db.createObjectStore('images', { keyPath: 'id' }); }; request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); }; request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error); reject((event.target as IDBOpenDBRequest).error); }; }); },
    getImage: function(id: string): Promise<CachedImage | null> { return new Promise(async (resolve, reject) => { const db = await this.init(); const transaction = db.transaction(['images'], 'readonly'); const store = transaction.objectStore('images'); const request = store.get(id); request.onsuccess = () => { resolve(request.result || null); }; request.onerror = (event) => { reject((event.target as IDBRequest).error); }; }); },
    setImage: function(id: string, blob: Blob, url: string) { return new Promise(async (resolve, reject) => { const db = await this.init(); const transaction = db.transaction(['images'], 'readwrite'); const store = transaction.objectStore('images'); const request = store.put({ id, blob, url }); request.onsuccess = () => { resolve(request.result); }; request.onerror = (event) => { reject((event.target as IDBRequest).error); }; }); }
};

// --- PAGE COMPONENTS ---
const PageContent = ({ title }) => <div style={styles.pageContainer}><h1>{title}</h1><p>Functionality for this page is coming soon.</p></div>;

// --- LAYOUT COMPONENTS ---
const Header = ({ session, onLogout, onToggleSidebar, appLogoSrc, isMobile }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header style={styles.appHeader}>
            <div style={styles.headerLeft}>
                {isMobile && <button onClick={onToggleSidebar} style={styles.menuButton}><MenuIcon /></button>}
                <img src={appLogoSrc} alt="Logo" style={styles.headerLogo} />
                {!isMobile && <span style={styles.headerTitle}>Kambeshwar Agencies</span>}
            </div>
            <div style={styles.headerRight} ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} style={styles.profileButton}>
                    <UserIcon />
                    <span style={styles.profileName}>{session.userName}</span>
                </button>
                {dropdownOpen && (
                    <div style={styles.profileDropdown}>
                        <div style={styles.dropdownInfo}>
                            <div style={styles.dropdownUserName}>{session.userName}</div>
                            <div style={styles.dropdownUserRole}>{session.role}</div>
                        </div>
                        <button onClick={onLogout} style={styles.logoutButton}>
                            <LogoutIcon />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

const Sidebar = ({ activeView, onNavigate, isMobile, isOpen, onClose }) => {
    const sidebarItems = [
        { id: 'Stock', label: 'Stock Overview' },
        { id: 'Update', label: 'Stock Updation' },
        { id: 'Deleted', label: 'Deleted Orders' },
        { id: 'Expired', label: 'Expired Orders' },
        { id: 'Users', label: 'User Management' },
        { id: 'Approval', label: 'Order Approval' },
    ];
    const sidebarStyle = isMobile ? { ...styles.sidebar, ...styles.sidebarMobile, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' } : styles.sidebar;
    return (
        <>
            {isMobile && isOpen && <div style={styles.overlay} onClick={onClose}></div>}
            <nav style={sidebarStyle}>
                <div style={styles.sidebarNav}>
                    {sidebarItems.map(item => (
                        <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={activeView === item.id ? { ...styles.navItem, ...styles.navItemActive } : styles.navItem}>
                            <NavIcon name={item.id} /><span style={styles.navLabel}>{item.label}</span>
                        </a>
                    ))}
                </div>
            </nav>
        </>
    );
};

const BottomNavBar = ({ activeView, onNavigate }) => {
    const navItems = [
        { id: 'Entry', label: 'Entry' },
        { id: 'Pending', label: 'Pending' },
        { id: 'Billing', label: 'Billing' },
        { id: 'Billed', label: 'Billed' },
    ];
    return (
        <nav style={styles.bottomNav}>
            {navItems.map(item => (
                <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={activeView === item.id ? { ...styles.bottomNavItem, ...styles.bottomNavItemActive } : styles.bottomNavItem}>
                    <NavIcon name={item.id} /><span style={styles.bottomNavLabel}>{item.label}</span>
                </a>
            ))}
        </nav>
    );
};

const MainContent = ({ activeView }) => {
    const pages = {
        'Entry': 'New Order Entry', 'Pending': 'Pending Orders', 'Billing': 'Ready for Billing', 'Billed': 'Billed Orders (Archive)',
        'Stock': 'Stock Overview', 'Update': 'Stock Updation', 'Deleted': 'Deleted Orders', 'Expired': 'Expired Orders', 'Users': 'User Management', 'Approval': 'Order Approval (Admin)'
    };
    return <main style={styles.mainContent}><PageContent title={pages[activeView] || 'Dashboard'} /></main>;
};

// --- HOMEPAGE WRAPPER ---
const HomePage = ({ session, onLogout, appLogoSrc }) => {
    const [activeView, setActiveView] = useState('Entry');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        // FIX: Cast querySelector results to HTMLElement to access the style property, as querySelector returns a generic Element type by default.
        const brandingPane = document.querySelector<HTMLElement>('.branding-pane');
        const formPane = document.querySelector<HTMLElement>('.form-pane');
        const rootEl = document.getElementById('root');

        if(brandingPane) brandingPane.style.display = 'none';
        if(formPane) {
            formPane.style.flex = '1 0 100%';
            formPane.style.padding = '0';
        }
        if(rootEl) rootEl.style.maxWidth = '100vw';
        document.body.style.overflow = 'auto';

        return () => {
            window.removeEventListener('resize', handleResize);
            if(brandingPane) brandingPane.style.display = 'flex';
            if(formPane) {
                formPane.style.flex = '1';
                formPane.style.padding = isMobile ? '1rem' : '2rem';
            }
            if(rootEl) rootEl.style.maxWidth = '420px';
            document.body.style.overflow = 'hidden';
        };
    }, [isMobile]);

    const handleNavigate = (view) => {
        setActiveView(view);
        if (isMobile) setIsSidebarOpen(false);
    };

    return (
        <div style={styles.appContainer}>
            <Header session={session} onLogout={onLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} appLogoSrc={appLogoSrc} isMobile={isMobile} />
            <div style={styles.appBody}>
                <Sidebar activeView={activeView} onNavigate={handleNavigate} isMobile={isMobile} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <MainContent activeView={activeView} />
            </div>
            {isMobile && <BottomNavBar activeView={activeView} onNavigate={handleNavigate} />}
        </div>
    );
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
                if (new Date().getTime() < sessionData.expiry) { setSession(sessionData); setIsLoggedIn(true); } 
                else { localStorage.removeItem('ka-oms-session'); }
            } catch (e) { console.error("Error parsing session data", e); localStorage.removeItem('ka-oms-session'); }
        }

        const loadAndCacheImage = async (key: string, url: string): Promise<string> => {
            try {
                const cachedData = await imageDb.getImage(key);
                if (cachedData && cachedData.url === url) { return URL.createObjectURL(cachedData.blob); }
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Network error for ${url}`);
                const imageBlob = await response.blob();
                await imageDb.setImage(key, imageBlob, url);
                return URL.createObjectURL(imageBlob);
            } catch (error) { console.error(`Failed to load/cache image ${key}:`, error); return url; }
        };

        const initializeApp = async () => {
            const [brandingSrc, logoSrc] = await Promise.all([
                loadAndCacheImage('branding-image', 'https://i.ibb.co/sphkNfpr/Copilot-20251105-083438.png'),
                loadAndCacheImage('app-logo', 'https://i.ibb.co/spDFy1wW/applogo-1.png')
            ]);
            const brandingImgElement = document.querySelector('.branding-pane-img') as HTMLImageElement;
            if (brandingImgElement) { brandingImgElement.src = brandingSrc; brandingImgElement.classList.add('loaded'); }
            setAppLogoSrc(logoSrc);
            setAreImagesReady(true);
            setIsMounted(true);
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
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'login', userId, password }), });
            const result = await response.json();
            if (result.success) {
                const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
                const newSession = { userId: result.userId, role: result.role, userName: result.userName, expiry };
                localStorage.setItem('ka-oms-session', JSON.stringify(newSession));
                setSession(newSession);
                setIsLoggedIn(true);
            } else { setError(result.message || 'Login failed.'); }
        } catch (err) { setError('An error occurred. Please check your network connection.'); } 
        finally { setIsLoading(false); }
    };
    
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setForgotMessage('');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'forgotPassword', email: forgotEmail }), });
            const result = await response.json();
            if (result.success) { setForgotMessage(result.message); setForgotEmail(''); } 
            else { setError(result.message || 'Password recovery failed.'); }
        } catch (err) { setError('An error occurred. Please check your network connection.'); } 
        finally { setIsLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('ka-oms-session');
        setIsLoggedIn(false);
        setSession(null);
        setUserId('');
        setPassword('');
    };
    
    const cardStyles = { ...styles.card, padding: isMobile ? '2.5rem 1.5rem' : '2.5rem 2rem', boxShadow: isMobile ? '0 4px 15px rgba(0, 0, 0, 0.06)' : 'var(--box-shadow)', transform: isMounted ? 'translateY(0)' : 'translateY(20px)', opacity: isMounted ? 1 : 0 };
    const titleStyles = { ...styles.title, fontSize: isMobile ? '1.5rem' : '1.75rem' };
    const subtitleStyles = { ...styles.subtitle, fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: isMobile ? '1.5rem' : '2rem' };
    const logoStyles = { ...styles.logo, opacity: areImagesReady ? 1 : 0, transition: 'opacity 0.3s ease-in' };

    if (isLoggedIn && session) {
        return <HomePage session={session} onLogout={handleLogout} appLogoSrc={appLogoSrc} />;
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
                                <div style={styles.inputGroup}><label style={{ ...styles.label, ...(forgotEmail || emailFocused ? styles.labelFocused : {}) }}>Email Address</label><input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} style={styles.input} required /></div>
                                {error && <p style={styles.error}>{error}</p>}
                                {forgotMessage && <p style={styles.success}>{forgotMessage}</p>}
                                <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Recovery Email'}</button>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setError(''); setForgotMessage(''); }} style={styles.link}>Back to Login</a>
                            </form>
                        ) : (
                            <form onSubmit={handleLogin} style={styles.form}>
                                <div style={styles.inputGroup}><label style={{ ...styles.label, ...(userId || userIdFocused ? styles.labelFocused : {}) }}>User ID (Mobile or Email)</label><input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} onFocus={() => setUserIdFocused(true)} onBlur={() => setUserIdFocused(false)} style={styles.input} required /></div>
                                <div style={styles.inputGroup}><label style={{ ...styles.label, ...(password || passwordFocused ? styles.labelFocused : {}) }}>Password</label><input type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} style={styles.input} required /><button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon} aria-label={isPasswordVisible ? "Hide password" : "Show password"}><EyeIcon closed={!isPasswordVisible} /></button></div>
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
    // --- App Layout ---
    appContainer: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--light-grey)' },
    appHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '64px', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--skeleton-bg)', flexShrink: 0 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    headerRight: { position: 'relative' },
    headerLogo: { height: '36px', width: '36px' },
    headerTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--dark-grey)' },
    profileButton: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark-grey)' },
    profileName: { fontWeight: 500 },
    profileDropdown: { position: 'absolute', top: '120%', right: 0, backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', zIndex: 100, width: '220px', border: '1px solid var(--skeleton-bg)' },
    dropdownInfo: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)' },
    dropdownUserName: { fontWeight: 600, color: 'var(--dark-grey)' },
    dropdownUserRole: { fontSize: '0.8rem', color: 'var(--text-color)' },
    logoutButton: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', width: '100%', color: 'var(--dark-grey)', fontSize: '0.9rem' },
    appBody: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: { width: '250px', backgroundColor: '#FBFCFD', borderRight: '1px solid var(--skeleton-bg)', flexShrink: 0, transition: 'transform 0.3s ease' },
    sidebarMobile: { position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 200 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 199 },
    sidebarNav: { display: 'flex', flexDirection: 'column', padding: '1rem 0.5rem' },
    navItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--text-color)', borderRadius: '8px', marginBottom: '0.25rem', fontWeight: 500 },
    navItemActive: { backgroundColor: 'var(--active-bg)', color: 'var(--brand-color)' },
    navLabel: { fontSize: '0.9rem' },
    mainContent: { flex: 1, overflowY: 'auto', padding: '1.5rem' },
    bottomNav: { display: 'flex', justifyContent: 'space-around', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--skeleton-bg)', position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', zIndex: 100 },
    bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textDecoration: 'none', color: 'var(--text-color)', gap: '2px' },
    bottomNavItemActive: { color: 'var(--brand-color)' },
    bottomNavLabel: { fontSize: '0.7rem' },
    pageContainer: { backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)' },
    // --- Login Styles ---
    loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' },
    card: { width: '100%', maxWidth: '420px', minHeight: '580px', padding: '2.5rem 2rem', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.2)', transition: 'transform 0.5s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    logo: { width: '80px', height: '80px', marginBottom: '0.5rem', margin: '0 auto 0.5rem', opacity: 0 },
    title: { color: 'var(--dark-grey)', fontWeight: 600, marginBottom: '0.25rem' },
    subtitle: { color: 'var(--text-color)', marginBottom: '2rem', fontSize: '1rem' },
    form: { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    inputGroup: { position: 'relative' },
    input: { width: '100%', padding: '12px 15px', paddingTop: '18px', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    label: { position: 'absolute', left: '15px', top: '15px', color: 'var(--text-color)', pointerEvents: 'none', transition: 'all 0.2s ease-out' },
    labelFocused: { top: '5px', fontSize: '0.75rem', color: 'var(--brand-color)' },
    eyeIcon: { position: 'absolute', top: '50%', right: '15px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '0' },
    button: { padding: '15px', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease, transform 0.1s ease', marginTop: '0.5rem' },
    link: { color: 'var(--brand-color)', textDecoration: 'none', fontSize: '0.9rem', marginTop: '0.5rem' },
    error: { color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center', marginTop: '-0.5rem', marginBottom: '0.5rem' },
    success: { color: '#2ecc71', fontSize: '0.85rem', textAlign: 'center' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><KAOMSLogin /></React.StrictMode>);
} else {
    console.error('Failed to find the root element');
}