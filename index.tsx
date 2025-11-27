
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { NewOrderEntry } from './neworderentry';
import { StockOverview } from './stockoverview';
import { PendingOrders } from './pendingorder';
import { ReadyForBilling } from './readyforbilling';
import { BilledOrders } from './billedorders';
import { InactiveOrders } from './inactiveorders';
import { UserManagement } from './usermanagement';
import { OrderApproval } from './orderapproval';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';


// --- TOAST NOTIFICATION SYSTEM ---
const ToastContext = React.createContext(null);
const useToast = () => React.useContext(ToastContext);

// FIX: Explicitly type Toast as a React.FC to allow the 'key' prop, which is used when mapping over toasts.
const Toast: React.FC<{ message: any, type: any, onClose: any }> = ({ message, type, onClose }) => {
    const toastStyles = {
        ...styles.toast,
        backgroundColor: type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--blue)',
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
const DesktopSidebarToggleIcon = () => (<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor">
  <path d="M50.01,56.074l-35.989,0c-3.309,0 -5.995,-2.686 -5.995,-5.995l0,-36.011c0,-3.308 2.686,-5.994 5.995,-5.994l35.989,0c3.309,0 5.995,2.686 5.995,5.994l0,36.011c0,3.309 -2.686,5.995 -5.995,5.995Zm-25.984,-4l0,-40l-9.012,0c-1.65,0.001 -2.989,1.34 -2.989,2.989l0,34.022c0,1.649 1.339,2.989 2.989,2.989l9.012,0Zm24.991,-40l-20.991,0l0,40l20.991,0c1.65,0 2.989,-1.34 2.989,-2.989l0,-34.022c0,-1.649 -1.339,-2.988 -2.989,-2.989Z"/>
</svg>);
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const NavIcon = ({ name, active = false }) => {
    const icons = {
        Dashboard: active ? 
            <svg width="30" height="30" viewBox="0 0 28 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.6288 1.94617C12.9452 0.685478 15.0206 0.684487 16.3382 1.94393L25.9705 9.82424C26.0825 9.92147 26.2415 10.0911 26.3998 10.3064C26.5943 10.6198 26.7798 10.9189 27 11.8956V24.9976C27 26.1013 26.1068 27 25 27H18.7601C17.9317 27 17.2601 26.3284 17.2601 25.5V20.7939C17.2601 18.9948 15.8058 17.5405 14.0168 17.5405C12.2279 17.5405 10.7735 18.9948 10.7735 20.7939V25.5C10.7735 26.3284 10.102 27 9.27354 27H3C1.89318 27 1 26.1013 1 24.9976V11.7425C1 11.0901 1.36299 10.564 1.56986 10.3028C1.69049 10.1505 1.89631 9.94036 1.89631 9.94036L11.6288 1.94617Z"/></svg> : 
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M16.3382 1.94393L25.9705 9.82424L26.0201 9.8788C26.1701 10.0437 26.3998 10.3064 26.5943 10.6198C26.7798 10.9189 27 11.3686 27 11.8956V24.9976C27 26.1013 26.1068 27 25 27H18.7601C17.9317 27 17.2601 26.3284 17.2601 25.5V20.7939C17.2601 18.9948 15.8058 17.5405 14.0168 17.5405C12.2279 17.5405 10.7735 18.9948 10.7735 20.7939V25.5C10.7735 26.3284 10.102 27 9.27354 27H3C1.89318 27 1 26.1013 1 24.9976V11.7425C1 11.0901 1.36299 10.564 1.56986 10.3028C1.69049 10.1505 1.80873 10.0264 1.89631 9.94036C1.9407 9.89677 1.97877 9.86147 2.0074 9.83565C2.03384 9.81204 2.05551 9.79329 2.06007 9.7894L11.6288 1.94617C12.9452 0.685478 15.0206 0.684487 16.3382 1.94393ZM3.35246 11.3159C3.33673 11.33 3.31953 11.3459 3.29759 11.3674C3.19388 11.4736 3.07966 11.6178 3.01374 11.7344V24.9976H8.77354V20.7939C8.77354 17.8948 11.1188 15.5405 14.0168 15.5405C16.9149 15.5405 19.2601 17.8948 19.2601 20.7939V25H25V11.8956C24.9788 11.8095 24.8108 11.5389 24.588 11.2772L15.004 3.43645C14.4228 2.86484 13.5451 2.86525 12.997 3.40534L3.35246 11.3159Z" fill="currentColor"/></svg>,
        Entry: active ? 
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C4.89 2 4 2.9 4 4V20C4 21.1 4.89 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H13V15H11V18H8V15H11V12H13V15H16V18ZM13 9V3.5L18.5 9H13Z"/></svg> : 
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
        Pending: active ? 
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 2V8L10 12L6 16V22H18V16L14 12L18 8V2H6ZM16 16.5V20H8V16.5L12 12.5L16 16.5ZM12 11.5L8 7.5V4H16V7.5L12 11.5Z"/></svg> : 
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M6 2L10 6L6 10V14H18V10L14 6L18 2H6Z"/></svg>,
        Stock: active ? 
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M3 11H11V3H3V11ZM13 3V11H21V3H13ZM3 21H11V13H3V21ZM13 21H21V13H13V21Z"/></svg> :
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
        Billing: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, 
        Billed: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>, 
        Update: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, 
        Inactive: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="15" y1="10" x2="9" y2="16"></line><line x1="9" y1="10" x2="15" y2="16"></line></svg>, 
        Users: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, 
        Approval: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>,
        Preferences: <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    };
    return icons[name] || null;
};
const Spinner = () => <div style={styles.spinner}></div>;
const RadialSpinner = () => <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{color: 'var(--text-tertiary)'}}><style>{`.spinner_DupC{animation:spinner_sM3D 1.2s linear infinite}.spinner_GWtZ{animation-delay:-.1s}.spinner_dwN6{animation-delay:-.2s}.spinner_46_2{animation-delay:-.3s}.spinner_G24s{animation-delay:-.4s}.spinner_p24s{animation-delay:-.5s}.spinner_J3Y2{animation-delay:-.6s}.spinner_2eL5{animation-delay:-.7s}.spinner_R64v{animation-delay:-.8s}.spinner_sL4g{animation-delay:-.9s}.spinner_rC6k{animation-delay:-1s}.spinner_8i8F{animation-delay:-1.1s}@keyframes spinner_sM3D{0%{opacity:1}100%{opacity:.2}}`}</style><rect className="spinner_DupC" x="11" y="1" width="2" height="5" rx="1" fill="currentColor"/><rect className="spinner_DupC spinner_GWtZ" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(30 12 12)"/><rect className="spinner_DupC spinner_dwN6" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(60 12 12)"/><rect className="spinner_DupC spinner_46_2" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(90 12 12)"/><rect className="spinner_DupC spinner_G24s" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(120 12 12)"/><rect className="spinner_DupC spinner_p24s" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(150 12 12)"/><rect className="spinner_DupC spinner_J3Y2" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(180 12 12)"/><rect className="spinner_DupC spinner_2eL5" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(210 12 12)"/><rect className="spinner_DupC spinner_R64v" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(240 12 12)"/><rect className="spinner_DupC spinner_sL4g" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(270 12 12)"/><rect className="spinner_DupC spinner_rC6k" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(300 12 12)"/><rect className="spinner_DupC spinner_8i8F" x="11" y="1" width="2" height="5" rx="1" fill="currentColor" transform="rotate(330 12 12)"/></svg>;
const CollapseIcon = ({ collapsed }) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}><path d="m15 18-6-6 6-6"/></svg>;
const AlertTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const IdCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>;
const AtSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const ThemeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;


