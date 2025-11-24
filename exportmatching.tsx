
import React, { useState, useEffect } from 'react';

// Icons
const Spinner = () => <div style={styles.spinner}></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--green)'}}><polyline points="20 6 9 17 4 12"></polyline></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--red)'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwC2oLSeZO6eou1zA1svKgt2mrkKrzSACnvec2iznYVVre_bw7aEAqxuIGFJQCN7W3o/exec';

type Order = {
    orderNumber: string;
    partyName: string;
    timestamp: string;
    items: any[];
};

type BatchStatus = 'pending' | 'exporting' | 'success' | 'error';

interface ExportMatchingProps {
    isOpen: boolean;
    onClose: () => void;
    ordersToExport: Order[];
}

export const ExportMatching: React.FC<ExportMatchingProps> = ({ isOpen, onClose, ordersToExport }) => {
    const [status, setStatus] = useState<BatchStatus>('pending');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isOpen && ordersToExport.length > 0 && status === 'pending') {
            const runBatchExport = async () => {
                setStatus('exporting');
                setMessage('Consolidating items from selected orders...');

                try {
                    // 1. Consolidate items by barcode, summing quantities
                    const consolidatedItems = new Map<string, { barcode: string; quantity: number }>();
                    ordersToExport.forEach(order => {
                        order.items.forEach(item => {
                            const barcode = item.fullItemData.Barcode;
                            if (consolidatedItems.has(barcode)) {
                                consolidatedItems.get(barcode)!.quantity += item.quantity;
                            } else {
                                consolidatedItems.set(barcode, {
                                    barcode: barcode,
                                    quantity: item.quantity,
                                });
                            }
                        });
                    });

                    // 2. Consolidate order/party details into comma-separated strings
                    const orderNumbers = [...new Set(ordersToExport.map(o => o.orderNumber))].join(', ');
                    const partyNames = [...new Set(ordersToExport.map(o => o.partyName))].join(', ');
                    const firstOrderTimestamp = ordersToExport[0]?.timestamp || new Date().toISOString();
                    
                    setMessage('Sending consolidated data for matching...');
                    
                    // 3. Create the single payload
                    const payload = {
                        orderNumber: orderNumbers,
                        partyName: partyNames,
                        orderDate: firstOrderTimestamp,
                        items: Array.from(consolidatedItems.values())
                    };
                    
                    // 4. Encode and send the request
                    const jsonString = JSON.stringify(payload);
                    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                    const body = `jsonData=${encodeURIComponent(base64Data)}`;

                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: body,
                    });
                    
                    // 5. Update status to success
                    setStatus('success');
                    setMessage(`Successfully exported ${ordersToExport.length} orders as one batch.`);

                } catch (error) {
                    console.error('Failed to export batch:', error);
                    setStatus('error');
                    setMessage(error.message || 'An unknown error occurred during export.');
                }
            };

            runBatchExport();
        } else if (!isOpen) {
            // Reset state when the modal is closed
            setStatus('pending');
            setMessage('');
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

    if (!isOpen) return null;

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
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);