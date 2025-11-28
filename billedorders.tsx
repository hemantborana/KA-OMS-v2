
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const OrderViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const PartyViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;


// --- TYPE & FIREBASE ---
interface Order { orderNumber: string; partyName: string; timestamp: string; billedTimestamp?: string; totalQuantity: number; totalValue: number; orderNote?: string; items: any[]; }
const BILLED_ORDERS_REF = 'Billed_Orders_V2';

// --- HELPERS ---
const colorPalette = [
    { bg: 'rgba(255, 56, 60, 0.1)', text: 'var(--red)' }, // red
    { bg: 'rgba(255, 149, 0, 0.1)', text: 'var(--orange)' }, // orange
    { bg: 'rgba(52, 199, 89, 0.1)', text: 'var(--green)' }, // green
    { bg: 'rgba(0, 195, 208, 0.1)', text: 'var(--teal)' }, // teal
    { bg: 'rgba(0, 122, 255, 0.1)', text: 'var(--blue)' }, // blue
    { bg: 'rgba(88, 86, 214, 0.1)', text: 'var(--indigo)' }, // indigo
    { bg: 'rgba(175, 82, 222, 0.1)', text: 'var(--purple)' }, // purple
];

const getColorForString = (str: string) => {
    if (!str) return colorPalette[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colorPalette.length);
    return colorPalette[index];
};
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

