import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(4px)'
        }}>
            <span>{type === 'error' ? '✕' : '✓'}</span>
            <span>{message}</span>
        </div>
    );
};

export default Toast;