// --- AVATAR SYSTEM ---
const AvatarOne = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#58b0e0"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#60350a" fillRule="evenodd" d="M45.487 19.987l-29.173.175s1.048 16.148-2.619 21.21h35.701c-.92-1.35-3.353-1.785-3.909-21.385z"/><path fill="#d5e1ed" fillRule="evenodd" d="M18.135 45.599l7.206-3.187 11.55-.3 7.42 3.897-5.357 11.215-7.613 4.088-7.875-4.35-5.331-11.363z"/><path fill="#f9dca4" fillRule="evenodd" d="M24.744 38.68l12.931.084v8.949l-12.931-.085V38.68z"/><path fillRule="evenodd" opacity=".11" d="M37.677 38.778v3.58a9.168 9.168 0 0 1-.04 1.226 6.898 6.898 0 0 1-.313 1.327c-4.37 4.165-11.379.78-12.49-6.333z"/><path fill="#434955" fillRule="evenodd" d="M52.797 52.701a30.896 30.896 0 0 1-44.08-.293l1.221-3.098 9.103-4.122c3.262 5.98 6.81 11.524 12.317 15.455A45.397 45.397 0 0 0 43.2 45.483l8.144 3.853z"/><path fill="#f9dca4" fillRule="evenodd" d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 0 1-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 0 0 1.419-7.384z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z"/><path fill="#464449" fillRule="evenodd" d="M33.399 24.983a7.536 7.536 0 0 1 5.223-.993h.005c5.154.63 5.234 2.232 4.733 2.601a2.885 2.885 0 0 0-.785 1.022 6.566 6.566 0 0 1-1.052 2.922 5.175 5.175 0 0 1-3.464 2.312c-.168.027-.34.048-.516.058a4.345 4.345 0 0 1-3.65-1.554 8.33 8.33 0 0 1-1.478-2.53v.003s-.797-1.636-2.072-.114a8.446 8.446 0 0 1-1.52 2.64 4.347 4.347 0 0 1-3.651 1.555 5.242 5.242 0 0 1-.516-.058 5.176 5.176 0 0 1-3.464-2.312 6.568 6.568 0 0 1-1.052-2.921 2.75 2.75 0 0 0-.77-1.023c-.5-.37-.425-1.973 4.729-2.603a7.545 7.545 0 0 1 5.24 1.01l.003.002.215.131a3.93 3.93 0 0 0 3.842-.148zm-4.672.638a6.638 6.638 0 0 0-6.157-.253c-1.511.686-1.972 1.17-1.386 3.163a5.617 5.617 0 0 0 .712 1.532 4.204 4.204 0 0 0 3.326 1.995 3.536 3.536 0 0 0 2.966-1.272 7.597 7.597 0 0 0 1.36-2.37c.679-1.78.862-1.863-.82-2.795zm10.947-.45a6.727 6.727 0 0 0-5.886.565c-1.538.911-1.258 1.063-.578 2.79a7.476 7.476 0 0 0 1.316 2.26 3.536 3.536 0 0 0 2.967 1.272 4.228 4.228 0 0 0 .43-.048 4.34 4.34 0 0 0 2.896-1.947 5.593 5.593 0 0 0 .684-1.44c.702-2.25.076-2.751-1.828-3.451z"/><path fill="#8a5c42" fillRule="evenodd" d="M17.89 25.608c0-.638.984-.886 1.598 2.943a22.164 22.164 0 0 0 .956-4.813c1.162.225 2.278 2.848 1.927 5.148 3.166-.777 11.303-5.687 13.949-12.324 6.772 3.901 6.735 12.094 6.735 12.094s.358-1.9.558-3.516c.066-.538.293-.733.798-.213C48.073 17.343 42.3 5.75 31.297 5.57c-15.108-.246-17.03 16.114-13.406 20.039z"/><path fill="#fff" fillRule="evenodd" d="M24.765 42.431a14.125 14.125 0 0 0 6.463 5.236l-4.208 6.144-5.917-9.78z"/><path fill="#fff" fillRule="evenodd" d="M37.682 42.431a14.126 14.126 0 0 1-6.463 5.236l4.209 6.144 5.953-9.668z"/><circle cx="31.223" cy="52.562" r=".839" fill="#434955"/><circle cx="31.223" cy="56.291" r=".839" fill="#434955"/><path fill="#464449" fillRule="evenodd" d="M41.997 24.737c1.784.712 1.719 1.581 1.367 1.841a2.886 2.886 0 0 0-.785 1.022 6.618 6.618 0 0 1-.582 2.086v-4.949zm-21.469 4.479a6.619 6.619 0 0 1-.384-1.615 2.748 2.748 0 0 0-.77-1.023c-.337-.249-.413-1.06 1.154-1.754z"/></svg>;

const AvatarTwo = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#a9cf54"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#302e33" fillRule="evenodd" d="M16.647 25.104s1.394 18.62-1.98 23.645 16.51-.19 16.51-.19l.006-34.863z"/><path fill="#302e33" fillRule="evenodd" d="M45.705 25.104s-1.394 18.62 1.981 23.645-16.51-.19-16.51-.19l-.006-34.863z"/><path fill="#f9dca4" fillRule="evenodd" d="M52.797 52.701c-.608-1.462-.494-2.918-5.365-5.187-2.293-.542-8.21-1.319-9.328-3.4-.567-1.052-.43-2.535-.43-5.292l-12.93-.142c0 2.777.109 4.258-.524 5.298-1.19 1.957-8.935 3.384-11.338 4.024-4.093 1.819-3.625 2.925-4.165 4.406a30.896 30.896 0 0 0 44.08.293z"/><path fillRule="evenodd" opacity=".11" d="m37.677 38.778-.015 2.501a5.752 5.752 0 0 0 .55 3.011c-4.452 3.42-12.794 2.595-13.716-5.937z"/><path fill="#f9dca4" fillRule="evenodd" d="M19.11 24.183c-2.958 1.29-.442 7.41 1.42 7.383a30.842 30.842 0 0 1-1.42-7.383zM43.507 24.182c2.96 1.292.443 7.411-1.419 7.384a30.832 30.832 0 0 0 1.419-7.384z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.114 8.666c8.722 0 12.377 6.2 12.601 13.367.307 9.81-5.675 21.43-12.6 21.43-6.56 0-12.706-12.018-12.333-21.928.26-6.953 3.814-12.869 12.332-12.869z"/><path fill="#464449" fillRule="evenodd" d="M31.183 13.697c-.579 2.411-3.3 10.167-14.536 11.407C15.477 5.782 30.182 6.256 31.183 6.311c1.002-.055 15.707-.53 14.536 18.793-11.235-1.24-13.957-8.996-14.536-11.407z"/><path fill="#e9573e" fillRule="evenodd" d="M52.797 52.701c-14.87 4.578-34.168 1.815-39.915-4.699-4.093 1.819-3.625 2.925-4.165 4.406a30.896 30.896 0 0 0 44.08.293z"/><path fill="#e9573e" fillRule="evenodd" d="m42.797 46.518 1.071.253-.004 8.118h-1.067v-8.371z"/><path fill="#464449" fillRule="evenodd" d="M23.834 44.42c.002.013.878 4.451 7.544 4.451 6.641 0 7.046-4.306 7.047-4.318l.188.183c0 .012-.564 4.702-7.235 4.702-6.797 0-7.756-4.83-7.759-4.845z"/><ellipse cx="31.324" cy="49.445" rx="1.513" ry="1.909" fill="#464449"/></svg>;

const AvatarThree = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61.8 66.358"><defs><clipPath id="clip-path-a3"><path fill="none" d="M53.456 52.022A30.766 30.766 0 0 1 30.9 61.829a31.163 31.163 0 0 1-3.833-.237 34.01 34.01 0 0 1-11.15-3.644 31.007 31.007 0 0 1-7.849-6.225l1.282-3.1 13.91-6.212c.625 3.723 7.806 8.175 7.806 8.175s7.213-3.412 8.087-8.211l12.777 6.281z" clipRule="evenodd"></path></clipPath><clipPath id="clip-path-2-a3"><path fill="none" d="M14.112 46.496l6.814-3.042 10.209 13.978 10.328-13.938 5.949 2.831v20.033h-33.3V46.496z" clipRule="evenodd"></path></clipPath></defs><g><g><circle cx="30.9" cy="30.9" r="30.9" fill="#3dbc93"></circle><path fill="#f9dca4" fillRule="evenodd" d="M23.255 38.68l15.907.121v12.918l-15.907-.121V38.68z"></path><path fillRule="evenodd" d="M39.165 38.778v3.58a7.783 7.783 0 0 1-.098 1.18 6.527 6.527 0 0 1-.395 1.405c-5.374 4.164-13.939.748-15.306-6.365z" opacity=".11"></path><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"></path><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.046c-3.07 1.339-.46 7.686 1.472 7.658a31.972 31.972 0 0 1-1.472-7.659zM44.135 24.046c3.07 1.339.465 7.686-1.466 7.657a31.978 31.978 0 0 0 1.466-7.657z"></path><path fill="#ecbe6a" fillRule="evenodd" d="M44.123 24.17s7.96-11.785-2.636-16.334a11.881 11.881 0 0 0-12.87-5.22C22.775 3.805 20.604 6.7 20.604 6.7s-5.53 5.014-10.44 5.117a9.774 9.774 0 0 0 6.28 1.758c-.672 1.68-1.965 7.21 1.989 10.854 4.368-2.868 8.012-8.477 8.012-8.477s.982 3.257.207 4.86a18.879 18.879 0 0 0 7.922-3.531c2.542-2.036 3.893-4.297 5.31-4.326 3.256-.069 4.213 9.74 4.24 11.216z"></path><path fill="#498bd9" fillRule="evenodd" d="M53.456 52.022A30.766 30.766 0 0 1 30.9 61.829a31.163 31.163 0 0 1-3.833-.237 34.01 34.01 0 0 1-11.15-3.644 31.007 31.007 0 0 1-7.849-6.225l1.282-3.1 13.91-6.212c.625 3.723 7.806 8.175 7.806 8.175s7.213-3.412 8.087-8.211l12.777 6.281z"></path><g clipPath="url(#clip-path-a3)"><path fill="#545f69" fillRule="evenodd" d="M14.112 46.496l6.814-3.042 10.209 13.978 10.328-13.938 5.949 2.831v20.033h-33.3V46.496z"></path><g clipPath="url(#clip-path-2-a3)"><path fill="#434955" fillRule="evenodd" d="M37.79 42.881h.732v21.382h-.732V42.881zm-14.775 0h.731v21.382h-.73V42.881zm-2.981 0h.731v21.382h-.731V42.881zm-2.944 0h.731v21.382h-.73V42.881zm-2.981 0h.731v21.382h-.731V42.881zm20.708 0h.731v21.382h-.731V42.881zm-2.981 0h.731v21.382h-.731V42.881zm-2.944 0h.731v21.382h-.731V42.881zm-2.981 0h.731v21.382h-.731V42.881zm20.785 0h.732v21.382h-.732V42.881zm-2.98 0h.73v21.382h-.73V42.881zm-2.944 0h.73v21.382h-.73z"></path></g></g><path fill="#58b0e0" fillRule="evenodd" d="m23.265 41.27 7.802 9.316-6.305 3.553-4.823-10.591 3.326-2.278zM39.155 41.45l-8.088 9.136 6.518 3.553 4.777-10.719-3.207-1.97z"></path><path fill="#464449" fillRule="evenodd" d="M21.637 23.157h6.416a1.58 1.58 0 0 1 1.119.464v.002a1.579 1.579 0 0 1 .464 1.117v2.893a1.585 1.585 0 0 1-1.583 1.583h-6.416a1.578 1.578 0 0 1-1.116-.465h-.002a1.58 1.58 0 0 1-.464-1.118V24.74a1.579 1.579 0 0 1 .464-1.117l.002-.002a1.578 1.578 0 0 1 1.116-.464zm6.416.85h-6.416a.735.735 0 0 0-.517.214l-.001.002a.735.735 0 0 0-.214.517v2.893a.73.73 0 0 0 .215.517.735.735 0 0 0 .517.215h6.416a.735.735 0 0 0 .732-.732V24.74a.734.734 0 0 0-.214-.518.731.731 0 0 0-.518-.215zM34.548 23.157h6.416a1.58 1.58 0 0 1 1.118.464v.002a1.579 1.579 0 0 1 .465 1.117v2.893a1.585 1.585 0 0 1-1.583 1.583h-6.416a1.58 1.58 0 0 1-1.117-.465l-.001-.002a1.58 1.58 0 0 1-.465-1.116V24.74a1.58 1.58 0 0 1 .465-1.117l.002-.001a1.58 1.58 0 0 1 1.116-.465zm6.416.85h-6.416a.73.73 0 0 0-.517.214l-.001.002a.729.729 0 0 0-.214.517v2.893a.73.73 0 0 0 .214.517l.001.001a.73.73 0 0 0 .517.214h6.416a.735.735 0 0 0 .732-.732V24.74a.734.734 0 0 0-.214-.518h-.001a.731.731 0 0 0-.517-.215z"></path><path fill="#464449" d="M29.415 24.506h3.845v.876h-3.845z"></path></g></g></svg>;

