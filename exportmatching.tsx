

import React, { useState, useEffect, useMemo } from 'react';

// Icons
const Spinner = () => <div style={styles.spinner}></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--green)'}}><polyline points="20 6 9 17 4 12"></polyline></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--red)'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const normalizeKeyPart = (part: any): string => {
    if (!part) return '';
    return String(part).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
};

const StockIndicator: React.FC<{ stockLevel: number }> = ({ stockLevel }) => {
    const isUnavailable = typeof stockLevel !== 'number' || stockLevel < 0;
    let color = null;
    let title = `Stock: ${stockLevel}`;
    if (isUnavailable || stockLevel === 0) {
        color = 'var(--red)';
        if (isUnavailable) title = 'Stock: Unavailable';
    } else if (stockLevel >= 1 && stockLevel <= 3) {
        color = 'var(--yellow)';
    } else if (stockLevel >= 4) {
        color = 'var(--green)';
    }
    if (!color) return <div style={styles.stockIndicatorPlaceholder}></div>;
    return <span style={{ ...styles.stockIndicator, backgroundColor: color }} title={title} />;
};

const ProcessQuantityControl: React.FC<{
    value: string | number;
    onUpdate: (value: string) => void;
}> = ({ value, onUpdate }) => {
    const currentValue = Number(value) || 0;

    const handleStep = (step: number) => {
        const newValue = Math.max(0, currentValue + step);
        onUpdate(String(newValue));
    };
    
    return (
        <div style={styles.processQtyContainer}>
            <button onClick={() => handleStep(-1)} style={{ ...styles.processQtyButton, borderRadius: '6px 0 0 6px' }} aria-label="Decrease quantity">-</button>
            <input 
                type="number" 
                value={value} 
                onChange={(e) => onUpdate(e.target.value)} 
                style={styles.processQtyInput} 
                min="0"
                placeholder="0"
            />
            <button onClick={() => handleStep(1)} style={{ ...styles.processQtyButton, borderRadius: '0 6px 6px 0' }} aria-label="Increase quantity">+</button>
        </div>
    );
};


const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwC2oLSeZO6eou1zA1svKgt2mrkKrzSACnvec2iznYVVre_bw7aEAqxuIGFJQCN7W3o/exec';

type Order = {
    orderNumber: string;
    partyName: string;
    timestamp: string;
    items: any[];
};

type BatchStatus = 'pending' | 'editing' | 'exporting' | 'success' | 'error';

interface ExportItem {
    id: string; // barcode
    data: any; // fullItemData
    exportQuantity: number;
    originalTotalQuantity: number;
    fromOrders: { orderNumber: string, partyName: string }[];
}


interface ExportMatchingProps {
    isOpen: boolean;
    onClose: () => void;
    ordersToExport: Order[];
    onExportSuccess: (orderNumbers: string[]) => void;
    stockData: Record<string, number>;
    isMobile: boolean;
}

