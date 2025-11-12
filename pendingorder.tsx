

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const SummarizedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const DetailedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;

// --- TYPE DEFINITIONS ---
interface OrderItem { id: string; quantity: number; price: number; fullItemData: Record<string, any>; }
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: OrderItem[]; }

// --- FIREBASE CONFIGURATION ---
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';

// --- HELPER FUNCTIONS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'N/A';

// --- SUB-COMPONENTS ---
const ExpandedOrderView = ({ order, srq, onSrqChange, onSendToBilling, isSending, onMatchAll }) => {
    const handleSendClick = () => {
        const totalSrq = Object.values(srq).reduce((sum: number, qty: number) => sum + qty, 0);
        if (totalSrq === 0) {
            showToast("Please enter a quantity for at least one item.", 'error');
            return;
        }
        onSendToBilling(order, srq);
    };

    return (
        <div style={styles.expandedViewContainer}>
            <div style={styles.modalSummary}>
                <div><strong>Date:</strong> {formatDateTime(order.timestamp)}</div>
                <div><strong>Total Ord Qty:</strong> {order.totalQuantity}</div>
            </div>
            {order.orderNote && <div style={styles.modalNote}><strong>Note:</strong> {order.orderNote}</div>}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Style</th><th style={styles.th}>Color</th><th style={styles.th}>Size</th><th style={styles.th}>Ord Qty</th><th style={styles.th}>SRQ</th></tr></thead>
                    <tbody>
                        {order.items.map(item => (
                            <tr key={item.id} style={styles.tr}>
                                <td style={styles.td}>{item.fullItemData.Style}</td>
                                <td style={styles.td}>{item.fullItemData.Color}</td>
                                <td style={styles.td}>{item.fullItemData.Size}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={{...styles.td, ...styles.tdInput}}>
                                    <input
                                      type="number"
                                      style={styles.srqInput}
                                      value={srq[item.id] || ''}
                                      onChange={(e) => onSrqChange(item.id, e.target.value, item.quantity)}
                                      placeholder="0"
                                      max={item.quantity}
                                      min="0"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={styles.modalFooter}>
                <button onClick={onMatchAll} style={styles.matchAllButton} disabled={isSending}>
                    <CheckSquareIcon /> Match Order Qty
                </button>
                <button onClick={handleSendClick} style={styles.modalActionButton} disabled={isSending}>
                    {isSending ? <SmallSpinner /> : 'Send to Billing'}
                </button>
            </div>
        </div>
    );
};

const PartyGroup = ({ partyName, data, onToggleExpand, expandedOrderNumber, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);

    return (
        <div style={styles.styleCard}>
            <button style={styles.styleHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={styles.styleInfo}>
                    <span style={styles.styleName}>{partyName}</span>
                    <span style={styles.styleTotalStock}>{data.orderCount} Orders | Total Qty: {totalQty}</span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.styleDetails}>
                    {data.orders.map(order => (
                        <React.Fragment key={order.orderNumber}>
                            <div style={expandedOrderNumber === order.orderNumber ? {...styles.partyOrderItem, ...styles.partyOrderItemActive} : styles.partyOrderItem} onClick={() => onToggleExpand(order)}>
                                <div style={styles.partyOrderInfo}>
                                    <strong>{order.orderNumber}</strong>
                                    <span style={styles.partyOrderMeta}><CalendarIcon /> {formatDate(order.timestamp)}</span>
                                    <span>Qty: {order.totalQuantity}</span>
                                </div>
                                <button style={styles.detailsButton}>
                                    {expandedOrderNumber === order.orderNumber ? 'Close' : 'Process'}
                                </button>
                            </div>
                            {expandedOrderNumber === order.orderNumber && children}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

const SummarizedView = ({ data, onToggleExpand, expandedOrderNumber, children }) => {
    const partyNames = Object.keys(data).sort();
    return (
        <div style={styles.listContainer}>
            {partyNames.map(partyName => (
                <PartyGroup key={partyName} partyName={partyName} data={data[partyName]} onToggleExpand={onToggleExpand} expandedOrderNumber={expandedOrderNumber}>
                    {children}
                </PartyGroup>
            ))}
        </div>
    );
};

const DetailedView = ({ orders, onToggleExpand, expandedOrderNumber, children }) => (
    <div style={styles.detailedListContainer}>
        {orders.map(order => (
            <div key={order.orderNumber} style={expandedOrderNumber === order.orderNumber ? {...styles.detailedCard, ...styles.detailedCardActive} : styles.detailedCard}>
                <div style={styles.detailedCardHeader} onClick={() => onToggleExpand(order)}>
                    <div>
                        <h3 style={styles.detailedCardTitle}>{order.partyName}</h3>
                        <span style={styles.detailedCardOrderNum}>{order.orderNumber}</span>
                    </div>
                    <ChevronIcon collapsed={expandedOrderNumber !== order.orderNumber} />
                </div>
                {expandedOrderNumber !== order.orderNumber && (
                    <div style={styles.detailedCardBody}>
                        <div style={styles.summaryItem}><span>Date</span><strong>{formatDate(order.timestamp)}</strong></div>
                        <div style={styles.summaryItem}><span>Items</span><strong>{order.totalQuantity}</strong></div>
                    </div>
                )}
                {expandedOrderNumber === order.orderNumber && children}
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
    const [dateFilter, setDateFilter] = useState('all');
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [srq, setSrq] = useState<Record<string, number>>({});
    const [sendingOrder, setSendingOrder] = useState<string | null>(null);

    useEffect(() => {
        const ordersRef = firebase.database().ref(PENDING_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setOrders(ordersArray);
            } else { setOrders([]); }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch orders. Please check your connection.');
            setIsLoading(false);
        });
        return () => ordersRef.off('value', listener);
    }, []);
    
    const handleSrqChange = (itemId, value, maxQty) => {
        const numValue = Math.max(0, Math.min(maxQty, Number(value) || 0));
        setSrq(prev => ({ ...prev, [itemId]: numValue }));
    };

    const handleToggleExpand = (order: Order) => {
        const orderNumber = order.orderNumber;
        if (expandedOrderNumber === orderNumber) {
            setExpandedOrderNumber(null);
        } else {
            setSrq({});
            setExpandedOrderNumber(orderNumber);
        }
    };

    const handleMatchAll = useCallback((order) => {
        const allQuantities = order.items.reduce((acc, item) => {
            acc[item.id] = item.quantity;
            return acc;
        }, {});
        setSrq(allQuantities);
        showToast('All quantities matched!', 'info');
    }, []);

    const handleSendToBilling = async (order, stockRemovedQuantities) => {
        setSendingOrder(order.orderNumber);
        try {
            const updates = {};
            const itemsForBilling = [];
            const itemsRemainingInPending = [];

            order.items.forEach(item => {
                const removedQty = stockRemovedQuantities[item.id] || 0;
                if (removedQty > 0) itemsForBilling.push({ ...item, quantity: removedQty });
                if (item.quantity > removedQty) itemsRemainingInPending.push({ ...item, quantity: item.quantity - removedQty });
            });

            if (itemsForBilling.length === 0) throw new Error("No items selected.");
            const billingOrderRefPath = `${BILLING_ORDERS_REF}/${order.orderNumber}`;
            const pendingOrderRefPath = `${PENDING_ORDERS_REF}/${order.orderNumber}`;
            const existingBillingOrderSnap = await firebase.database().ref(billingOrderRefPath).once('value');
            const existingBillingOrder = existingBillingOrderSnap.val() as Order | null;
            
            const finalBillingItemsMap = new Map(existingBillingOrder?.items.map(i => [i.id, i]) || []);
            itemsForBilling.forEach(newItem => {
                const existingItem = finalBillingItemsMap.get(newItem.id);
                if (existingItem) { existingItem.quantity += newItem.quantity; } 
                else { finalBillingItemsMap.set(newItem.id, newItem); }
            });
            const finalBillingItems = Array.from(finalBillingItemsMap.values());

            updates[billingOrderRefPath] = { ...order, items: finalBillingItems, totalQuantity: finalBillingItems.reduce((sum, i) => sum + i.quantity, 0), totalValue: finalBillingItems.reduce((sum, i) => sum + (i.quantity * i.price), 0), status: 'Ready for Billing' };
            if (itemsRemainingInPending.length > 0) {
                updates[pendingOrderRefPath] = { ...order, items: itemsRemainingInPending, totalQuantity: itemsRemainingInPending.reduce((sum, i) => sum + i.quantity, 0), totalValue: itemsRemainingInPending.reduce((sum, i) => sum + (i.quantity * i.price), 0), };
            } else {
                updates[pendingOrderRefPath] = null;
            }

            await firebase.database().ref().update(updates);
            showToast("Items sent to billing successfully!", 'success');
            setExpandedOrderNumber(null);
            setSrq({});
        } catch (e) {
            console.error("Failed to send to billing", e);
            showToast("Error sending items to billing.", 'error');
        } finally {
            setSendingOrder(null);
        }
    };

    const filteredOrders = useMemo(() => {
        let filtered = orders;
        
        // Date Filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate;

            if (dateFilter === 'today') {
                startDate = today;
            } else if (dateFilter === '7days') {
                startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateFilter === '30days') {
                 startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            if (startDate) {
                filtered = filtered.filter(order => new Date(order.timestamp) >= startDate);
            }
        }
        
        // Search Filter
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(order => 
                order.partyName.toLowerCase().includes(lowercasedTerm) ||
                order.orderNumber.toLowerCase().includes(lowercasedTerm)
            );
        }

        return filtered;
    }, [orders, searchTerm, dateFilter]);

    const summarizedData = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) { acc[order.partyName] = { orderCount: 0, orders: [] }; }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const expandedOrder = useMemo(() => {
        if (!expandedOrderNumber) return null;
        return orders.find(o => o.orderNumber === expandedOrderNumber);
    }, [expandedOrderNumber, orders]);
    
    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders found.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search or filter.</div>;

        const expandedView = expandedOrder ? (
            <ExpandedOrderView 
                order={expandedOrder} 
                srq={srq} 
                onSrqChange={handleSrqChange}
                onSendToBilling={handleSendToBilling}
                isSending={sendingOrder === expandedOrder.orderNumber}
                onMatchAll={() => handleMatchAll(expandedOrder)}
            />
        ) : null;
        
        return viewMode === 'summarized' 
            ? <SummarizedView data={summarizedData} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber}>{expandedView}</SummarizedView>
            : <DetailedView orders={filteredOrders} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber}>{expandedView}</DetailedView>;
    };
    
    const dateFilters = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: '7days', label: 'Last 7 Days' },
        { key: '30days', label: 'Last 30 Days' },
    ];

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
                <div style={styles.filterContainer}>
                    {dateFilters.map(filter => (
                        <button 
                          key={filter.key} 
                          onClick={() => setDateFilter(filter.key)} 
                          style={dateFilter === filter.key ? styles.filterButtonActive : styles.filterButton}
                        >{filter.label}</button>
                    ))}
                </div>
            </div>
            {renderContent()}
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
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    filterButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' },
    filterButtonActive: { background: 'var(--active-bg)', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    styleCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    styleHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    styleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    styleName: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    styleTotalStock: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    styleDetails: { padding: '0 1.5rem 1rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column' },
    partyOrderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--light-grey)', cursor: 'pointer' },
    partyOrderItemActive: { backgroundColor: 'var(--active-bg)', margin: '0 -1.5rem', padding: '0.75rem 1.5rem' },
    partyOrderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)' },
    partyOrderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    detailedListContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', paddingBottom: '1rem', alignItems: 'start' },
    detailedCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s ease' },
    detailedCardActive: { borderColor: 'var(--brand-color)', boxShadow: '0 4px 12px rgba(71, 84, 104, 0.1)' },
    detailedCardHeader: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
    detailedCardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    detailedCardOrderNum: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500, backgroundColor: 'var(--light-grey)', padding: '0.25rem 0.5rem', borderRadius: '6px' },
    detailedCardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--dark-grey)' },
    expandedViewContainer: { padding: '0.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--brand-color)', margin: '0 -1.5rem', backgroundColor: 'var(--active-bg)'},
    modalSummary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', color: 'var(--dark-grey)', marginBottom: '1rem', border: '1px solid var(--skeleton-bg)' },
    modalNote: { backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' },
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    tdInput: { padding: '4px' },
    srqInput: { width: '60px', padding: '8px', textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', fontSize: '0.9rem' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px' },
    matchAllButton: { padding: '0.7rem 1.2rem', background: 'none', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
};