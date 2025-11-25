


import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CheckSquareIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
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
// FIX: Explicitly type props with React.FC to allow the 'key' prop used in lists.
interface ExpandedBillingViewProps {
    order: Order;
    billedQty: Record<string, number>;
    onQtyChange: (itemId: string, value: string, maxQty: number) => void;
    onMarkBilled: (order: Order, billedQuantities: Record<string, number>) => void;
    isProcessing: boolean;
    onMatchAll: (order: Order) => void;
    isMobile: boolean;
}

const ExpandedBillingView: React.FC<ExpandedBillingViewProps> = ({ order, billedQty, onQtyChange, onMarkBilled, isProcessing, onMatchAll, isMobile }) => {
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

    const renderFooter = () => {
        const isButtonDisabled = isProcessing;

        const getMarkBilledButtonStyle = () => {
            let style = { ...styles.modalActionButton };
            if (isMobile) {
                style.flexGrow = 1;
            }

            if (isProcessing) {
                style = {...style, ...styles.modalActionButtonDisabled};
            }
            return style;
        };

        if (isMobile) {
            return (
                <div style={styles.mobileFooterContainer}>
                    <button onClick={() => onMatchAll(order)} style={styles.iconButton} disabled={isProcessing} title="Match Ready Quantity">
                        <CheckSquareIcon color="var(--brand-color)" />
                    </button>
                    <button onClick={handleDownloadPdf} style={styles.iconButton} disabled={isProcessing} title="Download Packing Slip">
                        <DownloadIcon />
                    </button>
                    <button 
                        onClick={handleMarkBilledClick} 
                        style={getMarkBilledButtonStyle()}
                        disabled={isButtonDisabled}
                    >
                        {isProcessing ? <SmallSpinner /> : 'Mark as Billed'}
                    </button>
                </div>
            );
        }
        return (
            <div style={{...styles.modalFooter, padding: '1rem'}}>
                <button onClick={() => onMatchAll(order)} style={styles.matchAllButton} disabled={isProcessing} title="Match Ready Quantity">
                    <CheckSquareIcon />
                </button>
                <div style={styles.footerActions}>
                    <button onClick={handleDownloadPdf} style={styles.iconButton} disabled={isProcessing} title="Download Packing Slip">
                        <DownloadIcon />
                    </button>
                    <button 
                        onClick={handleMarkBilledClick} 
                        style={getMarkBilledButtonStyle()}
                        disabled={isButtonDisabled}
                    >
                        {isProcessing ? <SmallSpinner /> : 'Mark as Billed'}
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div style={styles.orderWrapper}>
            <div style={{ ...styles.expandedSummary, padding: isMobile ? '0.75rem' : '1rem' }}>
                <div style={{display: 'none'}}><strong>Party:</strong> {order.partyName}</div>
                <div><strong>Order #:</strong> {order.orderNumber}</div>
                <div><strong>Order Date:</strong> {formatDate(order.timestamp)}</div>
                <div><strong>Ready Qty:</strong> {order.totalQuantity}</div>
            </div>
            {order.orderNote && <div style={styles.expandedNote}><strong>Note:</strong> {order.orderNote}</div>}
            <div style={isMobile ? styles.mobileTableWrapper : {}}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{...styles.th, textAlign: 'left'}}>Style</th>
                            <th style={{...styles.th, textAlign: 'left'}}>Color</th>
                            <th style={{...styles.th, textAlign: 'left'}}>Size</th>
                            <th style={styles.th}>{isMobile ? 'Qty' : 'Ready Qty'}</th>
                            <th style={styles.th}>{isMobile ? 'Billed' : 'Billed Qty'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={item.id} style={index % 2 !== 0 ? { ...styles.tr, backgroundColor: 'var(--stripe-bg)' } : styles.tr}>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Style}</td>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Color}</td>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Size}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={{...styles.td, ...styles.tdInput}}>
                                     <input
                                        type="number"
                                        value={billedQty[item.id] || ''}
                                        onChange={(e) => onQtyChange(item.id, e.target.value, item.quantity)}
                                        style={styles.billingQtyInput}
                                        max={item.quantity}
                                        min="0"
                                        placeholder="0"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {renderFooter()}
        </div>
    );
};

