import React, { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

declare const XLSX: any;

// --- ICONS ---
const UploadCloudIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-color)' }}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const Spinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid #fff', borderRight: '3px solid transparent'}}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '24px', height: '24px'}}></div>;


const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

export const StockUpdation = () => {
    const [file, setFile] = useState<File | null>(null);
    const [headerRow, setHeaderRow] = useState(1);
    const [dataStartRow, setDataStartRow] = useState(2);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fullData, setFullData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [totalCols, setTotalCols] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const parseXLSX = useCallback(() => {
        if (!file) return;
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    range: dataStartRow - 1 // 0-indexed
                });

                const headerValues = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    range: `A${headerRow}:${XLSX.utils.encode_col(worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).e.c : 0)}${headerRow}`
                })[0];
                
                if (!headerValues || headerValues.length === 0) {
                    showToast('Could not find headers at the specified row.', 'error');
                    setIsLoading(false);
                    return;
                }
                
                const formattedData = jsonData.map(row => {
                    const obj = {};
                    headerValues.forEach((header, index) => {
                        obj[header] = row[index] !== undefined ? row[index] : '';
                    });
                    return obj;
                });

                setHeaders(headerValues);
                setFullData(formattedData);
                setPreviewData(formattedData.slice(0, 15));
                setTotalRows(formattedData.length);
                setTotalCols(headerValues.length);
            } catch (err) {
                showToast('Failed to parse the XLSX file.', 'error');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }, [file, headerRow, dataStartRow]);

    useEffect(() => {
        if (file) {
            parseXLSX();
        }
    }, [file, headerRow, dataStartRow, parseXLSX]);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            setFile(files[0]);
            setPreviewData([]);
            setFullData([]);
            setHeaders([]);
            setTotalCols(0);
            setTotalRows(0);
        }
    };
    
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files);
        }
    };

    const handleConfirmUpdate = async () => {
        setIsConfirmModalOpen(false);
        setIsUploading(true);
        try {
            // 1. Update items
            await firebase.database().ref('itemData/items').set(fullData);

            // 2. Update metadata to trigger sync on clients
            const metadataUpdate = {
                uploadDate: new Date().toISOString(),
                manualSync: 'Y'
            };
            await firebase.database().ref('itemData/metadata').update(metadataUpdate);

            showToast('Item catalog updated successfully!', 'success');
            showToast('Clients will sync on next startup.', 'info');

            // Reset state
            setFile(null);
            setPreviewData([]);
            setFullData([]);
        } catch (error) {
            console.error("Firebase update failed:", error);
            showToast('Failed to update item catalog.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.pageTitle}>Stock Updation</h2>
                <p style={styles.pageSubtitle}>Upload and update the master item catalog from an XLSX file.</p>
            </div>

            <div style={styles.mainGrid}>
                <div style={styles.controlsCard}>
                    <label 
                        htmlFor="file-upload" 
                        style={dragActive ? {...styles.uploadBox, ...styles.uploadBoxActive} : styles.uploadBox}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                        <input type="file" id="file-upload" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files)} />
                        <UploadCloudIcon />
                        <p><strong>Drag & drop your file here</strong></p>
                        <p style={{fontSize: '0.8rem', color: 'var(--text-color)'}}>or click to browse</p>
                    </label>

                    {file && (
                        <div style={styles.fileInfo}>
                            <FileIcon />
                            <div style={{flex: 1}}>
                                <div style={{fontWeight: 600}}>{file.name}</div>
                                <div style={{fontSize: '0.8rem', color: 'var(--text-color)'}}>{(file.size / 1024).toFixed(2)} KB</div>
                            </div>
                        </div>
                    )}
                    
                    <div style={styles.configSection}>
                         <div style={styles.inputGroup}>
                            <label style={styles.label}>Header Row</label>
                            <input type="number" style={styles.numberInput} value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))} min="1" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Data Starts at Row</label>
                            <input type="number" style={styles.numberInput} value={dataStartRow} onChange={(e) => setDataStartRow(Number(e.target.value))} min="1" />
                        </div>
                    </div>

                    <div style={styles.summarySection}>
                        <div style={styles.summaryItem}><span style={styles.summaryLabel}>Total Rows Found</span><span style={styles.summaryValue}>{totalRows}</span></div>
                        <div style={styles.summaryItem}><span style={styles.summaryLabel}>Total Columns Found</span><span style={styles.summaryValue}>{totalCols}</span></div>
                    </div>

                    <button 
                        style={(fullData.length === 0 || isUploading) ? {...styles.updateButton, ...styles.updateButtonDisabled} : styles.updateButton}
                        onClick={() => setIsConfirmModalOpen(true)}
                        disabled={fullData.length === 0 || isUploading}
                    >
                        {isUploading ? <Spinner/> : 'Process & Update Catalog'}
                    </button>
                </div>

                <div style={styles.previewCard}>
                    <h3 style={styles.previewTitle}>Data Preview (First 15 Rows)</h3>
                    {isLoading ? (
                        <div style={styles.centeredMessage}><SmallSpinner /></div>
                    ) : headers.length > 0 ? (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>{headers.map((h, i) => <th key={i} style={styles.th}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} style={i % 2 !== 0 ? {backgroundColor: 'var(--stripe-bg)'} : {}}>
                                            {headers.map((h, j) => <td key={j} style={styles.td}>{row[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={styles.centeredMessage}>
                            <p>No file selected or data is empty.</p>
                        </div>
                    )}
                </div>
            </div>

            {isConfirmModalOpen && (
                 <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={{...styles.modalTitle, textAlign: 'center'}}>Confirm Update</h3>
                        <p style={{textAlign: 'center', color: 'var(--text-color)', marginBottom: '1.5rem', fontSize: '0.95rem'}}>
                            Are you sure you want to update the master item list with <strong>{fullData.length} items</strong>? This will replace the existing catalog for all users. This action cannot be undone.
                        </p>
                        <div style={styles.iosModalActions}>
                            <button onClick={() => setIsConfirmModalOpen(false)} style={styles.iosModalButtonSecondary}>Cancel</button>
                            <button onClick={handleConfirmUpdate} style={{...styles.iosModalButtonPrimary, color: 'var(--brand-color)'}}>Confirm Update</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', height: '100%', overflow: 'hidden' },
    header: { padding: '0 1rem' },
    pageTitle: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)' },
    pageSubtitle: { fontSize: '1rem', color: 'var(--text-color)', marginTop: '0.25rem' },
    mainGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', flex: 1, minHeight: 0 },
    controlsCard: { display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    uploadBox: { border: '2px dashed var(--separator-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
    uploadBoxActive: { borderColor: 'var(--brand-color)', backgroundColor: 'var(--active-bg)' },
    fileInfo: { display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--light-grey)', padding: '0.75rem', borderRadius: '8px' },
    configSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-color)' },
    numberInput: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px' },
    summarySection: { borderTop: '1px solid var(--separator-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' },
    summaryLabel: { color: 'var(--text-color)' },
    summaryValue: { fontWeight: 600, color: 'var(--dark-grey)' },
    updateButton: { padding: '0.8rem', fontSize: '1rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
    updateButtonDisabled: { backgroundColor: 'var(--gray-3)', cursor: 'not-allowed' },
    previewCard: { display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: 0 },
    previewTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600 },
    tableContainer: { flex: 1, overflow: 'auto', border: '1px solid var(--separator-color)', borderRadius: '8px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { position: 'sticky', top: 0, backgroundColor: 'var(--light-grey)', padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' },
    td: { padding: '0.75rem', borderTop: '1px solid var(--separator-color)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)' },
    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);