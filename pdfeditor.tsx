// FIX: Added useMemo to the import statement to resolve 'Cannot find name 'useMemo'' error.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// Global declarations for libraries loaded from CDN
declare const PDFLib: any;
declare const pdfjsLib: any;

// --- ICONS ---
const UploadCloudIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-color)' }}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m16 16-4-4-4 4" /></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ChevronDownIcon = ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


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

const CNDeductor = () => (
    <div style={styles.placeholderContainer}>
        <h3 style={styles.placeholderTitle}>CN Deductor</h3>
        <p style={styles.placeholderText}>This feature is currently under development and will be available soon.</p>
    </div>
);

const PartyNameChanger = ({ isMobile }) => {
    // Component states
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [modifiedPdfBytes, setModifiedPdfBytes] = useState<Uint8Array | null>(null);
    const [modifiedPreviewBytes, setModifiedPreviewBytes] = useState<Uint8Array | null>(null);
    const [downloadFilename, setDownloadFilename] = useState<string>('');
    
    const [parties, setParties] = useState<any[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
    const [partySearchTerm, setPartySearchTerm] = useState('');

    const [status, setStatus] = useState<{ message: string; percent?: number }>({ message: 'Upload a PDF to begin.' });
    const [isLoading, setIsLoading] = useState(false);
    
    const originalCanvasRef = useRef<HTMLCanvasElement>(null);
    const modifiedCanvasRef = useRef<HTMLCanvasElement>(null);
    const partyDropdownRef = useRef<HTMLDivElement>(null);

    // --- Firebase Data Loading ---
    useEffect(() => {
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
                                    ...party
                                });
                            }
                        }
                    }
                }
                
                allParties.sort((a, b) => a.partyName.localeCompare(b.partyName));
                
                setParties(allParties);
                setSelectedPartyId('');
                setStatus({ message: 'Select a party to proceed.' });
            } catch (error) {
                console.error('Error loading parties:', error);
                setStatus({ message: 'Error loading party data.' });
            } finally {
                setIsLoading(false);
            }
        };
    
        loadAllParties();
    }, []);
    
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
        if (modifiedPreviewBytes) {
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
                if (selectedParty.partyName.toUpperCase() === 'POSHAK RETAIL') {
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
                    <label style={styles.label}>2. Select Party to Apply</label>
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
                    {modifiedPdfBytes ? (
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
        </div>
    );
};

export const PDFEditor = () => {
    const [activeTab, setActiveTab] = useState('partyChange');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.pillContainer}>
                <button onClick={() => setActiveTab('partyChange')} style={activeTab === 'partyChange' ? styles.pillButtonActive : styles.pillButton}>Party Name Change</button>
                <button onClick={() => setActiveTab('cnDeductor')} style={activeTab === 'cnDeductor' ? styles.pillButtonActive : styles.pillButton}>CN Deductor</button>
            </div>
            <div style={styles.contentContainer}>
                {activeTab === 'partyChange' && <PartyNameChanger isMobile={isMobile} />}
                {activeTab === 'cnDeductor' && <CNDeductor />}
            </div>
        </div>
    );
};


const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', height: '100%' },
    pillContainer: { display: 'flex', justifyContent: 'center', padding: '1rem 1rem 0', backgroundColor: 'var(--light-grey)' },
    pillButton: { padding: '0.6rem 1.5rem', fontSize: '0.9rem', border: 'none', backgroundColor: 'var(--gray-5)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s ease' },
    pillButtonActive: { padding: '0.6rem 1.5rem', fontSize: '0.9rem', border: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', cursor: 'pointer', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    contentContainer: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', backgroundColor: 'var(--light-grey)' },
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
    actionButton: { padding: '0.8rem', fontSize: '1rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s, box-shadow 0.2s, transform 0.1s' },
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
    downloadButton: { padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--green)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' },
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