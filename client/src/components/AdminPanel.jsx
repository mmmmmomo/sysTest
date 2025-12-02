import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure? This will delete all user files.')) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchUsers();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    };

    return (
        <div className="container animate-fade-in">
            <header className="header">
                <div className="logo">Admin Panel</div>
                <div className="nav-links">
                    <Link to="/" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none' }}>
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <div className="card">
                <h3>User Management</h3>
                <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        {user.role !== 'admin' && (
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="btn"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                            >
                                                Delete User
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
