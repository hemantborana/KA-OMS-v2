




import React, { useState, useEffect, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const RevertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;


// --- TYPE & FIREBASE ---
interface HistoryEvent { timestamp: string; event: string; details: string; }
interface Order { orderNumber: string; partyName: string; timestamp: string; deletedTimestamp?: string; deletionReason?: string; totalQuantity: number; totalValue: number; items: any[]; history?: HistoryEvent[]; }
const DELETED_ORDERS_REF = 'Deleted_Orders_V2';
const PENDING_ORDERS_REF = 'Pending_Order_V2';

// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'2-digit', hour: 'numeric', minute: '2-digit' }) : 'N/A';

const DeletedOrderCard: React.FC<{ order: Order; onRevert: (order: Order) => void; }> = ({ order, onRevert }) => {
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    const cardStyle: React.CSSProperties = {
        ...styles.card,
        boxShadow: !isHistoryVisible ? 'rgba(0, 0, 0, 0.04) 0px 2px 4px' : 'rgba(0, 0, 0, 0.06) 0px 4px 8px',
        transition: 'box-shadow 0.3s ease',
    };

    return (
        <div style={cardStyle}>
            <div style={styles.cardHeader}>
                <div style={styles.cardInfo}>
                    <span style={styles.cardTitle}>{order.partyName}</span>
                    <span style={styles.cardSubTitle}>{order.orderNumber}</span>
                </div>
                <button style={styles.revertButton} onClick={() => onRevert(order)}>
                    <RevertIcon /> Revert
                </button>
            </div>
            <div style={styles.cardDetails}>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Deleted On</span>
                    <div style={styles.detailValue}><CalendarIcon /> {formatDateTime(order.deletedTimestamp)}</div>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Reason</span>
                    <div style={styles.detailValue}>{order.deletionReason || 'No reason provided'}</div>
                </div>
                {order.history && order.history.length > 0 && (
                    <div style={styles.historySection}>
                        <button style={styles.historyHeader} onClick={() => setIsHistoryVisible(!isHistoryVisible)}>
                             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><HistoryIcon /><span>Full Order History</span></div>
                             <ChevronIcon collapsed={isHistoryVisible} />
                        </button>
                        <div style={!isHistoryVisible ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                            <div style={styles.collapsibleContentWrapper}>
                                <div style={styles.historyContent}>
                                    {order.history.map((event, index) => (
                                         <div key={index} style={styles.historyItem}>
                                            <div style={styles.historyMeta}>
                                                <span style={{...styles.historyEventType, backgroundColor: event.event === 'System' ? '#eef2f7' : '#fffbe6', color: event.event === 'System' ? 'var(--brand-color)' : '#d48806'}}>{event.event}</span>
                                                <span>{new Date(event.timestamp).toLocaleString()}</span>
                                            </div>
                                            <p style={styles.historyDetails}>{event.details}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DeletedOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        const ordersRef = firebase.database().ref(DELETED_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const twentyDaysAgo = new Date().getTime() - (20 * 24 * 60 * 60 * 1000);
                const ordersArray = (Object.values(data) as Order[])
                    .filter(order => new Date(order.deletedTimestamp).getTime() > twentyDaysAgo);
                
                ordersArray.sort((a, b) => new Date(b.deletedTimestamp).getTime() - new Date(a.deletedTimestamp).getTime());
                setOrders(ordersArray);
            } else {
                setOrders([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch deleted orders.');
            setIsLoading(false);
        });
        return () => ordersRef.off('value', listener);
    }, []);

    const handleRevertOrder = async (order: Order) => {
        if (!window.confirm(`Are you sure you want to revert order ${order.orderNumber}? It will be moved back to Pending Orders.`)) {
            return;
        }

        const revertedOrder = { ...order };
        delete revertedOrder.deletedTimestamp;
        delete revertedOrder.deletionReason;

        const updates = {
            [`${PENDING_ORDERS_REF}/${order.orderNumber}`]: revertedOrder,
            [`${DELETED_ORDERS_REF}/${order.orderNumber}`]: null
        };

        try {
            await firebase.database().ref().update(updates);
            showToast('Order successfully reverted to pending.', 'success');
        } catch (err) {
            console.error('Failed to revert order:', err);
            showToast('An error occurred while reverting the order.', 'error');
        }
    };

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
        if (orders.length === 0) return <div style={styles.centeredMessage}>No recently deleted orders found.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;
        
        return (
            <div style={styles.listContainer}>
                {filteredOrders.map(order => (
                    <DeletedOrderCard key={order.orderNumber} order={order} onRevert={handleRevertOrder} />
                ))}
            </div>
        );
    };
    
    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <h2 style={styles.pageTitle}>Deleted Orders (Last 20 Days)</h2>
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
            </div>
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
    headerCard: {
        backgroundColor: 'transparent',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
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
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        overflow: 'hidden',
        marginLeft: '10px',
        marginRight: '10px',
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--skeleton-bg)', flexWrap: 'wrap', gap: '0.5rem' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500, backgroundColor: 'var(--light-grey)', padding: '0.2rem 0.5rem', borderRadius: '6px' },
    revertButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--active-bg)', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
    cardDetails: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    detailItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    detailLabel: { fontSize: '0.8rem', color: 'var(--text-color)', fontWeight: 500 },
    detailValue: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--dark-grey)' },
    // History Styles
    historySection: { marginTop: '1rem', borderTop: '1px solid var(--skeleton-bg)', paddingTop: '1rem' },
    historyHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)' },
    historyContent: { padding: '1rem 0 0', display: 'flex', flexDirection: 'column', gap: '1rem' },
    collapsibleContainer: {
        display: 'grid',
        gridTemplateRows: '0fr',
        transition: 'grid-template-rows 0.35s ease',
    },
    collapsibleContainerExpanded: {
        gridTemplateRows: '1fr',
    },
    collapsibleContentWrapper: {
        overflow: 'hidden',
    },
    historyItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '3px solid var(--skeleton-bg)', paddingLeft: '1rem' },
    historyMeta: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-color)' },
    historyEventType: { fontWeight: 600, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' },
    historyDetails: { fontSize: '0.9rem', color: 'var(--dark-grey)' },
};