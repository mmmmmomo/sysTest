import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div style={{
            width: '250px',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            <div className="logo" style={{ marginBottom: '2rem' }}>FileSys</div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <Link to="/" style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    color: isActive('/') ? 'white' : '#94a3b8',
                    backgroundColor: isActive('/') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span>📁</span> All Files
                </Link>

                {user.role === 'admin' && (
                    <Link to="/admin" style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        color: isActive('/admin') ? 'white' : '#94a3b8',
                        backgroundColor: isActive('/admin') ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <span>👥</span> User Management
                    </Link>
                )}
            </nav>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Logged in as <span style={{ color: 'white' }}>{user.username}</span>
                </div>
                <button onClick={logout} className="btn btn-danger" style={{ width: '100%' }}>
                    Logout
                </button>
            </div>
        </div >
    );
};

export default Sidebar;