// --- COMPONENTS ---
const BilledOrderCard: React.FC<{ order: Order, showPartyName?: boolean, isExpanded: boolean, onToggle: () => void }> = ({ order, showPartyName = false, isExpanded, onToggle }) => {
    const avatarColorStyle = useMemo(() => getColorForString(order.partyName), [order.partyName]);
    const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

    const handleDownloadPdf = async (e) => {
        e.stopPropagation();
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
    
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Kambeshwar Agencies', 105, 20, { align: 'center' });
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('123 Business Road, Commerce City, 12345', 105, 27, { align: 'center' });
        doc.text('Email: contact@kambeshwar.com | Phone: +91 98765 43210', 105, 32, { align: 'center' });
    
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Billed Order Record", 105, 45, { align: 'center' });
    
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`Party Name: ${order.partyName}`, 14, 60);
        doc.text(`Order No: ${order.orderNumber}`, 14, 67);
        doc.text(`Billed Date: ${formatDate(order.billedTimestamp || order.timestamp)}`, 150, 67);
    
        const tableColumn = ["#", "Style", "Color", "Size", "Quantity"];
        const tableRows = [];
    
        order.items.forEach((item, index) => {
            const itemData = [
                index + 1,
                item.fullItemData.Style,
                item.fullItemData.Color,
                item.fullItemData.Size,
                item.quantity
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
    
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Quantity: ${order.totalQuantity}`, 14, finalY + 15);
    
        finalY = doc.internal.pageSize.height - 30;
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('For Kambeshwar Agencies', 165, finalY + 8, { align: 'center' });
    
        doc.save(`Billed_Order_${order.orderNumber}.pdf`);
    };

    return (
        <div style={styles.billedOrderContainer}>
            <button style={styles.billedOrderHeader} onClick={onToggle}>
                <div style={styles.billedOrderInfo}>
                     {showPartyName && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0}}>
                           <div style={{...styles.partyAvatar, ...avatarColorStyle, width: '32px', height: '32px', fontSize: '0.9rem'}}>{order.partyName.charAt(0).toUpperCase()}</div>
                           <span style={styles.standalonePartyName}>{order.partyName}</span>
                        </div>
                     )}
                    <strong style={{fontFamily: 'monospace'}}>{order.orderNumber}</strong>
                    <span style={styles.billedOrderMeta}><CalendarIcon /> {formatDate(order.billedTimestamp || order.timestamp)}</span>
                </div>
                <div style={styles.billedOrderStats}>
                    <span>Qty: {order.totalQuantity}</span>
                    <ChevronIcon collapsed={!isExpanded} />
                </div>
            </button>

            <div style={!isExpanded ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={styles.billedOrderDetails}>
                        <div style={styles.summaryGrid}>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Order Date</span>
                                <span style={styles.summaryValue}>{formatDate(order.timestamp)}</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Billed Date</span>
                                <span style={styles.summaryValue}>{formatDate(order.billedTimestamp || order.timestamp)}</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Total Qty</span>
                                <span style={styles.summaryValue}>{order.totalQuantity}</span>
                            </div>
                            <div style={styles.summaryItem}>
                                <span style={styles.summaryLabel}>Total Value</span>
                                <span style={styles.summaryValue}>{formatCurrency(order.totalValue)}</span>
                            </div>
                        </div>

                        {order.orderNote && <div style={styles.orderNoteBox}><strong>Note:</strong> {order.orderNote}</div>}
                        
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{...styles.th, fontSize: '0.9rem'}}>Style</th>
                                        <th style={{...styles.th, fontSize: '0.9rem'}}>Color</th>
                                        <th style={{...styles.th, fontSize: '0.9rem'}}>Size</th>
                                        <th style={{...styles.th, fontSize: '0.9rem'}}>Billed Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, index) => (
                                        <tr key={item.id} style={index % 2 !== 0 ? { ...styles.tr, backgroundColor: 'var(--stripe-bg, var(--stripe-light-bg))' } : styles.tr}>
                                            <td style={styles.td}>{item.fullItemData.Style}</td>
                                            <td style={styles.td}>{item.fullItemData.Color}</td>
                                            <td style={styles.td}>{item.fullItemData.Size}</td>
                                            <td style={styles.td}>{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={styles.billedOrderActions}>
                            <button onClick={handleDownloadPdf} style={{...styles.detailsButton, gap: '0.5rem'}}>
                                <DownloadIcon /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PartyGroup: React.FC<{ 
    partyName: string; 
    data: any;
    expandedOrders: Set<string>;
    onToggleOrderExpand: (orderNumber: string) => void;
}> = ({ partyName, data, expandedOrders, onToggleOrderExpand }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);

    const cardStyle: React.CSSProperties = {
        ...styles.card,
        boxShadow: isCollapsed ? 'rgba(0, 0, 0, 0.04) 0px 2px 4px' : 'rgba(0, 0, 0, 0.06) 0px 4px 8px',
        transition: 'box-shadow 0.3s ease',
    };

    const avatarColorStyle = useMemo(() => {
        const colors = getColorForString(partyName);
        return { backgroundColor: colors.bg, color: colors.text };
    }, [partyName]);

    return (
        <div style={cardStyle}>
            <button style={{...styles.cardHeader, alignItems: 'center'}} onClick={() => setIsCollapsed(!isCollapsed)}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, overflow: 'hidden'}}>
                    <div style={{...styles.partyAvatar, ...avatarColorStyle}}>
                        {partyName.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.cardInfo}>
                        <span style={styles.cardTitle}>{partyName}</span>
                        <span style={styles.cardSubTitle}>
                            {data.orderCount} Orders | Total Qty: {totalQty}
                        </span>
                    </div>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            <div style={isCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={styles.cardDetails}>
                        {data.orders.map(order => (
                            <BilledOrderCard 
                                key={order.orderNumber} 
                                order={order} 
                                showPartyName={false} 
                                isExpanded={expandedOrders.has(order.orderNumber)}
                                onToggle={() => onToggleOrderExpand(order.orderNumber)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BilledOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [view, setView] = useState('order'); // Default to order view
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState(new Set<string>());
    
    const filterPillsRef = useRef(null);
    const pillRefs = useRef({});
    const [markerStyle, setMarkerStyle] = useState({});

    useEffect(() => {
        const ordersRef = firebase.database().ref(BILLED_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(b.billedTimestamp || b.timestamp).getTime() - new Date(a.billedTimestamp || a.timestamp).getTime());
                setOrders(ordersArray);
            } else {
                setOrders([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch billed orders. Please check your connection.');
            setIsLoading(false);
        });
        return () => ordersRef.off('value', listener);
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

    const filteredOrders = useMemo(() => {
        let filtered = orders;

        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate;

            if (dateFilter === 'today') startDate = today;
            else if (dateFilter === '7days') startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (dateFilter === '30days') startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            if (startDate) {
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.billedTimestamp || order.timestamp);
                    return orderDate >= startDate;
                });
            }
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(order => 
                order.partyName.toLowerCase().includes(lowercasedTerm) ||
                order.orderNumber.toLowerCase().includes(lowercasedTerm)
            );
        }
        return filtered;
    }, [orders, searchTerm, dateFilter]);

    useEffect(() => {
        if (view === 'order' && filteredOrders.length > 0) {
            const recentOrderNumbers = filteredOrders.slice(0, 10).map(order => order.orderNumber);
            setExpandedOrders(new Set(recentOrderNumbers));
        } else {
            setExpandedOrders(new Set());
        }
    }, [view, filteredOrders]);

    const handleToggleOrderExpand = (orderNumber: string) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderNumber)) {
                newSet.delete(orderNumber);
            } else {
                newSet.add(orderNumber);
            }
            return newSet;
        });
    };

    const summarizedData = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) {
                acc[order.partyName] = { orderCount: 0, orders: [] };
            }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No billed orders found in the archive.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No billed orders match your search or filter.</div>;
        
        const animationKey = `${view}-${dateFilter}-${searchTerm}`;

        if (view === 'party') {
            const partyNames = Object.keys(summarizedData).sort();
            return (
                <div style={styles.listContainer} key={`party-${animationKey}`} className="fade-in-slide">
                    {partyNames.map(partyName => (
                        <PartyGroup 
                            key={partyName} 
                            partyName={partyName} 
                            data={summarizedData[partyName]}
                            expandedOrders={expandedOrders}
                            onToggleOrderExpand={handleToggleOrderExpand}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div style={{...styles.listContainer, gap: '0.75rem'}} key={`order-${animationKey}`} className="fade-in-slide">
                {filteredOrders.map(order => (
                    <div style={styles.card} key={order.orderNumber}>
                        <BilledOrderCard 
                            order={order} 
                            showPartyName={true} 
                            isExpanded={expandedOrders.has(order.orderNumber)}
                            onToggle={() => handleToggleOrderExpand(order.orderNumber)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
             <style>{`.fade-in-slide { animation: fadeInSlide 0.4s ease-out forwards; } @keyframes fadeInSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div style={styles.headerCard}>
                <div style={styles.headerTop}>
                    <h2 style={styles.pageTitle}>Billed Orders (Archive)</h2>
                     <div style={styles.viewToggle}>
                        <button onClick={() => setView('order')} style={view === 'order' ? styles.toggleButtonActive : styles.toggleButton}><OrderViewIcon/></button>
                        <button onClick={() => setView('party')} style={view === 'party' ? styles.toggleButtonActive : styles.toggleButton}><PartyViewIcon/></button>
                    </div>
                </div>
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
    headerTop: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    viewToggle: { 
        display: 'flex', 
        backgroundColor: 'var(--gray-5)', 
        borderRadius: '18px', 
        padding: '4px' 
    },
    toggleButton: { 
        background: 'none', 
        border: 'none', 
        padding: '6px 10px', 
        cursor: 'pointer', 
        color: 'var(--text-color)', 
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center'
    },
    toggleButtonActive: { 
        background: 'var(--card-bg)', 
        border: 'none', 
        padding: '6px 10px', 
        cursor: 'pointer', 
        color: 'var(--brand-color)', 
        borderRadius: '14px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center'
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
    filterContainer: { 
        display: 'flex', 
        gap: '0.5rem', 
        flexWrap: 'wrap', 
        height: '37px', 
        position: 'relative', 
        backgroundColor: 'var(--gray-5)', 
        borderRadius: '18px', 
        padding: '4px' 
    },
    filterMarker: { 
        position: 'absolute', 
        top: '4px', 
        left: 0, 
        height: 'calc(100% - 8px)', 
        backgroundColor: 'var(--card-bg)', 
        borderRadius: '14px', 
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', 
        zIndex: 0, 
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 3px, rgba(0, 0, 0, 0.05) 0px 1px 2px', 
        opacity: 0 
    },
    filterButton: { 
        background: 'transparent', 
        border: 'none', 
        color: 'var(--text-color)', 
        padding: '0.4rem 0.8rem', 
        borderRadius: '14px', 
        cursor: 'pointer', 
        fontSize: '0.85rem', 
        position: 'relative', 
        zIndex: 1, 
        transition: 'color 0.3s ease' 
    },
    filterButtonActive: { 
        background: 'transparent', 
        border: 'none', 
        color: 'var(--brand-color)', 
        padding: '0.4rem 0.8rem', 
        borderRadius: '14px', 
        cursor: 'pointer', 
        fontSize: '0.85rem', 
        fontWeight: 600, 
        position: 'relative', 
        zIndex: 1, 
        transition: 'color 0.3s ease' 
    },
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
    cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 400 },
    cardDetails: { padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    collapsibleContainer: {
        display: 'grid',
        gridTemplateRows: '0fr',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        transition: 'grid-template-rows 0.35s ease',
    },
    collapsibleContainerExpanded: {
        gridTemplateRows: '1fr',
    },
    collapsibleContentWrapper: {
        overflow: 'hidden',
    },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    partyAvatar: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1rem', flexShrink: 0 },
    
    // Billed Order Card
    billedOrderContainer: { padding: '0.5rem 0' },
    billedOrderHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0' },
    billedOrderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--dark-grey)', fontWeight: 500, flex: 1, minWidth: 0 },
    standalonePartyName: { fontWeight: 600, color: 'var(--dark-grey)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    billedOrderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.8rem', marginLeft: 'auto' },
    billedOrderStats: { display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-color)', fontSize: '0.9rem', paddingLeft: '1rem' },
    billedOrderDetails: { padding: '0.5rem 0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    orderNoteBox: { backgroundColor: 'var(--card-bg-tertiary)', borderLeft: '3px solid var(--orange)', padding: '1rem', borderRadius: '4px', fontSize: '0.9rem' },
    billedOrderActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' },

    // Summary Grid
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--card-bg-tertiary)',
        borderRadius: '8px',
        marginBottom: '0rem',
    },
    summaryItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    summaryLabel: {
        fontSize: '0.8rem',
        color: 'var(--text-color)',
        fontWeight: 500,
    },
    summaryValue: {
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--dark-grey)',
    },

    // Shared table styles
    tableContainer: { 
        overflow: 'hidden',
        borderRadius: '8px', 
        backgroundColor: 'var(--card-bg-secondary)', 
        border: '1px solid var(--separator-color)' 
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: 'var(--light-grey)', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-color)', borderBottom: '1px solid var(--separator-color)', whiteSpace: 'nowrap', fontSize: '0.85rem', position: 'sticky', top: 0, zIndex: 1 },
    tr: {},
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'left', borderBottom: '1px solid var(--separator-color)' },
};