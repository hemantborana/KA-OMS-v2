import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9" x2="6" y2="15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12" x2="15" y2="6"></polyline></svg>;
const BarcodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6v12h18V6H3zM8 6v12M12 6v12M16 6v12"/></svg>;
const ManualIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;

const GIVEN_TO_PARTY_REF = 'GivenToParty_V2';

const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

// --- Copy of IndexedDB helper for master item data ---
const itemDb = {
    db: null,
    init: function() { /* ... same as neworderentry.tsx ... */ },
    getAllItems: async function(): Promise<any[]> { /* ... same as neworderentry.tsx ... */ return new Promise(r => r([])) }
};
// Re-implementing the core logic for brevity as it's a known quantity
itemDb.init = function() {
    return new Promise((resolve, reject) => {
      if (this.db) { return resolve(this.db); }
      const request = indexedDB.open('ItemCatalogDB', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'Barcode' });
      };
      request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
      request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBRequest).error); reject((event.target as IDBRequest).error); };
    });
};
itemDb.getAllItems = async function() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['items'], 'readonly');
      const store = transaction.objectStore('items');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
};

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);


// Main component managing both List and Entry views
export const GivenToParty = ({ onNavigate }) => {
    const [view, setView] = useState('list'); // 'list' or 'entry'
    const [isLoading, setIsLoading] = useState(true);
    const [entries, setEntries] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const entriesRef = firebase.database().ref(GIVEN_TO_PARTY_REF);
        const listener = entriesRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            const entriesArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            entriesArray.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setEntries(entriesArray);
            setIsLoading(false);
        });
        return () => entriesRef.off('value', listener);
    }, []);

    const groupedAndFilteredEntries = useMemo(() => {
        const grouped = entries.reduce((acc, entry) => {
            if (!acc[entry.partyName]) acc[entry.partyName] = [];
            acc[entry.partyName].push(entry);
            return acc;
        }, {});

        if (!searchTerm) return grouped;

        const lowercasedTerm = searchTerm.toLowerCase();
        return Object.keys(grouped).reduce((acc, partyName) => {
            if (partyName.toLowerCase().includes(lowercasedTerm)) {
                acc[partyName] = grouped[partyName];
            }
            return acc;
        }, {});
    }, [entries, searchTerm]);

    const handleNewEntry = () => {
        setView('entry');
    };
    
    const handleExitEntryView = () => {
        setView('list');
    }

    if (view === 'entry') {
        return <GivenToPartyEntry onExit={handleExitEntryView} />;
    }

    return (
        <div style={styles.container}>
             <div style={styles.header}>
                <h2 style={styles.pageTitle}>Given to Party</h2>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} placeholder="Search by party name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
            
            {isLoading ? <div style={styles.centeredMessage}><Spinner/></div> : (
                 <div style={styles.listContainer}>
                    {Object.keys(groupedAndFilteredEntries).length > 0 ? Object.keys(groupedAndFilteredEntries).sort().map(partyName => (
                        <PartyGroup key={partyName} partyName={partyName} entries={groupedAndFilteredEntries[partyName]} />
                    )) : <div style={styles.centeredMessage}>No entries found.</div>}
                </div>
            )}

            <button style={styles.fab} onClick={handleNewEntry}>
                <PlusIcon />
            </button>
        </div>
    );
};