const AvatarFour = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 61.8 61.8"><g><g><circle cx="30.9" cy="30.9" r="30.9" fill="#485a69"></circle><path fill="#f9dca4" fillRule="evenodd" d="M23.242 38.592l15.92.209v12.918l-15.907-.121-.013-13.006z"></path><path fill="#d5e1ed" fillRule="evenodd" d="M53.478 51.993A30.814 30.814 0 0 1 30.9 61.8a31.225 31.225 0 0 1-3.837-.237A30.699 30.699 0 0 1 15.9 57.919a31.033 31.033 0 0 1-7.857-6.225l1.284-3.1 13.925-6.212c0 4.535 1.84 6.152 7.97 6.244 7.57.113 7.94-1.606 7.94-6.28l12.79 6.281z"></path><path fillRule="evenodd" d="M39.165 38.778v3.404c-2.75 4.914-14 4.998-15.923-3.59z" opacity=".11"></path><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.267 0-21.281-35.266 0-35.266z"></path><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.045c-3.07 1.34-.46 7.687 1.472 7.658a31.973 31.973 0 0 1-1.472-7.658zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.992 31.992 0 0 0 1.471-7.658z"></path><path fill="#ecbe6a" fillRule="evenodd" d="M43.409 29.584s1.066-8.716-2.015-11.752c-1.34 3.528-7.502 4.733-7.502 4.733a16.62 16.62 0 0 0 3.215-2.947c-1.652.715-6.876 2.858-11.61 1.161a23.715 23.715 0 0 0 3.617-2.679s-4.287 2.322-8.44 1.742c-2.991 2.232-1.66 9.162-1.66 9.162C15 18.417 18.697 6.296 31.39 6.226c12.358-.069 16.17 11.847 12.018 23.358z"></path><path fill="#fff" fillRule="evenodd" d="M23.255 42.179a17.39 17.39 0 0 0 7.958 6.446l-5.182 5.349L19.44 43.87z"></path><path fill="#fff" fillRule="evenodd" d="M39.16 42.179a17.391 17.391 0 0 1-7.958 6.446l5.181 5.349 6.592-10.103z"></path><path fill="#3dbc93" fillRule="evenodd" d="M33.366 61.7q-1.239.097-2.504.098-.954 0-1.895-.056l1.031-8.757h2.41z"></path><path fill="#3dbc93" fillRule="evenodd" d="M28.472 51.456l2.737-2.817 2.736 2.817-2.736 2.817-2.737-2.817z"></path></g></g></svg>;

const AvatarFive = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#e9573e"/><path fill="#f9dca4" fillRule="evenodd" d="M23.255 38.68l15.907.149v3.617l7.002 3.339-15.687 14.719-13.461-15.34 6.239-2.656V38.68z"/><path fill="#677079" fillRule="evenodd" d="M53.478 51.993A30.813 30.813 0 0 1 30.9 61.8a31.226 31.226 0 0 1-3.837-.237A34.071 34.071 0 0 1 15.9 57.919a31.034 31.034 0 0 1-7.856-6.225l1.283-3.1 11.328-5.054c.875 4.536 4.235 11.535 10.176 15.502a24.128 24.128 0 0 0 11.057-15.318l10.063 4.903z"/><path fillRule="evenodd" opacity=".11" d="M39.791 42.745c.728.347 1.973.928 2.094.999-2.03 6.368-15.72 8.7-19.756-.756z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.266 0-21.281-35.266 0-35.266z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.045c-3.07 1.34-.46 7.687 1.472 7.658a31.974 31.974 0 0 1-1.472-7.658zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.993 31.993 0 0 0 1.471-7.658z"/><path fill="#ad835f" fillRule="evenodd" d="M23.396 15.437c-.592 2.768-.384 5.52-3.008 6.028-.624.12-1.037.965-1.172 1.71a22.896 22.896 0 0 0-.38 4.931c.104.569-.396-1.092-.396-1.092l-.085-3.174s-.037-.608-.023-1.535c.03-1.88.244-4.928 1.196-5.86 1.421-1.39 3.868-1.008 3.868-1.008zM39.095 15.437c.592 2.768.385 5.52 3.008 6.028.624.12 1.038.965 1.172 1.71a21.808 21.808 0 0 1 .312 4.947c-.105.57.395-1.092.395-1.092l.166-3.178s.025-.62.01-1.547c-.028-1.88-.242-4.928-1.195-5.86-1.421-1.39-3.868-1.008-3.868-1.008z"/><path fill="#60350a" fillRule="evenodd" d="M25.364 46.477c-1.51-1.457-2.718-2.587-3.814-3.718-1.405-1.451-1.881-2.922-2.154-5.498a110.846 110.846 0 0 1-1.043-13.43s1.034 6.333 2.962 9.455c.99 1.603 5.04-2.165 6.655-2.738a2.683 2.683 0 0 1 3.24.782 2.636 2.636 0 0 1 3.213-.782c1.616.573 5.61 3.792 6.656 2.738 2.515-2.536 3.057-9.446 3.057-9.446a113.885 113.885 0 0 1-1.129 13.576c-.363 2.746-.547 3.81-1.486 4.884a30.775 30.775 0 0 1-4.57 4.193c-.828.656-2.267 1.272-5.933 1.25-3.406-.02-4.803-.446-5.654-1.267zM39.604 15.997a2.638 2.638 0 0 1 2.76 1.227c1.556 2.613 1.685 2.95 1.685 2.95s-.184-4.674-.295-5.23a.697.697 0 0 1 .973.028c.11.222-.444-4.7-3.335-5.644-1.057-3.002-4.754-5.226-4.754-5.226l-.167 1.668a6.056 6.056 0 0 0-5.265-4.145c.667.751.507 1.3.507 1.3a8.152 8.152 0 0 0-3.288-.632c.14.889-.889 1.835-.889 1.835s-.639-.974-3.169-1.307c-.445 1.612-1.28 1.89-2.085 2.641a18.92 18.92 0 0 0-1.861 2.224s.083-1.557.639-2.002c.209-.138-4.716 1.803-2.252 9.036a1.962 1.962 0 0 0-1.945 1.462c1.39.389.815 2.49 1.593 3.852.547-1.58.909-4.658 4.328-3.852 2.448.577 4.798 1.814 7.62 1.913 3.987.139 5.501-1.954 9.2-2.098z"/><path fill="#ffe8be" fillRule="evenodd" d="M32.415 38.594a2.774 2.774 0 0 0 2.214-.588c.72-.83 1.307-2.009.215-2.643a8.583 8.583 0 0 0-3.581-1.472 8.595 8.595 0 0 0-3.604 1.47c-1.34.775-.52 1.815.201 2.645a2.774 2.774 0 0 0 2.214.588c-.811-2.824 3.153-2.824 2.341 0z"/></svg>;

