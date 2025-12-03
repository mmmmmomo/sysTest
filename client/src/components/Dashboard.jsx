import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, Link } from 'react-router-dom';
import PreviewModal from './PreviewModal';
import Sidebar from './Sidebar';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [currentFolder, setCurrentFolder] = useState(null); // null = root
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: '首页' }]);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [accessLevel, setAccessLevel] = useState('1');
    const [allUsers, setAllUsers] = useState([]);
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
            showToast('文件上传成功');
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
            showToast('文件夹创建成功');
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
            showToast('重命名成功');
        }
    };

    const handleAccessLevelChange = async (fileId, newLevel) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ access_level: newLevel })
        });

        if (res.ok) {
            fetchFiles();
            showToast('权限修改成功');
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
        if (!window.confirm('确定要删除吗？')) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchFiles();
            showToast('删除成功');
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

    const handleMove = async (fileId, targetFolderId, successMessage) => {
        if (String(fileId) === String(targetFolderId)) return;

        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/files/${fileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ parent_id: targetFolderId })
        });

        if (res.ok) {
            fetchFiles();
            showToast(successMessage || '移动成功');
        }
    };

    const handleDragStart = (e, file) => {
        e.dataTransfer.setData('fileId', file.id);
        e.dataTransfer.setData('fileName', file.filename);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, targetFile) => {
        if (targetFile.is_folder) {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
        }
    };

    const handleDragLeave = (e) => {
        e.currentTarget.style.background = '';
    };

    const handleDrop = (e, targetFolder) => {
        e.preventDefault();
        e.currentTarget.style.background = '';

        // Strict check: Only folders can receive drops
        if (!targetFolder.is_folder) return;

        const fileId = e.dataTransfer.getData('fileId');
        const fileName = e.dataTransfer.getData('fileName');
        if (fileId) {
            handleMove(fileId, targetFolder.id, `已移动 "${fileName}" 到 "${targetFolder.filename}"`);
        }
    };

    const handleNavigateUp = () => {
        if (breadcrumbs.length > 1) {
            const parent = breadcrumbs[breadcrumbs.length - 2];
            navigateToFolder(parent.id, parent.name);
        }
    };

    const handleDropToParent = (e) => {
        e.preventDefault();
        e.currentTarget.style.background = '';
        const fileId = e.dataTransfer.getData('fileId');
        const fileName = e.dataTransfer.getData('fileName');
        if (fileId && breadcrumbs.length > 1) {
            const parent = breadcrumbs[breadcrumbs.length - 2];
            handleMove(fileId, parent.id, `已移动 "${fileName}" 到 "${parent.name}"`);
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="animate-fade-in" style={{ flex: 1, marginLeft: '200px', padding: '1rem', width: 'calc(100% - 200px)', overflowX: 'hidden' }}>
                <header className="header">
                    <h2>我的文件</h2>
                    <div className="nav-links" style={{ alignItems: 'center' }}>
                        {/* Header content moved to Sidebar mostly, keeping title here */}
                    </div>
                </header>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        {/* Breadcrumbs */}
                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {searchQuery ? (
                                <span>"{searchQuery}" 的搜索结果</span>
                            ) : (
                                breadcrumbs.map((crumb, index) => (
                                    <React.Fragment key={crumb.id || 'root'}>
                                        {index > 0 && <span>/</span>}
                                        <span
                                            onClick={() => navigateToFolder(crumb.id, crumb.name)}
                                            style={{
                                                cursor: 'pointer',
                                                color: index === breadcrumbs.length - 1 ? 'var(--text-primary)' : '#2563eb',
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
                                placeholder="搜索文件..."
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
                                <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="新文件夹"
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
                                        {uploading ? '上传中...' : '上传文件'}
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>名称</th>
                                    <th>大小</th>
                                    <th>类型</th>
                                    <th>级别</th>
                                    {user.role === 'admin' && <th>所有者</th>}
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentFolder && (
                                    <tr
                                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                                        onDragLeave={(e) => e.currentTarget.style.background = ''}
                                        onDrop={handleDropToParent}
                                        onClick={handleNavigateUp}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>📁</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>..</span>
                                            </div>
                                        </td>
                                        <td>-</td>
                                        <td>上级目录</td>
                                        <td>-</td>
                                        {user.role === 'admin' && <td>-</td>}
                                        <td></td>
                                    </tr>
                                )}
                                {files.length === 0 ? (
                                    <tr>
                                        <td colSpan={user.role === 'admin' ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            暂无文件
                                        </td>
                                    </tr>
                                ) : (
                                    files.map(file => (
                                        <tr
                                            key={file.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, file)}
                                            onDragOver={(e) => handleDragOver(e, file)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, file)}
                                            style={{ cursor: 'grab' }}
                                        >
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
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%', height: '100%', padding: '0.5rem 0' }}
                                                        onClick={() => {
                                                            if (file.is_folder) {
                                                                navigateToFolder(file.id, file.filename);
                                                            } else {
                                                                setSelectedFile(file);
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1.2rem' }}>{file.is_folder ? '📁' : '📄'}</span>
                                                        <span
                                                            style={{
                                                                color: file.is_folder ? 'var(--text-primary)' : '#2563eb',
                                                                fontWeight: file.is_folder ? 'bold' : 'normal',
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            {file.filename}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{file.is_folder ? '-' : (file.size / 1024).toFixed(2) + ' KB'}</td>
                                            <td>{file.is_folder ? '文件夹' : file.mimetype}</td>
                                            <td>
                                                {(user.role === 'admin' || user.id === file.owner_id) ? (
                                                    <select
                                                        value={file.access_level}
                                                        onChange={(e) => handleAccessLevelChange(file.id, e.target.value)}
                                                        className="badge"
                                                        style={{
                                                            background: file.access_level === 3 ? 'rgba(239, 68, 68, 0.1)' : file.access_level === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: file.access_level === 3 ? '#ef4444' : file.access_level === 2 ? '#f59e0b' : '#34d399',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            appearance: 'none',
                                                            WebkitAppearance: 'none',
                                                            textAlign: 'center',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <option value="1" style={{ color: 'black' }}>员工</option>
                                                        <option value="2" style={{ color: 'black' }}>经理</option>
                                                        <option value="3" style={{ color: 'black' }}>总监</option>
                                                    </select>
                                                ) : (
                                                    <span className="badge" style={{
                                                        background: file.access_level === 3 ? 'rgba(239, 68, 68, 0.1)' : file.access_level === 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: file.access_level === 3 ? '#ef4444' : file.access_level === 2 ? '#f59e0b' : '#34d399'
                                                    }}>
                                                        {file.access_level === 3 ? '总监' : file.access_level === 2 ? '经理' : '员工'}
                                                    </span>
                                                )}
                                            </td>
                                            {user.role === 'admin' && <td>{file.owner_name || '我'}</td>}
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {!file.is_folder && (
                                                        <button
                                                            onClick={() => handleDownload(file.id, file.filename)}
                                                            className="btn"
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: '#eff6ff', color: '#2563eb', minWidth: '60px', justifyContent: 'center' }}
                                                        >
                                                            下载
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setRenamingId(file.id);
                                                            setRenameValue(file.filename);
                                                        }}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: '#f1f5f9', color: 'var(--text-secondary)', minWidth: '60px', justifyContent: 'center' }}
                                                    >
                                                        重命名
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(file.id)}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', minWidth: '60px', justifyContent: 'center' }}
                                                    >
                                                        删除
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