const PartyGroup = ({ partyName, entries }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    
    const summary = useMemo(() => {
        const totalItems = entries.reduce((sum, entry) => sum + (entry.totalQuantity || 0), 0);
        return { totalItems, entryCount: entries.length };
    }, [entries]);

    return (
        <div style={styles.partyCard}>
            <button style={styles.partyHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div>
                    <div style={styles.partyName}>{partyName}</div>
                    <div style={styles.partySub}>{summary.entryCount} Entries • {summary.totalItems} Items</div>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            <div style={isCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={styles.entryList}>
                        {entries.map(entry => (
                            <div key={entry.id} style={styles.entryItem}>
                                <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                                <span>{entry.totalQuantity} items</span>
                                <span>{formatCurrency(entry.totalValue)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const GivenToPartyEntry = ({ onExit }) => {
    const [partyName, setPartyName] = useState('');
    const [items, setItems] = useState([]);
    const [barcode, setBarcode] = useState('');
    
    const [masterItems, setMasterItems] = useState(null);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualItem, setManualItem] = useState({ name: '', color: '', size: '', mrp: '', quantity: '1' });
    
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, isClosing: false, item: null });

    const barcodeInputRef = useRef(null);

    useEffect(() => {
        itemDb.getAllItems().then(data => {
            const itemMap = new Map(data.map(item => [item.Barcode, item]));
            setMasterItems(itemMap);
            setIsLoadingCatalog(false);
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
        }).catch(err => {
            console.error(err);
            showToast('Failed to load item catalog.', 'error');
            setIsLoadingCatalog(false);
        });
    }, []);

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        if (!barcode.trim() || !masterItems) return;

        const scannedBarcode = barcode.trim();
        setBarcode('');
        
        const existingItemIndex = items.findIndex(item => item.id === scannedBarcode);
        if (existingItemIndex > -1) {
            const newItems = [...items];
            newItems[existingItemIndex].quantity += 1;
            setItems(newItems);
            showToast(`${newItems[existingItemIndex].name} quantity increased to ${newItems[existingItemIndex].quantity}`, 'success');
            return;
        }

        if (masterItems.has(scannedBarcode)) {
            const masterItem = masterItems.get(scannedBarcode);
            const newItem = {
                id: masterItem.Barcode,
                name: masterItem.Style,
                color: masterItem.Color,
                size: masterItem.Size,
                mrp: parseFloat(String(masterItem.MRP).replace(/[^0-9.-]+/g, "")) || 0,
                quantity: 1,
            };
            setConfirmationModal({ isOpen: true, isClosing: false, item: newItem });
        } else {
            showToast('Barcode not found. Please add manually.', 'error');
            setIsManualMode(true);
        }
    };

    const handleConfirmAddItem = (confirmedItem) => {
        const itemWithId = { ...confirmedItem, id: confirmedItem.id || `manual_${Date.now()}`};
        setItems(prev => [...prev, itemWithId]);
        setConfirmationModal({ isOpen: false, isClosing: false, item: null });
        showToast(`${confirmedItem.name} added.`, 'success');
    };

    const handleManualItemChange = (field, value) => {
        setManualItem(prev => ({ ...prev, [field]: value }));
    };

    const handleManualAdd = () => {
        if (!manualItem.name || !manualItem.quantity) {
            showToast('Item Name and Quantity are required.', 'error');
            return;
        }
        const newItem = {
            id: `manual_${Date.now()}`,
            name: manualItem.name.trim(),
            color: manualItem.color.trim(),
            size: manualItem.size.trim(),
            mrp: Number(manualItem.mrp) || 0,
            quantity: Number(manualItem.quantity),
        };
        setItems(prev => [...prev, newItem]);
        setManualItem({ name: '', color: '', size: '', mrp: '', quantity: '1' });
        setIsManualMode(false);
        showToast(`${newItem.name} added manually.`, 'success');
    };

    const handleItemQuantityChange = (index, newQuantity) => {
        if (newQuantity < 1) {
            handleRemoveItem(index);
        } else {
            const newItems = [...items];
            newItems[index].quantity = newQuantity;
            setItems(newItems);
        }
    };
    
    const handleRemoveItem = (indexToRemove) => {
        setItems(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSave = async () => {
        if (!partyName.trim()) {
            showToast('Party Name is required.', 'error'); return;
        }
        if (items.length === 0) {
            showToast('Cannot save an empty entry.', 'error'); return;
        }

        setIsSaving(true);
        const { totalQuantity, totalValue } = items.reduce((acc, item) => {
            acc.totalQuantity += item.quantity;
            acc.totalValue += item.quantity * item.mrp;
            return acc;
        }, { totalQuantity: 0, totalValue: 0 });
        
        const newEntry = { partyName: partyName.trim(), items, totalQuantity, totalValue, timestamp: new Date().toISOString() };

        try {
            await firebase.database().ref(GIVEN_TO_PARTY_REF).push(newEntry);
            showToast('Entry saved successfully!', 'success');
            onExit();
        } catch(err) {
            console.error(err);
            showToast('Failed to save entry.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const { totalQuantity, totalValue } = useMemo(() => items.reduce((acc, item) => {
        acc.totalQuantity += item.quantity;
        acc.totalValue += item.quantity * item.mrp;
        return acc;
    }, { totalQuantity: 0, totalValue: 0 }), [items]);
     
     return (
        <div style={styles.entryContainer}>
            <div style={styles.entryHeader}>
                <button style={styles.backButton} onClick={onExit}><ChevronLeftIcon /></button>
                <h2 style={styles.entryTitle}>New Entry</h2>
            </div>
            <div style={styles.entryBody}>
                <div style={styles.entrySection}>
                    <label style={styles.entryLabel}>Party Name</label>
                    <input type="text" style={styles.entryInput} placeholder="Enter party name" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
                </div>
                
                <div style={styles.entrySection}>
                    {!isManualMode ? (
                         <>
                            <label style={styles.entryLabel}>Scan Barcode</label>
                            <form onSubmit={handleBarcodeSubmit} style={styles.barcodeForm}>
                                <BarcodeIcon/>
                                <input ref={barcodeInputRef} type="text" style={styles.barcodeInput} placeholder="Scan item..." value={barcode} onChange={(e) => setBarcode(e.target.value)} disabled={isLoadingCatalog} />
                            </form>
                            <button style={styles.secondaryButton} onClick={() => setIsManualMode(true)}>+ Add Manually</button>
                         </>
                    ) : (
                        <div style={styles.manualEntryForm}>
                            <div style={styles.manualFormHeader}>
                                <h3 style={styles.manualFormTitle}>Manual Item Entry</h3>
                                <button style={styles.secondaryButton} onClick={() => setIsManualMode(false)}>Scan Barcode Instead</button>
                            </div>
                            <div style={styles.manualInputGrid}>
                                <input style={styles.entryInput} value={manualItem.name} onChange={(e) => handleManualItemChange('name', e.target.value)} placeholder="Item Name*" />
                                <input style={styles.entryInput} value={manualItem.color} onChange={(e) => handleManualItemChange('color', e.target.value)} placeholder="Color" />
                                <input style={styles.entryInput} value={manualItem.size} onChange={(e) => handleManualItemChange('size', e.target.value)} placeholder="Size" />
                                <input style={styles.entryInput} type="number" value={manualItem.mrp} onChange={(e) => handleManualItemChange('mrp', e.target.value)} placeholder="MRP" />
                                <input style={styles.entryInput} type="number" value={manualItem.quantity} onChange={(e) => handleManualItemChange('quantity', e.target.value)} placeholder="Quantity*" />
                            </div>
                            <button style={styles.primaryButton} onClick={handleManualAdd}>Add Item</button>
                        </div>
                    )}
                </div>

                <div style={styles.addedItemsSection}>
                    {items.length > 0 ? (
                        items.map((item, index) => (
                             <div key={item.id} style={styles.addedItemCard}>
                                <div style={styles.addedItemInfo}>
                                    <div style={styles.addedItemName}>{item.name}</div>
                                    <div style={styles.addedItemDetails}>{item.color} • {item.size} • {formatCurrency(item.mrp)}</div>
                                </div>
                                <div style={styles.addedItemActions}>
                                    <input type="number" value={item.quantity} onChange={(e) => handleItemQuantityChange(index, Number(e.target.value))} style={styles.quantityInput} />
                                    <button style={styles.deleteButton} onClick={() => handleRemoveItem(index)}><TrashIcon/></button>
                                </div>
                             </div>
                        ))
                    ) : (
                        <div style={styles.centeredMessage}>No items added yet.</div>
                    )}
                </div>
            </div>
            
            <div style={styles.entryFooter}>
                <div style={styles.summaryRow}>
                    <div style={styles.summaryItem}><span>Total Items</span><strong>{totalQuantity}</strong></div>
                    <div style={styles.summaryItem}><span>Total Value</span><strong>{formatCurrency(totalValue)}</strong></div>
                </div>
                <button style={isSaving ? {...styles.primaryButton, ...styles.primaryButtonDisabled} : styles.primaryButton} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <SmallSpinner/> : "Save Entry"}
                </button>
            </div>

            {confirmationModal.isOpen && (
                <ItemConfirmationModal 
                    item={confirmationModal.item} 
                    onClose={() => setConfirmationModal(p => ({...p, isClosing: true}))}
                    onConfirm={handleConfirmAddItem}
                    isClosing={confirmationModal.isClosing}
                />
            )}
        </div>
    );
};

const ItemConfirmationModal = ({ item, onClose, onConfirm, isClosing }) => {
    const [editedItem, setEditedItem] = useState(item);

    const handleFieldChange = (field, value) => {
        setEditedItem(prev => ({...prev, [field]: value}));
    };
    
    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={onClose}>
            <div style={{...styles.modalContent, animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>Confirm Item</h3>
                <p style={styles.modalSubtitle}>Verify or edit the item details before adding.</p>
                
                <div style={styles.confirmationForm}>
                    <label>Name</label><input type="text" value={editedItem.name} onChange={(e) => handleFieldChange('name', e.target.value)} />
                    <label>Color</label><input type="text" value={editedItem.color} onChange={(e) => handleFieldChange('color', e.target.value)} />
                    <label>Size</label><input type="text" value={editedItem.size} onChange={(e) => handleFieldChange('size', e.target.value)} />
                    <label>MRP</label><input type="number" value={editedItem.mrp} onChange={(e) => handleFieldChange('mrp', Number(e.target.value))} />
                    <label>Quantity</label><input type="number" value={editedItem.quantity} onChange={(e) => handleFieldChange('quantity', Number(e.target.value))} />
                </div>

                <div style={styles.iosModalActions}>
                    <button onClick={onClose} style={styles.iosModalButtonSecondary}>Cancel</button>
                    <button onClick={() => onConfirm(editedItem)} style={styles.iosModalButtonPrimary}>Confirm & Add</button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--light-grey)' },
    header: { padding: '1rem', backgroundColor: 'var(--light-grey)', position: 'sticky', top: 0, zIndex: 10 },
    pageTitle: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '1rem' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--card-bg)', padding: '0.75rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem' },
    listContainer: { flex: 1, overflowY: 'auto', padding: '0 1rem 5rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    fab: { position: 'fixed', bottom: '2rem', right: '2rem', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--brand-color)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

    // Party Group Styles
    partyCard: { backgroundColor: 'var(--card-bg)', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    partyHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    partyName: { fontWeight: 600, fontSize: '1.1rem' },
    partySub: { fontSize: '0.85rem', color: 'var(--text-color)' },
    collapsibleContainer: { display: 'grid', gridTemplateRows: '0fr', transition: 'grid-template-rows 0.3s ease-out' },
    collapsibleContainerExpanded: { gridTemplateRows: '1fr' },
    collapsibleContentWrapper: { overflow: 'hidden' },
    entryList: { padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    entryItem: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'var(--light-grey)' },

    // Entry View Styles
    entryContainer: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--light-grey)' },
    entryHeader: { display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--card-bg)', flexShrink: 0 },
    backButton: { background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' },
    entryTitle: { fontSize: '1.2rem', fontWeight: 600, flex: 1, textAlign: 'center', marginRight: '40px' /* balance back button */ },
    entryBody: { flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    entrySection: { backgroundColor: 'var(--card-bg)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' },
    entryLabel: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)' },
    entryInput: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px' },
    barcodeForm: { display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--separator-color)', borderRadius: '8px', padding: '0 0.5rem' },
    barcodeInput: { flex: 1, border: 'none', background: 'none', outline: 'none', padding: '0.75rem 0.5rem', fontSize: '1rem' },
    secondaryButton: { background: 'var(--light-grey)', border: '1px solid var(--separator-color)', color: 'var(--dark-grey)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 },
    primaryButton: { backgroundColor: 'var(--brand-color)', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' },
    primaryButtonDisabled: { backgroundColor: 'var(--gray-3)', cursor: 'not-allowed' },
    manualEntryForm: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    manualFormHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    manualFormTitle: { fontSize: '1rem', fontWeight: 600 },
    manualInputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },

    addedItemsSection: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    addedItemCard: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px' },
    addedItemInfo: { flex: 1 },
    addedItemName: { fontWeight: 600 },
    addedItemDetails: { fontSize: '0.85rem', color: 'var(--text-color)' },
    addedItemActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    quantityInput: { width: '60px', textAlign: 'center', padding: '0.5rem', border: '1px solid var(--separator-color)', borderRadius: '6px' },
    deleteButton: { background: 'var(--light-grey)', border: '1px solid var(--separator-color)', borderRadius: '6px', padding: '0.5rem', display: 'flex', color: 'var(--red)' },
    
    entryFooter: { padding: '1rem', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--separator-color)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    summaryItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
    
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalSubtitle: { margin: '-0.5rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-color)' },
    confirmationForm: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', alignItems: 'center' },
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes modalOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }`;
document.head.appendChild(styleSheet);