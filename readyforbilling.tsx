

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

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
interface HistoryEvent { timestamp: string; event: string; details: string; }
interface OrderItem { id: string; quantity: number; price: number; fullItemData: Record<string, any>; }
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: OrderItem[]; history?: HistoryEvent[]; }
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';
const BILLED_ORDERS_REF = 'Billed_Orders_V2';

// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

// --- COMPONENTS ---
const ExpandedBillingView = ({ order, billedQty, onQtyChange, onMarkBilled, isProcessing, onMatchAll }) => {
    const handleMarkBilledClick = () => {
        const totalBilled = Object.values(billedQty).reduce((sum: number, qty: number) => sum + qty, 0);
        if (totalBilled === 0) {
            showToast("Cannot mark as billed with zero quantity.", 'error');
            return;
        }
        onMarkBilled(order, billedQty);
    };
    
    const handleDownloadPdf = async () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
    
        // 1. Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Kambeshwar Agencies', 105, 20, { align: 'center' });
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('123 Business Road, Commerce City, 12345', 105, 27, { align: 'center' });
        doc.text('Email: contact@kambeshwar.com | Phone: +91 98765 43210', 105, 32, { align: 'center' });
    
        // 2. Document Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Packing Slip", 105, 45, { align: 'center' });
    
        // 3. Order Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`Party Name: ${order.partyName}`, 14, 60);
        doc.text(`Order No: ${order.orderNumber}`, 14, 67);
        doc.text(`Date: ${formatDate(order.timestamp)}`, 150, 67);
    
        // 4. Table
        const tableColumn = ["#", "Style", "Color", "Size", "Quantity"];
        const tableRows = [];
    
        const itemsToProcess = order.items.filter(item => (billedQty[item.id] || 0) > 0);

        itemsToProcess.forEach((item, index) => {
            const itemData = [
                index + 1,
                item.fullItemData.Style,
                item.fullItemData.Color,
                item.fullItemData.Size,
                billedQty[item.id]
            ];
            tableRows.push(itemData);
        });
    
        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [71, 84, 104] },
            styles: { font: 'helvetica', fontSize: 10 },
        });
    
        let finalY = (doc as any).lastAutoTable.finalY || 100;
    
        // 5. Totals
        const totalQuantity = itemsToProcess.reduce((sum, item) => sum + (billedQty[item.id] || 0), 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Quantity: ${totalQuantity}`, 14, finalY + 15);
    
        // 6. Footer
        finalY = doc.internal.pageSize.height - 30;
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Receiver\'s Signature', 40, finalY + 8, { align: 'center' });
        doc.text('For Kambeshwar Agencies', 165, finalY + 8, { align: 'center' });
    
        doc.save(`Packing_Slip_${order.orderNumber}.pdf`);
    };

    return (
        <div style={styles.expandedViewContainer}>
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead><tr><th style={styles.th}>Style</th><th style={styles.th}>Color</th><th style={styles.th}>Size</th><th style={styles.th}>Ready Qty</th><th style={styles.th}>Billed Qty</th></tr></thead>
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
                                      style={styles.qtyInput}
                                      value={billedQty[item.id] || ''}
                                      onChange={(e) => onQtyChange(item.id, e.target.value, item.quantity)}
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
                 <button onClick={onMatchAll} style={styles.matchAllButton} disabled={isProcessing}>
                    <CheckSquareIcon /> Match Ready Qty
                </button>
                 <div style={styles.footerActions}>
                    <button onClick={handleDownloadPdf} style={styles.secondaryButton} disabled={isProcessing}>
                        <DownloadIcon /> Download Slip
                    </button>
                    <button onClick={handleMarkBilledClick} style={styles.modalActionButton} disabled={isProcessing}>
                        {isProcessing ? <SmallSpinner /> : 'Mark as Billed'}
                    </button>
                </div>
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
                    <span style={styles.cardSubTitle}>
                        {data.orderCount} Orders | Total Qty: {totalQty}
                    </span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.cardDetails}>
                    {data.orders.map(order => (
                        <React.Fragment key={order.orderNumber}>
                             <Swipeable onAction={() => onToggleExpand(order)} actionText="Process">
                                <div style={expandedOrderNumber === order.orderNumber ? {...styles.orderItem, ...styles.orderItemActive} : styles.orderItem} onClick={() => onToggleExpand(order)}>
                                    <div style={styles.orderInfo}>
                                        <strong>{order.orderNumber}</strong>
                                        <span style={styles.orderMeta}><CalendarIcon /> {formatDate(order.timestamp)}</span>
                                        <span>Qty: {order.totalQuantity}</span>
                                    </div>
                                    <button style={styles.detailsButton} onClick={(e) => { e.stopPropagation(); onToggleExpand(order); }}>
                                        {expandedOrderNumber === order.orderNumber ? 'Close' : 'Process'}
                                    </button>
                                </div>
                            </Swipeable>
                            {expandedOrderNumber === order.orderNumber && children}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ReadyForBilling = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [billedQty, setBilledQty] = useState<Record<string, number>>({});
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);

    useEffect(() => {
        const ordersRef = firebase.database().ref(BILLING_ORDERS_REF);
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

    const handleQtyChange = (itemId, value, maxQty) => {
        const numValue = Math.max(0, Math.min(maxQty, Number(value) || 0));
        setBilledQty(prev => ({ ...prev, [itemId]: numValue }));
    };

    const handleToggleExpand = (order: Order) => {
        const orderNumber = order.orderNumber;
        if (expandedOrderNumber === orderNumber) {
            setExpandedOrderNumber(null);
        } else {
            const initialQtys: Record<string, number> = {};
            order.items.forEach(item => { initialQtys[item.id] = item.quantity; });
            setBilledQty(initialQtys);
            setExpandedOrderNumber(orderNumber);
        }
    };
    
    const handleMatchAll = useCallback((order) => {
        const allQuantities = order.items.reduce((acc, item) => {
            acc[item.id] = item.quantity;
            return acc;
        }, {});
        setBilledQty(allQuantities);
        showToast('All quantities matched!', 'info');
    }, []);

    const handleMarkBilled = async (order, billedQuantities) => {
        setProcessingOrder(order.orderNumber);
        try {
            const updates = {};
            const itemsForBilled = [];
            const itemsRemainingInBilling = [];

            order.items.forEach(item => {
                const billedQty = billedQuantities[item.id] || 0;
                if (billedQty > 0) itemsForBilled.push({ ...item, quantity: billedQty });
                if (item.quantity > billedQty) itemsRemainingInBilling.push({ ...item, quantity: item.quantity - billedQty });
            });

            if (itemsForBilled.length === 0) throw new Error("No items selected.");
            
            const totalBilledQty = itemsForBilled.reduce((sum, i) => sum + i.quantity, 0);
            const newHistoryEvent = {
                timestamp: new Date().toISOString(),
                event: 'System',
                details: `Marked as Billed. Billed Qty: ${totalBilledQty}.`
            };
            const updatedHistory = [...(order.history || []), newHistoryEvent];
            
            const billedOrderRefPath = `${BILLED_ORDERS_REF}/${order.orderNumber}`;
            const billingOrderRefPath = `${BILLING_ORDERS_REF}/${order.orderNumber}`;
            const existingBilledOrderSnap = await firebase.database().ref(billedOrderRefPath).once('value');
            const existingBilledOrder = existingBilledOrderSnap.val() as Order | null;
            
            const finalBilledItemsMap = new Map(existingBilledOrder?.items.map(i => [i.id, i]) || []);
            itemsForBilled.forEach(newItem => {
                const existingItem = finalBilledItemsMap.get(newItem.id);
                if (existingItem) { existingItem.quantity += newItem.quantity; } 
                else { finalBilledItemsMap.set(newItem.id, newItem); }
            });
            const finalBilledItems = Array.from(finalBilledItemsMap.values());

            updates[billedOrderRefPath] = { ...order, items: finalBilledItems, totalQuantity: finalBilledItems.reduce((sum, i) => sum + i.quantity, 0), totalValue: finalBilledItems.reduce((sum, i) => sum + (i.quantity * i.price), 0), status: 'Billed', billedTimestamp: new Date().toISOString(), history: updatedHistory };
            if (itemsRemainingInBilling.length > 0) {
                updates[billingOrderRefPath] = { ...order, items: itemsRemainingInBilling, totalQuantity: itemsRemainingInBilling.reduce((sum, i) => sum + i.quantity, 0), totalValue: itemsRemainingInBilling.reduce((sum, i) => sum + (i.quantity * i.price), 0), history: updatedHistory };
            } else {
                updates[billingOrderRefPath] = null;
            }
            await firebase.database().ref().update(updates);
            showToast("Order marked as billed!", 'success');
            setExpandedOrderNumber(null);
            setBilledQty({});
        } catch(e) {
            console.error("Failed to mark as billed", e);
            showToast("Error marking order as billed.", 'error');
        } finally {
            setProcessingOrder(null);
        }
    };

    const filteredOrders = useMemo(() => {
        let filtered = orders;
        
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate;
            if (dateFilter === 'today') startDate = today;
            else if (dateFilter === '7days') startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (dateFilter === '30days') startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (startDate) filtered = filtered.filter(order => new Date(order.timestamp) >= startDate);
        }

        if (!searchTerm) return filtered;
        const lowercasedTerm = searchTerm.toLowerCase();
        return filtered.filter(order => 
            order.partyName.toLowerCase().includes(lowercasedTerm) ||
            order.orderNumber.toLowerCase().includes(lowercasedTerm)
        );
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
        if (orders.length === 0) return <div style={styles.centeredMessage}>No orders are ready for billing.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search or filter.</div>;
        
        const partyNames = Object.keys(summarizedData).sort();
        const expandedView = expandedOrder ? (
            <ExpandedBillingView
                order={expandedOrder}
                billedQty={billedQty}
                onQtyChange={handleQtyChange}
                onMarkBilled={handleMarkBilled}
                isProcessing={processingOrder === expandedOrder.orderNumber}
                onMatchAll={() => handleMatchAll(expandedOrder)}
            />
        ) : null;

        return (
            <div style={styles.listContainer}>
                {partyNames.map(partyName => (
                    <PartyGroup key={partyName} partyName={partyName} data={summarizedData[partyName]} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber}>
                        {expandedView}
                    </PartyGroup>
                ))}
            </div>
        );
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
                <h2 style={styles.pageTitle}>Ready for Billing</h2>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} className="global-search-input" placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    filterButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' },
    filterButtonActive: { background: 'var(--active-bg)', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
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
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    tdInput: { padding: '4px' },
    qtyInput: { width: '70px', padding: '8px', textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', fontSize: '0.9rem' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    footerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: '#27ae60', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px' },
    matchAllButton: { padding: '0.7rem 1.2rem', background: 'none', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)', padding: '0.7rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    // Swipeable styles
    swipeableContainer: { position: 'relative', overflow: 'hidden' },
    swipeableActions: { position: 'absolute', top: 0, right: 0, height: '100%', display: 'flex', alignItems: 'center' },
    swipeableActionButton: { height: '100%', width: '80px', background: 'var(--brand-color)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 },
    swipeableContent: { position: 'relative', backgroundColor: 'var(--card-bg)', zIndex: 1 },
};
