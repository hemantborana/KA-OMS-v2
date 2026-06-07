// FIX: Added useMemo to the import statement to resolve 'Cannot find name 'useMemo'' error.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { getPersistedState, setPersistedState } from './persistence';

// Global declarations for libraries loaded from CDN
declare const PDFLib: any;
declare const pdfjsLib: any;

// --- ICONS ---
const UploadCloudIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-color)' }}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const TrashIcon = ({ size = 16, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const EditIcon = ({ size = 16, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const PlusIcon = ({ size = 16, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const XIcon = ({ size = 20, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


// --- FIREBASE CONFIG for party data ---
const pdfEditorFirebaseConfig = {
    apiKey: "AIzaSyD75VN0x6DLmKljSMKOqXgVYFIuU_X7g7c",
    authDomain: "ka-oms-new.firebaseapp.com",
    databaseURL: "https://ka-oms-new-default-rtdb.firebaseio.com",
    projectId: "ka-oms-new",
    storageBucket: "ka-oms-new.appspot.com",
    messagingSenderId: "528745660731",
    appId: "1:528745660731:web:277e4e0ae6382d2378771e",
    measurementId: "G-B7EEVXQ2TG"
};

let pdfEditorApp;
if (!firebase.apps.some(app => app.name === 'pdfEditorApp')) {
  pdfEditorApp = firebase.initializeApp(pdfEditorFirebaseConfig, 'pdfEditorApp');
} else {
  pdfEditorApp = firebase.app('pdfEditorApp');
}
const pdfEditorDatabase = pdfEditorApp.database();

