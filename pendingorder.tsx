
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const Swipeable: React.FC<{ onAction: () => void; children: React.ReactNode; actionText: string; }> = ({ onAction, children, actionText }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const wasSwiped = useRef(false);

    const resetOpenItems = () => {
        document.querySelectorAll('.swipeable-content.swiped-open').forEach(node => {
            if (node !== contentRef.current) {
                (node as HTMLElement).style.transform = 'translateX(0px)';
                node.classList.remove('swiped-open');
            }
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        resetOpenItems();
        startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging.current = true;
        wasSwiped.current = false;
        if (contentRef.current) {
            contentRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !contentRef.current) return;
        
        const currentX = e.touches[0].clientX;
        const diffX = currentX - startPos.current.x;

        if (Math.abs(diffX) > 10) {
            wasSwiped.current = true;
        }
        
        if (diffX < 0) {
            const newTranslateX = Math.max(-80, diffX);
            contentRef.current.style.transform = `translateX(${newTranslateX}px)`;
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        if (contentRef.current) {
            contentRef.current.style.transition = 'transform 0.3s ease';
            const currentTransform = new WebKitCSSMatrix(window.getComputedStyle(contentRef.current).transform).m41;

            if (currentTransform < -40) {
                contentRef.current.style.transform = 'translateX(-80px)';
                contentRef.current.classList.add('swiped-open');
            } else {
                contentRef.current.style.transform = 'translateX(0px)';
                contentRef.current.classList.remove('swiped-open');
            }
        }
        
        if (!wasSwiped.current) {
            onAction();
        }
    };
    
    const handleActionClick = () => {
        if (contentRef.current) {
             contentRef.current.style.transition = 'transform 0.3s ease';
             contentRef.current.style.transform = 'translateX(0px)';
             contentRef.current.classList.remove('swiped-open');
        }
        onAction();
    }

    return (
        <div style={styles.swipeableContainer}>
            <div style={styles.swipeableActions}>
                <button onClick={handleActionClick} style={styles.swipeableActionButton}>
                    {actionText}
                </button>
            </div>
            <div
                ref={contentRef}
                className="swipeable-content"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={styles.swipeableContent}
            >
                {children}
            </div>
        </div>
    );
};


// --- TYPE & FIREBASE ---
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: any[]; }
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';
const DELETED_ORDERS_REF = 'Deleted_Orders_V2';

// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const timeSince = (dateString) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

// --- COMPONENTS ---
const ExpandedPendingView = ({ order, onProcess, onDelete, isProcessing }) => {
    return (
        <div style={styles.expandedViewContainer}>
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Style</th><th style={styles.th}>Color</th><th style={styles.th}>Size</th><th style={styles.th}>Qty</th></tr></thead>
                    <tbody>
                        {order.items.map(item => (
                            <tr key={item.id} style={styles.tr}>
                                <td style={styles.td}>{item.fullItemData.Style}</td>
                                <td style={styles.td}>{item.fullItemData.Color}</td>
                                <td style={styles.td}>{item.fullItemData.Size}</td>
                                <td style={styles.td}>{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {order.orderNote && <div style={styles.noteBox}><strong>Note:</strong> {order.orderNote}</div>}
            <div style={styles.modalFooter}>
                <button onClick={() => onDelete(order)} style={styles.deleteButton} disabled={isProcessing}>
                    <TrashIcon /> Delete
                </button>
                <button onClick={() => onProcess(order)} style={styles.modalActionButton} disabled={isProcessing}>
                    {isProcessing ? <SmallSpinner /> : 'Process for Billing'}
                </button>
            </div>
        </div>
    );
};

// FIX: Explicitly type component props to resolve issues with 'key' prop and 'children' type inference by using React.FC.
const PartyGroup: React.FC<{ partyName: string; data: any; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; }> = ({ partyName, data, onToggleExpand, expandedOrderNumber, children }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);

    return (
        <div style={styles.card}>
            <button style={styles.cardHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={styles.cardInfo}>
                    <span style={styles.cardTitle}>{partyName}</span>
                    <span style={styles.cardSubTitle}>{data.orderCount} Orders | Total Qty: {totalQty}</span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.cardDetails}>
                    {data.orders.map(order => {
                        const isOverdue = new Date().getTime() - new Date(order.timestamp).getTime() > 48 * 60 * 60 * 1000;
                        const orderItemStyle = expandedOrderNumber === order.orderNumber ? {...styles.orderItem, ...styles.orderItemActive} : styles.orderItem;
                        return (
                            <React.Fragment key={order.orderNumber}>
                                <Swipeable onAction={() => onToggleExpand(order)} actionText="Process">
                                    <div style={orderItemStyle} onClick={() => onToggleExpand(order)}>
                                        <div style={styles.orderInfo}>
                                            <strong style={isOverdue ? { color: '#e74c3c' } : {}}>{order.orderNumber}</strong>
                                            <span style={styles.orderMeta}><CalendarIcon /> {timeSince(order.timestamp)}</span>
                                            <span>Qty: {order.totalQuantity}</span>
                                        </div>
                                        <button style={styles.detailsButton} onClick={(e) => { e.stopPropagation(); onToggleExpand(order); }}>
                                            {expandedOrderNumber === order.orderNumber ? 'Close' : 'Process'}
                                        </button>
                                    </div>
                                </Swipeable>
                                {expandedOrderNumber === order.orderNumber && children}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// FIX: Explicitly type component props with React.FC to resolve issues with 'children' type inference.
const DetailedList: React.FC<{ orders: Order[]; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; }> = ({ orders, onToggleExpand, expandedOrderNumber, children }) => {
    return (
        <div style={{...styles.card, padding: 0}}>
            {orders.map(order => {
                const isOverdue = new Date().getTime() - new Date(order.timestamp).getTime() > 48 * 60 * 60 * 1000;
                const orderItemStyle = expandedOrderNumber === order.orderNumber ? {...styles.orderItem, ...styles.orderItemActive, borderBottom: 'none' } : {...styles.orderItem, padding: '1rem 1.5rem'};
                 return (
                    <React.Fragment key={order.orderNumber}>
                         <Swipeable onAction={() => onToggleExpand(order)} actionText="Process">
                            <div style={orderItemStyle} onClick={() => onToggleExpand(order)}>
                                <div style={styles.orderInfo}>
                                    <div>
                                        <strong style={isOverdue ? { color: '#e74c3c' } : {}}>{order.orderNumber}</strong>
                                        <div style={styles.cardSubTitle}>{order.partyName}</div>
                                    </div>
                                    <span style={styles.orderMeta}><CalendarIcon /> {timeSince(order.timestamp)}</span>
                                    <span>Qty: {order.totalQuantity}</span>
                                </div>
                                <button style={styles.detailsButton} onClick={(e) => { e.stopPropagation(); onToggleExpand(order); }}>
                                    {expandedOrderNumber === order.orderNumber ? 'Close' : 'Process'}
                                </button>
                            </div>
                        </Swipeable>
                        {expandedOrderNumber === order.orderNumber && children}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export const PendingOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('summarized'); // summarized or detailed
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);

    useEffect(() => {
        const ordersRef = firebase.database().ref(PENDING_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

    const handleProcessOrder = async (order: Order) => {
        setProcessingOrder(order.orderNumber);
        try {
            const updates = {
                [`${BILLING_ORDERS_REF}/${order.orderNumber}`]: order,
                [`${PENDING_ORDERS_REF}/${order.orderNumber}`]: null
            };
            await firebase.database().ref().update(updates);
            showToast('Order moved to Ready for Billing!', 'success');
            setExpandedOrderNumber(null);
        } catch(e) {
            console.error(e);
            showToast('Failed to process order.', 'error');
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleDeleteOrder = async (order: Order) => {
        const reason = prompt("Please provide a reason for deleting this order:", "Customer cancellation");
        if (reason === null) return; // User cancelled

        setProcessingOrder(order.orderNumber);
        const deletedOrderData = { ...order, deletionReason: reason, deletedTimestamp: new Date().toISOString() };
        try {
            const updates = {
                [`${DELETED_ORDERS_REF}/${order.orderNumber}`]: deletedOrderData,
                [`${PENDING_ORDERS_REF}/${order.orderNumber}`]: null
            };
            await firebase.database().ref().update(updates);
            showToast('Order moved to Deleted archive.', 'success');
            setExpandedOrderNumber(null);
        } catch(e) {
            console.error(e);
            showToast('Failed to delete order.', 'error');
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleToggleExpand = (order: Order) => {
        setExpandedOrderNumber(prev => prev === order.orderNumber ? null : order.orderNumber);
    };

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
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;
        
        const expandedView = expandedOrder ? (
            <ExpandedPendingView
                order={expandedOrder}
                onProcess={handleProcessOrder}
                onDelete={handleDeleteOrder}
                isProcessing={processingOrder === expandedOrder.orderNumber}
            />
        ) : null;
        
        if (view === 'summarized') {
            const partyNames = Object.keys(summarizedData).sort();
            return (
                <div style={styles.listContainer}>
                    {partyNames.map(partyName => (
                        <PartyGroup key={partyName} partyName={partyName} data={summarizedData[partyName]} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber}>
                            {expandedView}
                        </PartyGroup>
                    ))}
                </div>
            );
        }

        return (
            <div style={styles.listContainer}>
                <DetailedList orders={filteredOrders} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber}>
                    {expandedView}
                </DetailedList>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <div style={styles.headerTop}>
                    <h2 style={styles.pageTitle}>Pending Orders</h2>
                    <div style={styles.viewToggle}>
                        <button onClick={() => setView('summarized')} style={view === 'summarized' ? styles.toggleButtonActive : styles.toggleButton}><SummarizedViewIcon /></button>
                        <button onClick={() => setView('detailed')} style={view === 'detailed' ? styles.toggleButtonActive : styles.toggleButton}><DetailedViewIcon /></button>
                    </div>
                </div>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} className="global-search-input" placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
    headerCard: { backgroundColor: 'var(--card-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    cardDetails: { padding: '0 1.5rem 1rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column' },
    orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--light-grey)' },
    orderItemActive: { backgroundColor: 'var(--active-bg)', margin: '0 -1.5rem', padding: '0.75rem 1.5rem' },
    orderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)' },
    orderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eef2f7', border: '1px solid var(--skeleton-bg)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    expandedViewContainer: { padding: '0.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--brand-color)', margin: '0 -1.5rem -1rem', backgroundColor: '#fafbff' },
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    noteBox: { backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.9rem', marginTop: '1rem' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    deleteButton: { padding: '0.75rem 1.5rem', background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '180px' },
    // Swipeable styles
    swipeableContainer: { position: 'relative', overflow: 'hidden' },
    swipeableActions: { position: 'absolute', top: 0, right: 0, height: '100%', display: 'flex', alignItems: 'center' },
    swipeableActionButton: { height: '100%', width: '80px', background: 'var(--brand-color)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 },
    swipeableContent: { position: 'relative', backgroundColor: 'var(--card-bg)', zIndex: 1 },
};
