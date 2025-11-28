
import React, { useState } from 'react';
import { DeletedOrders as DeletedOrdersComponent } from './deletedorders';
import { ExpiredOrders as ExpiredOrdersComponent } from './expiredorders';

export const InactiveOrders = () => {
    const [activeView, setActiveView] = useState('deleted'); // 'deleted' or 'expired'

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.toggleWrapper}>
                    <button 
                        onClick={() => setActiveView('deleted')}
                        style={activeView === 'deleted' ? styles.toggleButtonActive : styles.toggleButton}
                    >
                        Deleted Orders
                    </button>
                    <button 
                        onClick={() => setActiveView('expired')}
                        style={activeView === 'expired' ? styles.toggleButtonActive : styles.toggleButton}
                    >
                        Expired Orders
                    </button>
                </div>
            </div>
            <div style={styles.contentContainer}>
                {activeView === 'deleted' ? <DeletedOrdersComponent /> : <ExpiredOrdersComponent />}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--light-grey)',
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        paddingBottom: 0,
        flexShrink: 0,
    },
    toggleWrapper: {
        display: 'flex',
        backgroundColor: 'var(--gray-5)',
        borderRadius: '18px',
        padding: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    toggleButton: {
        padding: '0.5rem 1.5rem',
        fontSize: '0.9rem',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--text-color)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderRadius: '6px',
        fontWeight: 500,
    },
    toggleButtonActive: {
        padding: '0.5rem 1.5rem',
        fontSize: '0.9rem',
        border: 'none',
        backgroundColor: 'var(--card-bg)',
        color: 'var(--dark-grey)',
        cursor: 'pointer',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        fontWeight: 600,
    },
    contentContainer: {
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
    },
};