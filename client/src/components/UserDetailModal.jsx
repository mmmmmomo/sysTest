import React, { useEffect, useState } from 'react';

const UserDetailModal = ({ userId, onClose }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:3000/api/admin/users/${userId}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
            setLoading(false);
        };
        fetchDetails();
    }, [userId]);

    if (!userId) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>用户详情</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <p>加载中...</p>
                    ) : user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="detail-row">
                                <span className="label">用户名:</span>
                                <span className="value">{user.username}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">角色:</span>
                                <span className="value">{user.role}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">职位:</span>
                                <span className="value">
                                    {user.position === 'Director' ? '总监' : user.position === 'Manager' ? '经理' : '员工'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="label">文件数量:</span>
                                <span className="value">{user.file_count}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">已用空间:</span>
                                <span className="value">{(user.total_size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                        </div>
                    ) : (
                        <p>加载失败</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-primary">关闭</button>
                </div>
            </div>
            <style>{`
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #eee;
                }
                .label {
                    font-weight: bold;
                    color: var(--text-secondary);
                }
                .value {
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
};

export default UserDetailModal;
