import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getPersistedState, setPersistedState } from './persistence';
import { database, itemDb } from './db';

// --- ICONS ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-color)', marginBottom: '1rem' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

type Step = 'upload' | 'mapping' | 'preview';

interface Mapping {
  Barcode: string;
  Style: string;
  Color: string;
  Size: string;
  MRP: string;
}

export const StockUpdation: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headerRow, setHeaderRow] = useState<number>(getPersistedState('ka_updation_header_row', 1));
  const [dataStartRow, setDataStartRow] = useState<number>(getPersistedState('ka_updation_data_start', 2));
  const [mapping, setMapping] = useState<Mapping>(getPersistedState('ka_updation_mapping', {
    Barcode: '',
    Style: '',
    Color: '',
    Size: '',
    MRP: ''
  }));
  
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Persist settings
  useEffect(() => { setPersistedState('ka_updation_header_row', headerRow); }, [headerRow]);
  useEffect(() => { setPersistedState('ka_updation_data_start', dataStartRow); }, [dataStartRow]);
  useEffect(() => { setPersistedState('ka_updation_mapping', mapping); }, [mapping]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let uploadedFile: File | null = null;
    if ('files' in e.target && e.target.files) {
      uploadedFile = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      e.preventDefault();
      uploadedFile = e.dataTransfer.files[0];
    }

    if (uploadedFile) {
      if (!uploadedFile.name.endsWith('.xlsx') && !uploadedFile.name.endsWith('.xls')) {
        showToast('Please upload a valid Excel file (.xlsx or .xls)', 'error');
        return;
      }
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
        setRawRows(rows);
        showToast('File loaded successfully', 'success');
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  const headers = useMemo(() => {
    if (rawRows.length >= headerRow && headerRow > 0) {
      return rawRows[headerRow - 1].map((h, i) => {
        const name = String(h || '').trim();
        return name ? `${name} (Col ${i + 1})` : `Column ${i + 1}`;
      });
    }
    return [];
  }, [rawRows, headerRow]);

  const mappedData = useMemo(() => {
    if (!rawRows.length || dataStartRow <= 0) return [];
    const dataRows = rawRows.slice(dataStartRow - 1);
    const headerIdxMap: Record<string, number> = {};
    if (rawRows[headerRow - 1]) {
        rawRows[headerRow - 1].forEach((h, i) => {
            const name = String(h || '').trim();
            const uniqueName = name ? `${name} (Col ${i + 1})` : `Column ${i + 1}`;
            headerIdxMap[uniqueName] = i;
        });
    }

    return dataRows.map(row => {
      const item: any = {};
      Object.entries(mapping).forEach(([field, colName]) => {
        const idx = headerIdxMap[colName as string];
        item[field] = idx !== undefined ? row[idx] : '';
      });
      return item;
    }).filter(item => item.Barcode && String(item.Barcode).trim() !== '');
  }, [rawRows, headerRow, dataStartRow, mapping]);

  const handleConfirmUpdate = async () => {
    if (mappedData.length === 0) {
      showToast('No valid data found to update', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const uploadDate = new Date().toISOString();
      
      // 1. Update Firebase
      await database.ref('itemData/items').set(mappedData);
      await database.ref('itemData/metadata').update({
        uploadDate,
        manualSync: 'Y'
      });

      // 2. Update Local IndexedDB immediately for this user
      await itemDb.clearAndAddItems(mappedData);
      await itemDb.setMetadata({ uploadDate });

      showToast(`Successfully updated ${mappedData.length} items`, 'success');
      setFile(null);
      setWorkbook(null);
      setRawRows([]);
      setStep('upload');
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Update failed:', error);
      showToast('Failed to update data. Check console for details.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div style={styles.stepIndicator}>
      <div style={{ ...styles.step, ...(step === 'upload' ? styles.stepActive : {}) }}>1. Upload & Rows</div>
      <ChevronRightIcon />
      <div style={{ ...styles.step, ...(step === 'mapping' ? styles.stepActive : {}) }}>2. Map Columns</div>
      <ChevronRightIcon />
      <div style={{ ...styles.step, ...(step === 'preview' ? styles.stepActive : {}) }}>3. Preview & Save</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Item Updation</h1>
        <p style={styles.subtitle}>Update your master item catalog from an Excel file</p>
      </div>

      {renderStepIndicator()}

      <div style={styles.card}>
        {step === 'upload' && (
          <div style={styles.stepContent}>
            {!file ? (
              <div 
                style={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileUpload}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <UploadIcon />
                <p style={styles.dropzoneText}>Drag & drop your XLSX file here or <strong>click to browse</strong></p>
                <input id="fileInput" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
            ) : (
              <div style={styles.fileInfo}>
                <div style={styles.fileHeader}>
                  <FileIcon />
                  <span style={styles.fileName}>{file.name}</span>
                  <button style={styles.changeFileBtn} onClick={() => { setFile(null); setRawRows([]); }}>Change File</button>
                </div>

                <div style={styles.configGrid}>
                  <div style={styles.configItem}>
                    <label style={styles.configLabel}>Header Row Number</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={headerRow} 
                      onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)} 
                      style={styles.configInput}
                    />
                    <p style={styles.configHint}>Row containing column names</p>
                  </div>
                  <div style={styles.configItem}>
                    <label style={styles.configLabel}>Data Starts at Row</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={dataStartRow} 
                      onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)} 
                      style={styles.configInput}
                    />
                    <p style={styles.configHint}>First row of actual item data</p>
                  </div>
                </div>

                <div style={styles.previewSection}>
                  <h3 style={styles.sectionTitle}>Row Selection Preview</h3>
                  <div style={styles.tableWrapper}>
                    <table style={styles.previewTable}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Row #</th>
                          {rawRows[0]?.map((_, i) => <th key={i} style={styles.th}>Col {i + 1}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rawRows.slice(0, 15).map((row, idx) => {
                          const rowNum = idx + 1;
                          const isHeader = rowNum === headerRow;
                          const isDataStart = rowNum === dataStartRow;
                          return (
                            <tr key={idx} style={{
                              backgroundColor: isHeader ? 'rgba(59, 130, 246, 0.1)' : isDataStart ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                              borderLeft: isHeader ? '4px solid #3b82f6' : isDataStart ? '4px solid #10b981' : 'none'
                            }}>
                              <td style={{ ...styles.td, fontWeight: 'bold', color: isHeader ? '#3b82f6' : isDataStart ? '#10b981' : 'inherit' }}>
                                {rowNum} {isHeader && '(Header)'} {isDataStart && '(Data)'}
                              </td>
                              {row.map((cell, i) => <td key={i} style={styles.td}>{String(cell)}</td>)}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button 
                    style={styles.primaryBtn} 
                    onClick={() => setStep('mapping')}
                    disabled={!headers.length}
                  >
                    Next: Map Columns <ChevronRightIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'mapping' && (
          <div style={styles.stepContent}>
            <h2 style={styles.sectionTitle}>Map Excel Columns to Item Fields</h2>
            <p style={styles.sectionSubtitle}>Select which column in your Excel file corresponds to each field.</p>
            
            <div style={styles.mappingGrid}>
              {Object.keys(mapping).map((field) => (
                <div key={field} style={styles.mappingItem}>
                  <label style={styles.mappingLabel}>{field} {field === 'Barcode' && <span style={{color: 'var(--red)'}}>*</span>}</label>
                  <select 
                    style={styles.mappingSelect}
                    value={mapping[field as keyof Mapping]}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div style={styles.mappingPreview}>
                <h3 style={styles.sectionTitle}>Mapping Live Preview (First 5 Rows)</h3>
                <div style={styles.tableWrapper}>
                    <table style={styles.previewTable}>
                        <thead>
                            <tr>
                                {Object.keys(mapping).map(f => <th key={f} style={styles.th}>{f}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {mappedData.slice(0, 5).map((row, i) => (
                                <tr key={i}>
                                    {Object.keys(mapping).map(f => <td key={f} style={styles.td}>{row[f]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.actions}>
              <button style={styles.secondaryBtn} onClick={() => setStep('upload')}>
                <ChevronLeftIcon /> Back
              </button>
              <button 
                style={styles.primaryBtn} 
                onClick={() => setStep('preview')}
                disabled={!mapping.Barcode}
              >
                Next: Final Preview <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={styles.stepContent}>
            <div style={styles.summaryBanner}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Total Items to Import</span>
                <span style={styles.summaryValue}>{mappedData.length}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Columns Mapped</span>
                <span style={styles.summaryValue}>{Object.values(mapping).filter(v => v !== '').length} / 5</span>
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Final Data Preview (First 50 Items)</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.previewTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    {Object.keys(mapping).map(f => <th key={f} style={styles.th}>{f}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mappedData.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{i + 1}</td>
                      {Object.keys(mapping).map(f => <td key={f} style={styles.td}>{row[f]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.warningBox}>
              <AlertIcon />
              <div>
                <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Important Note</p>
                <p>This will <strong>replace all existing item data</strong> in the database. Ensure your mapping is correct before proceeding.</p>
              </div>
            </div>

            <div style={styles.actions}>
              <button style={styles.secondaryBtn} onClick={() => setStep('mapping')}>
                <ChevronLeftIcon /> Back
              </button>
              <button 
                style={{ ...styles.primaryBtn, backgroundColor: 'var(--brand-color)' }} 
                onClick={() => setShowConfirmModal(true)}
              >
                Process & Update Database
              </button>
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Confirm Database Update</h2>
            <p style={styles.modalText}>
              Are you sure you want to update the master catalog with <strong>{mappedData.length} items</strong>? 
              This will overwrite all existing item data.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.modalSecondaryBtn} onClick={() => setShowConfirmModal(false)} disabled={isLoading}>Cancel</button>
              <button style={styles.modalPrimaryBtn} onClick={handleConfirmUpdate} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Yes, Update Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.5rem' },
  subtitle: { color: 'var(--dark-grey)', fontSize: '1rem' },
  stepIndicator: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', color: 'var(--dark-grey)', fontSize: '0.9rem' },
  step: { padding: '0.5rem 1rem', borderRadius: '2rem', backgroundColor: 'var(--skeleton-bg)', transition: 'all 0.3s' },
  stepActive: { backgroundColor: 'var(--brand-color)', color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: 'var(--glass-bg)', borderRadius: '1rem', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--shadow-md)' },
  stepContent: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  dropzone: { border: '2px dashed var(--glass-border)', borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dropzoneText: { fontSize: '1.1rem', color: 'var(--text-color)' },
  fileInfo: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  fileHeader: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--skeleton-bg)', borderRadius: '0.5rem' },
  fileName: { fontWeight: 'bold', flex: 1 },
  changeFileBtn: { color: 'var(--brand-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' },
  configGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  configItem: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  configLabel: { fontWeight: '600', fontSize: '0.9rem' },
  configInput: { padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', backgroundColor: 'var(--glass-bg)', color: 'var(--text-color)' },
  configHint: { fontSize: '0.8rem', color: 'var(--dark-grey)' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' },
  sectionSubtitle: { color: 'var(--dark-grey)', marginBottom: '1rem' },
  tableWrapper: { overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', maxHeight: '400px' },
  previewTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { padding: '0.75rem', textAlign: 'left', backgroundColor: 'var(--skeleton-bg)', borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0 },
  td: { padding: '0.75rem', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' },
  primaryBtn: { padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--brand-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  secondaryBtn: { padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', color: 'var(--text-color)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  mappingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' },
  mappingItem: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  mappingLabel: { fontWeight: '600' },
  mappingSelect: { padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', backgroundColor: 'var(--glass-bg)', color: 'var(--text-color)' },
  summaryBanner: { display: 'flex', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--skeleton-bg)', borderRadius: '0.5rem' },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  summaryValue: { fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--brand-color)' },
  warningBox: { display: 'flex', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', color: '#b91c1c' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--glass-bg)', padding: '2rem', borderRadius: '1rem', maxWidth: '400px', width: '90%', border: '1px solid var(--glass-border)' },
  modalTitle: { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' },
  modalText: { marginBottom: '2rem', lineHeight: '1.5' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem' },
  modalPrimaryBtn: { padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--red)', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  modalSecondaryBtn: { padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--glass-border)', backgroundColor: 'transparent', color: 'var(--text-color)', cursor: 'pointer' },
};
