import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PreviewModal from './PreviewModal';
import Sidebar from './Sidebar';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [currentFolder, setCurrentFolder] = useState(null); // null = root
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Home' }]);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [accessLevel, setAccessLevel] = useState('1');
    const [allUsers, setAllUsers] = useState([]);
    const [whitelist, setWhitelist] = useState([]);
    const [blacklist, setBlacklist] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [currentFolder, searchQuery]);

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/auth/users/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setAllUsers(data);
        }
    };

    const fetchFiles = async () => {
        const token = localStorage.getItem('token');
        let url = 'http://localhost:3000/api/files?';

        if (searchQuery) {
            url += `search=${encodeURIComponent(searchQuery)}&`;
        } else if (currentFolder) {
            url += `parent_id=${currentFolder}&`;
        }

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setFiles(data.items); // Now returns { items, total, ... }
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('access_level', accessLevel);
        if (whitelist.length > 0) formData.append('whitelist', '|' + whitelist.join('|') + '|');
        if (blacklist.length > 0) formData.append('blacklist', '|' + blacklist.join('|') + '|');

        if (currentFolder) {
            formData.append('parent_id', currentFolder);
        }

        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/files/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            fetchFiles();
            e.target.value = null;
        }
        setUploading(false);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        const token = localStorage.getItem('token');
        const body = {
            name: newFolderName,
            parent_id: currentFolder,
            access_level: accessLevel
        };
        if (whitelist.length > 0) body.whitelist = '|' + whitelist.join('|') + '|';
        if (blacklist.length > 0) body.blacklist = '|' + blacklist.join('|') + '|';

        const res = await fetch('http://localhost:3000/api/files/folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setNewFolderName('');
            fetchFiles();
        }
    };

    const handleRename = async (id) => {
        if (!renameValue.trim()) return;

        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: renameValue })
        });

        if (res.ok) {
            setRenamingId(null);
            fetchFiles();
        }
    };

    const navigateToFolder = (folderId, folderName) => {
        setCurrentFolder(folderId);
        // Update breadcrumbs
        const index = breadcrumbs.findIndex(b => b.id === folderId);
        if (index !== -1) {
            // Navigate back
            setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        } else {
            // Navigate forward
            setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
        }
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
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="animate-fade-in" style={{ flex: 1, marginLeft: '250px', padding: '2rem' }}>
                <header className="header">
                    <h2>My Files</h2>
                    <div className="nav-links" style={{ alignItems: 'center' }}>
                        {/* Header content moved to Sidebar mostly, keeping title here */}
                    </div>
                </header>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        {/* Breadcrumbs */}
                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                            {searchQuery ? (
                                <span>Search results for "{searchQuery}"</span>
                            ) : (
                                breadcrumbs.map((crumb, index) => (
                                    <React.Fragment key={crumb.id || 'root'}>
                                        {index > 0 && <span>/</span>}
                                        <span
                                            onClick={() => navigateToFolder(crumb.id, crumb.name)}
                                            style={{
                                                cursor: 'pointer',
                                                color: index === breadcrumbs.length - 1 ? 'white' : '#60a5fa',
                                                fontWeight: index === breadcrumbs.length - 1 ? 'bold' : 'normal'
                                            }}
                                        >
                                            {crumb.name}
                                        </span>
                                    </React.Fragment>
                                ))
                            )}
                        </div>

                        {/* Search Box */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '250px', paddingRight: '2rem' }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                        {!searchQuery && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <select
                                        className="input-field"
                                        value={accessLevel}
                                        onChange={(e) => setAccessLevel(e.target.value)}
                                        style={{ width: '120px' }}
                                        title="Minimum Access Level"
                                    >
                                        <option value="1">Staff</option>
                                        <option value="2">Manager</option>
                                        <option value="3">Director</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <select
                                        multiple
                                        className="input-field"
                                        value={whitelist}
                                        onChange={(e) => setWhitelist(Array.from(e.target.selectedOptions, option => option.value))}
                                        style={{ height: '40px', width: '120px', fontSize: '0.8rem' }}
                                        title="Whitelist (Hold Ctrl/Cmd to select multiple)"
                                    >
                                        <option disabled>Whitelist</option>
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <select
                                        multiple
                                        className="input-field"
                                        value={blacklist}
                                        onChange={(e) => setBlacklist(Array.from(e.target.selectedOptions, option => option.value))}
                                        style={{ height: '40px', width: '120px', fontSize: '0.8rem' }}
                                        title="Blacklist (Hold Ctrl/Cmd to select multiple)"
                                    >
                                        <option disabled>Blacklist</option>
                                        {allUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="New Folder"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        style={{ width: '150px', padding: '0.5rem' }}
                                    />
                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>+</button>
                                </form>
                            </div>
                        )}

                        {!searchQuery && (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                        )}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Type</th>
                                    <th>Level</th>
                                    {user.role === 'admin' && <th>Owner</th>}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.length === 0 ? (
                                    <tr>
                                        <td colSpan={user.role === 'admin' ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No files found
                                        </td>
                                    </tr>
                                ) : (
                                    files.map(file => (
                                        <tr key={file.id}>
                                            <td>
                                                {renamingId === file.id ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            className="input-field"
                                                            style={{ padding: '0.25rem', width: '150px' }}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleRename(file.id)} className="btn btn-primary" style={{ padding: '0.25rem' }}>✓</button>
                                                        <button onClick={() => setRenamingId(null)} className="btn" style={{ padding: '0.25rem' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span>{file.is_folder ? '📁' : '📄'}</span>
                                                        <span
                                                            onClick={() => {
                                                                if (file.is_folder) {
                                                                    navigateToFolder(file.id, file.filename);
                                                                } else {
                                                                    setSelectedFile(file);
                                                                }
                                                            }}
                                                            style={{
                                                                cursor: 'pointer',
                                                                color: file.is_folder ? '#f8fafc' : '#60a5fa',
                                                                fontWeight: file.is_folder ? 'bold' : 'normal',
                                                                textDecoration: file.is_folder ? 'none' : 'underline',
                                                                textUnderlineOffset: '4px'
                                                            }}
                                                        >
                                                            {file.filename}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{file.is_folder ? '-' : (file.size / 1024).toFixed(2) + ' KB'}</td>
                                            <td>{file.is_folder ? 'Folder' : file.mimetype}</td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: file.access_level === 3 ? 'rgba(239, 68, 68, 0.1)' : file.access_level === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: file.access_level === 3 ? '#ef4444' : file.access_level === 2 ? '#f59e0b' : '#34d399'
                                                }}>
                                                    {file.access_level === 3 ? 'Director' : file.access_level === 2 ? 'Manager' : 'Staff'}
                                                </span>
                                            </td>
                                            {user.role === 'admin' && <td>{file.owner_name || 'Me'}</td>}
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {!file.is_folder && (
                                                        <button
                                                            onClick={() => handleDownload(file.id, file.filename)}
                                                            className="btn"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}
                                                        >
                                                            Download
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setRenamingId(file.id);
                                                            setRenameValue(file.filename);
                                                        }}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}
                                                    >
                                                        Rename
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
        </div>
    );
};

export default Dashboard;
