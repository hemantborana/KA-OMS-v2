

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SummarizedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const DetailedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;

// --- TYPE DEFINITIONS ---
interface Order {
    orderNumber: string;
    partyName: string;
    timestamp: string;
    totalQuantity: number;
    totalValue: number;
    orderNote?: string;
    items: any[];
}

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBRV-i_70Xdk86bNuQQ43jiYkRNCXGvvyo",
    authDomain: "hcoms-221aa.firebaseapp.com",
    databaseURL: "https://hcoms-221aa-default-rtdb.firebaseio.com",
    projectId: "hcoms-221aa",
    storageBucket: "hcoms-221aa.appspot.com",
    messagingSenderId: "817694176734",
    appId: "1:817694176734:web:176bf69333bd7119d3194f",
    measurementId: "G-JB143EY71N"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const PENDING_ORDERS_REF = 'Pending_Order_V2';

// --- HELPER FUNCTIONS ---
const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value || 0);
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'N/A';

// --- SUB-COMPONENTS ---
const OrderDetailModal = ({ order, onClose }) => {
    if (!order) return null;
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <div>
                        <h2 style={styles.modalTitle}>Order Details</h2>
                        <p style={styles.modalSubtitle}>{order.orderNumber} - {order.partyName}</p>
                    </div>
                    <button style={styles.modalCloseButton} onClick={onClose}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    <div style={styles.modalSummary}>
                        <div><strong>Date:</strong> {formatDateTime(order.timestamp)}</div>
                        <div><strong>Total Qty:</strong> {order.totalQuantity}</div>
                        <div><strong>Total Value:</strong> {formatCurrency(order.totalValue)}</div>
                    </div>
                    {order.orderNote && <div style={styles.modalNote}><strong>Note:</strong> {order.orderNote}</div>}
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>Style</th><th style={styles.th}>Color</th><th style={styles.th}>Size</th><th style={styles.th}>Qty</th><th style={styles.th}>MRP</th><th style={styles.th}>Total</th></tr></thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id} style={styles.tr}>
                                        <td style={styles.td}>{item.fullItemData.Style}</td>
                                        <td style={styles.td}>{item.fullItemData.Color}</td>
                                        <td style={styles.td}>{item.fullItemData.Size}</td>
                                        <td style={styles.td}>{item.quantity}</td>
                                        <td style={styles.td}>{formatCurrency(item.price)}</td>
                                        <td style={styles.td}>{formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PartyGroup = ({ partyName, data, onViewOrder }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
        <div style={styles.styleCard}>
            <button style={styles.styleHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={styles.styleInfo}>
                    <span style={styles.styleName}>{partyName}</span>
                    <span style={styles.styleTotalStock}>
                        {data.orderCount} Orders | Total: {formatCurrency(data.totalValue)}
                    </span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.styleDetails}>
                    {data.orders.map(order => (
                        <div key={order.orderNumber} style={styles.partyOrderItem}>
                            <div style={styles.partyOrderInfo}>
                                <strong>{order.orderNumber}</strong>
                                <span style={styles.partyOrderMeta}><CalendarIcon /> {formatDate(order.timestamp)}</span>
                                <span>Qty: {order.totalQuantity}</span>
                                <span>{formatCurrency(order.totalValue)}</span>
                            </div>
                            <button style={styles.detailsButton} onClick={() => onViewOrder(order)}>
                                <InfoIcon /> Details
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SummarizedView = ({ data, onViewOrder }) => {
    const partyNames = Object.keys(data).sort();
    return (
        <div style={styles.listContainer}>
            {partyNames.map(partyName => (
                <PartyGroup key={partyName} partyName={partyName} data={data[partyName]} onViewOrder={onViewOrder} />
            ))}
        </div>
    );
};

const DetailedView = ({ orders, onViewOrder }) => (
    <div style={styles.detailedListContainer}>
        {orders.map(order => (
            <div key={order.orderNumber} style={styles.detailedCard}>
                <div style={styles.detailedCardHeader}>
                    <h3 style={styles.detailedCardTitle}>{order.partyName}</h3>
                    <span style={styles.detailedCardOrderNum}>{order.orderNumber}</span>
                </div>
                <div style={styles.detailedCardBody}>
                    <div style={styles.summaryItem}><span>Date</span><strong>{formatDate(order.timestamp)}</strong></div>
                    <div style={styles.summaryItem}><span>Total Items</span><strong>{order.totalQuantity}</strong></div>
                    <div style={styles.summaryItem}><span>Total Value</span><strong>{formatCurrency(order.totalValue)}</strong></div>
                </div>
                <div style={styles.detailedCardFooter}>
                    <button style={styles.detailsButton} onClick={() => onViewOrder(order)}><InfoIcon /> View Details</button>
                </div>
            </div>
        ))}
    </div>
);

// --- MAIN COMPONENT ---
export const PendingOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('summarized');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        const ordersRef = database.ref(PENDING_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // FIX: Cast the array from Firebase to Order[] and use getTime() for safe date comparison.
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setOrders(ordersArray);
            } else {
                setOrders([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch orders. Please check your connection.');
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

    const summarizedData = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) {
                acc[order.partyName] = { orderCount: 0, totalValue: 0, orders: [] };
            }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].totalValue += order.totalValue;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders found.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;

        return viewMode === 'summarized' 
            ? <SummarizedView data={summarizedData} onViewOrder={setSelectedOrder} />
            : <DetailedView orders={filteredOrders} onViewOrder={setSelectedOrder} />;
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <div style={styles.headerInfo}>
                    <h2 style={styles.pageTitle}>Pending Orders</h2>
                    <div style={styles.viewToggle}>
                        <button onClick={() => setViewMode('summarized')} style={viewMode === 'summarized' ? styles.toggleButtonActive : styles.toggleButton}><SummarizedViewIcon /></button>
                        <button onClick={() => setViewMode('detailed')} style={viewMode === 'detailed' ? styles.toggleButtonActive : styles.toggleButton}><DetailedViewIcon /></button>
                    </div>
                </div>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
            {renderContent()}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
    headerCard: { backgroundColor: 'var(--card-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    headerInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    styleCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    styleHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    styleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    styleName: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    styleTotalStock: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    styleDetails: { padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    partyOrderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--light-grey)' },
    partyOrderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
    partyOrderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    detailedListContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', paddingBottom: '1rem' },
    detailedCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column' },
    detailedCardHeader: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    detailedCardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    detailedCardOrderNum: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500, backgroundColor: 'var(--light-grey)', padding: '0.25rem 0.5rem', borderRadius: '6px' },
    detailedCardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' },
    detailedCardFooter: { marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', justifyContent: 'flex-end' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' },
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
    modalHeader: { padding: '1.5rem', borderBottom: '1px solid var(--skeleton-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalSubtitle: { fontSize: '0.9rem', color: 'var(--text-color)', marginTop: '0.25rem' },
    modalCloseButton: { background: 'none', border: 'none', fontSize: '2rem', color: 'var(--text-color)', cursor: 'pointer' },
    modalBody: { padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' },
    modalSummary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', backgroundColor: 'var(--light-grey)', padding: '1rem', borderRadius: '8px' },
    modalNote: { backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem' },
};