const CNDeductor = ({ isMobile }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [pagesText, setPagesText] = useState<{ pageNum: number; text: string }[]>([]);
    const [statusMessage, setStatusMessage] = useState('Upload a Credit Note PDF to extract and view text.');
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedPage, setCopiedPage] = useState<number | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const uploadedFile = files[0];
            setFile(uploadedFile);
            await extractText(uploadedFile);
        }
    };

    const extractText = async (pdfFile: File) => {
        setIsExtracting(true);
        setPagesText([]);
        setStatusMessage('Reading PDF file...');
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const fileBytes = new Uint8Array(arrayBuffer);
            
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
            }

            setStatusMessage('Loading PDF document...');
            const loadingTask = pdfjsLib.getDocument({ data: fileBytes });
            const pdf = await loadingTask.promise;
            const totalPages = pdf.numPages;

            const extractedPages: { pageNum: number; text: string }[] = [];

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                setStatusMessage(`Extracting text from page ${pageNum} of ${totalPages}...`);
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                const textItems = textContent.items.map((item: any) => item.str);
                const pageFullText = textItems.join(' ');
                extractedPages.push({ pageNum, text: pageFullText });
            }

            setPagesText(extractedPages);
            setStatusMessage(`Successfully extracted text from ${totalPages} page(s).`);
        } catch (error: any) {
            console.error('Failed to extract text from PDF:', error);
            setStatusMessage(`Error: ${error.message || 'Failed to extract text'}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleCopyText = (text: string, pageNum: number) => {
        navigator.clipboard.writeText(text);
        setCopiedPage(pageNum);
        setTimeout(() => setCopiedPage(null), 2000);
    };

    const handleCopyAll = () => {
        const fullText = pagesText.map(p => `--- Page ${p.pageNum} ---\n${p.text}`).join('\n\n');
        navigator.clipboard.writeText(fullText);
        alert('All extracted text copied to clipboard!');
    };

    const filteredPages = useMemo(() => {
        if (!searchTerm) return pagesText;
        return pagesText.map(page => {
            const lowerSearch = searchTerm.toLowerCase();
            const containsTerm = page.text.toLowerCase().includes(lowerSearch);
            return containsTerm ? page : null;
        }).filter((p): p is { pageNum: number; text: string } => p !== null);
    }, [pagesText, searchTerm]);

    const highlightText = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => 
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} style={{ backgroundColor: 'rgba(241, 196, 15, 0.4)', color: 'var(--dark-grey)', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
                    ) : part
                )}
            </>
        );
    };

    const cnGridLayout = {
        ...styles.cnGridLayout,
        ...(isMobile && {
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
        })
    };

    return (
        <div style={styles.cnDeductorContainer}>
            <div style={styles.cnHeaderCard}>
                <h2 style={styles.cnTitle}>CN Deductor — Text Extractor</h2>
                <p style={styles.cnSubtitle}>Upload your Credit Note or Deductions PDF to parse all text data and prepare for deduction checks.</p>
            </div>

            <div style={cnGridLayout}>
                {/* Left Control Panel */}
                <div style={styles.cnLeftPanel}>
                    <div style={styles.inputCard}>
                        <label style={styles.label}>Upload PDF File</label>
                        <label htmlFor="cn-pdf-upload" style={{
                            ...styles.uploadButton,
                            borderColor: file ? 'var(--green)' : 'var(--separator-color)',
                            backgroundColor: 'var(--card-bg)'
                        }}>
                            <FileIcon />
                            <span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file ? file.name : 'Choose Credit Note PDF'}
                            </span>
                        </label>
                        <input id="cn-pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} disabled={isExtracting} />
                        
                        <p style={{ ...styles.statusMessage, color: pagesText.length > 0 ? 'var(--green)' : 'var(--text-color)' }}>
                            {statusMessage}
                        </p>

                        {isExtracting && (
                            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                                <div style={styles.spinner}></div>
                            </div>
                        )}
                    </div>

                    {pagesText.length > 0 && (
                        <div style={styles.statsCard}>
                            <h4 style={{ ...styles.detailsHeader, borderBottom: '1px solid var(--separator-color)', paddingBottom: '0.5rem' }}>Document Stats</h4>
                            <div style={styles.statRow}>
                                <span style={styles.statLabel}>Total Pages:</span>
                                <span style={styles.statValue}>{pagesText.length}</span>
                            </div>
                            <div style={styles.statRow}>
                                <span style={styles.statLabel}>Total Characters:</span>
                                <span style={styles.statValue}>{pagesText.reduce((acc, p) => acc + p.text.length, 0).toLocaleString()}</span>
                            </div>
                            <div style={styles.statRow}>
                                <span style={styles.statLabel}>Estimated Words:</span>
                                <span style={styles.statValue}>{pagesText.reduce((acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length, 0).toLocaleString()}</span>
                            </div>

                            <button onClick={handleCopyAll} style={{ ...styles.actionButton, marginTop: '1.5rem', width: '100%', gap: '8px' }}>
                                Copy All Text
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Text Viewer Panel */}
                <div style={styles.cnRightPanel}>
                    {pagesText.length > 0 ? (
                        <div style={styles.textViewerCard}>
                            <div style={styles.viewerHeader}>
                                <h3 style={{ ...styles.previewTitle, margin: 0 }}>Extracted Text Content</h3>
                                <div style={styles.searchBarContainer}>
                                    <SearchIcon />
                                    <input 
                                        type="text" 
                                        placeholder="Search in extracted text..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={styles.cnSearchInput}
                                    />
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', alignItems: 'center' }}>
                                            <XIcon size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {filteredPages.length === 0 ? (
                                <div style={styles.emptyView}>
                                    No matches found for "{searchTerm}" in the extracted text.
                                </div>
                            ) : (
                                <div style={styles.pagesContainer}>
                                    {filteredPages.map(page => (
                                        <div key={page.pageNum} style={styles.pageTextBlock}>
                                            <div style={styles.pageBlockHeader}>
                                                <span style={styles.pageNumberBadge}>Page {page.pageNum} of {pagesText.length}</span>
                                                <button 
                                                    onClick={() => handleCopyText(page.text, page.pageNum)} 
                                                    style={{
                                                        ...styles.copyPageButton,
                                                        backgroundColor: copiedPage === page.pageNum ? 'var(--green)' : 'rgba(0,0,0,0.05)',
                                                        color: copiedPage === page.pageNum ? '#fff' : 'var(--dark-grey)'
                                                    }}
                                                >
                                                    {copiedPage === page.pageNum ? 'Copied ✓' : 'Copy Page Text'}
                                                </button>
                                            </div>
                                            <div style={styles.extractedTextParagraph}>
                                                {highlightText(page.text, searchTerm)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={styles.emptyTextViewer}>
                            <UploadCloudIcon />
                            <h4 style={{ marginTop: '1rem', color: 'var(--dark-grey)', fontWeight: 600 }}>No PDF Extracted</h4>
                            <p style={{ color: 'var(--text-color)', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>
                                Upload a PDF on the left panel to begin text extraction processes automatically.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- INDEXEDDB CACHE FOR PDF WORK ---
const pdfCache = {
    db: null as IDBDatabase | null,
    init: function(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (this.db) { resolve(this.db); return; }
            const request = indexedDB.open('PDFEditorCache', 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('pdf_work')) {
                    db.createObjectStore('pdf_work');
                }
            };
            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                reject((event.target as IDBOpenDBRequest).error);
            };
        });
    },
    save: function(key: string, data: any): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.init();
                const transaction = db.transaction(['pdf_work'], 'readwrite');
                const store = transaction.objectStore('pdf_work');
                store.put(data, key);
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject((event.target as IDBRequest).error);
            } catch (e) { reject(e); }
        });
    },
    get: function(key: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.init();
                const transaction = db.transaction(['pdf_work'], 'readonly');
                const store = transaction.objectStore('pdf_work');
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject((event.target as IDBRequest).error);
            } catch (e) { reject(e); }
        });
    },
    clear: function(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.init();
                const transaction = db.transaction(['pdf_work'], 'readwrite');
                const store = transaction.objectStore('pdf_work');
                store.clear();
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject((event.target as IDBRequest).error);
            } catch (e) { reject(e); }
        });
    }
};

const PartyFormModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        partyName: '',
        address1: '',
        address2: '',
        city: '',
        state: 'GOA(30)',
        phone1: '',
        phone2: '',
        gst: '',
        hasDifferentShipTo: false,
        shipTo: {
            partyName: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            phone: '',
            gst: ''
        }
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...formData,
                ...initialData,
                shipTo: initialData.shipTo || formData.shipTo
            });
        } else {
            setFormData({
                partyName: '',
                address1: '',
                address2: '',
                city: '',
                state: 'GOA(30)',
                phone1: '',
                phone2: '',
                gst: '',
                hasDifferentShipTo: false,
                shipTo: {
                    partyName: '',
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    phone: '',
                    gst: ''
                }
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('shipTo.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                shipTo: { ...prev.shipTo, [field]: value }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.partyName) {
            alert("Party Name is required");
            return;
        }
        onSave(formData);
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>{initialData ? 'Edit Party' : 'Add New Party'}</h3>
                    <button onClick={onClose} style={styles.closeButton}><XIcon /></button>
                </div>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.formSection}>
                        <h4 style={styles.sectionTitle}>Bill To Details</h4>
                        <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Party Name *</label>
                                <input name="partyName" value={formData.partyName} onChange={handleChange} style={styles.formInput} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>GSTIN</label>
                                <input name="gst" value={formData.gst} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Address Line 1</label>
                                <input name="address1" value={formData.address1} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Address Line 2</label>
                                <input name="address2" value={formData.address2} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>City</label>
                                <input name="city" value={formData.city} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>State</label>
                                <input name="state" value={formData.state} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Phone 1</label>
                                <input name="phone1" value={formData.phone1} onChange={handleChange} style={styles.formInput} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Phone 2</label>
                                <input name="phone2" value={formData.phone2} onChange={handleChange} style={styles.formInput} />
                            </div>
                        </div>
                    </div>

                    <div style={styles.formSection}>
                        <label style={{...styles.formLabel, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                            <input type="checkbox" name="hasDifferentShipTo" checked={formData.hasDifferentShipTo} onChange={handleChange} />
                            Different Ship To Address
                        </label>
                    </div>

                    {formData.hasDifferentShipTo && (
                        <div style={styles.formSection}>
                            <h4 style={styles.sectionTitle}>Ship To Details</h4>
                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Ship To Name</label>
                                    <input name="shipTo.partyName" value={formData.shipTo.partyName} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Ship To GST</label>
                                    <input name="shipTo.gst" value={formData.shipTo.gst} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Address Line 1</label>
                                    <input name="shipTo.address1" value={formData.shipTo.address1} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Address Line 2</label>
                                    <input name="shipTo.address2" value={formData.shipTo.address2} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>City</label>
                                    <input name="shipTo.city" value={formData.shipTo.city} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>State</label>
                                    <input name="shipTo.state" value={formData.shipTo.state} onChange={handleChange} style={styles.formInput} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.formLabel}>Phone</label>
                                    <input name="shipTo.phone" value={formData.shipTo.phone} onChange={handleChange} style={styles.formInput} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={styles.modalFooter}>
                        <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
                        <button type="submit" style={styles.primaryButton}>Save Party</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManagePartiesModal = ({ isOpen, onClose, parties, onEdit, onDelete, onAdd }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    if (!isOpen) return null;

    const filtered = parties.filter(p => p.partyName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column'}} onClick={e => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Manage Parties</h3>
                    <button onClick={onClose} style={styles.closeButton}><XIcon /></button>
                </div>
                
                <div style={{padding: '1rem', borderBottom: '1px solid var(--separator-color)', display: 'flex', gap: '1rem'}}>
                    <div style={{...styles.dropdownSearchContainer, flex: 1, margin: 0}}>
                        <SearchIcon />
                        <input 
                            type="text" 
                            placeholder="Search parties..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            style={styles.dropdownSearchInput}
                        />
                    </div>
                    <button onClick={onAdd} style={{...styles.actionButton, padding: '0 1.5rem', borderRadius: '8px', height: '40px'}}>
                        <PlusIcon /> Add New
                    </button>
                </div>

                <div style={{flex: 1, overflowY: 'auto', padding: '1rem'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{textAlign: 'left', borderBottom: '2px solid var(--separator-color)'}}>
                                <th style={{padding: '0.75rem'}}>Party Name</th>
                                <th style={{padding: '0.75rem'}}>City</th>
                                <th style={{padding: '0.75rem'}}>GST</th>
                                <th style={{padding: '0.75rem', textAlign: 'right'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} style={{borderBottom: '1px solid var(--separator-color)'}}>
                                    <td style={{padding: '0.75rem'}}>{p.partyName}</td>
                                    <td style={{padding: '0.75rem'}}>{p.city}</td>
                                    <td style={{padding: '0.75rem'}}>{p.gst || 'N/A'}</td>
                                    <td style={{padding: '0.75rem', textAlign: 'right'}}>
                                        <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end'}}>
                                            <button onClick={() => onEdit(p)} style={styles.iconButton} title="Edit"><EditIcon color="var(--brand-color)" /></button>
                                            <button onClick={() => onDelete(p)} style={styles.iconButton} title="Delete"><TrashIcon color="var(--red)" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const PartyNameChanger = ({ isMobile }) => {
    // Component states
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [modifiedPdfBytes, setModifiedPdfBytes] = useState<Uint8Array | null>(null);
    const [modifiedPreviewBytes, setModifiedPreviewBytes] = useState<Uint8Array | null>(null);

    // Load large files from IndexedDB on mount
    useEffect(() => {
        const loadCachedWork = async () => {
            const lastSeen = localStorage.getItem('ka_oms_last_seen');
            if (lastSeen && Date.now() - parseInt(lastSeen) < 10 * 60 * 1000) {
                try {
                    const cachedFiles = await pdfCache.get('uploadedFiles');
                    if (cachedFiles) setUploadedFiles(cachedFiles);
                    
                    const cachedPdf = await pdfCache.get('modifiedPdfBytes');
                    if (cachedPdf) setModifiedPdfBytes(cachedPdf);

                    const cachedPreview = await pdfCache.get('modifiedPreviewBytes');
                    if (cachedPreview) setModifiedPreviewBytes(cachedPreview);
                } catch (e) {
                    console.error('Failed to load cached PDF work:', e);
                }
            } else {
                // Clear cache if more than 10 minutes
                pdfCache.clear();
            }
        };
        loadCachedWork();
    }, []);

    // Save large files to IndexedDB when they change
    useEffect(() => {
        if (uploadedFiles.length > 0) {
            pdfCache.save('uploadedFiles', uploadedFiles);
        } else {
            // We don't explicitly clear here because uploadedFiles might be empty during initial load
            // but we should clear if it's a manual reset. 
            // Actually, if it's empty, we can just leave it or delete it.
        }
    }, [uploadedFiles]);

    useEffect(() => {
        if (modifiedPdfBytes) {
            pdfCache.save('modifiedPdfBytes', modifiedPdfBytes);
        } else {
            // If modifiedPdfBytes is null, it means we reset or haven't generated yet.
            // We should probably remove it from cache to avoid restoring stale data.
            pdfCache.init().then(db => {
                const transaction = db.transaction(['pdf_work'], 'readwrite');
                transaction.objectStore('pdf_work').delete('modifiedPdfBytes');
            });
        }
    }, [modifiedPdfBytes]);

    useEffect(() => {
        if (modifiedPreviewBytes) {
            pdfCache.save('modifiedPreviewBytes', modifiedPreviewBytes);
        } else {
            pdfCache.init().then(db => {
                const transaction = db.transaction(['pdf_work'], 'readwrite');
                transaction.objectStore('pdf_work').delete('modifiedPreviewBytes');
            });
        }
    }, [modifiedPreviewBytes]);

    const [downloadFilename, setDownloadFilename] = useState<string>(() => getPersistedState('pdf_editor_filename', ''));
    
    const [parties, setParties] = useState<any[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState(() => getPersistedState('pdf_editor_party_id', ''));
    const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
    const [partySearchTerm, setPartySearchTerm] = useState('');

    const [status, setStatus] = useState<{ message: string; percent?: number }>(() => getPersistedState('pdf_editor_status', { message: 'Upload a PDF to begin.' }));
    const [isLoading, setIsLoading] = useState(false);
    
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingParty, setEditingParty] = useState<any>(null);

    const originalCanvasRef = useRef<HTMLCanvasElement>(null);
    const modifiedCanvasRef = useRef<HTMLCanvasElement>(null);
    const partyDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPersistedState('pdf_editor_party_id', selectedPartyId);
    }, [selectedPartyId]);

    useEffect(() => {
        setPersistedState('pdf_editor_status', status);
    }, [status]);

    useEffect(() => {
        setPersistedState('pdf_editor_filename', downloadFilename);
    }, [downloadFilename]);

    // --- Firebase Data Loading ---
    const loadAllParties = async () => {
        setIsLoading(true);
        setStatus({ message: 'Loading party data...' });
        try {
            const snapshot = await pdfEditorDatabase.ref('brands').once('value');
            const brandsData = snapshot.val() || {};

            const allParties: any[] = [];
            for (const brandKey in brandsData) {
                const brand = brandsData[brandKey];
                if (brand && typeof brand.parties === 'object' && brand.parties) {
                    for (const partyId in brand.parties) {
                        const party = brand.parties[partyId];
                        if (typeof party === 'object' && party && party.partyName) {
                            allParties.push({
                                id: partyId,
                                brandKey: brandKey,
                                ...party
                            });
                        }
                    }
                }
            }
            
            allParties.sort((a, b) => a.partyName.localeCompare(b.partyName));
            
            setParties(allParties);
            setStatus({ message: 'Select a party to proceed.' });
        } catch (error) {
            console.error('Error loading parties:', error);
            setStatus({ message: 'Error loading party data.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAllParties();
    }, []);
    
    // --- CRUD Handlers ---
    const handleAddParty = () => {
        setEditingParty(null);
        setIsFormModalOpen(true);
    };

    const handleEditParty = (party) => {
        setEditingParty(party);
        setIsFormModalOpen(true);
    };

    const handleDeleteParty = async (party) => {
        if (!window.confirm(`Are you sure you want to delete ${party.partyName}?`)) return;
        
        try {
            await pdfEditorDatabase.ref(`brands/${party.brandKey}/parties/${party.id}`).remove();
            alert("Party deleted successfully");
            loadAllParties();
        } catch (e) {
            console.error(e);
            alert("Failed to delete party");
        }
    };

    const handleSaveParty = async (formData) => {
        try {
            setIsLoading(true);
            if (editingParty) {
                // Update
                await pdfEditorDatabase.ref(`brands/${editingParty.brandKey}/parties/${editingParty.id}`).update(formData);
                alert("Party updated successfully");
            } else {
                // Add
                // We need a brandKey. We'll use 'DEFAULT_BRAND' or create one.
                let brandKey = 'DEFAULT_BRAND';
                const brandsSnap = await pdfEditorDatabase.ref('brands').once('value');
                if (brandsSnap.exists()) {
                    brandKey = Object.keys(brandsSnap.val())[0];
                } else {
                    await pdfEditorDatabase.ref('brands/DEFAULT_BRAND').set({ name: 'Default Brand' });
                }
                
                await pdfEditorDatabase.ref(`brands/${brandKey}/parties`).push(formData);
                alert("Party added successfully");
            }
            setIsFormModalOpen(false);
            loadAllParties();
        } catch (e) {
            console.error(e);
            alert("Failed to save party");
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Close dropdown on outside click ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
                setIsPartyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- PDF Handling ---
    const renderPdfPreview = async (pdfBytes: Uint8Array, canvasEl: HTMLCanvasElement | null) => {
        if (!canvasEl || !pdfBytes) return;

        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const context = canvasEl.getContext('2d');
        canvasEl.height = viewport.height;
        canvasEl.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;
    };

    useEffect(() => {
        if (modifiedPreviewBytes && modifiedCanvasRef.current) {
            renderPdfPreview(modifiedPreviewBytes, modifiedCanvasRef.current);
        }
    }, [modifiedPreviewBytes]);


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setUploadedFiles(Array.from(files));
            setModifiedPdfBytes(null); 
            setModifiedPreviewBytes(null);

            // Clear modified canvas visually
            if (modifiedCanvasRef.current) {
                const context = modifiedCanvasRef.current.getContext('2d');
                if (context) {
                    context.clearRect(0, 0, modifiedCanvasRef.current.width, modifiedCanvasRef.current.height);
                }
            }

            const arrayBuffer = await files[0].arrayBuffer();
            await renderPdfPreview(new Uint8Array(arrayBuffer), originalCanvasRef.current);
            setStatus({ message: `${files.length} file(s) loaded. Select a party to modify.` });
        }
    };
    
    const generateModifiedPDF = async () => {
        if (!selectedPartyId || uploadedFiles.length === 0) {
            setStatus({message: "Please select a party and upload PDFs."});
            return;
        }

        const selectedParty = parties.find(p => p.id === selectedPartyId);
        if (!selectedParty) {
            setStatus({message: "Selected party not found."});
            return;
        }
        
        setIsLoading(true);

        // --- Filename Generation Logic ---
        if (uploadedFiles.length > 0) {
            try {
                const firstFileBytes = new Uint8Array(await uploadedFiles[0].arrayBuffer());
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
                }
                const loadingTask = pdfjsLib.getDocument({ data: firstFileBytes });
                const pdf = await loadingTask.promise;
                const page = await pdf.getPage(1);
                const textContent = await page.getTextContent();
                const fullText = textContent.items.map((item: any) => item.str).join(' ');

                const invoiceNoMatch = fullText.match(/Invoice No\s*:\s*(\S+)/i);
                const invoiceDateMatch = fullText.match(/Invoice Date\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i);
                
                const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1] : 'invoice';
                let datePart = new Date().toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit'}).replace(/\//g, '.');

                if (invoiceDateMatch && invoiceDateMatch[1]) {
                    const dateStr = invoiceDateMatch[1];
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        const monthMap: { [key: string]: string } = { 'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12' };
                        const day = parts[0];
                        const month = monthMap[parts[1].toUpperCase()];
                        if (day && month) {
                            datePart = `${day}.${month}`;
                        }
                    }
                }
                
                const partyNamePart = selectedParty.partyName.toUpperCase().replace(/\s+/g, '_');
                
                const filename = `${invoiceNo}_${datePart}_${partyNamePart}.pdf`;
                setDownloadFilename(filename);

            } catch (e) {
                console.error("Failed to parse PDF for filename:", e);
                const partyNamePart = selectedParty.partyName.toUpperCase().replace(/\s+/g, '_');
                setDownloadFilename(`Modified_Invoice_${partyNamePart}.pdf`);
            }
        }
        // --- End Filename Logic ---
        
        const processedPdfDocs = [];

        try {
            for (let i = 0; i < uploadedFiles.length; i++) {
                setStatus({ message: `Processing file ${i + 1} of ${uploadedFiles.length}...`, percent: ((i + 1) / uploadedFiles.length) * 100 });
                
                const file = uploadedFiles[i];
                const pdfBytes = new Uint8Array(await file.arrayBuffer());
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                const firstPage = pdfDoc.getPages()[0];
                const pageHeight = firstPage.getHeight();

                const leftWidth = 329.99 - 24.96 - 14.17;
                const originalRightWidth = leftWidth / 2;
                const expansionPoints = 91.04;
                const newRightWidth = originalRightWidth + expansionPoints;
                
                const areas = {
                    billToArea: { x: 24.96, y: pageHeight - 149.07, width: leftWidth, height: 149.07 - 81.27 },
                    shipToArea: { x: 329.99, y: pageHeight - 149.07, width: newRightWidth, height: 149.07 - 81.27 }
                };

                const billToData = { partyName: selectedParty.partyName, address: [selectedParty.address1, selectedParty.address2].filter(Boolean).join('\n'), city: selectedParty.city, state: selectedParty.state, phone: [selectedParty.phone1, selectedParty.phone2].filter(Boolean).join(', '), gst: selectedParty.gst || 'NA' };
                
                let shipToData;
                if (selectedParty.hasDifferentShipTo && selectedParty.shipTo) {
                    shipToData = {
                        partyName: selectedParty.shipTo.partyName || selectedParty.partyName,
                        address: [selectedParty.shipTo.address1, selectedParty.shipTo.address2].filter(Boolean).join('\n'),
                        city: selectedParty.shipTo.city,
                        state: selectedParty.shipTo.state,
                        phone: selectedParty.shipTo.phone,
                        gst: selectedParty.shipTo.gst
                    };
                } else if (selectedParty.partyName.toUpperCase() === 'POSHAK RETAIL') {
                    shipToData = { 
                        partyName: 'Poshak Panjim', 
                        address: '', 
                        city: 'Panjim', 
                        state: 'GOA(30)',
                        phone: '',
                        gst: ''
                    };
                } else {
                    shipToData = billToData;
                }

                const { rgb } = PDFLib;
                firstPage.drawRectangle({ ...areas.billToArea, color: rgb(1, 1, 1), borderWidth: 0 });
                firstPage.drawRectangle({ ...areas.shipToArea, color: rgb(1, 1, 1), borderWidth: 0 });

                await addContentToArea(firstPage, areas.billToArea, billToData, 'Bill To');
                await addContentToArea(firstPage, areas.shipToArea, shipToData, 'Ship To');

                processedPdfDocs.push(pdfDoc);
            }
            
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (const pdfDoc of processedPdfDocs) {
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }
            
            const mergedBytes = await mergedPdf.save();
            const firstModifiedPdfBytes = await processedPdfDocs[0].save();
            
            setModifiedPdfBytes(mergedBytes);
            setModifiedPreviewBytes(firstModifiedPdfBytes);
            
            setStatus({ message: `Successfully processed ${uploadedFiles.length} file(s)!`, percent: 100 });
        } catch (error) {
            console.error('PDF generation error:', error);
            setStatus({ message: `Error generating PDFs: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    const addContentToArea = async (page: any, area: any, data: any, label: string) => {
        const { StandardFonts, rgb } = PDFLib;
        const helveticaBold = await page.doc.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await page.doc.embedFont(StandardFonts.Helvetica);

        const FONT_SIZES = {
            header: 8.2,
            address: 7.8,
            cityState: 7.9,
            contact: 7.6,
            gstin: 7.6,
        };
        
        const leftPadding = 0; 
        const topPadding = -4;
        
        let currentY = area.y + area.height - topPadding;
        const availableWidth = area.width - leftPadding * 2;
        const lineSpacing = 1.2 ;

        // Combined Header (e.g., "Bill To: PARTY NAME")
        const headerText = `${label}: ${data.partyName.toUpperCase()}`;
        currentY -= FONT_SIZES.header;
        page.drawText(headerText, {
            x: area.x + leftPadding,
            y: currentY,
            size: FONT_SIZES.header,
            font: helveticaBold,
            color: rgb(0, 0, 0),
            maxWidth: availableWidth,
        });
        currentY -= lineSpacing + 0.8;  // Space after header

        // Address (Fixed 2 lines, uppercase)
        const addressLines = data.address ? data.address.split('\n') : [];
        const addressLine1 = (addressLines[0] || '').toUpperCase();
        const addressLine2 = (addressLines[1] || '').toUpperCase();

        // Draw first address line (always reserves space)
        currentY -= (FONT_SIZES.address + lineSpacing);
        if (addressLine1) {
            page.drawText(addressLine1, {
                x: area.x + leftPadding,
                y: currentY,
                size: FONT_SIZES.address,
                font: helvetica,
                color: rgb(0, 0, 0),
                maxWidth: availableWidth
            });
        }

        // Draw second address line (always reserves space)
        currentY -= (FONT_SIZES.address + lineSpacing);
        if (addressLine2) {
            page.drawText(addressLine2, {
                x: area.x + leftPadding,
                y: currentY,
                size: FONT_SIZES.address,
                font: helvetica,
                color: rgb(0, 0, 0),
                maxWidth: availableWidth
            });
        }
        
        currentY -= lineSpacing + 2.5; // Add spacing after the address block

        // City and State
        if (data.city) {
            currentY -= (FONT_SIZES.cityState + lineSpacing);

            // Build text: city + fixed constant
            const cityStateText = `${data.city.trim()}              State: GOA(30)`;

            page.drawText(cityStateText, {
                x: area.x + leftPadding,
                y: currentY,
                size: FONT_SIZES.cityState,
                font: helvetica,
                color: rgb(0, 0, 0),
                maxWidth: availableWidth
            });

            currentY -= lineSpacing + 2;
        }


        // Contact
        const phoneText = data.phone || 'N/A';
        currentY -= (FONT_SIZES.contact + lineSpacing);
        page.drawText(`Phone: ${phoneText}`, {
            x: area.x + leftPadding,
            y: currentY,
            size: FONT_SIZES.contact,
            font: helvetica,
            color: rgb(0, 0, 0),
            maxWidth: availableWidth
        });
        currentY -= lineSpacing + 3.5;

        // GSTIN
        const gstText = data.gst || 'NA';
        currentY -= (FONT_SIZES.gstin + lineSpacing);
        page.drawText(`GSTIN: ${gstText}`, {
            x: area.x + leftPadding,
            y: currentY,
            size: FONT_SIZES.gstin,
            font: helvetica,
            color: rgb(0, 0, 0),
            maxWidth: availableWidth
        });
    };

    const handleDownload = () => {
        if (!modifiedPdfBytes) return;
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = downloadFilename || `Modified_Invoices_${Date.now()}.pdf`;
        link.click();
    };

    const selectedPartyDetails = useMemo(() => {
        return parties.find(p => p.id === selectedPartyId);
    }, [selectedPartyId, parties]);

    const handlePartySelect = (partyId: string) => {
        setSelectedPartyId(partyId);
        setIsPartyDropdownOpen(false);
        setPartySearchTerm('');
    };
    
    const filteredParties = useMemo(() => {
        if (!partySearchTerm) return parties;
        return parties.filter(p => p.partyName.toLowerCase().includes(partySearchTerm.toLowerCase()));
    }, [partySearchTerm, parties]);
    
    const isGenerateDisabled = isLoading || !selectedPartyId || uploadedFiles.length === 0;

    const editorContainerStyle = {
        ...styles.editorContainer,
        ...(isMobile && {
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
            height: 'auto'
        })
    };

    const previewSectionStyle = {
        ...styles.previewSection,
        ...(isMobile && {
            gridTemplateColumns: '1fr'
        }),
    };

    return (
        <div style={editorContainerStyle}>
            <div style={styles.controlsSection}>
                 <div style={styles.inputGroup}>
                    <label style={styles.label}>1. Upload Invoice PDF(s)</label>
                    <label htmlFor="pdf-upload" style={styles.uploadButton}>
                        <FileIcon />
                        <span>{uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : 'Choose Files'}</span>
                    </label>
                    <input id="pdf-upload" type="file" accept=".pdf" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
                 <div style={styles.inputGroup} ref={partyDropdownRef}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label style={styles.label}>2. Select Party to Apply</label>
                        <button onClick={() => setIsManageModalOpen(true)} style={styles.manageButton}>Manage</button>
                    </div>
                    <button style={styles.customDropdownButton} onClick={() => setIsPartyDropdownOpen(prev => !prev)} disabled={isLoading || parties.length === 0}>
                        <span>{selectedPartyDetails?.partyName || (isLoading ? "Loading..." : "Select a Party")}</span>
                        <ChevronDownIcon />
                    </button>
                    {isPartyDropdownOpen && (
                        <div style={styles.dropdownMenu}>
                            <div style={styles.dropdownSearchContainer}>
                                <SearchIcon />
                                <input 
                                    type="text"
                                    placeholder="Search parties..."
                                    value={partySearchTerm}
                                    onChange={(e) => setPartySearchTerm(e.target.value)}
                                    style={styles.dropdownSearchInput}
                                />
                            </div>
                            <ul style={styles.dropdownList}>
                                {filteredParties.length > 0 ? filteredParties.map(p => (
                                    <li key={p.id} className="dropdown-list-item" style={styles.dropdownListItem} onClick={() => handlePartySelect(p.id)}>{p.partyName}</li>
                                )) : <li style={{...styles.dropdownListItem, cursor: 'default', color: 'var(--text-tertiary)'}}>No parties found</li>}
                            </ul>
                        </div>
                    )}
                </div>
                {selectedPartyDetails && (
                    <div style={styles.partyDetails}>
                         <h4 style={styles.detailsHeader}>Party Details</h4>
                         <div><strong>Name:</strong> {selectedPartyDetails.partyName}</div>
                         <div><strong>Address:</strong> {[selectedPartyDetails.address1, selectedPartyDetails.address2].filter(Boolean).join(', ')}</div>
                         <div><strong>City:</strong> {selectedPartyDetails.city}</div>
                         <div><strong>GST:</strong> {selectedPartyDetails.gst || 'N/A'}</div>
                    </div>
                )}
                 <button onClick={generateModifiedPDF} style={isGenerateDisabled ? {...styles.actionButton, ...styles.actionButtonDisabled} : styles.actionButton} disabled={isGenerateDisabled}>
                    {isLoading ? <Spinner /> : 'Generate Modified PDF'}
                </button>
                {status.percent !== undefined && (
                     <div style={styles.progressBarContainer}><div style={{...styles.progressBar, width: `${status.percent}%`}}></div></div>
                )}
            </div>

            <div style={previewSectionStyle}>
                <div style={styles.previewBox}>
                    <h3 style={styles.previewTitle}>Original PDF Preview</h3>
                    {uploadedFiles.length > 0 ? (
                        <canvas ref={originalCanvasRef} style={styles.canvas}></canvas>
                    ) : (
                        <div style={styles.canvasPlaceholder}>Upload a PDF to see a preview.</div>
                    )}
                </div>
                <div style={styles.previewBox}>
                    <h3 style={styles.previewTitle}>Modified PDF Preview</h3>
                    {modifiedPreviewBytes ? (
                        <canvas ref={modifiedCanvasRef} style={styles.canvas}></canvas>
                    ) : (
                        <div style={styles.canvasPlaceholder}>The modified PDF will appear here after generation.</div>
                    )}
                    {modifiedPdfBytes && (
                        <button onClick={handleDownload} style={styles.downloadButton}>
                            <DownloadIcon /> Download Merged PDF
                        </button>
                    )}
                </div>
            </div>
            <ManagePartiesModal 
                isOpen={isManageModalOpen} 
                onClose={() => setIsManageModalOpen(false)} 
                parties={parties}
                onEdit={handleEditParty}
                onDelete={handleDeleteParty}
                onAdd={handleAddParty}
            />
            <PartyFormModal 
                isOpen={isFormModalOpen} 
                onClose={() => setIsFormModalOpen(false)} 
                onSave={handleSaveParty}
                initialData={editingParty}
            />
        </div>
    );
};

export const PDFEditor = () => {
    const [activeTab, setActiveTab] = useState(() => getPersistedState('pdf_editor_tab', 'partyChange'));
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        setPersistedState('pdf_editor_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.pillContainerWrapper}>
                <div style={styles.pillContainer}>
                    <button onClick={() => setActiveTab('partyChange')} style={activeTab === 'partyChange' ? styles.pillButtonActive : styles.pillButton}>Party Name Change</button>
                    <button onClick={() => setActiveTab('cnDeductor')} style={activeTab === 'cnDeductor' ? styles.pillButtonActive : styles.pillButton}>CN Deductor</button>
                </div>
            </div>
            <div style={styles.contentContainer}>
                {activeTab === 'partyChange' && <PartyNameChanger isMobile={isMobile} />}
                {activeTab === 'cnDeductor' && <CNDeductor isMobile={isMobile} />}
            </div>
        </div>
    );
};


const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--light-grey)' },
    pillContainerWrapper: {
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem 1rem 0',
        backgroundColor: 'var(--light-grey)'
    },
    pillContainer: { 
        display: 'flex',
        backgroundColor: 'var(--gray-5)',
        borderRadius: '18px',
        padding: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    pillButton: { 
        padding: '0.5rem 1.5rem', 
        fontSize: '0.9rem', 
        border: 'none', 
        backgroundColor: 'transparent', 
        color: 'var(--text-color)', 
        cursor: 'pointer', 
        fontWeight: 500, 
        transition: 'all 0.2s ease',
        borderRadius: '14px',
    },
    pillButtonActive: { 
        padding: '0.5rem 1.5rem', 
        fontSize: '0.9rem', 
        border: 'none', 
        backgroundColor: 'var(--card-bg)', 
        color: 'var(--dark-grey)', 
        cursor: 'pointer', 
        fontWeight: 600, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: '14px',
    },
    contentContainer: { flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--light-grey)' },
    placeholderContainer: { textAlign: 'center', padding: '3rem 1rem' },
    placeholderTitle: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.5rem' },
    placeholderText: { fontSize: '1rem', color: 'var(--text-color)' },
    
    editorContainer: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: '100%' },
    controlsSection: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' },
    label: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)' },
    uploadButton: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' },
    partyDetails: { backgroundColor: 'var(--light-grey)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--separator-color)' },
    detailsHeader: { margin: 0, marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    actionButton: { padding: '0.8rem', fontSize: '1rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s, box-shadow 0.2s, transform 0.1s' },
    actionButtonDisabled: { backgroundColor: 'rgba(0, 122, 255, 0.4)', color: 'rgba(255, 255, 255, 0.7)', cursor: 'not-allowed', boxShadow: 'none' },
    spinner: { border: '3px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTop: '3px solid #fff', width: '20px', height: '20px', animation: 'spin 1s linear infinite' },
    progressBarContainer: { height: '8px', backgroundColor: 'var(--separator-color)', borderRadius: '4px', overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: 'var(--brand-color)', transition: 'width 0.3s ease' },
    
    // Custom Dropdown
    customDropdownButton: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', cursor: 'pointer', textAlign: 'left' },
    dropdownMenu: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--glass-bg)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', border: '1px solid var(--glass-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: '250px', overflowY: 'hidden', zIndex: 10, borderRadius: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column' },
    dropdownSearchContainer: { padding: '0.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    dropdownSearchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--dark-grey)', padding: '0.5rem' },
    dropdownList: { listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto' },
    // FIX: Removed ':hover' pseudo-selector from inline style object to prevent React errors. Hover effects are handled via a stylesheet.
    dropdownListItem: { padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)' },

    previewSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', overflow: 'auto' },
    previewBox: { display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', alignItems: 'center' },
    previewTitle: { margin: 0, fontSize: '1rem', fontWeight: 600, width: '100%', textAlign: 'left' },
    canvas: { width: '100%', height: 'auto', border: '1px solid var(--separator-color)', borderRadius: '8px' },
    canvasPlaceholder: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        border: '2px dashed var(--separator-color)',
        borderRadius: '8px',
        color: 'var(--text-tertiary)',
        minHeight: '200px',
        width: '100%',
        flexGrow: 1
    },
    downloadButton: { padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--green)', border: 'none', borderRadius: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' },
    
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'var(--card-bg)', borderRadius: '12px', width: '90%', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--separator-color)', paddingBottom: '1rem' },
    modalTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark-grey)' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--separator-color)', paddingTop: '1rem' },
    primaryButton: { padding: '0.6rem 1.5rem', backgroundColor: 'var(--brand-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' },
    secondaryButton: { padding: '0.6rem 1.5rem', backgroundColor: 'var(--gray-5)', color: 'var(--dark-grey)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' },
    
    // Form Styles
    form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    formSection: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    sectionTitle: { margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--brand-color)', borderBottom: '1px solid var(--active-bg)', paddingBottom: '0.25rem' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    formLabel: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)' },
    formInput: { padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--separator-color)', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', fontSize: '0.9rem' },
    
    manageButton: { background: 'none', border: 'none', color: 'var(--brand-color)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' },
    iconButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'background-color 0.2s' },

    // CN Deductor Styles
    cnDeductorContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' },
    cnHeaderCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    cnTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--dark-grey)', marginBottom: '0.25rem' },
    cnSubtitle: { margin: 0, fontSize: '0.95rem', color: 'var(--text-color)' },
    cnGridLayout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' },
    cnLeftPanel: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    cnRightPanel: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' },
    inputCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    statsCard: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    statRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid var(--separator-color)', paddingBottom: '0.5rem', color: 'var(--text-color)' },
    statLabel: { fontWeight: 500 },
    statValue: { fontWeight: 600, color: 'var(--dark-grey)' },
    statusMessage: { margin: 0, fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: '1.4' },
    textViewerCard: { backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%' },
    viewerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--separator-color)', gap: '1rem', flexWrap: 'wrap' },
    searchBarContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--separator-color)', borderRadius: '8px', width: '280px', backgroundColor: 'var(--light-grey)' },
    cnSearchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: 'var(--dark-grey)', width: '100%' },
    pagesContainer: { padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '550px' },
    pageTextBlock: { border: '1px solid var(--separator-color)', borderRadius: '8px', padding: '1.25rem', backgroundColor: 'var(--light-grey)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    pageBlockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageNumberBadge: { fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--brand-color)', color: '#fff', padding: '2px 8px', borderRadius: '4px' },
    copyPageButton: { padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' },
    extractedTextParagraph: { fontSize: '0.9rem', color: 'var(--dark-grey)', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', backgroundColor: '#fff', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-mono)' },
    emptyView: { display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-tertiary)', padding: '3rem', fontSize: '1rem' },
    emptyTextViewer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        border: '2px dashed var(--separator-color)',
        borderRadius: '12px',
        color: 'var(--text-tertiary)',
        minHeight: '400px',
        width: '100%',
        backgroundColor: 'var(--card-bg)',
        flexDirection: 'column',
    }
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    .dropdown-list-item:hover {
        background-color: var(--active-bg);
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);