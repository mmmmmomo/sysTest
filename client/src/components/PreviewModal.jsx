import React, { useState, useEffect } from 'react';

const PreviewModal = ({ file, onClose }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (file && file.mimetype.startsWith('image/')) {
            loadPreview();
        }
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [file]);

    const loadPreview = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:3000/api/files/preview/${file.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load preview');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!file) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(20px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                padding: '1.5rem',
                borderRadius: '1rem',
                maxWidth: '90%',
                maxHeight: '90%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>{file.filename}</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '200px',
                    minWidth: '300px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '0.5rem',
                    overflow: 'hidden'
                }}>
                    {loading ? (
                        <div style={{ color: '#94a3b8' }}>Loading preview...</div>
                    ) : error ? (
                        <div style={{ color: '#ef4444' }}>{error}</div>
                    ) : file.mimetype.startsWith('image/') ? (
                        previewUrl && <img src={previewUrl} alt={file.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <p>Preview not available for this file type.</p>
                            <p style={{ fontSize: '0.875rem' }}>({file.mimetype})</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
