import React, { useState, useMemo } from 'react';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export const NewOrderEntry = () => {
    const [customerName, setCustomerName] = useState('');
    const [customerCode, setCustomerCode] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState([{ id: 1, product: '', shade: '', size: '', quantity: 1, price: 0 }]);

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
                    <h2 style={styles.cardTitle}>Customer Details</h2>
                    <div style={styles.inputRow}>
                        <div style={styles.inputGroup}>
                            <label htmlFor="customerName" style={styles.label}>Customer Name</label>
                            <input type="text" id="customerName" style={styles.input} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. John Doe" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label htmlFor="customerCode" style={styles.label}>Customer Code</label>
                            <input type="text" id="customerCode" style={styles.input} value={customerCode} onChange={e => setCustomerCode(e.target.value)} placeholder="e.g. CUST-001" />
                        </div>
                    </div>
                     <div style={styles.inputGroup}>
                        <label htmlFor="orderDate" style={styles.label}>Order Date</label>
                        <input type="date" id="orderDate" style={styles.input} value={orderDate} onChange={e => setOrderDate(e.target.value)} />
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
};