const AvatarSix = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#58b0e0"/><path fill="#f9dca4" fillRule="evenodd" d="m23.255 38.68 15.907.121v12.918l-15.907-.121V38.68z"/><path fill="#e6e6e6" fillRule="evenodd" d="M43.971 58.905a30.967 30.967 0 0 1-25.843.14V48.417H43.97z"/><path fill="#e9573e" fillRule="evenodd" d="m33.403 61.7q-1.238.099-2.503.1-.955 0-1.895-.057l1.03-8.988h2.41z"/><path fill="#677079" fillRule="evenodd" d="M25.657 61.332A34.072 34.072 0 0 1 15.9 57.92a31.033 31.033 0 0 1-7.857-6.225l1.284-3.1 13.925-6.212c0 5.212 1.711 13.482 2.405 18.95z"/><path fillRule="evenodd" opacity=".11" d="M39.165 38.759v3.231c-4.732 5.527-13.773 4.745-15.8-3.412z"/><path fill="#ffe8be" fillRule="evenodd" d="M31.129 8.432c21.281 0 12.987 35.266 0 35.266-12.267 0-21.281-35.266 0-35.266z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.365 24.046c-3.07 1.339-.46 7.686 1.472 7.658a31.972 31.972 0 0 1-1.472-7.659zM44.14 24.045c3.07 1.339.46 7.687-1.471 7.658a31.993 31.993 0 0 0 1.471-7.658z"/><path fill="#464449" fillRule="evenodd" d="M21.931 14.328c-3.334 3.458-2.161 13.03-2.161 13.03l-1.05-.495c-6.554-25.394 31.634-25.395 25.043 0l-1.05.495s1.174-9.572-2.16-13.03c-4.119 3.995-14.526 3.974-18.622 0z"/><path fill="#677079" fillRule="evenodd" d="M36.767 61.243a30.863 30.863 0 0 0 17.408-10.018l-1.09-2.631-13.924-6.212c0 5.212-1.7 13.393-2.394 18.861z"/><path fill="#fff" fillRule="evenodd" d="m39.162 41.98-7.926 6.465 6.573 5.913s1.752-9.704 1.353-12.378z"/><path fill="#fff" fillRule="evenodd" d="m23.253 41.98 7.989 6.465-6.645 5.913s-1.746-9.704-1.344-12.378z"/><path fill="#e9573e" fillRule="evenodd" d="m28.109 51.227 3.137-2.818 3.137 2.818-3.137 2.817-3.137-2.817z"/><path fill="#434955" fillRule="evenodd" d="M25.767 61.373a30.815 30.815 0 0 1-3.779-.88 2.652 2.652 0 0 1-.114-.093l-3.535-6.39 4.541-3.26h-4.752l1.017-6.851 4.11-2.599c.178 7.37 1.759 15.656 2.512 20.073zM36.645 61.266c.588-.098 1.17-.234 1.747-.384a56.83 56.83 0 0 0 2.034-.579l.134-.043 3.511-6.315-4.541-3.242h4.752l-1.017-6.817-4.11-2.586c-.178 7.332-1.758 15.571-2.51 19.966z"/></svg>;

const AvatarSeven = () => <svg viewBox="0 0 61.8 61.8" xmlns="http://www.w3.org/2000/svg"><circle cx="30.9" cy="30.9" r="30.9" fill="#ffc200"/><path fill="#677079" fillRule="evenodd" d="M52.587 52.908a30.895 30.895 0 0 1-43.667-.291 9.206 9.206 0 0 1 4.037-4.832 19.799 19.799 0 0 1 4.075-2.322c-2.198-7.553 3.777-11.266 6.063-12.335 0 3.487 3.265 1.173 7.317 1.217 3.336.037 9.933 3.395 9.933-1.035 3.67 1.086 7.67 8.08 4.917 12.377a17.604 17.604 0 0 1 3.181 2.002 10.192 10.192 0 0 1 4.144 5.22z"/><path fill="#f9dca4" fillRule="evenodd" d="m24.032 38.68 14.92.09v3.437l-.007.053a2.784 2.784 0 0 1-.07.462l-.05.341-.03.071c-.966 5.074-5.193 7.035-7.803 8.401-2.75-1.498-6.638-4.197-6.947-8.972l-.013-.059v-.2a8.897 8.897 0 0 1-.004-.207c0 .036.003.07.004.106z"/><path fillRule="evenodd" opacity=".11" d="M38.953 38.617v4.005a7.167 7.167 0 0 1-.095 1.108 6.01 6.01 0 0 1-.38 1.321c-5.184 3.915-13.444.704-14.763-5.983z"/><path fill="#f9dca4" fillRule="evenodd" d="M18.104 25.235c-4.94 1.27-.74 7.29 2.367 7.264a19.805 19.805 0 0 1-2.367-7.264zM43.837 25.235c4.94 1.27.74 7.29-2.368 7.263a19.8 19.8 0 0 0 2.368-7.263z"/><path fill="#ffe8be" fillRule="evenodd" d="M30.733 11.361c20.523 0 12.525 32.446 0 32.446-11.83 0-20.523-32.446 0-32.446z"/><path fill="#8a5c42" fillRule="evenodd" d="M21.047 22.105a1.738 1.738 0 0 1-.414 2.676c-1.45 1.193-1.503 5.353-1.503 5.353-.56-.556-.547-3.534-1.761-5.255s-2.032-13.763 4.757-18.142a4.266 4.266 0 0 0-.933 3.6s4.716-6.763 12.54-6.568a5.029 5.029 0 0 0-2.487 3.26s6.84-2.822 12.54.535a13.576 13.576 0 0 0-4.145 1.947c2.768.076 5.443.59 7.46 2.384a3.412 3.412 0 0 0-2.176 4.38c.856 3.503.936 6.762.107 8.514-.829 1.752-1.22.621-1.739 4.295a1.609 1.609 0 0 1-.77 1.214c-.02.266.382-3.756-.655-4.827-1.036-1.07-.385-2.385.029-3.163 2.89-5.427-5.765-7.886-10.496-7.88-4.103.005-14 1.87-10.354 7.677z"/><path fill="#434955" fillRule="evenodd" d="M19.79 49.162c.03.038 10.418 13.483 22.63-.2-1.475 4.052-7.837 7.27-11.476 7.26-6.95-.02-10.796-5.6-11.154-7.06z"/><path fill="#e6e6e6" fillRule="evenodd" d="M36.336 61.323c-.41.072-.822.135-1.237.192v-8.937a.576.576 0 0 1 .618-.516.576.576 0 0 1 .619.516v8.745zm-9.82.166q-.622-.089-1.237-.2v-8.711a.576.576 0 0 1 .618-.516.576.576 0 0 1 .62.516z"/></svg>;

const UserAvatar = ({ name, avatarId, size = 'small', style = {} }) => {
    const isLarge = size === 'large';
    const isMedium = size === 'medium';
    const dim = isLarge ? 80 : (isMedium ? 30 : 40); 
    const fontSize = isLarge ? '2.5rem' : (isMedium ? '1rem' : '1.2rem');
    
    // Fallback to 0 if undefined
    const safeId = typeof avatarId === 'number' && avatarId >= 0 && avatarId <= 7 ? avatarId : 0;

    // Base container style
    const containerStyle = {
        width: `${dim}px`, 
        height: `${dim}px`, 
        borderRadius: '50%', 
        overflow: 'hidden', // Ensures SVGs stay within the circle
        backgroundColor: safeId === 0 ? 'var(--brand-color)' : 'transparent',
        color: '#fff', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: fontSize, 
        fontWeight: 600,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        flexShrink: 0,
        ...style
    };

    const renderContent = () => {
        switch(safeId) {
            case 1: return <AvatarOne />;
            case 2: return <AvatarTwo />;
            case 3: return <AvatarThree />;
            case 4: return <AvatarFour />;
            case 5: return <AvatarFive />;
            case 6: return <AvatarSix />;
            case 7: return <AvatarSeven />;
            case 0:
            default: return name ? name.charAt(0).toUpperCase() : 'U';
        }
    };

    return (
        <div style={containerStyle}>
            {renderContent()}
        </div>
    );
};

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
            backgroundColor: checked ? 'var(--brand-color)' : 'var(--gray-3)', 
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

