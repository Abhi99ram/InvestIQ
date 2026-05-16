'use client';
import { useState, useEffect } from 'react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '' });

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
      if (data.emailSent || data.emailPreviewUrl) {
        if (data.emailPreviewUrl) window.open(data.emailPreviewUrl, '_blank');
        alert(`Test alert sent to ${user.email} & ${user.mobile}!`);
      } else {
        alert('Test alert processed, but email might not have sent. Check server logs.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to trigger alert');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name || '', email: user.email || '', mobile: user.mobile || '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: editingUser.email,
          name: editForm.name,
          email: editForm.email,
          mobile: editForm.mobile
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('User updated successfully');
        setEditingUser(null);
        fetchUsers(false);
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Network error while updating user');
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
                <th>Name</th>
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
                  <td><strong>{u.name || '-'}</strong></td>
                  <td><strong>{u.email}</strong></td>
                  <td>{u.mobile || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => testAlert(u)}>
                        Test Alert
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEditClick(u)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit User Details</h3>
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-input" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
