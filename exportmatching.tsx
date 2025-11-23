
import React, { useState, useEffect } from 'react';

// Icons
const Spinner = () => <div style={styles.spinner}></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--green)'}}><polyline points="20 6 9 17 4 12"></polyline></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--red)'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwC2oLSeZO6eou1zA1svKgt2mrkKrzSACnvec2iznYVVre_bw7aEAqxuIGFJQCN7W3o/exec';

type Order = {
    orderNumber: string;
    partyName: string;
    timestamp: string;
    items: any[];
};

type ExportStatus = {
    orderNumber: string;
    partyName: string;
    status: 'pending' | 'exporting' | 'success' | 'error';
    message?: string;
};

interface ExportMatchingProps {
    isOpen: boolean;
    onClose: () => void;
    ordersToExport: Order[];
}

export const ExportMatching: React.FC<ExportMatchingProps> = ({ isOpen, onClose, ordersToExport }) => {
    const [statuses, setStatuses] = useState<ExportStatus[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (isOpen && ordersToExport.length > 0 && !isExporting && !isComplete) {
            const initialStatuses = ordersToExport.map(order => ({
                orderNumber: order.orderNumber,
                partyName: order.partyName,
                status: 'pending' as 'pending',
            }));
            setStatuses(initialStatuses);
            setIsExporting(true);
            
            const runExport = async () => {
                for (let i = 0; i < ordersToExport.length; i++) {
                    const order = ordersToExport[i];
                    
                    setStatuses(prev => {
                        const newStatuses = [...prev];
                        newStatuses[i].status = 'exporting';
                        return newStatuses;
                    });

                    try {
                        const payload = {
                            orderNumber: order.orderNumber,
                            partyName: order.partyName,
                            orderDate: order.timestamp,
                            items: order.items.map(item => ({
                                barcode: item.fullItemData.Barcode,
                                quantity: item.quantity,
                            }))
                        };
                        
                        const jsonString = JSON.stringify(payload);
                        const base64Data = btoa(unescape(encodeURIComponent(jsonString)));
                        
                        const body = `jsonData=${encodeURIComponent(base64Data)}`;

                        const response = await fetch(SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors', // Apps Script web apps often require this
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: body,
                        });
                        
                        // With no-cors, we can't inspect the response, so we assume success if no network error.
                        setStatuses(prev => {
                            const newStatuses = [...prev];
                            newStatuses[i].status = 'success';
                            newStatuses[i].message = 'Export request sent.';
                            return newStatuses;
                        });

                    } catch (error) {
                        console.error(`Failed to export order ${order.orderNumber}:`, error);
                        setStatuses(prev => {
                            const newStatuses = [...prev];
                            newStatuses[i].status = 'error';
                            newStatuses[i].message = error.message;
                            return newStatuses;
                        });
                    }
                }
                setIsExporting(false);
                setIsComplete(true);
            };

            runExport();
        } else if (!isOpen) {
            // Reset state when closed
            setIsExporting(false);
            setIsComplete(false);
            setStatuses([]);
        }
    }, [isOpen, ordersToExport, isExporting, isComplete]);
    
    const handleClose = () => {
        if(isExporting) {
            if (window.confirm("Export is in progress. Are you sure you want to close? This won't stop the process.")) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;
    
    const exportingIndex = statuses.findIndex(s => s.status === 'exporting');
    const totalCount = statuses.length;
    const completedCount = statuses.filter(s => s.status === 'success' || s.status === 'error').length;
    
    let title = "Preparing Export...";
    if (isExporting) {
        title = `Exporting ${completedCount + 1} of ${totalCount}...`;
    } else if (isComplete) {
        title = `Export Complete (${completedCount}/${totalCount})`;
    }


    return (
        <div style={styles.modalOverlay} onClick={handleClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h2 style={styles.modalTitle}>{title}</h2>
                    <button style={styles.modalCloseButton} onClick={handleClose}>&times;</button>
                </div>
                <div style={styles.modalBody}>
                    <ul style={styles.statusList}>
                        {statuses.map((item, index) => (
                            <li key={index} style={styles.statusItem}>
                                <div style={styles.statusIcon}>
                                    {item.status === 'pending' && <div style={styles.pendingIndicator}></div>}
                                    {item.status === 'exporting' && <Spinner />}
                                    {item.status === 'success' && <CheckIcon />}
                                    {item.status === 'error' && <ErrorIcon />}
                                </div>
                                <div style={styles.statusInfo}>
                                    <div style={styles.statusOrderInfo}>{item.orderNumber} - {item.partyName}</div>
                                    {item.message && <div style={{...styles.statusMessage, color: item.status === 'error' ? 'var(--red)' : 'var(--text-color)'}}>{item.message}</div>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={styles.closeButton}>
                        {isComplete ? 'Done' : 'Close'}
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
    modalBody: { padding: '0 1.5rem', overflowY: 'auto', flex: 1 },
    statusList: { listStyle: 'none', padding: '1rem 0', margin: 0 },
    statusItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--separator-color)' },
    statusIcon: { width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    pendingIndicator: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--gray-3)' },
    statusInfo: { flex: 1 },
    statusOrderInfo: { fontWeight: 500, color: 'var(--dark-grey)' },
    statusMessage: { fontSize: '0.85rem', marginTop: '0.25rem' },
    modalFooter: { borderTop: '1px solid var(--separator-color)', padding: '1.5rem', flexShrink: 0 },
    closeButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' },
    spinner: { border: '3px solid var(--light-grey)', borderRadius: '50%', borderTop: '3px solid var(--brand-color)', width: '18px', height: '18px', animation: 'spin 1s linear infinite' },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);