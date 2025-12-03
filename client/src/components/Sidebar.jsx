import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div style={{
            width: '200px',
            background: 'var(--surface-color)',
            borderRight: '1px solid var(--surface-border)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            <div className="logo" style={{ marginBottom: '3rem' }}>
                文件系统
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <Link to="/" className="btn" style={{
                    justifyContent: 'flex-start',
                    background: location.pathname === '/' ? '#eff6ff' : 'transparent',
                    color: location.pathname === '/' ? '#2563eb' : 'var(--text-primary)',
                    textDecoration: 'none'
                }}>
                    我的文件
                </Link>

                <Link to="/admin" className="btn" style={{
                    justifyContent: 'flex-start',
                    background: location.pathname === '/admin' ? '#eff6ff' : 'transparent',
                    color: location.pathname === '/admin' ? '#2563eb' : 'var(--text-primary)',
                    textDecoration: 'none'
                }}>
                    用户管理
                </Link>
            </nav>

            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
                <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    登录用户 <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{user.username}</span>
                </div>
                <button onClick={logout} className="btn btn-danger" style={{ width: '100%' }}>
                    退出登录
                </button>
            </div>
        </div >
    );
};

export default Sidebar;