const PartyGroup: React.FC<{ 
    partyName: string; 
    data: any; 
    billedQtys: Record<string, Record<string, number>>;
    processingOrders: string[];
    onQtyChange: (orderNumber: string, itemId: string, value: string, maxQty: number) => void;
    onMarkBilled: (order: Order, billedQuantities: Record<string, number>) => void;
    onMatchAll: (order: Order) => void;
    onPartyExpand: (orders: Order[]) => void;
    isMobile: boolean;
}> = ({ partyName, data, billedQtys, processingOrders, onQtyChange, onMarkBilled, onMatchAll, onPartyExpand, isMobile }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);

    const handleToggleCollapse = () => {
        if (isCollapsed) { // expanding
            onPartyExpand(data.orders);
        }
        setIsCollapsed(!isCollapsed);
    };

    const cardStyle: React.CSSProperties = {
        ...styles.card,
        boxShadow: isCollapsed ? 'rgba(0, 0, 0, 0.04) 0px 2px 4px' : 'rgba(0, 0, 0, 0.06) 0px 4px 8px',
        transition: 'box-shadow 0.3s ease',
        borderRadius: 'var(--border-radius)',
    };

    return (
        <div style={cardStyle}>
            <button style={styles.cardHeader} onClick={handleToggleCollapse}>
                <div style={styles.cardInfo}>
                    <span style={styles.cardTitle}>{partyName}</span>
                    <span style={styles.cardSubTitle}>
                        {data.orderCount} Orders | Total Qty: {totalQty}
                    </span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            <div style={isCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={{...styles.cardDetails, padding: isMobile ? '0 0.5rem 1rem' : '0 1.5rem 1.5rem'}}>
                        {data.orders.map(order => (
                            <ExpandedBillingView
                                key={order.orderNumber}
                                order={order}
                                billedQty={billedQtys[order.orderNumber] || {}}
                                onQtyChange={(itemId, value, maxQty) => onQtyChange(order.orderNumber, itemId, value, maxQty)}
                                onMarkBilled={onMarkBilled}
                                isProcessing={processingOrders.includes(order.orderNumber)}
                                onMatchAll={onMatchAll}
                                isMobile={isMobile}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReadyForBilling = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [billedQtys, setBilledQtys] = useState<Record<string, Record<string, number>>>({});
    const [processingOrders, setProcessingOrders] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    const filterPillsRef = useRef(null);
    const pillRefs = useRef({});
    const [markerStyle, setMarkerStyle] = useState({});

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

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
        return () => {
            ordersRef.off('value', listener);
            window.removeEventListener('resize', handleResize);
        }
    }, []);

    const dateFilters = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: '7days', label: 'Last 7 Days' },
        { key: '30days', label: 'Last 30 Days' },
    ];

    useLayoutEffect(() => {
        const activePill = pillRefs.current[dateFilter];
        const container = filterPillsRef.current;
    
        if (activePill && container) {
            const containerRect = container.getBoundingClientRect();
            const pillRect = activePill.getBoundingClientRect();
    
            setMarkerStyle({
                left: pillRect.left - containerRect.left,
                width: pillRect.width,
                height: pillRect.height,
                opacity: 1,
            });
        }
    }, [dateFilter]);


    const handleQtyChange = (orderNumber: string, itemId: string, value: string, maxQty: number) => {
        const numValue = Math.max(0, Math.min(maxQty, Number(value) || 0));
        setBilledQtys(prev => ({
            ...prev,
            [orderNumber]: {
                ...(prev[orderNumber] || {}),
                [itemId]: numValue,
            },
        }));
    };
    
    const handlePartyExpand = (ordersInParty: Order[]) => {
        setBilledQtys(prevQtys => {
            const newQtys = { ...prevQtys };
            let updated = false;
            ordersInParty.forEach(order => {
                if (!newQtys[order.orderNumber]) { // Only initialize if not already there
                    const initialQtys = {};
                    order.items.forEach(item => { initialQtys[item.id] = item.quantity; });
                    newQtys[order.orderNumber] = initialQtys;
                    updated = true;
                }
            });
            return updated ? newQtys : prevQtys;
        });
    };
    
    const handleMatchAll = useCallback((order: Order) => {
        const allQuantities = order.items.reduce((acc, item) => {
            acc[item.id] = item.quantity;
            return acc;
        }, {});
        setBilledQtys(prev => ({
            ...prev,
            [order.orderNumber]: allQuantities,
        }));
        showToast('All quantities matched!', 'info');
    }, []);

    const handleMarkBilled = async (order: Order, billedQuantities: Record<string, number>) => {
        setProcessingOrders(prev => [...prev, order.orderNumber]);
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
                 setBilledQtys(prev => {
                    const newQtys = { ...prev };
                    delete newQtys[order.orderNumber];
                    return newQtys;
                });
            }
            await firebase.database().ref().update(updates);
            showToast("Order marked as billed!", 'success');

        } catch(e) {
            console.error("Failed to mark as billed", e);
            showToast("Error marking order as billed.", 'error');
        } finally {
            setProcessingOrders(prev => prev.filter(num => num !== order.orderNumber));
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

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No orders are ready for billing.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search or filter.</div>;
        
        const partyNames = Object.keys(summarizedData).sort();

        const animationKey = `${dateFilter}-${searchTerm}`;

        return (
            <div style={styles.listContainer} key={animationKey} className="fade-in-slide">
                {partyNames.map(partyName => (
                     <PartyGroup
                        key={partyName}
                        partyName={partyName}
                        data={summarizedData[partyName]}
                        billedQtys={billedQtys}
                        processingOrders={processingOrders}
                        onQtyChange={handleQtyChange}
                        onMarkBilled={handleMarkBilled}
                        onMatchAll={handleMatchAll}
                        onPartyExpand={handlePartyExpand}
                        isMobile={isMobile}
                    />
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
             <style>{`.fade-in-slide { animation: fadeInSlide 0.4s ease-out forwards; } @keyframes fadeInSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div style={styles.headerCard}>
                <h2 style={styles.pageTitle}>Ready for Billing</h2>
                <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} className="global-search-input" placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} />
                </div>
                 <div style={styles.filterContainer} ref={filterPillsRef}>
                     <div style={{...styles.filterMarker, ...markerStyle}}></div>
                    {dateFilters.map(filter => (
                        <button 
                          key={filter.key}
                          ref={el => { pillRefs.current[filter.key] = el; }} 
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
    container: { display: 'flex', flexDirection: 'column', gap: '0', flex: 1, backgroundColor: 'var(--light-grey)' },
    headerCard: {
        background: 'linear-gradient(to bottom, var(--light-grey) 85%, transparent)',
        padding: '1rem 1.5rem 1.5rem',
        borderRadius: 0,
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 10,
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
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', position: 'relative', backgroundColor: 'var(--gray-5)', borderRadius: '18px', padding: '4px' },
    filterMarker: { position: 'absolute', top: '4px', left: 0, height: 'calc(100% - 8px)', backgroundColor: 'var(--card-bg)', borderRadius: '14px', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', zIndex: 0, boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 3px, rgba(0, 0, 0, 0.05) 0px 1px 2px', opacity: 0 },
    filterButton: { background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', position: 'relative', zIndex: 1, transition: 'color 0.3s ease' },
    filterButtonActive: { background: 'transparent', border: 'none', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, position: 'relative', zIndex: 1, transition: 'color 0.3s ease' },
    listContainer: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '0 1rem 1rem',
    },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: {
        backgroundColor: 'var(--billing-party-card-bg, var(--card-bg))',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        overflow: 'hidden',
        marginLeft: '10px',
        marginRight: '10px',
    },
    cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 400 },
    cardDetails: { padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
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
    orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--light-grey)' },
    orderItemActive: { backgroundColor: 'var(--active-bg)', margin: '0 -1.5rem', padding: '0.75rem 1.5rem' },
    orderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)' },
    orderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eef2f7', border: '1px solid var(--skeleton-bg)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    orderWrapper: { border: '1px solid var(--separator-color)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--billing-card)', overflow: 'hidden' },
    expandedSummary: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem',
        backgroundColor: 'var(--light-grey)',
        padding: '1rem',
        fontSize: '0.9rem',
        color: 'var(--text-color)',
    },
    expandedNote: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderLeft: '3px solid var(--orange)',
        padding: '1rem',
        margin: '1rem',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: 'var(--dark-grey)',
    },
    mobileTableWrapper: { overflow: 'hidden', borderRadius: '8px', margin: '1rem', border: '1px solid var(--separator-color)' },
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: 'var(--light-grey)', padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-color)', borderBottom: '1px solid var(--separator-color)', whiteSpace: 'nowrap', fontSize: '0.8rem' },
    tr: { borderBottom: '1px solid var(--separator-color)' },
    td: { padding: '8px 10px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    tdInput: { padding: '4px' },
    billingQtyInput: { width: '60px', height: '32px', textAlign: 'center', border: '1px solid var(--separator-color)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--dark-grey)', backgroundColor: 'var(--card-bg)', appearance: 'textfield', MozAppearance: 'textfield' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    footerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: '#27ae60', border: 'none', borderRadius: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px', height: '40px', transition: 'background-color 0.2s ease', boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)' },
    modalActionButtonDisabled: { backgroundColor: 'var(--gray-3)', boxShadow: 'none', cursor: 'not-allowed' },
    matchAllButton: {
        padding: '0px',
        border: '1px solid var(--skeleton-bg)',
        color: 'var(--dark-grey)',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: 'rgba(0, 0, 0, 0.09) 0px 3px 13px',
        display: 'flex',
        alignItems: 'center',
        fontWeight: 500,
        height: '41px',
        backgroundColor: 'var(--card-bg)',
        justifyContent: 'center',
        width: '41px',
    },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)', padding: '0.7rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    iconButton: {
        padding: '0px',
        border: '1px solid var(--skeleton-bg)',
        color: 'var(--dark-grey)',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: 'rgba(0, 0, 0, 0.09) 0px 3px 13px',
        display: 'flex',
        alignItems: 'center',
        fontWeight: 500,
        height: '41px',
        backgroundColor: 'var(--card-bg)',
        justifyContent: 'center',
        width: '41px',
    },
    // Swipeable styles
    swipeableContainer: { position: 'relative', overflow: 'hidden' },
    swipeableActions: { position: 'absolute', top: 0, right: 0, height: '100%', display: 'flex', alignItems: 'center' },
    swipeableActionButton: { height: '100%', width: '80px', background: 'var(--brand-color)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 },
    swipeableContent: { position: 'relative', backgroundColor: 'var(--card-bg)', zIndex: 1 },
    mobileFooterContainer: {
        padding: '0.5rem 1rem 1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
    },
};
