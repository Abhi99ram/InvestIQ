'use client';
import { useState, useEffect } from 'react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers(); // Initial fetch

    // Real-time polling every 3 seconds
    const intervalId = setInterval(() => {
      fetchUsers(false); // pass false to avoid showing loading state on every poll
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Add a timestamp cache buster to bypass any aggressive browser/edge caching
      const res = await fetch(`/api/admin/users?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
    if (showLoading) setLoading(false);
  };

  const testAlert = async (user) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user,
          alertDetails: { symbol: 'ADMIN.TEST', message: 'Admin triggered a manual test alert.' }
        })
      });
      const data = await res.json();
      if (data.emailPreviewUrl) {
        window.open(data.emailPreviewUrl, '_blank');
        alert(`Test alert sent to ${user.email} & ${user.mobile}!\nCheck server logs for SMS and the opened tab for the Email.`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to trigger alert');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="section-header">
        <h1 className="section-title">👑 Host Admin Dashboard</h1>
        <button className="btn btn-secondary" onClick={fetchUsers}>Refresh</button>
      </div>

      <div className="card">
        <h3>Registered Users ({users.length})</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users registered yet.</p>
        ) : (
          <table className="data-table" style={{ marginTop: '20px' }}>
            <thead>
              <tr>
                <th>ID / Created</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {u.id}<br/>{new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td><strong>{u.email}</strong></td>
                  <td>{u.mobile || '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => testAlert(u)}>
                      Send Test Alert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
