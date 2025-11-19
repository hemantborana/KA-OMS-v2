
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { NewOrderEntry } from './neworderentry';
import { StockOverview } from './stockoverview';
import { PendingOrders } from './pendingorder';
import { ReadyForBilling } from './readyforbilling';
import { BilledOrders } from './billedorders';
import { DeletedOrders } from './deletedorders';
import { ExpiredOrders } from './expiredorders';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';


// --- TOAST NOTIFICATION SYSTEM ---
const ToastContext = React.createContext(null);
const useToast = () => React.useContext(ToastContext);

// FIX: Explicitly type Toast as a React.FC to allow the 'key' prop, which is used when mapping over toasts.
const Toast: React.FC<{ message: any, type: any, onClose: any }> = ({ message, type, onClose }) => {
    const toastStyles = {
        ...styles.toast,
        backgroundColor: type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db',
    };

    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div style={toastStyles}>
            {message}
        </div>
    );
};

// FIX: Explicitly type the children prop for ToastProvider to fix type inference issues.
// FIX: Correctly typed `children` prop by providing an explicit type to `React.FC`. This resolves the error where `children` was not found on the props object.
const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);

    const showToast = useCallback((message, type = 'info') => {
        setToasts(currentToasts => [
            ...currentToasts,
            { id: toastId.current++, message, type },
        ]);
    }, []);

    const removeToast = (id) => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div style={styles.toastContainer}>
                {toasts.map(toast => (
                    <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};


// --- ICON COMPONENTS ---
const EyeIcon = ({ closed }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> {closed ? (<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></>) : (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></>)} </svg>);
const MenuIcon = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24"><path d="M4 18H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M4 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const CloseSidebarIcon = () => <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" width="24" height="24"><path fillRule="evenodd" clipRule="evenodd" d="M4 5C3.44772 5 3 5.44772 3 6C3 6.55228 3.44772 7 4 7H20C20.5523 7 21 6.55228 21 6C21 5.44772 20.5523 5 20 5H4ZM7 12C7 11.4477 7.44772 11 8 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H8C7.44772 13 7 12.5523 7 12ZM13 18C13 17.4477 13.4477 17 14 17H20C20.5523 17 21 17.4477 21 18C21 18.5523 20.5523 19 20 19H14C13.4477 19 13 18.5523 13 18Z" fill="currentColor"/></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const NavIcon = ({ name }) => { const icons = { 
    Dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>, 
    Entry: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>, 
    Pending: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>, 
    Billing: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, 
    Billed: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>, 
    Stock: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-4-2V9"></path><path d="M20 13H4"></path><path d="M10 3L4 9"></path><path d="M14 3l6 6"></path></svg>, 
    Update: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, 
    Deleted: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>, 
    Expired: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /><path d="M2 2l20 20" /></svg>, 
    Users: <svg xmlns="hcom/w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, 
    Approval: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>,
    Preferences: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
}; return icons[name] || null; };
const Spinner = () => <div style={styles.spinner}></div>;
const CollapseIcon = ({ collapsed }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}><path d="m15 18-6-6 6-6"/></svg>;
const AlertTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

// --- DATABASE LOGIC ---
interface CachedImage { id: string; blob: Blob; url: string; }
const imageDb = {
    db: null,
    init: function(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { if (this.db) { resolve(this.db); return; } const request = indexedDB.open('BrandingImageCache', 3); request.onupgradeneeded = (event) => { const db = (event.target as IDBOpenDBRequest).result; if (db.objectStoreNames.contains('images')) { db.deleteObjectStore('images'); } db.createObjectStore('images', { keyPath: 'id' }); }; request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); }; request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error); reject((event.target as IDBOpenDBRequest).error); }; }); },
    getImage: function(id: string): Promise<CachedImage | null> { return new Promise(async (resolve, reject) => { const db = await this.init(); const transaction = db.transaction(['images'], 'readonly'); const store = transaction.objectStore('images'); const request = store.get(id); request.onsuccess = () => { resolve(request.result || null); }; request.onerror = (event) => { reject((event.target as IDBRequest).error); }; }); },
    setImage: function(id: string, blob: Blob, url: string) { return new Promise(async (resolve, reject) => { const db = await this.init(); const transaction = db.transaction(['images'], 'readwrite'); const store = transaction.objectStore('images'); const request = store.put({ id, blob, url }); request.onsuccess = () => { resolve(request.result); }; request.onerror = (event) => { reject((event.target as IDBRequest).error); }; }); }
};