export const ExportMatching: React.FC<ExportMatchingProps> = ({ isOpen, onClose, ordersToExport, onExportSuccess, stockData, isMobile }) => {
    const [status, setStatus] = useState<BatchStatus>('pending');
    const [message, setMessage] = useState('');
    const [exportItems, setExportItems] = useState<ExportItem[]>([]);

    useEffect(() => {
        if (isOpen && ordersToExport.length > 0 && status === 'pending') {
            setStatus('editing');
            setMessage('Adjust quantities for export. Items with the same barcode are grouped.');

            const consolidated = new Map<string, ExportItem>();
            ordersToExport.forEach(order => {
                order.items.forEach(item => {
                    const barcode = item.fullItemData.Barcode;
                    if (consolidated.has(barcode)) {
                        const existing = consolidated.get(barcode)!;
                        existing.exportQuantity += item.quantity;
                        existing.originalTotalQuantity += item.quantity;
                        if (!existing.fromOrders.some(o => o.orderNumber === order.orderNumber)) {
                            existing.fromOrders.push({ orderNumber: order.orderNumber, partyName: order.partyName });
                        }
                    } else {
                        consolidated.set(barcode, {
                            id: barcode,
                            data: item.fullItemData,
                            exportQuantity: item.quantity,
                            originalTotalQuantity: item.quantity,
                            fromOrders: [{ orderNumber: order.orderNumber, partyName: order.partyName }],
                        });
                    }
                });
            });

            setExportItems(Array.from(consolidated.values()).sort((a, b) => a.data.Style.localeCompare(b.data.Style)));
        
        } else if (!isOpen) {
            // Reset state when the modal is closed
            setStatus('pending');
            setMessage('');
            setExportItems([]);
        }
    }, [isOpen, ordersToExport, status]);
    
    const handleClose = () => {
        if(status === 'exporting') {
            if (window.confirm("Export is in progress. Are you sure you want to close? This won't stop the background process.")) {
                onClose();
            }
        } else {
            onClose();
        }
    };
    
    const handleQtyChange = (itemId: string, newValue: string) => {
        setExportItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQty = Math.max(0, Number(newValue) || 0);
                return { ...item, exportQuantity: newQty };
            }
            return item;
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setExportItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleConfirmExport = async () => {
        setStatus('exporting');
        setMessage('Consolidating final items and sending to sheet...');

        try {
            const itemsToExport = exportItems.filter(item => item.exportQuantity > 0);
            if (itemsToExport.length === 0) {
                setStatus('error');
                setMessage('No items to export. Add a quantity to at least one item.');
                return;
            }

            const orderNumbers = [...new Set(ordersToExport.map(o => o.orderNumber))].join(', ');
            const partyNames = [...new Set(ordersToExport.map(o => o.partyName))].join(', ');
            const firstOrderTimestamp = ordersToExport[0]?.timestamp || new Date().toISOString();

            const payload = {
                orderNumber: orderNumbers,
                partyName: partyNames,
                orderDate: firstOrderTimestamp,
                items: itemsToExport.map(item => ({
                    barcode: item.id,
                    quantity: item.exportQuantity
                }))
            };

            const jsonString = JSON.stringify(payload);
            const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            const body = `jsonData=${encodeURIComponent(base64Data)}`;

            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body,
            });

            setStatus('success');
            setMessage(`Successfully exported ${itemsToExport.length} unique items.`);
            onExportSuccess(ordersToExport.map(o => o.orderNumber));

        } catch (error) {
            console.error('Failed to export batch:', error);
            setStatus('error');
            setMessage(error.message || 'An unknown error occurred during export.');
        }
    };

    if (!isOpen) return null;

    if (status === 'editing') {
         const modalContentStyle = isMobile 
            ? {...styles.modalContent, maxWidth: '100%', height: '100%', borderRadius: 0}
            : {...styles.modalContent, maxWidth: '700px'};

        const modalBodyStyle = isMobile 
            ? {...styles.modalBody, padding: '0.5rem' }
            : styles.modalBody;
            
        return (
            <div style={styles.modalOverlay} onClick={handleClose}>
                <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.modalHeader}>
                        <h2 style={styles.modalTitle}>Review and Adjust Export</h2>
                        <button style={styles.modalCloseButton} onClick={handleClose}>&times;</button>
                    </div>
                    <div style={modalBodyStyle}>
                        <p style={styles.statusSubMessage}>{message}</p>
                        {isMobile ? (
                             <div style={styles.mobileListContainer}>
                                {exportItems.map(item => {
                                    const stockKey = `${normalizeKeyPart(item.data.Style)}-${normalizeKeyPart(item.data.Color)}-${normalizeKeyPart(item.data.Size)}`;
                                    const stockLevel = stockData[stockKey];
                                    return (
                                        <div key={item.id} style={styles.mobileItemCard}>
                                            <div style={styles.mobileItemInfo}>
                                                <div style={styles.mobileItemName}>{item.data.Style} - {item.data.Color} - <strong>{item.data.Size}</strong></div>
                                                <div style={styles.mobileMetaGrid}>
                                                    <div style={styles.mobileMetaItem}>
                                                        <span>Stock</span>
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                            <StockIndicator stockLevel={stockLevel} />
                                                            <strong>{stockLevel ?? 'N/A'}</strong>
                                                        </div>
                                                    </div>
                                                    <div style={styles.mobileMetaItem}>
                                                        <span>Ordered</span>
                                                        <strong>{item.originalTotalQuantity}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={styles.mobileItemActions}>
                                                <ProcessQuantityControl
                                                    value={item.exportQuantity}
                                                    onUpdate={(newValue) => handleQtyChange(item.id, newValue)}
                                                />
                                                <button style={styles.deleteButton} onClick={() => handleRemoveItem(item.id)}><TrashIcon /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Item</th>
                                            <th style={styles.th}>Stock</th>
                                            <th style={styles.th}>Original Qty</th>
                                            <th style={styles.th}>Export Qty</th>
                                            <th style={styles.th}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exportItems.map(item => {
                                            const stockKey = `${normalizeKeyPart(item.data.Style)}-${normalizeKeyPart(item.data.Color)}-${normalizeKeyPart(item.data.Size)}`;
                                            const stockLevel = stockData[stockKey];
                                            return (
                                                <tr key={item.id}>
                                                    <td style={styles.td}>
                                                        <div>{item.data.Style} - {item.data.Color}</div>
                                                        <div style={{fontSize: '0.8rem', color: 'var(--text-color)'}}>{item.data.Size}</div>
                                                    </td>
                                                    <td style={{...styles.td, textAlign: 'center'}}>
                                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                                                            <StockIndicator stockLevel={stockLevel} />
                                                            <span>{stockLevel ?? 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{...styles.td, textAlign: 'center'}}>{item.originalTotalQuantity}</td>
                                                    <td style={styles.td}>
                                                        <ProcessQuantityControl 
                                                            value={item.exportQuantity}
                                                            onUpdate={(newValue) => handleQtyChange(item.id, newValue)}
                                                        />
                                                    </td>
                                                    <td style={{...styles.td, textAlign: 'center'}}>
                                                        <button style={styles.deleteButton} onClick={() => handleRemoveItem(item.id)}><TrashIcon /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <div style={styles.modalFooter}>
                        <button onClick={handleConfirmExport} style={styles.closeButton}>
                            Confirm & Export
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    let title = "Preparing Export...";
    if (status === 'exporting') {
        title = `Exporting Batch...`;
    } else if (status === 'success' || status === 'error') {
        title = `Export Complete`;
    }

    return (
        <div style={styles.modalOverlay} onClick={handleClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{title}</h2>
                    <button style={styles.modalCloseButton} onClick={handleClose}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                     <div style={styles.batchStatusContainer}>
                        <div style={styles.statusIcon}>
                            {(status === 'pending' || status === 'exporting') && <Spinner />}
                            {status === 'success' && <CheckIcon />}
                            {status === 'error' && <ErrorIcon />}
                        </div>
                        <div style={styles.statusInfo}>
                            <div style={styles.statusMainMessage}>
                                {status === 'pending' && 'Preparing...'}
                                {status === 'exporting' && 'Exporting...'}
                                {status === 'success' && 'Success!'}
                                {status === 'error' && 'Error Occurred'}
                            </div>
                            {message && <div style={styles.statusSubMessage}>{message}</div>}
                        </div>
                    </div>
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryTitle}>Export Summary</div>
                        <div style={styles.summaryItem}><strong>Orders:</strong> {ordersToExport.length}</div>
                        <div style={styles.summaryItem}><strong>Parties:</strong> {[...new Set(ordersToExport.map(o => o.partyName))].length}</div>
                        <div style={styles.summaryItem}><strong>Total Unique Items:</strong> {ordersToExport.reduce((acc, order) => { order.items.forEach(item => acc.add(item.fullItemData.Barcode)); return acc; }, new Set()).size}</div>
                    </div>
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={styles.closeButton}>
                        {status === 'exporting' ? 'Close' : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' },
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
    modalHeader: { padding: '1rem 1.5rem', borderBottom: '1px solid var(--separator-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalCloseButton: { background: 'none', border: 'none', fontSize: '2rem', color: 'var(--text-color)', cursor: 'pointer' },
    modalBody: { padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 },
    modalFooter: { borderTop: '1px solid var(--separator-color)', padding: '1.5rem', flexShrink: 0 },
    closeButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' },
    spinner: { border: '3px solid var(--light-grey)', borderRadius: '50%', borderTop: '3px solid var(--brand-color)', width: '24px', height: '24px', animation: 'spin 1s linear infinite' },
    batchStatusContainer: { display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--light-grey)', borderRadius: '8px' },
    statusIcon: { width: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    statusInfo: { flex: 1 },
    statusMainMessage: { fontWeight: 600, fontSize: '1.1rem', color: 'var(--dark-grey)' },
    statusSubMessage: { fontSize: '0.9rem', color: 'var(--text-color)', marginTop: '0.25rem' },
    summaryBox: { border: '1px solid var(--separator-color)', borderRadius: '8px', marginTop: '1.5rem', padding: '1rem' },
    summaryTitle: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--separator-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' },
    summaryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--dark-grey)', padding: '0.25rem 0' },
    tableContainer: { overflowY: 'auto', maxHeight: 'calc(80vh - 250px)' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
    th: { backgroundColor: 'var(--light-grey)', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '1px solid var(--separator-color)', whiteSpace: 'nowrap' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', borderBottom: '1px solid var(--separator-color)' },
    deleteButton: { background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' },
    processQtyContainer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', },
    processQtyButton: { backgroundColor: 'var(--light-grey)', border: '1px solid var(--separator-color)', color: 'var(--dark-grey)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', lineHeight: 1, width: '32px', height: '32px', fontSize: '1.2rem' },
    processQtyInput: { textAlign: 'center', border: '1px solid var(--separator-color)', borderLeft: 'none', borderRight: 'none', fontSize: '0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', appearance: 'textfield', MozAppearance: 'textfield', WebkitAppearance: 'none', margin: 0, width: '50px', height: '32px' },
    stockIndicator: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    stockIndicatorPlaceholder: { width: '8px', height: '8px' },
    mobileListContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    mobileItemCard: {
        backgroundColor: 'var(--light-grey)',
        borderRadius: '8px',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    mobileItemInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    mobileItemName: {
        fontWeight: 600,
        color: 'var(--dark-grey)',
        fontSize: '0.9rem',
    },
    mobileMetaGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
    },
    mobileMetaItem: {
        fontSize: '0.8rem',
        color: 'var(--text-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    mobileItemActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--separator-color)',
        paddingTop: '0.75rem'
    }

};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);