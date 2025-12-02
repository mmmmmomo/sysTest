import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PreviewModal from './PreviewModal';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/files', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setFiles(data);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/files/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            fetchFiles();
        }
        setUploading(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchFiles();
        }
    };

    const handleDownload = async (id, filename) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/download/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    };

    return (
        <div className="container animate-fade-in">
            <header className="header">
                <div className="logo">FileSys</div>
                <div className="nav-links" style={{ alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user.username}</span>
                    {user.role === 'admin' && (
                        <Link to="/admin" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none' }}>
                            Admin Panel
                        </Link>
                    )}
                    <button onClick={logout} className="btn btn-danger">Logout</button>
                </div>
            </header>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3>My Files</h3>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            id="file-upload"
                            style={{ display: 'none' }}
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <label htmlFor="file-upload" className="btn btn-primary">
                            {uploading ? 'Uploading...' : 'Upload File'}
                        </label>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Type</th>
                                {user.role === 'admin' && <th>Owner</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.length === 0 ? (
                                <tr>
                                    <td colSpan={user.role === 'admin' ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No files found
                                    </td>
                                </tr>
                            ) : (
                                files.map(file => (
                                    <tr key={file.id}>
                                        <td>
                                            <span
                                                onClick={() => setSelectedFile(file)}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: '#60a5fa',
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: '4px'
                                                }}
                                            >
                                                {file.filename}
                                            </span>
                                        </td>
                                        <td>{(file.size / 1024).toFixed(2)} KB</td>
                                        <td>{file.mimetype}</td>
                                        {user.role === 'admin' && <td>{file.owner_name || 'Me'}</td>}
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleDownload(file.id, file.filename)}
                                                    className="btn"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(file.id)}
                                                    className="btn"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedFile && (
                <PreviewModal
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
