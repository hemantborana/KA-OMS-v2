
import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBRV-i_70Xdk86bNuQQ43jiYkRNCXGvvyo",
  authDomain: "hcoms-221aa.firebaseapp.com",
  databaseURL: "https://hcoms-221aa-default-rtdb.firebaseio.com",
  projectId: "hcoms-221aa",
  storageBucket: "hcoms-221aa.appspot.com",
  messagingSenderId: "817694176734",
  appId: "1:817694176734:web:176bf69333bd7119d3194f",
  measurementId: "G-JB143EY71N"
};

// --- FIREBASE INITIALIZATION ---
// FIX: Use Firebase v8 compat API and check for existing app instance to prevent re-initialization.
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();


export const NewOrderEntry = () => {
    const [partyName, setPartyName] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState([{ id: 1, product: '', shade: '', size: '', quantity: 1, price: 0 }]);
    
    const [allParties, setAllParties] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const suggestionBoxRef = useRef(null);
    const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);

    // Fetch all parties from Firebase on component mount
    useEffect(() => {
        // FIX: Use Firebase v8 compat API for database reference.
        const partyRef = database.ref('PartyData');
        // FIX: Use .on() for v8 compat API and store listener for cleanup.
        const listener = partyRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Map to names, filter out any invalid entries, and ensure uniqueness with a Set
                const partyList = Object.values(data)
                    .map((party: any) => party.name)
                    .filter(name => typeof name === 'string' && name.trim() !== '');
                const uniquePartyList = [...new Set(partyList)];
                setAllParties(uniquePartyList);
            } else {
                setAllParties([]); // Ensure state is empty if no data exists
            }
        });

        // FIX: Add cleanup function to remove listener on component unmount.
        return () => partyRef.off('value', listener);
    }, []);

     // Effect to handle clicks outside the suggestion box
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) {
                setIsSuggestionsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePartyNameChange = (e) => {
        const value = e.target.value;
        setPartyName(value);

        if (value.trim()) {
            const filtered = allParties.filter(party =>
                party.toLowerCase().includes(value.toLowerCase())
            );

            // Only show "Add" option if the typed name doesn't exactly match an existing party (case-insensitive)
            const exactMatch = allParties.some(party => party.toLowerCase() === value.toLowerCase());
            if (!exactMatch) {
                filtered.push(`Add: ${value}`);
            }

            setSuggestions(filtered);
            setIsSuggestionsVisible(true);
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (suggestion.startsWith('Add: ')) {
            const newParty = suggestion.substring(5).trim();
            // Case-insensitive check to prevent adding a duplicate party name
            const existingParty = allParties.find(p => p.toLowerCase() === newParty.toLowerCase());

            if (existingParty) {
                // If it's a duplicate, just set the input to the existing name
                setPartyName(existingParty);
            } else {
                // If it's a new party, save it to Firebase
                // FIX: Use Firebase v8 compat API to get reference, push new key, and set data.
                const partyRef = database.ref('PartyData');
                const newPartyRef = partyRef.push();
                newPartyRef.set({ name: newParty })
                    .then(() => {
                        console.log("Successfully added new party:", newParty);
                        setPartyName(newParty);
                        // The `onValue` listener will automatically update the `allParties` state
                    })
                    .catch(error => {
                        console.error("Firebase Error: Could not add new party.", error);
                        // Optionally, show an error to the user
                    });
            }
        } else {
            setPartyName(suggestion);
        }
        setSuggestions([]);
        setIsSuggestionsVisible(false);
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), product: '', shade: '', size: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };
    
    const { subtotal, gst, grandTotal } = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const gst = subtotal * 0.18; // Assuming 18% GST
        const grandTotal = subtotal + gst;
        return { subtotal, gst, grandTotal };
    }, [items]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>New Order Entry</h1>
                <div style={styles.actions}>
                    <button style={{ ...styles.button, ...styles.secondaryButton }}>Save Draft</button>
                    <button style={styles.button}>Submit Order</button>
                </div>
            </div>
            
            <div style={styles.formGrid}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Order Details</h2>
                    <div style={{...styles.inputGroup, position: 'relative'}} ref={suggestionBoxRef}>
                        <label htmlFor="partyName" style={styles.label}>Party Name</label>
                        <input 
                            type="text" 
                            id="partyName" 
                            style={styles.input} 
                            value={partyName} 
                            onChange={handlePartyNameChange}
                            onFocus={() => partyName && suggestions.length > 0 && setIsSuggestionsVisible(true)}
                            placeholder="Enter or select a customer" 
                            autoComplete="off"
                         />
                         {isSuggestionsVisible && suggestions.length > 0 && (
                            <ul style={styles.suggestionsList}>
                                {suggestions.map((s, i) => (
                                    <li 
                                        key={i} 
                                        style={{
                                            ...styles.suggestionItem,
                                            ...(s.startsWith('Add: ') ? styles.addSuggestionItem : {}),
                                            ...(hoveredSuggestionIndex === i ? styles.suggestionItemHover : {})
                                        }}
                                        onClick={() => handleSuggestionClick(s)}
                                        onMouseDown={(e) => e.preventDefault()} // Prevents input blur before click
                                        onMouseEnter={() => setHoveredSuggestionIndex(i)}
                                        onMouseLeave={() => setHoveredSuggestionIndex(-1)}
                                    >
                                        {s.startsWith('Add: ') ? `+ Add "${s.substring(5)}"` : s}
                                    </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </div>

                <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                    <h2 style={styles.cardTitle}>Order Items</h2>
                    <div style={styles.itemTable}>
                        <div style={styles.itemHeader}>
                            <div style={{...styles.itemCell, flex: 3}}>Product</div>
                            <div style={{...styles.itemCell, flex: 2}}>Shade</div>
                            <div style={{...styles.itemCell, flex: 1}}>Size</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Qty</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Price</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Total</div>
                            <div style={{...styles.itemCell, flex: '0 0 40px'}}></div>
                        </div>
                        {items.map((item, index) => (
                            <div key={item.id} style={styles.itemRow}>
                                <div style={{...styles.itemCell, flex: 3}}>
                                    <input type="text" style={styles.tableInput} value={item.product} onChange={e => handleItemChange(item.id, 'product', e.target.value)} placeholder="Product Name" />
                                </div>
                                <div style={{...styles.itemCell, flex: 2}}>
                                    <input type="text" style={styles.tableInput} value={item.shade} onChange={e => handleItemChange(item.id, 'shade', e.target.value)} placeholder="Shade" />
                                </div>
                                <div style={{...styles.itemCell, flex: 1}}>
                                    <input type="text" style={styles.tableInput} value={item.size} onChange={e => handleItemChange(item.id, 'size', e.target.value)} placeholder="Size" />
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>
                                    <input type="number" style={{...styles.tableInput, textAlign: 'right'}} min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)} />
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>
                                    <input type="number" style={{...styles.tableInput, textAlign: 'right'}} min="0" value={item.price} onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right', padding: '8px'}}>
                                    {(item.quantity * item.price).toFixed(2)}
                                </div>
                                <div style={{...styles.itemCell, flex: '0 0 40px', justifyContent: 'center'}}>
                                    {items.length > 1 && <button onClick={() => handleRemoveItem(item.id)} style={styles.deleteButton}><TrashIcon /></button>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAddItem} style={styles.addButton}><PlusIcon /> Add Item</button>
                </div>

                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Order Summary</h2>
                    <div style={styles.summary}>
                        <div style={styles.summaryRow}><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                        <div style={styles.summaryRow}><span>GST (18%)</span><span>{gst.toFixed(2)}</span></div>
                        <div style={{...styles.summaryRow, ...styles.summaryTotal}}><span>Grand Total</span><span>{grandTotal.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    title: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark-grey)' },
    actions: { display: 'flex', gap: '0.75rem' },
    button: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' },
    card: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.5rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.75rem' },
    inputRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' },
    label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' },
    input: { width: '100%', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', backgroundColor: '#fff', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    tableInput: { width: '100%', padding: '8px', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', backgroundColor: 'var(--light-grey)', outline: 'none' },
    itemTable: { display: 'flex', flexDirection: 'column' },
    itemHeader: { display: 'flex', padding: '0 8px', borderBottom: '1px solid var(--skeleton-bg)', marginBottom: '0.5rem', color: 'var(--text-color)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' },
    itemRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
    itemCell: { padding: '4px', display: 'flex', alignItems: 'center' },
    deleteButton: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    addButton: { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: 'none', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 },
    summary: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-color)', fontSize: '0.9rem' },
    summaryTotal: { fontWeight: 600, color: 'var(--dark-grey)', fontSize: '1.1rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--skeleton-bg)' },
    suggestionsList: {
        listStyle: 'none',
        margin: '0.25rem 0 0',
        padding: '0.5rem 0',
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--skeleton-bg)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 10,
    },
    suggestionItem: {
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: 'var(--text-color)',
    },
    suggestionItemHover: {
        backgroundColor: 'var(--active-bg)',
    },
    addSuggestionItem: {
        color: 'var(--brand-color)',
        fontWeight: 500,
    },
};
