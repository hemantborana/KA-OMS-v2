
import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;

// --- TYPE & FIREBASE ---
interface Order { orderNumber: string; partyName: string; timestamp: string; expiredTimestamp?: string; expirationReason?: string; totalQuantity: number; items: any[]; }
const EXPIRED_ORDERS_REF = 'Expired_Orders_V2';

// --- HELPERS ---
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'2-digit', hour: 'numeric', minute: '2-digit' }) : 'N/A';

// Marquee component for scrolling text
const Marquee: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={styles.marqueeContainer}>
        <div style={styles.marqueeContent}>
            <span style={styles.marqueeItem}>{children}</span>
            <span style={styles.marqueeItem} aria-hidden="true">{children}</span>
        </div>
    </div>
);

export const ExpiredOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        const ordersRef = firebase.database().ref(EXPIRED_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(b.expiredTimestamp).getTime() - new Date(a.expiredTimestamp).getTime());
                setOrders(ordersArray);
            } else {
                setOrders([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch expired orders.');
            setIsLoading(false);
        });
        return () => ordersRef.off('value', listener);
    }, []);

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        const lowercasedTerm = searchTerm.toLowerCase();
        return orders.filter(order => 
            order.partyName.toLowerCase().includes(lowercasedTerm) ||
            order.orderNumber.toLowerCase().includes(lowercasedTerm)
        );
    }, [orders, searchTerm]);

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No expired orders found.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;
        
        return (
            <div style={styles.listContainer}>
                {filteredOrders.map(order => (
                    <div key={order.orderNumber} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardInfo}>
                                <span style={styles.cardTitle}>{order.partyName}</span>
                                <span style={styles.cardSubTitle}>{order.orderNumber}</span>
                            </div>
                        </div>
                        <div style={styles.cardDetails}>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Expired On</span>
                                <div style={styles.detailValue}><CalendarIcon /> {formatDateTime(order.expiredTimestamp)}</div>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Reason</span>
                                <div style={styles.detailValue}>{order.expirationReason || 'Expired automatically'}</div>
                            </div>
                             <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Original Order Date</span>
                                <div style={styles.detailValue}><CalendarIcon /> {formatDateTime(order.timestamp)}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    return (
        <div style={styles.container}>
             <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
            <div style={styles.headerCard}>
                <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                    <SearchIcon />
                    <input 
                        type="text" 
                        style={styles.searchInput} 
                        className="global-search-input" 
                        placeholder="Search by party or order number..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
                 <div style={styles.marqueeWrapper}>
                    <Marquee>
                        <span style={styles.lastUpdated}>
                            Orders are moved here after 40 days in pending. They are permanently deleted after 30 more days.
                        </span>
                    </Marquee>
                 </div>
            </div>
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '0rem', flex: 1 },
    headerCard: {
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'linear-gradient(to bottom, var(--light-grey) 90%, transparent)',
    },
    pageTitle: {
        fontSize: '1.25rem',
        fontWeight: 600,
        display: 'none',
        color: 'var(--dark-grey)',
    },
    searchContainer: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        backgroundColor: 'var(--card-bg)', 
        padding: '11px', 
        borderRadius: '20px',
        border: '1px solid transparent',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    searchContainerActive: {
        borderColor: 'var(--brand-color)',
    },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem 1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        overflow: 'hidden',
        marginLeft: '10px',
        marginRight: '10px',
        boxShadow: 'rgba(0, 0, 0, 0.04) 0px 2px 4px',
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--skeleton-bg)', flexWrap: 'wrap', gap: '0.5rem' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500, backgroundColor: 'var(--light-grey)', padding: '0.2rem 0.5rem', borderRadius: '6px' },
    cardDetails: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    detailItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    detailLabel: { fontSize: '0.8rem', color: 'var(--text-color)', fontWeight: 500 },
    detailValue: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--dark-grey)' },
    lastUpdated: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500, whiteSpace: 'nowrap' },
    marqueeWrapper: {
        backgroundColor: 'var(--card-bg-tertiary)',
        borderRadius: '12px',
        padding: '0.6rem 0',
        height: '38px',
    },
    marqueeContainer: { 
        width: '100%', 
        overflow: 'hidden', 
        position: 'relative', 
        display: 'flex',
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' 
    },
    marqueeContent: { 
        display: 'flex',
        width: 'max-content',
        animation: 'marquee 25s linear infinite',
    },
    marqueeItem: {
        display: 'block',
        whiteSpace: 'nowrap',
        padding: '0 2rem',
    },
};