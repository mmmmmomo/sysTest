import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import UserDetailModal from './UserDetailModal';

const UserManagement = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState([]); // Mixed groups and users
    const [currentGroup, setCurrentGroup] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: '组织架构' }]);
    const [newGroupName, setNewGroupName] = useState('');
    const [renamingItem, setRenamingItem] = useState(null); // { id, type }
    const [renameValue, setRenameValue] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, [currentGroup]);

    const fetchData = async () => {
        const token = localStorage.getItem('token');

        // Fetch Subgroups
        let groupUrl = 'http://localhost:3000/api/groups';
        if (currentGroup) groupUrl += `?parent_id=${currentGroup}`;
        const groupRes = await fetch(groupUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const groups = groupRes.ok ? await groupRes.json() : [];

        // Fetch Users
        let userUrl = 'http://localhost:3000/api/admin/users';
        if (currentGroup) userUrl += `?group_id=${currentGroup}`;
        const userRes = await fetch(userUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        const users = userRes.ok ? await userRes.json() : [];

        // Combine and sort (groups first)
        const combined = [
            ...groups.map(g => ({ ...g, type: 'group' })),
            ...users.map(u => ({ ...u, type: 'user' }))
        ];
        setItems(combined);
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newGroupName, parent_id: currentGroup })
        });

        if (res.ok) {
            setNewGroupName('');
            fetchData();
            showToast('部门创建成功');
        }
    };

    const navigateToGroup = (groupId, groupName) => {
        if (groupId === currentGroup) return;

        if (groupId === null) {
            setBreadcrumbs([{ id: null, name: '组织架构' }]);
            setCurrentGroup(null);
        } else {
            // Check if we are going back
            const index = breadcrumbs.findIndex(b => b.id === groupId);
            if (index !== -1) {
                setBreadcrumbs(breadcrumbs.slice(0, index + 1));
            } else {
                setBreadcrumbs([...breadcrumbs, { id: groupId, name: groupName }]);
            }
            setCurrentGroup(groupId);
        }
    };

    const handleNavigateUp = () => {
        if (breadcrumbs.length > 1) {
            const parent = breadcrumbs[breadcrumbs.length - 2];
            navigateToGroup(parent.id, parent.name);
        }
    };

    const handleRename = async (id, type) => {
        if (!renameValue.trim()) return;

        const token = localStorage.getItem('token');
        let url, body;

        if (type === 'user') {
            url = `http://localhost:3000/api/admin/users/${id}`;
            body = { username: renameValue };
        } else {
            url = `http://localhost:3000/api/groups/${id}`;
            body = { name: renameValue };
        }

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setRenamingItem(null);
            fetchData();
            showToast('重命名成功');
        }
    };

    const handleUpdatePosition = async (userId, newPosition) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/position`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ position: newPosition })
        });
        if (res.ok) {
            fetchData();
            showToast('职位更新成功');
        }
    };

    // Note: Moving users/groups not implemented in this simplified version, 
    // but structure supports it (just update parent_id/group_id).

    const handleMove = async (draggedItem, targetGroup) => {
        if (draggedItem.id === targetGroup.id && draggedItem.type === 'group') return;

        const token = localStorage.getItem('token');
        let url, body;

        if (draggedItem.type === 'user') {
            url = `http://localhost:3000/api/admin/users/${draggedItem.id}/group`;
            body = { group_id: targetGroup.id };
        } else {
            url = `http://localhost:3000/api/groups/${draggedItem.id}`;
            body = { parent_id: targetGroup.id };
        }

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            fetchData();
            showToast(`已移动 "${draggedItem.name}" 到 "${targetGroup.name}"`);
        }
    };

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('item', JSON.stringify({
            id: item.id,
            type: item.type,
            name: item.name || item.username
        }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, targetItem) => {
        if (targetItem.type === 'group') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
        }
    };

    const handleDragLeave = (e) => {
        e.currentTarget.style.background = '';
    };

    const handleDrop = (e, targetGroup) => {
        e.preventDefault();
        e.currentTarget.style.background = '';
        const data = e.dataTransfer.getData('item');
        if (data) {
            const draggedItem = JSON.parse(data);
            handleMove(draggedItem, targetGroup);
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="animate-fade-in" style={{ flex: 1, marginLeft: '200px', padding: '1rem', width: 'calc(100% - 200px)', overflowX: 'hidden' }}>
                <header className="header">
                    <h1>用户管理</h1>
                    <div className="user-info">
                        <span>{user.username} ({user.role})</span>
                    </div>
                </header>

                <div className="card">
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.id || 'root'}>
                                {index > 0 && <span>/</span>}
                                <span
                                    onClick={() => navigateToGroup(crumb.id, crumb.name)}
                                    style={{
                                        cursor: 'pointer',
                                        color: index === breadcrumbs.length - 1 ? 'var(--text-primary)' : '#2563eb',
                                        fontWeight: index === breadcrumbs.length - 1 ? 'bold' : 'normal'
                                    }}
                                >
                                    {crumb.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Toolbar */}
                    {user.role === 'admin' && (
                        <div style={{ marginBottom: '2rem' }}>
                            <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="新部门"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    style={{ width: '200px', padding: '0.5rem' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>+ 添加部门</button>
                            </form>
                        </div>
                    )}

                    {/* List */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>名称</th>
                                    <th>类型</th>
                                    <th>职位/角色</th>
                                    {user.role === 'admin' && <th>操作</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {currentGroup && (
                                    <tr
                                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                                        onDragLeave={(e) => e.currentTarget.style.background = ''}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.background = '';
                                            const data = e.dataTransfer.getData('item');
                                            if (data && breadcrumbs.length > 1) {
                                                const parent = breadcrumbs[breadcrumbs.length - 2];
                                                const draggedItem = JSON.parse(data);
                                                handleMove(draggedItem, { id: parent.id, name: parent.name });
                                            }
                                        }}
                                        onClick={handleNavigateUp}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>📁</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>..</span>
                                            </div>
                                        </td>
                                        <td>上级目录</td>
                                        <td>-</td>
                                        {user.role === 'admin' && <td>-</td>}
                                    </tr>
                                )}
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            空部门
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr
                                            key={`${item.type}-${item.id}`}
                                            draggable={user.role === 'admin'}
                                            onDragStart={(e) => user.role === 'admin' && handleDragStart(e, item)}
                                            onDragOver={(e) => user.role === 'admin' && handleDragOver(e, item)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => user.role === 'admin' && handleDrop(e, item)}
                                            style={{ cursor: user.role === 'admin' ? 'grab' : 'default' }}
                                        >
                                            <td>
                                                {renamingItem && renamingItem.id === item.id && renamingItem.type === item.type ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            className="input-field"
                                                            style={{ padding: '0.25rem', width: '150px' }}
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleRename(item.id, item.type)} className="btn btn-primary" style={{ padding: '0.25rem' }}>✓</button>
                                                        <button onClick={() => setRenamingItem(null)} className="btn" style={{ padding: '0.25rem' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%', height: '100%', padding: '0.5rem 0' }}
                                                        onClick={() => {
                                                            if (item.type === 'group') {
                                                                navigateToGroup(item.id, item.name);
                                                            } else {
                                                                setSelectedUser(item.id);
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1.2rem' }}>{item.type === 'group' ? '📁' : '👤'}</span>
                                                        <span style={{ fontWeight: item.type === 'group' ? 'bold' : 'normal', color: item.type === 'group' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                            {item.name || item.username}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{item.type === 'group' ? '部门' : '用户'}</td>
                                            <td>
                                                {item.type === 'user' && (
                                                    user.role === 'admin' ? (
                                                        <select
                                                            value={item.position || 'Staff'}
                                                            onChange={(e) => handleUpdatePosition(item.id, e.target.value)}
                                                            className="input-field"
                                                            style={{
                                                                padding: '0.25rem',
                                                                fontSize: '0.875rem',
                                                                background: item.position === 'Director' ? '#fee2e2' : item.position === 'Manager' ? '#fef3c7' : '#d1fae5',
                                                                color: item.position === 'Director' ? '#991b1b' : item.position === 'Manager' ? '#92400e' : '#065f46',
                                                                border: '1px solid rgba(0,0,0,0.1)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="Staff" style={{ color: 'black' }}>员工</option>
                                                            <option value="Manager" style={{ color: 'black' }}>经理</option>
                                                            <option value="Director" style={{ color: 'black' }}>总监</option>
                                                        </select>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.25rem 0.5rem',
                                                            fontSize: '0.875rem',
                                                            borderRadius: '0.25rem',
                                                            background: item.position === 'Director' ? '#fee2e2' : item.position === 'Manager' ? '#fef3c7' : '#d1fae5',
                                                            color: item.position === 'Director' ? '#991b1b' : item.position === 'Manager' ? '#92400e' : '#065f46',
                                                            border: '1px solid rgba(0,0,0,0.1)'
                                                        }}>
                                                            {item.position === 'Director' ? '总监' : item.position === 'Manager' ? '经理' : '员工'}
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td>
                                                {user.role === 'admin' && (
                                                    <button
                                                        onClick={() => {
                                                            setRenamingItem({ id: item.id, type: item.type });
                                                            setRenameValue(item.name || item.username);
                                                        }}
                                                        className="btn"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: '#f1f5f9', color: 'var(--text-secondary)' }}
                                                    >
                                                        重命名
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {selectedUser && (
                <UserDetailModal
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
};

export default UserManagement;
