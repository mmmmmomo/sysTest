import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]); // Mixed groups and users
    const [currentGroup, setCurrentGroup] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Organization' }]);
    const [newGroupName, setNewGroupName] = useState('');
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
        }
    };

    const navigateToGroup = (groupId, groupName) => {
        if (groupId === currentGroup) return;

        if (groupId === null) {
            setBreadcrumbs([{ id: null, name: 'Organization' }]);
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
        if (res.ok) fetchData();
    };

    // Note: Moving users/groups not implemented in this simplified version, 
    // but structure supports it (just update parent_id/group_id).

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="main-content">
                <header className="header">
                    <h1>User Management</h1>
                    <div className="user-info">
                        <span>{user.username} ({user.role})</span>
                    </div>
                </header>

                <div className="card">
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.id || 'root'}>
                                {index > 0 && <span>/</span>}
                                <span
                                    onClick={() => navigateToGroup(crumb.id, crumb.name)}
                                    style={{
                                        cursor: 'pointer',
                                        color: index === breadcrumbs.length - 1 ? 'white' : '#60a5fa',
                                        fontWeight: index === breadcrumbs.length - 1 ? 'bold' : 'normal'
                                    }}
                                >
                                    {crumb.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Toolbar */}
                    <div style={{ marginBottom: '2rem' }}>
                        <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="New Department"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                style={{ width: '200px', padding: '0.5rem' }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>+ Add Department</button>
                        </form>
                    </div>

                    {/* List */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Position/Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            Empty department
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: item.type === 'group' ? 'pointer' : 'default' }}
                                                    onClick={() => item.type === 'group' && navigateToGroup(item.id, item.name)}
                                                >
                                                    <span style={{ fontSize: '1.2rem' }}>{item.type === 'group' ? '📁' : '👤'}</span>
                                                    <span style={{ fontWeight: item.type === 'group' ? 'bold' : 'normal', color: item.type === 'group' ? '#e2e8f0' : '#94a3b8' }}>
                                                        {item.name || item.username}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>{item.type === 'group' ? 'Department' : 'User'}</td>
                                            <td>
                                                {item.type === 'user' && (
                                                    <select
                                                        value={item.position || 'Staff'}
                                                        onChange={(e) => handleUpdatePosition(item.id, e.target.value)}
                                                        className="input-field"
                                                        style={{
                                                            padding: '0.25rem',
                                                            fontSize: '0.875rem',
                                                            background: item.position === 'Director' ? 'rgba(239, 68, 68, 0.1)' : item.position === 'Manager' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: item.position === 'Director' ? '#ef4444' : item.position === 'Manager' ? '#f59e0b' : '#34d399',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="Staff" style={{ color: 'black' }}>Staff</option>
                                                        <option value="Manager" style={{ color: 'black' }}>Manager</option>
                                                        <option value="Director" style={{ color: 'black' }}>Director</option>
                                                    </select>
                                                )}
                                            </td>
                                            <td>
                                                {/* Actions like delete/move could go here */}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
