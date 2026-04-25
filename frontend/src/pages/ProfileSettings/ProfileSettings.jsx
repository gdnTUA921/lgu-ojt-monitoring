import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileApi, usersApi, ASSET_URL } from '../../services/api';
import { FaUser, FaShieldAlt, FaKey, FaCamera, FaIdCard, FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';
import { IoWarning } from "react-icons/io5";
import './ProfileSettings.css';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const isAdmin = user?.user_type === 'admin';

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    middle_name: user?.middle_name || '',
    last_name: user?.last_name || '',
    contact_num: user?.contact_num || '',
    email: user?.email || '',
  });

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [editingPw, setEditingPw] = useState(false);
  const [is2FA, setIs2FA] = useState(user?.is_2fa_enabled || false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await profileApi.get();
      const p = res.profile;
      setForm({
        first_name: p.first_name || '',
        middle_name: p.middle_name || '',
        last_name: p.last_name || '',
        contact_num: p.contact_num || '',
        email: p.email || '',
      });
      setIs2FA(!!p.is_2fa_enabled);
      updateUser(p); // Sync AuthContext
    } catch (err) {
      setMsg('Failed to load profile data.');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Guard
    if (!form.middle_name.trim()) {
      setMsg('Middle name is required.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await profileApi.update(form);
      updateUser(form);
      setMsg('Profile updated successfully.');
    } catch (err) { setMsg(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle2FA = async () => {
    try {
      await profileApi.updateSecurity({ is_2fa_enabled: !is2FA });
      setIs2FA(!is2FA);
      updateUser({ is_2fa_enabled: !is2FA });
    } catch (err) { setMsg(err.message); }
  };

  const pwRules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
    { label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
    { label: 'One symbol (!@#$…)', test: (p) => /[^a-zA-Z0-9]/.test(p) },
  ];
  const pwStrong = (p) => pwRules.every(r => r.test(p));

  const handlePasswordUpdate = async () => {
    if (!pwForm.current_password) {
      showToast('Please enter your current password.', 'error');
      return;
    }
    if (!pwStrong(pwForm.new_password)) {
      showToast('Password does not meet the requirements below.', 'error');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await profileApi.updateSecurity({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      });
      showToast('Password updated successfully.', 'success');
      setEditingPw(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pfpic', file);

    setSaving(true);
    setMsg('');
    try {
      const res = await profileApi.updatePhoto(formData);
      console.log('Upload response:', res);
      // Always refetch to get authoritative server state
      await fetchProfileData();
      setMsg('Profile photo updated successfully.');
    } catch (err) {
      setMsg(err.message || 'Failed to upload photo.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const initials = `${(user?.first_name || '')[0] || ''}${(user?.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <>
      <div className="profile" id="profile-settings">
        <div className="manage-page__header" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="manage-page__title">Profile Settings</h2>
        </div>

        {msg && <div className={`chip chip--${msg.includes('success') ? 'success' : 'error'}`} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', width: 'fit-content' }}>{msg}</div>}

        {/* Virtual ID Card */}
        <div className="profile__virtual-id" id="virtual-id">
          <div className="profile__id-header">
            <div className="profile__id-logo">LGU</div>
            <span className="profile__id-org">City of Mandaluyong • OJT Monitoring</span>
          </div>
          <div className="profile__id-name">{user?.first_name} {user?.middle_name ? `${user.middle_name[0]}.` : ''} {user?.last_name}</div>
          <div className="profile__id-role">{user?.user_type?.toUpperCase()}</div>
          <div className="profile__id-details">
            <div className="profile__id-field">
              <span className="profile__id-field-label">Email Address</span>
              <span className="profile__id-field-value">{user?.email}</span>
            </div>
            <div className="profile__id-field">
              <span className="profile__id-field-label">User ID</span>
              <span className="profile__id-field-value">#{user?.user_id || '---'}</span>
            </div>
          </div>
        </div>

        <div className="profile__grid">
          {/* Profile Info Section */}
          <div className="profile__section">
            <h3 className="profile__section-title"><FaUser style={{ marginRight: '8px' }} /> User Profile</h3>

            <div className="profile__avatar-row">
              <div className="profile__avatar">
                {user?.pfpic ? (
                  <img src={`${ASSET_URL}/${user.pfpic}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <input
                  type="file"
                  id="pfpic-input"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => document.getElementById('pfpic-input').click()}
                  disabled={saving}
                >
                  <FaCamera style={{ marginRight: '8px' }} /> Change Photo
                </button>
                <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>JPG or PNG only. Max 2MB.</span>
              </div>
            </div>

            {!isAdmin && (
              <div className="chip chip--warning" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-3)', borderRadius: 12, padding: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
                <IoWarning size={40} /> Only administrators can modify official profile details. Please contact the IT department for changes.
              </div>
            )}

            <form className="manage-page__form" onSubmit={handleProfileSave}>
              <div className="manage-page__form-row">
                <div className="form-group">
                  <label className="form-group__label">First Name</label>
                  <input
                    className="input"
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-group">
                  <label className="form-group__label">Middle Name</label>
                  <input
                    className="input"
                    value={form.middle_name}
                    onChange={e => setForm({ ...form, middle_name: e.target.value })}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-group__label">Last Name</label>
                  <input
                    className="input"
                    value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="manage-page__form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-group__label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-group" style={{ flex: 1.5 }}>
                  <label className="form-group__label">Contact</label>
                  <input
                    className="input"
                    value={form.contact_num}
                    onChange={e => setForm({ ...form, contact_num: e.target.value })}
                    readOnly={!isAdmin}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {isAdmin && (
                <button type="submit" className="btn btn--primary" disabled={saving} id="save-profile" style={{ width: '100%' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </form>
          </div>

          {/* Security Section */}
          <div className="profile__section">
            <h3 className="profile__section-title"><FaShieldAlt style={{ marginRight: '8px' }} /> Account Security</h3>

            <div className="profile__2fa-toggle">
              <div className="profile__2fa-info">
                <span className="profile__2fa-label">Two-Factor Authentication</span>
                <span className="profile__2fa-desc">Add extra security verify email via code.</span>
              </div>
              <label className="profile__switch">
                <input type="checkbox" checked={is2FA} onChange={handleToggle2FA} id="toggle-2fa" />
                <span className="profile__switch-slider" />
              </label>
            </div>

            <div style={{ marginTop: 'var(--space-6)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)', fontWeight: 600 }}>Password Management</h4>
              {!editingPw ? (
                <button
                  type="button"
                  className="btn btn--outline"
                  id="change-password"
                  style={{ width: '100%' }}
                  onClick={() => setEditingPw(true)}
                >
                  <FaKey style={{ marginRight: '8px' }} /> Update Password
                </button>
              ) : (
                <div className="manage-page__form" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-group__label">Current Password</label>
                    <div className="login__input-wrapper">
                      <input
                        className="input"
                        type={showPw.current ? "text" : "password"}
                        value={pwForm.current_password}
                        onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="login__password-toggle"
                        onClick={() => setShowPw({ ...showPw, current: !showPw.current })}
                      >
                        {showPw.current ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">New Password</label>
                    <div className="login__input-wrapper">
                      <input
                        className="input"
                        type={showPw.new ? "text" : "password"}
                        value={pwForm.new_password}
                        onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="login__password-toggle"
                        onClick={() => setShowPw({ ...showPw, new: !showPw.new })}
                      >
                        {showPw.new ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {pwForm.new_password && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {pwRules.map(rule => {
                          const passed = rule.test(pwForm.new_password);
                          return (
                            <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span style={{ color: passed ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700, lineHeight: 1 }}>
                                {passed ? '✓' : '✗'}
                              </span>
                              <span style={{ color: passed ? 'var(--color-success)' : 'var(--color-on-surface-variant)' }}>
                                {rule.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-group__label">Confirm New Password</label>
                    <div className="login__input-wrapper">
                      <input
                        className="input"
                        type={showPw.confirm ? "text" : "password"}
                        value={pwForm.confirm}
                        onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                      />
                      <button
                        type="button"
                        className="login__password-toggle"
                        onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
                      >
                        {showPw.confirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                    <button type="button" className="btn btn--primary btn--sm" style={{ flex: 1 }} onClick={handlePasswordUpdate} disabled={saving}>Update</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingPw(false)} style={{ flex: 1 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          padding: '1rem 1.5rem', borderRadius: '8px', color: 'white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          backgroundColor: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
        }}>
          {toast.type === 'success' ? <FaCheck /> : <FaTimes />}
          <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{toast.message}</span>
        </div>
      )}
    </>
  );
}
