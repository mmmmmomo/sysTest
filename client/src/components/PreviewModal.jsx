import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const PreviewModal = ({ file, onClose }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (file && (
            file.mimetype.startsWith('image/') ||
            file.mimetype === 'application/pdf' ||
            file.mimetype.startsWith('text/') ||
            file.mimetype.startsWith('audio/') ||
            file.mimetype.startsWith('video/') ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )) {
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
            if (!res.ok) throw new Error('加载预览失败');

            const blob = await res.blob();

            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                const buffer = await blob.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const html = XLSX.utils.sheet_to_html(sheet);
                setPreviewUrl(html);
            } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const buffer = await blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
                setPreviewUrl(result.value);
            } else {
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            }
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
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                border: 'none',
                boxShadow: 'none'
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
                        <div style={{ color: '#94a3b8' }}>正在加载预览...</div>
                    ) : error ? (
                        <div style={{ color: '#ef4444' }}>{error}</div>
                    ) : file.mimetype.startsWith('image/') ? (
                        previewUrl && <img src={previewUrl} alt={file.filename} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                    ) : file.mimetype === 'application/pdf' ? (
                        previewUrl && <iframe src={previewUrl} title={file.filename} style={{ width: '100%', height: '70vh', border: 'none' }} />
                    ) : file.mimetype.startsWith('text/') ? (
                        previewUrl && <iframe src={previewUrl} title={file.filename} style={{ width: '100%', height: '70vh', border: 'none', background: 'white' }} />
                    ) : file.mimetype.startsWith('audio/') ? (
                        previewUrl && <audio controls src={previewUrl} style={{ width: '100%' }} />
                    ) : file.mimetype.startsWith('video/') ? (
                        previewUrl && <video controls src={previewUrl} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
                    ) : file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? (
                        previewUrl && (
                            <div style={{ width: '100%', height: '100%', overflow: 'auto', background: 'white', color: 'black', padding: '1rem' }}>
                                <style>{`
                                    .excel-preview table { border-collapse: collapse; min-width: 100%; font-family: Calibri, sans-serif; font-size: 14px; }
                                    .excel-preview td { border: 1px solid #d4d4d4; padding: 4px 8px; white-space: nowrap; }
                                    .excel-preview tr:first-child td { background-color: #f3f3f3; font-weight: bold; text-align: center; border-bottom: 2px solid #d4d4d4; }
                                `}</style>
                                <div className="excel-preview" dangerouslySetInnerHTML={{ __html: previewUrl }} />
                            </div>
                        )
                    ) : file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                        previewUrl && (
                            <div
                                style={{ width: '100%', height: '100%', overflow: 'auto', background: 'white', padding: '2rem', color: 'black' }}
                                dangerouslySetInnerHTML={{ __html: previewUrl }}
                            />
                        )
                    ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                            <p>此文件类型暂不支持预览。</p>
                            <p style={{ fontSize: '0.875rem' }}>({file.mimetype})</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