// --- PAGE COMPONENTS ---
const PageContent = () => <div style={styles.pageContainer}><p>Functionality for this page is coming soon.</p></div>;

const ToggleSwitch = ({ checked, onChange }) => (
    <div 
        onClick={onChange} 
        style={{
            width: '44px', 
            height: '24px', 
            backgroundColor: checked ? 'var(--brand-color)' : '#cbd5e0', 
            borderRadius: '12px', 
            position: 'relative', 
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        }}
    >
        <div style={{
            width: '20px', 
            height: '20px', 
            backgroundColor: '#fff', 
            borderRadius: '50%', 
            position: 'absolute', 
            top: '2px', 
            left: checked ? '22px' : '2px', 
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
    </div>
);

const Preferences = ({ session, theme, toggleTheme, onUpdateUser }) => {
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const showToast = useToast();

    const handleEditClick = () => {
        setNewName(session.userName);
        setIsNameModalOpen(true);
    };

    const handleSaveName = () => {
        if (newName.trim().length === 0) {
            showToast('Name cannot be empty', 'error');
            return;
        }
        onUpdateUser(newName.trim());
        setIsNameModalOpen(false);
        showToast('Display name updated successfully', 'success');
    };

    return (
        <div style={styles.preferencesPageWrapper}>
             <div style={styles.preferencesHeaderCenter}>
                <div style={styles.preferenceAvatarLarge}>
                    {session.userName.charAt(0).toUpperCase()}
                </div>
                <div style={styles.preferenceUserInfoCenter}>
                    <h2 style={styles.preferenceUserName}>{session.userName}</h2>
                    <span style={styles.preferenceUserRole}>{session.role}</span>
                </div>
             </div>

             <div style={styles.preferenceSection}>
                <h3 style={styles.preferenceSectionTitleOutside}>Account Details</h3>
                <div style={styles.preferenceTileCard}>
                    <div style={styles.preferenceRow}>
                        <span style={styles.preferenceLabel}>User ID</span>
                        <span style={styles.preferenceValue}>{session.userId}</span>
                    </div>
                    <div style={styles.preferenceRow}>
                        <span style={styles.preferenceLabel}>Display Name</span>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <span style={styles.preferenceValue}>{session.userName}</span>
                            <button onClick={handleEditClick} style={styles.iconButton}><EditIcon /></button>
                        </div>
                    </div>
                    <div style={styles.preferenceRow}>
                        <span style={styles.preferenceLabel}>Email</span>
                        <span style={styles.preferenceValue}>{session.email || 'Not set'}</span>
                    </div>
                    <div style={{...styles.preferenceRow, borderBottom: 'none'}}>
                        <span style={styles.preferenceLabel}>Status</span>
                        <span style={{...styles.preferenceValue, color: '#2ecc71', fontWeight: 600}}>Active</span>
                    </div>
                </div>
             </div>

             <div style={styles.preferenceSection}>
                <h3 style={styles.preferenceSectionTitleOutside}>Application</h3>
                <div style={styles.preferenceTileCard}>
                     <div style={styles.preferenceRow}>
                        <span style={styles.preferenceLabel}>Version</span>
                        <span style={styles.preferenceValue}>2.0.1</span>
                    </div>
                    <div style={{...styles.preferenceRow, borderBottom: 'none'}}>
                        <span style={styles.preferenceLabel}>Theme</span>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                             <span style={{fontSize: '0.9rem', color: 'var(--text-color)'}}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                             <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
                        </div>
                    </div>
                </div>
             </div>

            {isNameModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Change Display Name</h3>
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            style={styles.input}
                            autoFocus
                        />
                        <div style={styles.modalActions}>
                            <button onClick={() => setIsNameModalOpen(false)} style={styles.secondaryButton}>Cancel</button>
                            <button onClick={handleSaveName} style={styles.primaryButton}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = ({ onNavigate, session }) => {
    const [stats, setStats] = useState({ pending: 0, billing: 0, overdue: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const refs = [
            firebase.database().ref('Pending_Order_V2'),
            firebase.database().ref('Ready_For_Billing_V2'),
        ];

        const listeners = refs.map(ref => {
            const listener = ref.on('value', () => {
                // This is just to trigger a re-fetch when any node changes.
                // The main logic is consolidated below.
                fetchStats();
            });
            return { ref, listener };
        });

        const fetchStats = async () => {
            try {
                const [pendingSnapshot, billingSnapshot] = await Promise.all(refs.map(r => r.once('value')));
                const pendingData = pendingSnapshot.val() || {};
                const billingData = billingSnapshot.val() || {};
                
                const pendingOrders = Object.values(pendingData) as any[];
                const billingOrders = Object.values(billingData) as any[];
                
                const twentyFiveDaysAgo = new Date().getTime() - (25 * 24 * 60 * 60 * 1000);
                const overdueCount = pendingOrders.filter(order => new Date(order.timestamp).getTime() < twentyFiveDaysAgo).length;

                setStats({
                    pending: pendingOrders.length,
                    billing: billingOrders.length,
                    overdue: overdueCount,
                });
            } catch (e) {
                console.error("Failed to fetch dashboard stats", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        return () => {
            listeners.forEach(({ ref, listener }) => ref.off('value', listener));
        };
    }, []);
    
    const kpiCards = [
        { title: 'Pending Orders', value: stats.pending, icon: <NavIcon name="Pending" /> },
        { title: 'Ready for Billing', value: stats.billing, icon: <NavIcon name="Billing" /> },
    ];

    const actionCard = stats.overdue > 0 ? {
        title: 'Action Required',
        value: `${stats.overdue} Orders Overdue`,
        icon: <AlertTriangleIcon />,
        style: styles.kpiCardAlert,
        onClick: () => onNavigate('Pending')
    } : null;

    return (
        <div style={styles.dashboardContainer}>
            <h2 style={styles.dashboardWelcome}>Welcome back, {session.userName}!</h2>
            {isLoading ? <div style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}><Spinner /></div> : (
                <div style={styles.dashboardGrid}>
                    {/* KPI Cards */}
                    {kpiCards.map(card => (
                        <div key={card.title} style={styles.kpiCard}>
                            <div style={styles.kpiIcon}>{card.icon}</div>
                            <div>
                                <div style={styles.kpiTitle}>{card.title}</div>
                                <div style={styles.kpiValue}>{card.value}</div>
                            </div>
                        </div>
                    ))}

                    {/* Action Card */}
                    {actionCard && (
                         <div key={actionCard.title} style={{...styles.kpiCard, ...actionCard.style, cursor: 'pointer'}} onClick={actionCard.onClick}>
                            <div style={{...styles.kpiIcon, color: '#c0392b'}}>{actionCard.icon}</div>
                            <div>
                                <div style={styles.kpiTitle}>{actionCard.title}</div>
                                <div style={styles.kpiValue}>{actionCard.value}</div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div style={{...styles.dashboardCard, gridColumn: 'span 2'}}>
                        <h3 style={styles.cardTitle}>Quick Actions</h3>
                        <div style={styles.quickActions}>
                            <button style={styles.actionButton} onClick={() => onNavigate('Entry')}><NavIcon name="Entry" /> New Order</button>
                            <button style={styles.actionButton} onClick={() => onNavigate('Stock')}><NavIcon name="Stock" /> View Stock</button>
                            <button style={styles.actionButton} onClick={() => onNavigate('Billed')}><NavIcon name="Billed" /> View Billed Archive</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- LAYOUT COMPONENTS ---
const Header = ({ onToggleSidebar, appLogoSrc, isMobile, title }) => {
    return (
        <header style={styles.appHeader}>
            <div style={styles.headerLeft}>
                {isMobile ? (
                    <>
                        <button onClick={onToggleSidebar} style={styles.menuButton}><MenuIcon /></button>
                        <img src={appLogoSrc} alt="Logo" style={styles.headerLogo} />
                    </>
                ) : (
                    <>
                        <img src={appLogoSrc} alt="Logo" style={styles.headerLogo} />
                        <span style={styles.headerTitle}>Kambeshwar Agencies</span>
                    </>
                )}
            </div>
            <div style={styles.headerCenter}>
                <h1 style={styles.headerPageTitle}>{title}</h1>
            </div>
            <div style={styles.headerRight}>
                {/* Kept for layout balance and potential future use */}
            </div>
        </header>
    );
};


const Sidebar = ({ activeView, onNavigate, isMobile, isOpen, onClose, session, onLogout, isCollapsed, onToggleCollapse, sidebarRef }) => {
    const primaryItems = [
        { id: 'Dashboard', label: 'Dashboard' },
        { id: 'Entry', label: 'New Order Entry' },
        { id: 'Pending', label: 'Pending Orders' },
        { id: 'Billing', label: 'Ready for Billing' },
        { id: 'Billed', label: 'Billed Orders (Archive)' },
    ];
    const secondaryItems = [
        { id: 'Stock', label: 'Stock Overview' },
        { id: 'Update', label: 'Stock Updation' },
        { id: 'Deleted', label: 'Deleted Orders' },
        { id: 'Expired', label: 'Expired Orders' },
        { id: 'Users', label: 'User Management' },
        { id: 'Approval', label: 'Order Approval (Admin)' },
        { id: 'Preferences', label: 'Preferences' },
    ];

    const isActuallyCollapsed = !isMobile && isCollapsed;

    const sidebarStyle = isMobile
        ? { ...styles.sidebar, ...styles.sidebarMobile, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }
        : isActuallyCollapsed
            ? { ...styles.sidebar, ...styles.sidebarCollapsed }
            : styles.sidebar;

    const navItemStyle = (id) => {
        let baseStyle = activeView === id ? { ...styles.navItem, ...styles.navItemActive } : styles.navItem;
        if (isActuallyCollapsed) {
            baseStyle = { ...baseStyle, justifyContent: 'center' };
        }
        return baseStyle;
    };

    return (
        <>
            {isMobile && isOpen && <div style={styles.overlay} onClick={onClose}></div>}
            <nav style={sidebarStyle} ref={sidebarRef}>
                <div style={styles.sidebarHeader}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                             <UserIcon />
                             {!isActuallyCollapsed && (
                                <div style={styles.sidebarUserInfo}>
                                   <div style={styles.sidebarUserName}>{session.userName}</div>
                                   <div style={styles.sidebarUserRole}>{session.role}</div>
                                </div>
                             )}
                         </div>
                         {isMobile && (
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-grey)', padding: '4px' }}>
                                <CloseSidebarIcon />
                            </button>
                         )}
                     </div>
                     <button onClick={onLogout} style={isActuallyCollapsed ? { ...styles.sidebarLogoutButton, ...styles.sidebarLogoutButtonCollapsed } : styles.sidebarLogoutButton}>
                         <LogoutIcon />
                         {!isActuallyCollapsed && <span>Logout</span>}
                     </button>
                </div>
                <div style={styles.sidebarNav}>
                    {primaryItems.map(item => (
                        <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={navItemStyle(item.id)} title={isActuallyCollapsed ? item.label : ''}>
                            <NavIcon name={item.id} />{!isActuallyCollapsed && <span style={styles.navLabel}>{item.label}</span>}
                        </a>
                    ))}
                    <hr style={styles.sidebarSeparator} />
                    {secondaryItems.map(item => (
                        <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={navItemStyle(item.id)} title={isActuallyCollapsed ? item.label : ''}>
                            <NavIcon name={item.id} />{!isActuallyCollapsed && <span style={styles.navLabel}>{item.label}</span>}
                        </a>
                    ))}
                </div>
                {!isMobile && (
                    <div style={styles.sidebarFooter}>
                        <button onClick={onToggleCollapse} style={isActuallyCollapsed ? {...styles.collapseButtonSidebar, justifyContent: 'center'} : styles.collapseButtonSidebar}>
                            <CollapseIcon collapsed={isActuallyCollapsed} />
                            {!isActuallyCollapsed && <span style={styles.navLabel}>Collapse</span>}
                        </button>
                    </div>
                )}
            </nav>
        </>
    );
};

const BottomNavBar = ({ activeView, onNavigate }) => {
    const navItems = [
        { id: 'Dashboard', label: 'Home' },
        { id: 'Entry', label: 'Entry' },
        { id: 'Stock', label: 'Stock' },
        { id: 'Pending', label: 'Pending' },
    ];
    return (
        <nav style={styles.bottomNav}>
            {navItems.map(item => (
                <a key={item.id} title={item.label} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={activeView === item.id ? { ...styles.bottomNavItem, ...styles.bottomNavItemActive } : styles.bottomNavItem}>
                    <NavIcon name={item.id} />
                </a>
            ))}
        </nav>
    );
};

type MainContentProps = {
    activeView: string;
    onNavigate: (view: string) => void;
    session: any;
    isMobile: boolean;
    theme: string;
    toggleTheme: () => void;
    onUpdateUser: (name: string) => void;
};

const MainContent = React.forwardRef<HTMLElement, MainContentProps>(
    ({ activeView, onNavigate, session, isMobile, theme, toggleTheme, onUpdateUser }, ref) => {
        let mainStyle = styles.mainContent;

        if (isMobile) {
            let mobilePadding;
            if (activeView === 'Entry' || activeView === 'Pending') {
                mobilePadding = { padding: 0 };
            } else {
                mobilePadding = { padding: '0.5rem 0.25rem', paddingBottom: '70px' };
            }
            mainStyle = {
                ...styles.mainContent,
                ...mobilePadding,
                maskImage: 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent 100%)',
            };
        }

        const renderView = () => {
            switch (activeView) {
                case 'Dashboard': return <Dashboard onNavigate={onNavigate} session={session} />;
                case 'Entry': return <NewOrderEntry onNavigate={onNavigate} />;
                case 'Stock': return <StockOverview />;
                case 'Pending': return <PendingOrders onNavigate={onNavigate} />;
                case 'Billing': return <ReadyForBilling />;
                case 'Billed': return <BilledOrders />;
                case 'Deleted': return <DeletedOrders />;
                case 'Expired': return <ExpiredOrders />;
                case 'Preferences': return <Preferences session={session} theme={theme} toggleTheme={toggleTheme} onUpdateUser={onUpdateUser} />;
                default: return <PageContent />;
            }
        };
        
        return <main style={mainStyle} ref={ref}>{renderView()}</main>;
    }
);


// --- HOMEPAGE WRAPPER ---
const HomePage = ({ session, onLogout, appLogoSrc, onUpdateUser }) => {
    const [activeView, setActiveView] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const showToast = useToast();
    const sidebarRef = useRef(null);
    const mainContentRef = useRef<HTMLElement | null>(null);
    
    const pages = {
        'Dashboard': 'Dashboard', 'Entry': 'New Order Entry', 'Pending': 'Pending Orders', 'Billing': 'Ready for Billing', 'Billed': 'Billed Orders (Archive)',
        'Stock': 'Stock Overview', 'Update': 'Stock Updation', 'Deleted': 'Deleted Orders', 'Expired': 'Expired Orders', 'Users': 'User Management', 'Approval': 'Order Approval (Admin)',
        'Preferences': 'Preferences'
    };

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };
    
    const handleNavigate = (view) => {
        setActiveView(view);
        if (isMobile) setIsSidebarOpen(false);
    };

    // SWIPE LOGIC START
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const touchStartY = useRef(0);

    const handleTouchStart = (e) => {
        const target = e.target as HTMLElement;
        // If user is interacting with a swipeable item (pending/billing items), disable sidebar swipe
        // This prevents collision between item actions and sidebar navigation
        if (target.closest('.swipeable-content')) {
            touchStartX.current = -1; 
            return;
        }
        
        touchStartX.current = e.changedTouches[0].screenX;
        touchStartY.current = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === -1) return;
        
        touchEndX.current = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipe(touchEndY);
    };

    const handleSwipe = (touchEndY) => {
        const distanceX = touchStartX.current - touchEndX.current;
        const distanceY = touchStartY.current - touchEndY;
        const minSwipeDistance = 50;

        // Detect if the gesture is vertical (scrolling) rather than horizontal
        if (Math.abs(distanceY) > Math.abs(distanceX)) return;

        // Swipe Right (Left to Right) -> Open
        // Distance is negative (Start < End)
        if (distanceX < -minSwipeDistance) {
            if (isMobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        }

        // Swipe Left (Right to Left) -> Close
        // Distance is positive (Start > End)
        if (distanceX > minSwipeDistance) {
            if (isMobile && isSidebarOpen) {
                setIsSidebarOpen(false);
            }
        }
    };
    // SWIPE LOGIC END

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        const handleShowToast = (e: CustomEvent) => {
            if (showToast) {
                showToast(e.detail.message, e.detail.type);
            }
        };
        window.addEventListener('show-toast', handleShowToast as EventListener);

        const handleClickOutside = (event) => {
            if (isMobile && isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    handleNavigate('Entry');
                    break;
                case 's':
                    e.preventDefault();
                    const searchInput = document.querySelector('.global-search-input') as HTMLInputElement;
                    if (searchInput) {
                        searchInput.focus();
                    }
                    break;
                case 'arrowup':
                    e.preventDefault();
                    if (mainContentRef.current) {
                        mainContentRef.current.scrollBy({ top: -80, behavior: 'smooth' });
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (mainContentRef.current) {
                        mainContentRef.current.scrollBy({ top: 80, behavior: 'smooth' });
                    }
                    break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        const brandingPane = document.querySelector<HTMLElement>('.branding-pane');
        const formPane = document.querySelector<HTMLElement>('.form-pane');
        const rootEl = document.getElementById('root');

        if(brandingPane) brandingPane.style.display = 'none';
        if(formPane) {
            formPane.style.flex = '1 0 100%';
            formPane.style.padding = '0';
        }
        if(rootEl) rootEl.style.maxWidth = '100%';
        document.body.style.overflow = 'auto';

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('show-toast', handleShowToast as EventListener);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);

            if(brandingPane) brandingPane.style.display = 'flex';
            if(formPane) {
                formPane.style.flex = '1';
                formPane.style.padding = isMobile ? '1rem' : '2rem';
            }
            if(rootEl) rootEl.style.maxWidth = '420px';
            document.body.style.overflow = 'hidden';
        };
    }, [isMobile, showToast, isSidebarCollapsed, isSidebarOpen]);

    const handleToggleSidebarCollapse = () => {
        if (!isMobile) {
            setIsSidebarCollapsed(prev => !prev);
        }
    };

    return (
        <div style={styles.appContainer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} appLogoSrc={appLogoSrc} isMobile={isMobile} title={pages[activeView] || 'Dashboard'} />
            <div style={styles.appBody}>
                <Sidebar 
                    activeView={activeView} 
                    onNavigate={handleNavigate} 
                    isMobile={isMobile} 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                    session={session} 
                    onLogout={onLogout} 
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={handleToggleSidebarCollapse}
                    sidebarRef={sidebarRef}
                />
                <MainContent 
                    ref={mainContentRef} 
                    activeView={activeView} 
                    onNavigate={handleNavigate} 
                    session={session} 
                    isMobile={isMobile} 
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onUpdateUser={onUpdateUser}
                />
            </div>
            {isMobile && activeView !== 'Entry' && <BottomNavBar activeView={activeView} onNavigate={handleNavigate} />}
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
                const newSession = { userId: result.userId, role: result.role, userName: result.userName, expiry, email: result.email }; // Assuming email is returned or mocked
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
    
    const updateUserName = (newName) => {
        const updatedSession = { ...session, userName: newName };
        setSession(updatedSession);
        localStorage.setItem('ka-oms-session', JSON.stringify(updatedSession));
    };
    
    const cardStyles = { ...styles.card, padding: isMobile ? '2.5rem 1.5rem' : '2.5rem 2rem', boxShadow: isMobile ? '0 4px 15px rgba(0, 0, 0, 0.06)' : 'var(--box-shadow)', transform: isMounted ? 'translateY(0)' : 'translateY(20px)', opacity: isMounted ? 1 : 0 };
    const titleStyles = { ...styles.title, fontSize: isMobile ? '1.5rem' : '1.75rem' };
    const subtitleStyles = { ...styles.subtitle, fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: isMobile ? '1.5rem' : '2rem' };
    const logoStyles = { ...styles.logo, opacity: areImagesReady ? 1 : 0, transition: 'opacity 0.3s ease-in' };

    if (isLoggedIn && session) {
        return <HomePage session={session} onLogout={handleLogout} appLogoSrc={appLogoSrc} onUpdateUser={updateUserName} />;
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
    appHeader: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0.75rem 1.5rem 1rem', background: 'linear-gradient(to bottom, var(--card-bg) 60%, transparent)', borderBottom: 'none', flexShrink: 0, zIndex: 10 },
    headerLeft: { gridColumn: '1', display: 'flex', alignItems: 'center', gap: '1rem', justifySelf: 'start' },
    headerCenter: { gridColumn: '2', textAlign: 'center', minWidth: 0 },
    headerRight: { gridColumn: '3', justifySelf: 'end' },
    headerLogo: { height: '36px', width: '36px' },
    headerTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    headerPageTitle: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-grey)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--dark-grey)' },
    appBody: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: { width: '250px', backgroundColor: 'var(--card-bg)', borderRight: '1px solid var(--skeleton-bg)', flexShrink: 0, transition: 'width 0.3s ease, transform 0.3s ease', display: 'flex', flexDirection: 'column' },
    sidebarCollapsed: { width: '80px' },
    sidebarMobile: { position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 200 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)', zIndex: 199 },
    sidebarHeader: { padding: '1.5rem', borderBottom: '1px solid var(--skeleton-bg)' },
    sidebarUser: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
    sidebarUserInfo: { transition: 'opacity 0.2s ease' },
    sidebarUserName: { fontWeight: 600, color: 'var(--dark-grey)', whiteSpace: 'nowrap' },
    sidebarUserRole: { fontSize: '0.8rem', color: 'var(--text-color)', whiteSpace: 'nowrap' },
    sidebarLogoutButton: { background: 'none', border: '1px solid var(--skeleton-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', width: '100%', color: 'var(--text-color)', fontSize: '0.9rem', borderRadius: '8px', transition: 'all 0.2s ease' },
    sidebarLogoutButtonCollapsed: { padding: '0.6rem', width: '44px', height: '44px' },
    sidebarNav: { display: 'flex', flexDirection: 'column', padding: '1rem 0.5rem', flex: 1, overflowY: 'auto' },
    sidebarSeparator: { margin: '0.75rem 1rem', border: 'none', borderTop: '1px solid var(--skeleton-bg)' },
    sidebarFooter: { marginTop: 'auto', padding: '1rem 0.5rem' },
    collapseButtonSidebar: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', width: '100%', color: 'var(--text-color)', fontSize: '0.9rem', borderRadius: '8px', transition: 'background-color 0.2s ease, color 0.2s ease', justifyContent: 'flex-start' },
    navItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--text-color)', borderRadius: '8px', marginBottom: '0.25rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background-color 0.2s, color 0.2s' },
    navItemActive: { backgroundColor: 'var(--active-bg)', color: 'var(--brand-color)' },
    navLabel: { fontSize: '0.9rem', transition: 'opacity 0.2s ease-out' },
    mainContent: { flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' },
    bottomNav: { display: 'flex', justifyContent: 'space-around', background: 'linear-gradient(to top, var(--card-bg) 70%, transparent)', borderTop: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', zIndex: 100 },
    bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textDecoration: 'none', color: 'var(--text-color)' },
    bottomNavItemActive: { color: 'var(--brand-color)' },
    pageContainer: { backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)' },
    // --- Dashboard Styles ---
    dashboardContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    dashboardWelcome: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark-grey)' },
    dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
    dashboardCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', gridColumn: 'span 1' },
    kpiCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', alignItems: 'center', gap: '1.5rem' },
    kpiCardAlert: { backgroundColor: '#fbe2e2', border: '1px solid #e74c3c' },
    kpiIcon: { color: 'var(--brand-color)' },
    kpiTitle: { fontSize: '0.9rem', color: 'var(--text-color)', marginBottom: '0.25rem' },
    kpiValue: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '1rem' },
    cardText: { fontSize: '0.9rem', color: 'var(--text-color)' },
    quickActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--dark-grey)', fontWeight: 500 },
    itemList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--light-grey)', fontSize: '0.9rem' },
    lowStockBadge: { backgroundColor: '#fbe2e2', color: '#c0392b', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 },
    activityTime: { color: 'var(--text-color)', fontSize: '0.8rem' },
    // --- Toast Styles ---
    toastContainer: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' },
    toast: { padding: '12px 20px', borderRadius: '8px', color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', animation: 'toast-in 0.5s forwards' },
    // --- Login Styles ---
    loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' },
    card: { width: '100%', maxWidth: '420px', minHeight: '580px', padding: '2.5rem 2rem', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.2)', transition: 'transform 0.5s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    logo: { width: '80px', height: '80px', marginBottom: '0.5rem', margin: '0 auto 0.5rem', opacity: 0 },
    title: { color: 'var(--dark-grey)', fontWeight: 600, marginBottom: '0.25rem' },
    subtitle: { color: 'var(--text-color)', marginBottom: '2rem', fontSize: '1rem' },
    form: { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    inputGroup: { position: 'relative' },
    input: { width: '100%', padding: '12px 15px', paddingTop: '18px', fontSize: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    label: { position: 'absolute', left: '15px', top: '15px', color: 'var(--text-color)', pointerEvents: 'none', transition: 'all 0.2s ease-out' },
    labelFocused: { top: '5px', fontSize: '0.75rem', color: 'var(--brand-color)' },
    eyeIcon: { position: 'absolute', top: '50%', right: '15px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '0' },
    button: { padding: '15px', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease, transform 0.1s ease', marginTop: '0.5rem' },
    link: { color: 'var(--brand-color)', textDecoration: 'none', fontSize: '0.9rem', marginTop: '0.5rem' },
    error: { color: '#e74c3c', fontSize: '0.85rem', textAlign: 'center', marginTop: '-0.5rem', marginBottom: '0.5rem' },
    success: { color: '#2ecc71', fontSize: '0.85rem', textAlign: 'center' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
    
    // --- Preferences Styles ---
    preferencesPageWrapper: { display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%', padding: '1rem' },
    preferencesHeaderCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' },
    preferenceAvatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--brand-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    preferenceUserInfoCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
    preferenceUserName: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-grey)', margin: '0 0 0.25rem 0' },
    preferenceUserRole: { fontSize: '0.95rem', color: 'var(--text-color)', fontWeight: 500 },
    
    preferenceSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    preferenceSectionTitleOutside: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-color)', marginLeft: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
    preferenceTileCard: { backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' },
    preferenceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' },
    preferenceLabel: { color: 'var(--dark-grey)', fontSize: '0.95rem', fontWeight: 500 },
    preferenceValue: { color: 'var(--text-color)', fontWeight: 400, fontSize: '0.95rem' },
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalContent: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
    primaryButton: { padding: '0.6rem 1.2rem', backgroundColor: 'var(--brand-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 },
    secondaryButton: { padding: '0.6rem 1.2rem', backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' },
    iconButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', alignItems: 'center', padding: '4px' },
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><ToastProvider><KAOMSLogin /></ToastProvider></React.StrictMode>);
} else {
    console.error('Failed to find the root element');
}

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);