const PrivacyPolicyPage = ({ onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    return (
        <div style={{ ...styles.privacyPage, animation: isClosing ? 'slideOutRight 0.3s forwards' : 'slideInRight 0.3s forwards' }}>
            <header style={styles.privacyPageHeader}>
                <button onClick={handleClose} style={styles.privacyBackButton}>
                    <ChevronLeftIcon />
                </button>
                <h2 style={styles.privacyPageTitle}>Privacy Policy</h2>
            </header>
            <div style={styles.privacyPageContent}>
                <h3 style={styles.privacySectionTitle}>1. Introduction</h3>
                <p style={styles.privacyText}>
                    Welcome to KA-OMS. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
                </p>

                <h3 style={styles.privacySectionTitle}>2. Information We Collect</h3>
                <p style={styles.privacyText}>
                    We may collect personal identification information, such as your name, user ID, and email address, when you register and log in to the application. We also collect data related to your orders, including party names, items, quantities, and timestamps.
                </p>

                <h3 style={styles.privacySectionTitle}>3. How We Use Your Information</h3>
                <p style={styles.privacyText}>
                    The information we collect is used to:
                    - Create and manage your account.
                    - Process and track your orders.
                    - Improve application functionality and user experience.
                    - Communicate with you regarding your account or orders.
                </p>
                
                <h3 style={styles.privacySectionTitle}>4. Data Security</h3>
                <p style={styles.privacyText}>
                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
                </p>

                 <h3 style={styles.privacySectionTitle}>5. Data Retention</h3>
                <p style={styles.privacyText}>
                    We will retain your personal information and order data only for as long as is necessary for the purposes set out in this Privacy Policy.
                </p>

                <h3 style={styles.privacySectionTitle}>6. Your Rights</h3>
                <p style={styles.privacyText}>
                    You have the right to access, update, or delete your personal information. You can manage your display name and avatar within the application's preferences. For other requests, please contact the administrator.
                </p>

                <h3 style={styles.privacySectionTitle}>7. Changes to This Privacy Policy</h3>
                <p style={styles.privacyText}>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the application.
                </p>
            </div>
        </div>
    );
};


const Preferences = ({ session, theme, toggleTheme, updateUserProfile, onLogout }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(0);
    const [isPrivacyPolicyVisible, setIsPrivacyPolicyVisible] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isLogoutModalClosing, setIsLogoutModalClosing] = useState(false);
    const showToast = useToast();

    const handleEditClick = () => {
        setNewName(session.userName);
        setSelectedAvatar(session.avatarId || 0);
        setIsClosing(false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setIsClosing(false);
        }, 300);
    };

    const handleSave = () => {
        if (newName.trim().length === 0) {
            showToast('Name cannot be empty', 'error');
            return;
        }
        updateUserProfile(newName.trim(), selectedAvatar);
        handleCloseModal();
        showToast('Profile updated successfully', 'success');
    };
    
    const handleLogoutClick = () => {
        setIsLogoutModalClosing(false);
        setIsLogoutModalOpen(true);
    };

    const handleCloseLogoutModal = () => {
        setIsLogoutModalClosing(true);
        setTimeout(() => {
            setIsLogoutModalOpen(false);
        }, 300);
    };
    
    const handleConfirmLogout = () => {
        handleCloseLogoutModal();
        setTimeout(onLogout, 300);
    };

    // Array of IDs: 0 is default, 1-7 are SVG avatars
    const avatarOptions = [0, 1, 2, 3, 4, 5, 6, 7];

    return (
        <div style={styles.preferencesPageWrapper}>
             <div style={styles.preferencesHeaderCenter}>
                <UserAvatar name={session.userName} avatarId={session.avatarId} size="large" />
                <div style={styles.preferenceUserInfoCenter}>
                    <h2 style={styles.preferenceUserName}>{session.userName}</h2>
                    <span style={styles.preferenceUserRole}>{session.role}</span>
                </div>
             </div>

             <div style={styles.preferenceSection}>
                <h3 style={styles.preferenceSectionTitleOutside}>Account Details</h3>
                <div style={styles.preferenceTileCard}>
                    <div style={styles.preferenceRow}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <IdCardIcon />
                            <span style={styles.preferenceLabel}>User ID</span>
                        </div>
                        <span style={styles.preferenceValue}>{session.userId}</span>
                    </div>
                    <div style={styles.preferenceRow}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <UserIcon />
                            <span style={styles.preferenceLabel}>Display Name & Icon</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <span style={styles.preferenceValue}>{session.userName}</span>
                            <button onClick={handleEditClick} style={styles.iconButton}><EditIcon /></button>
                        </div>
                    </div>
                    <div style={styles.preferenceRow}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <AtSignIcon />
                            <span style={styles.preferenceLabel}>Email</span>
                        </div>
                        <span style={styles.preferenceValue}>{session.email || 'Not set'}</span>
                    </div>
                    <div style={{...styles.preferenceRow, borderBottom: 'none'}}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <CheckCircleIcon />
                            <span style={styles.preferenceLabel}>Status</span>
                        </div>
                        <span style={{...styles.preferenceValue, color: 'var(--green)', fontWeight: 600}}>Active</span>
                    </div>
                </div>
             </div>

             <div style={styles.preferenceSection}>
                <h3 style={styles.preferenceSectionTitleOutside}>Application</h3>
                <div style={styles.preferenceTileCard}>
                     <div style={styles.preferenceRow}>
                         <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <InfoIcon />
                            <span style={styles.preferenceLabel}>Version</span>
                        </div>
                        <span style={styles.preferenceValue}>2.0.1</span>
                    </div>
                    <div style={{...styles.preferenceRow, borderBottom: 'none'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <ThemeIcon />
                            <span style={styles.preferenceLabel}>Theme</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                             <span style={{fontSize: '0.9rem', color: 'var(--text-color)'}}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                             <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
                        </div>
                    </div>
                </div>
             </div>

            <div style={styles.preferenceSection}>
                <h3 style={styles.preferenceSectionTitleOutside}>Legal & Account</h3>
                <div style={styles.preferenceTileCard}>
                    <div 
                        onClick={() => setIsPrivacyPolicyVisible(true)} 
                        style={{...styles.preferenceRow, cursor: 'pointer'}}
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <ShieldIcon />
                            <span style={styles.preferenceLabel}>Privacy Policy</span>
                        </div>
                        <ChevronRightIcon />
                    </div>
                     <div
                        onClick={handleLogoutClick}
                        style={{...styles.preferenceRow, borderBottom: 'none', cursor: 'pointer'}}
                    >
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--red)'}}>
                            <LogoutIcon />
                            <span style={{...styles.preferenceLabel, color: 'inherit', fontWeight: 500}}>Logout</span>
                        </div>
                    </div>
                </div>
            </div>

            {isPrivacyPolicyVisible && <PrivacyPolicyPage onClose={() => setIsPrivacyPolicyVisible(false)} />}
            
            {isLogoutModalOpen && (
                <div style={{...styles.modalOverlay, animation: isLogoutModalClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={handleCloseLogoutModal}>
                    <div style={{...styles.modalContent, maxWidth: '320px', animation: isLogoutModalClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '0.5rem'}}>Confirm Logout</h3>
                        <p style={{textAlign: 'center', color: 'var(--text-color)', marginBottom: '1.5rem', fontSize: '0.95rem'}}>
                            Are you sure you want to log out from your session?
                        </p>
                        <div style={styles.iosModalActions}>
                            <button onClick={handleCloseLogoutModal} style={styles.iosModalButtonSecondary}>Cancel</button>
                            <button onClick={handleConfirmLogout} style={{...styles.iosModalButtonPrimary, color: 'var(--red)'}}>Logout</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={handleCloseModal}>
                    <div style={{...styles.modalContent, maxWidth: '380px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '1rem'}}>Edit Profile</h3>
                        
                        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
                             <UserAvatar name={newName || session.userName} avatarId={selectedAvatar} size="large" />
                        </div>

                        <label style={{...styles.label, position: 'static', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block'}}>Choose Avatar</label>
                        <div style={styles.avatarGrid}>
                            {avatarOptions.map(id => (
                                <div 
                                    key={id} 
                                    onClick={() => setSelectedAvatar(id)}
                                    style={selectedAvatar === id ? styles.avatarOptionSelected : styles.avatarOption}
                                >
                                    <UserAvatar name={newName || session.userName} avatarId={id} size="small" />
                                </div>
                            ))}
                        </div>

                        <div style={{...styles.inputGroup, marginTop: '1rem'}}>
                            <label style={{...styles.label, fontSize: '0.85rem', color: 'var(--text-color)', position: 'static', display: 'block', marginBottom: '0.5rem'}}>Display Name</label>
                            <input 
                                type="text" 
                                value={newName} 
                                onChange={(e) => setNewName(e.target.value)}
                                style={styles.modalInput}
                                className="modal-input"
                                placeholder="Enter your display name"
                            />
                        </div>

                        <div style={styles.iosModalActions}>
                            <button onClick={handleCloseModal} style={styles.iosModalButtonSecondary}>Cancel</button>
                            <button onClick={handleSave} style={styles.iosModalButtonPrimary}>Save Changes</button>
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
        { title: 'Pending Orders', value: stats.pending, icon: <NavIcon name="Pending" />, color: 'var(--orange)' },
        { title: 'Ready for Billing', value: stats.billing, icon: <NavIcon name="Billing" />, color: 'var(--blue)' },
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
                            <div style={{...styles.kpiIcon, color: card.color}}>{card.icon}</div>
                            <div>
                                <div style={styles.kpiTitle}>{card.title}</div>
                                <div style={styles.kpiValue}>{card.value}</div>
                            </div>
                        </div>
                    ))}

                    {/* Action Card */}
                    {actionCard && (
                         <div key={actionCard.title} style={{...styles.kpiCard, ...actionCard.style, cursor: 'pointer'}} onClick={actionCard.onClick}>
                            <div style={{...styles.kpiIcon, color: 'var(--red)'}}>{actionCard.icon}</div>
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
                            <button style={styles.actionButton} onClick={() => onNavigate('Entry')}>
                                <span style={{color: 'var(--green)', display: 'flex'}}><NavIcon name="Entry" /></span>
                                New Order
                            </button>
                             <button style={styles.actionButton} onClick={() => onNavigate('Stock')}>
                                <span style={{color: 'var(--teal)', display: 'flex'}}><NavIcon name="Stock" /></span>
                                View Stock
                            </button>
                             <button style={styles.actionButton} onClick={() => onNavigate('Billed')}>
                                <span style={{color: 'var(--purple)', display: 'flex'}}><NavIcon name="Billed" /></span>
                                View Billed Archive
                            </button>
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
                    <div style={{width: '48px'}}></div> // Placeholder for balance
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


const Sidebar = ({ activeView, onNavigate, isMobile, isOpen, onClose, session, onLogout, isCollapsed, onToggleCollapse, sidebarRef, appLogoSrc }) => {
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
        { id: 'Inactive', label: 'Inactive Orders' },
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
    
    // FIX: Add explicit `as 'hidden'` and `as 'visible'` to satisfy the `CSSProperties` type for `visibility`.
    const navLabelDynamicStyle = isActuallyCollapsed
        ? { opacity: 0, maxWidth: '0px', marginLeft: '0', visibility: 'hidden' as 'hidden', transition: 'opacity 0.1s, max-width 0.2s, margin-left 0.2s, visibility 0s 0.2s' }
        : { opacity: 1, maxWidth: '150px', marginLeft: '1rem', visibility: 'visible' as 'visible', transition: 'opacity 0.2s 0.1s, max-width 0.2s 0.1s, margin-left 0.2s 0.1s' };

    const sidebarClassName = isActuallyCollapsed ? 'sidebar-collapsed' : '';

    const userContainerStyle = {
        ...styles.sidebarUserContainer,
        ...(!isActuallyCollapsed && { width: '100%'}),
        ...(isActuallyCollapsed && {
            padding: '8px 0',
            justifyContent: 'center',
        })
    };

    return (
        <>
            {isMobile && isOpen && <div style={styles.overlay} onClick={onClose}></div>}
            <nav style={sidebarStyle} ref={sidebarRef} className={sidebarClassName}>
                <div style={styles.sidebarHeader}>
                     {!isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', minHeight: '36px' }}>
                            <div className="desktop-collapse-button-wrapper">
                                <button onClick={onToggleCollapse} className="desktop-collapse-button" style={styles.desktopCollapseButton}>
                                   <DesktopSidebarToggleIcon />
                                </button>
                                <span className="nav-tooltip" style={{...styles.navTooltip}}>
                                    {isCollapsed ? 'Expand' : 'Collapse'}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.75rem',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                transition: 'opacity 0.2s 0.1s, max-width 0.3s 0.1s',
                                opacity: isActuallyCollapsed ? 0 : 1,
                                maxWidth: isActuallyCollapsed ? '0px' : '200px',
                            }}>
                                <img src={appLogoSrc} alt="Logo" style={{ height: '36px', width: '36px', flexShrink: 0 }} />
                                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' }}>KA OMS</span>
                            </div>
                        </div>
                     )}
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div
                            className="sidebar-user-container"
                            style={userContainerStyle}
                            onClick={() => onNavigate('Preferences')}
                         >
                             <UserAvatar name={session.userName} avatarId={session.avatarId} size={isActuallyCollapsed ? 'medium' : 'small'} />
                             <div style={{
                                ...styles.sidebarUserInfo,
                                transition: 'opacity 0.2s 0.1s, max-width 0.3s 0.1s, visibility 0s ' + (isActuallyCollapsed ? '0.3s' : '0s'),
                                opacity: isActuallyCollapsed ? 0 : 1,
                                maxWidth: isActuallyCollapsed ? '0px' : '200px',
                                visibility: isActuallyCollapsed ? 'hidden' as 'hidden' : 'visible' as 'visible',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                             }}>
                               <div style={styles.sidebarUserName}>{session.userName}</div>
                               <div style={styles.sidebarUserRole}>{session.role}</div>
                            </div>
                            <span className="nav-tooltip" style={styles.navTooltip}>{session.userName}</span>
                         </div>
                         {isMobile && (
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-grey)', padding: '4px' }}>
                                <CloseSidebarIcon />
                            </button>
                         )}
                     </div>
                </div>
                <div style={styles.sidebarNav}>
                    {primaryItems.map(item => (
                        <a 
                            key={item.id} 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} 
                            style={navItemStyle(item.id)}
                            className={`nav-item ${isActuallyCollapsed ? 'nav-item-desktop-collapsed' : ''}`}
                        >
                            <NavIcon name={item.id} active={activeView === item.id} />
                            <span style={{...styles.navLabel, ...navLabelDynamicStyle}}>{item.label}</span>
                            <span className="nav-tooltip" style={styles.navTooltip}>{item.label}</span>
                        </a>
                    ))}
                    <hr style={styles.sidebarSeparator} />
                    {secondaryItems.map(item => {
                        if ((item.id === 'Users' || item.id === 'Approval') && session.role !== 'ADMIN') {
                            return null;
                        }
                        return (
                            <a 
                                key={item.id} 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} 
                                style={navItemStyle(item.id)} 
                                className={`nav-item ${isActuallyCollapsed ? 'nav-item-desktop-collapsed' : ''}`}
                            >
                                <NavIcon name={item.id} active={activeView === item.id} />
                                <span style={{...styles.navLabel, ...navLabelDynamicStyle}}>{item.label}</span>
                                <span className="nav-tooltip" style={styles.navTooltip}>{item.label}</span>
                            </a>
                        );
                    })}
                </div>
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
            {navItems.map(item => {
                const isActive = activeView === item.id;
                return (
                    <a key={item.id} title={item.label} href="#" onClick={(e) => { e.preventDefault(); onNavigate(item.id); }} style={isActive ? { ...styles.bottomNavItem, ...styles.bottomNavItemActive } : styles.bottomNavItem}>
                        <NavIcon name={item.id} active={isActive} />
                    </a>
                );
            })}
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
    updateUserProfile: (name: string, avatarId: number) => void;
    onLogout: () => void;
};

const MainContent = React.forwardRef<HTMLElement, MainContentProps>(
    ({ activeView, onNavigate, session, isMobile, theme, toggleTheme, updateUserProfile, onLogout }, ref) => {
        let mainStyle = styles.mainContent;

        if (isMobile) {
            let mobilePadding;
            if (activeView === 'Entry' || activeView === 'Pending' || activeView === 'Approval') {
                mobilePadding = { padding: 0 };
            } else {
                mobilePadding = { padding: '0rem 0.25rem', paddingBottom: '100px' };
            }
            mainStyle = {
                ...styles.mainContent,
                ...mobilePadding,
            };
            if (activeView === 'Pending' || activeView === 'Approval') {
                mainStyle.maskImage = 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent 100%)';
                mainStyle.WebkitMaskImage = 'linear-gradient(to bottom, transparent, black 5%, black 90%, transparent 100%)';
            }
        }

        const renderView = () => {
            switch (activeView) {
                case 'Dashboard': return <Dashboard onNavigate={onNavigate} session={session} />;
                case 'Entry': return <NewOrderEntry onNavigate={onNavigate} />;
                case 'Stock': return <StockOverview />;
                case 'Pending': return <PendingOrders onNavigate={onNavigate} />;
                case 'Billing': return <ReadyForBilling />;
                case 'Billed': return <BilledOrders />;
                case 'Inactive': return <InactiveOrders />;
                case 'Users': return <UserManagement session={session} />;
                case 'Approval': return <OrderApproval session={session} />;
                case 'Preferences': return <Preferences session={session} theme={theme} toggleTheme={toggleTheme} updateUserProfile={updateUserProfile} onLogout={onLogout} />;
                default: return <PageContent />;
            }
        };
        
        return <main style={mainStyle} ref={ref}>{renderView()}</main>;
    }
);


// --- HOMEPAGE WRAPPER ---
const HomePage = ({ session, onLogout, appLogoSrc, updateUserProfile }) => {
    const [activeView, setActiveView] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const showToast = useToast();
    const sidebarRef = useRef(null);
    const mainContentRef = useRef<HTMLElement | null>(null);
    
    const pages = {
        'Dashboard': 'Dashboard', 'Entry': 'New Order Entry', 'Pending': 'Pending Orders', 'Billing': 'Ready for Billing', 'Billed': 'Billed Orders (Archive)',
        'Stock': 'Stock Overview', 'Update': 'Stock Updation', 'Inactive': 'Inactive Orders', 'Users': 'User Management', 'Approval': 'Order Approval (Admin)',
        'Preferences': 'Preferences'
    };

    useEffect(() => {
        document.body.className = theme === 'dark' ? 'dark-mode' : '';
        localStorage.setItem('theme', theme);
        const themeColor = theme === 'dark' ? '#000000' : '#F2F2F7';
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute('content', themeColor);
        }

        const appleStatusBarStyle = theme === 'dark' ? 'black' : 'default';
        const appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (appleStatusMeta) {
            appleStatusMeta.setAttribute('content', appleStatusBarStyle);
        }
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
        <div style={isMobile ? {...styles.appContainer, flexDirection: 'column'} : styles.appContainer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
                appLogoSrc={appLogoSrc}
            />
            <div style={styles.mainWrapper}>
                <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} appLogoSrc={appLogoSrc} isMobile={isMobile} title={pages[activeView] || 'Dashboard'} />
                <MainContent 
                    ref={mainContentRef} 
                    activeView={activeView} 
                    onNavigate={handleNavigate} 
                    session={session} 
                    isMobile={isMobile} 
                    theme={theme}
                    toggleTheme={toggleTheme}
                    updateUserProfile={updateUserProfile}
                    onLogout={onLogout}
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
    const [isPasswordStep, setIsPasswordStep] = useState(false);
    const [isShowingPassword, setIsShowingPassword] = useState(false);
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

        if (isMobile) {
            const formPane = document.querySelector('.form-pane') as HTMLElement;
            if (formPane) formPane.style.padding = '0';
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
        return () => {
             window.removeEventListener('resize', handleResize);
             if (isMobile) {
                const formPane = document.querySelector('.form-pane') as HTMLElement;
                if (formPane) formPane.style.padding = '1rem';
            }
        };
    }, [isMobile]);
    
    const handleShowPasswordStep = (e) => {
        e.preventDefault();
        if (!userId) {
            setError('User ID cannot be empty.');
            return;
        }
        setError('');
        setIsShowingPassword(true);
        setTimeout(() => {
            setIsPasswordStep(true);
        }, 500);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'login', userId, password }), });
            const result = await response.json();
            if (result.success) {
                const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
                const newSession = { 
                    userId: result.userId, 
                    role: result.role, 
                    userName: result.userName, 
                    expiry, 
                    email: result.email,
                    avatarId: typeof result.avatarId === 'number' ? result.avatarId : 7
                }; 
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
    
    const updateUserProfile = (newName, newAvatarId) => {
        const updatedSession = { ...session, userName: newName, avatarId: newAvatarId };
        setSession(updatedSession);
        localStorage.setItem('ka-oms-session', JSON.stringify(updatedSession));
    };
    
    const cardStyles = { 
        ...styles.card, 
        padding: isMobile ? '2.5rem 1.5rem' : '2.5rem 2rem', 
        boxShadow: isMobile ? 'none' : 'var(--box-shadow)', 
        transform: isMounted ? 'translateY(0)' : 'translateY(20px)', 
        opacity: isMounted ? 1 : 0,
        borderRadius: isMobile ? 0 : 'var(--border-radius)',
        minHeight: isMobile ? '100%' : '580px',
        border: isMobile ? 'none' : '1px solid var(--border-color)',
        backgroundColor: isMobile ? 'var(--card-bg)' : 'var(--card-bg)',
    };
    const titleStyles = { ...styles.title, fontSize: isMobile ? '1.5rem' : '1.75rem' };
    const subtitleStyles = { ...styles.subtitle, fontSize: isMobile ? '0.9rem' : '1rem', marginBottom: isMobile ? '1.5rem' : '2rem' };
    const logoStyles = { ...styles.logo, width: isMobile ? '150px' : '100px', height: isMobile ? '150px' : '100px', opacity: areImagesReady ? 1 : 0, transition: 'opacity 0.3s ease-in' };

    if (isLoggedIn && session) {
        return <HomePage session={session} onLogout={handleLogout} appLogoSrc={appLogoSrc} updateUserProfile={updateUserProfile} />;
    }

    const mobileLoginContainerStyle = {
        ...styles.mobileInputContainer,
        borderColor: (userIdFocused || passwordFocused) ? 'var(--brand-color)' : '#757575'
    };
    const mobileForgotContainerStyle = {
        ...styles.mobileInputContainer,
        borderColor: emailFocused ? 'var(--brand-color)' : '#757575'
    };

    return (
         <div style={isMobile ? {...styles.loginContainer, backgroundColor: 'var(--card-bg)'} : styles.loginContainer}>
             <div style={cardStyles}>
                {!areImagesReady ? <Spinner /> : (
                    <>
                        <img src={appLogoSrc} alt="KA-OMS Logo" style={logoStyles} />
                        <h1 style={titleStyles}>KA OMS</h1>
                        <p style={subtitleStyles}>Enamor Order Management</p>

                        <div style={{width: '100%', overflow: 'hidden'}}>
                            <div style={{
                                display: 'flex',
                                width: '200%',
                                transform: isForgotPassword ? 'translateX(-50%)' : 'translateX(0)',
                                transition: 'transform 0.5s cubic-bezier(0.77, 0, 0.175, 1)'
                            }}>
                                <div style={{width: '50%', flexShrink: 0}}>
                                    <form onSubmit={handleLogin} style={styles.form}>
                                        {isMobile ? (
                                            <div style={mobileLoginContainerStyle}>
                                                <div style={{...styles.inputGroup, borderBottom: '1px solid var(--separator-color)'}}>
                                                    <label style={{ ...styles.label, ...(userId || userIdFocused ? styles.labelFocused : {}) }}>Email or Phone Number</label>
                                                    <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} onFocus={() => setUserIdFocused(true)} onBlur={() => setUserIdFocused(false)} style={{...styles.input, border: 'none', borderRadius: 0}} required />
                                                    {!isPasswordStep && (
                                                        <button type="button" onClick={handleShowPasswordStep} style={styles.mobileArrowButton}>
                                                            {isShowingPassword ? <RadialSpinner /> : <ArrowRightIcon />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={isPasswordStep ? styles.passwordContainerVisible : styles.passwordContainerHidden}>
                                                    <div style={styles.inputGroup}>
                                                        <label style={{ ...styles.label, ...(password || passwordFocused ? styles.labelFocused : {}) }}>Password</label>
                                                        <input type={'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} style={{...styles.input, border: 'none', borderRadius: 0}} required />
                                                        <button type="submit" style={styles.mobileArrowButton} disabled={isLoading}>
                                                            {isLoading ? <RadialSpinner /> : <ArrowRightIcon />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={styles.inputGroup}>
                                                    <label style={{ ...styles.label, ...(userId || userIdFocused ? styles.labelFocused : {}) }}>User ID (Mobile or Email)</label>
                                                    <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} onFocus={() => setUserIdFocused(true)} onBlur={() => setUserIdFocused(false)} style={styles.input} required />
                                                </div>
                                                <div style={styles.inputGroup}>
                                                    <label style={{ ...styles.label, ...(password || passwordFocused ? styles.labelFocused : {}) }}>Password</label>
                                                    <input type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} style={styles.input} required />
                                                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon} aria-label={isPasswordVisible ? "Hide password" : "Show password"}><EyeIcon closed={!isPasswordVisible} /></button>
                                                </div>
                                            </>
                                        )}
                                        {error && <p style={styles.error}>{error}</p>}
                                        {!isMobile && <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>}
                                        <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(true); setError(''); }} style={styles.link}>Forgot Password?</a>
                                    </form>
                                </div>
                                <div style={{width: '50%', flexShrink: 0}}>
                                     <form onSubmit={handleForgotPassword} style={styles.form}>
                                        <p style={{...styles.subtitle, marginBottom: '1.5rem', fontSize: '0.9rem'}}>Enter your email to recover your password.</p>
                                        
                                        {isMobile ? (
                                            <div style={mobileForgotContainerStyle}>
                                                <div style={styles.inputGroup}>
                                                    <label style={{ ...styles.label, ...(forgotEmail || emailFocused ? styles.labelFocused : {}) }}>Email Address</label>
                                                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} style={{...styles.input, border: 'none', borderRadius: 0}} required />
                                                    <button type="submit" style={styles.mobileArrowButton} disabled={isLoading}>
                                                        {isLoading ? <RadialSpinner /> : <ArrowRightIcon />}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={styles.inputGroup}>
                                                    <label style={{ ...styles.label, ...(forgotEmail || emailFocused ? styles.labelFocused : {}) }}>Email Address</label>
                                                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} style={styles.input} required />
                                                </div>
                                                <button type="submit" style={styles.button} disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Recovery Email'}</button>
                                            </>
                                        )}
            
                                        {error && <p style={styles.error}>{error}</p>}
                                        {forgotMessage && <p style={styles.success}>{forgotMessage}</p>}
                                        
                                        <a href="#" onClick={(e) => { e.preventDefault(); setIsForgotPassword(false); setError(''); setForgotMessage(''); }} style={styles.link}>Back to Login</a>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </>
                )}
             </div>
         </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    // --- App Layout ---
    appContainer: { display: 'flex', height: '100vh', backgroundColor: 'var(--light-grey)' },
    mainWrapper: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' },
    appHeader: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0.75rem 1.5rem', backgroundColor: 'var(--light-grey)', flexShrink: 0, zIndex: 10 },
    headerLeft: { gridColumn: '1', display: 'flex', alignItems: 'center', gap: '1rem', justifySelf: 'start' },
    headerCenter: { gridColumn: '2', textAlign: 'center', minWidth: 0 },
    headerRight: { gridColumn: '3', justifySelf: 'end' },
    headerLogo: { height: '36px', width: '36px' },
    headerTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    headerPageTitle: { fontFamily: "'Inter Tight', sans-serif", fontSize: '1.2rem', fontWeight: 500, color: 'var(--dark-grey)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--dark-grey)' },
    sidebar: { width: '230px', backgroundColor: 'var(--card-bg)', borderRight: 'none', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.07)', flexShrink: 0, transition: 'width 0.3s ease, transform 0.3s ease', display: 'flex', flexDirection: 'column', overflow: 'visible', zIndex: 101 },
    sidebarCollapsed: { width: '80px' },
    sidebarMobile: { position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 200 },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)', zIndex: 199 },
    sidebarHeader: { padding: '1.5rem', borderBottom: '1px solid var(--separator-color)' },
    desktopCollapseButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', borderRadius: '12px', transition: 'background-color 0.2s ease, color 0.2s ease' },
    sidebarUserContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        cursor: 'pointer'
    },
    sidebarUserInfo: { transition: 'opacity 0.2s ease' },
    sidebarUserName: { fontWeight: 600, color: 'var(--dark-grey)', whiteSpace: 'nowrap' },
    sidebarUserRole: { fontSize: '0.8rem', color: 'var(--text-color)', whiteSpace: 'nowrap' },
    sidebarLogoutButton: { background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', width: '100%', color: 'var(--text-color)', fontSize: '0.9rem', borderRadius: '8px', transition: 'all 0.2s ease' },
    sidebarLogoutButtonCollapsed: { padding: '0.6rem', width: '44px', height: '44px' },
    sidebarNav: { display: 'flex', flexDirection: 'column', padding: '1rem 0.5rem', flex: 1, overflowY: 'auto', overflowX: 'visible' },
    sidebarSeparator: { margin: '0.75rem 1rem', border: 'none', borderTop: '1px solid var(--separator-color)' },
    navItem: { display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--text-color)', borderRadius: '8px', marginBottom: '0.25rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'background-color 0.2s, color 0.2s', position: 'relative' },
    navItemActive: { backgroundColor: 'var(--active-bg)', color: 'var(--brand-color)' },
    navLabel: { fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden' },
    navTooltip: {
        position: 'absolute',
        left: 'calc(100% + 12px)',
        top: '50%',
        transform: 'translateY(-50%)',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        fontSize: '0.875rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: 1001,
        transition: 'opacity 0.15s ease, visibility 0s 0.15s',
        display: 'none'
    },
    mainContent: { flex: 1, overflowY: 'auto', padding: '0rem 1rem', display: 'flex', flexDirection: 'column' },
    bottomNav: {
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--glass-button-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        position: 'fixed',
        bottom: '12px',
        left: '15px',
        borderRadius: '30px',
        right: '15px',
        height: '73px',
        zIndex: 100,
        boxShadow: 'var(--box-shadow)',
    },
    bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textDecoration: 'none', color: 'var(--text-color)' },
    bottomNavItemActive: { color: 'var(--brand-color)' },
    pageContainer: { backgroundColor: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)' },
    // --- Dashboard Styles ---
    dashboardContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    dashboardWelcome: { fontFamily: "'Inter Tight', sans-serif", fontSize: '1.75rem', fontWeight: 500, color: 'var(--dark-grey)' },
    dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' },
    dashboardCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', gridColumn: 'span 1' },
    kpiCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', display: 'flex', alignItems: 'center', gap: '1.5rem' },
    kpiCardAlert: { backgroundColor: 'rgba(255, 56, 60, 0.1)', border: '1px solid var(--red)' },
    kpiIcon: { color: 'var(--brand-color)' },
    kpiTitle: { fontSize: '0.9rem', color: 'var(--text-color)', marginBottom: '0.25rem' },
    kpiValue: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '1rem' },
    cardText: { fontSize: '0.9rem', color: 'var(--text-color)' },
    quickActions: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
    actionButton: { display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', background: 'var(--card-bg)', border: '1px solid var(--separator-color)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--dark-grey)', fontWeight: 500 },
    itemList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--light-grey)', fontSize: '0.9rem' },
    lowStockBadge: { backgroundColor: 'rgba(255, 56, 60, 0.1)', color: 'var(--red)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 },
    activityTime: { color: 'var(--text-tertiary)', fontSize: '0.8rem' },
    // --- Toast Styles ---
    toastContainer: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' },
    toast: { padding: '12px 20px', borderRadius: '8px', color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', animation: 'toast-in 0.5s forwards' },
    // --- Login Styles ---
    loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' },
    card: { width: '100%', maxWidth: '420px', minHeight: '580px', padding: '2.5rem 2rem', backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(10px)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--box-shadow)', textAlign: 'center', border: '1px solid var(--border-color)', transition: 'transform 0.5s ease-out, opacity 0.5s ease-out, box-shadow 0.3s ease-out', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    logo: { width: '100px', height: '100px', marginBottom: '0.5rem', margin: '0 auto 0.5rem', opacity: 0 },
    title: { color: 'var(--dark-grey)', fontWeight: 600, marginBottom: '0.25rem' },
    subtitle: { color: 'var(--text-color)', marginBottom: '2rem', fontSize: '1rem' },
    form: { width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    inputGroup: { position: 'relative' },
    input: { width: '100%', padding: '14px 15px', paddingTop: '22px', fontSize: '1rem', border: '1px solid #757575', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease', outline: 'none' },
    label: { position: 'absolute', left: '15px', top: '18px', color: 'var(--gray)', pointerEvents: 'none', transition: 'all 0.2s ease-out' },
    labelFocused: { top: '7px', fontSize: '0.8rem', color: 'var(--brand-color)' },
    eyeIcon: { position: 'absolute', top: '50%', right: '15px', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', padding: '0' },
    button: { padding: '15px', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease, transform 0.1s ease', marginTop: '0.5rem' },
    link: { color: 'var(--brand-color)', textDecoration: 'none', fontSize: '0.9rem', marginTop: '0.5rem' },
    error: { color: 'var(--red)', fontSize: '0.85rem', textAlign: 'center', marginTop: '-0.5rem', marginBottom: '0.5rem' },
    success: { color: 'var(--green)', fontSize: '0.85rem', textAlign: 'center' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
    mobileInputContainer: { borderRadius: '12px', border: '1px solid #757575', overflow: 'hidden', backgroundColor: 'var(--card-bg)', transition: 'border-color 0.3s ease' },
    mobileArrowButton: { position: 'absolute', top: '50%', right: '12px', transform: 'translateY(-50%)', background: 'transparent', border: '1px solid var(--separator-color)', cursor: 'pointer', color: 'var(--text-color)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    passwordContainerHidden: { maxHeight: 0, overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' },
    passwordContainerVisible: { maxHeight: '80px', transition: 'max-height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' },
    
    // --- Preferences Styles ---
    preferencesPageWrapper: { display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%', padding: '1rem' },
    preferencesHeaderCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' },
    preferenceAvatarLarge: { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--brand-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    preferenceUserInfoCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
    preferenceUserName: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark-grey)', margin: '0 0 0.25rem 0' },
    preferenceUserRole: { fontSize: '0.95rem', color: 'var(--text-color)', fontWeight: 500 },
    
    preferenceSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    preferenceSectionTitleOutside: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-color)', marginLeft: '0.5rem', textTransform: 'capitalize' },
    preferenceTileCard: { backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' },
    preferenceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--separator-color)', backgroundColor: 'var(--card-bg)' },
    preferenceLabel: { color: 'var(--dark-grey)', fontSize: '0.95rem', fontWeight: 500 },
    preferenceValue: { color: 'var(--text-color)', fontWeight: 400, fontSize: '0.95rem' },
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem', transform: 'scale(0.95)', opacity: 0 },
    modalInput: { width: '100%', padding: '10px 15px', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)' },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
    primaryButton: { padding: '0.6rem 1.2rem', backgroundColor: 'var(--glass-brand-bg)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, backdropFilter: 'blur(5px)' },
    secondaryButton: { padding: '0.6rem 1.2rem', backgroundColor: 'var(--glass-button-bg)', color: 'var(--dark-grey)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', backdropFilter: 'blur(5px)' },
    iconButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', alignItems: 'center', padding: '4px' },
    
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },

    // Avatar Selection
    avatarGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '0.5rem' },
    avatarOption: { width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px', borderRadius: '50%', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s', boxSizing: 'border-box' },
    avatarOptionSelected: { width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--brand-color)', backgroundColor: 'transparent', boxSizing: 'border-box' },
    
    // Privacy Policy Page
    privacyPage: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--light-grey)', zIndex: 1100, display: 'flex', flexDirection: 'column' },
    privacyPageHeader: { display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--light-grey)', borderBottom: 'none', flexShrink: 0 },
    privacyBackButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--dark-grey)' },
    privacyPageTitle: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-grey)', margin: 0, textAlign: 'center', flex: 1, paddingRight: '48px' /* Balance the back button */ },
    privacyPageContent: { flex: 1, overflowY: 'auto', padding: '1.5rem' },
    privacySectionTitle: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-grey)', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--separator-color)', paddingBottom: '0.5rem' },
    privacyText: { fontSize: '1rem', color: 'var(--text-color)', lineHeight: 1.6, marginBottom: '1rem' },
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><ToastProvider><KAOMSLogin /></ToastProvider></React.StrictMode>);
} else {
    console.error('Failed to find the root element');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registered with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
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
    @keyframes overlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes overlayOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    @keyframes modalIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
    @keyframes modalOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.95); }
    }
    @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }

    /* --- HOVER EFFECTS & TOOLTIPS --- */
    
    /* Default color for collapse button, so hover can override */
    .desktop-collapse-button {
        color: var(--text-color);
    }
    
    /* General nav item hover for all views */
    .nav-item:hover {
        background-color: var(--active-bg);
        color: var(--brand-color);
    }

    /* Hover for desktop sidebar controls (toggle and user profile) */
    .desktop-collapse-button-wrapper:hover .desktop-collapse-button,
    .sidebar-user-container:hover {
        background-color: var(--light-grey);
        color: var(--brand-color);
    }
    body.dark-mode .desktop-collapse-button-wrapper:hover .desktop-collapse-button,
    body.dark-mode .sidebar-user-container:hover {
        background-color: var(--gray-5);
    }
    
    /* Tooltip for collapsed desktop sidebar */
    .sidebar-collapsed .nav-item-desktop-collapsed:hover .nav-tooltip,
    .sidebar-collapsed .desktop-collapse-button-wrapper:hover .nav-tooltip,
    .sidebar-collapsed .sidebar-user-container:hover .nav-tooltip {
        display: block;
        opacity: 1;
        visibility: visible;
        transition: opacity 0.15s ease 0.1s;
    }
`;
document.head.appendChild(styleSheet);