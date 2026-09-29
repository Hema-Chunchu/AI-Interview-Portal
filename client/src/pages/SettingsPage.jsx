import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

import SettingsTabs from '../components/settings/SettingsTabs';
import SettingsCard from '../components/settings/SettingsCard';
import ToggleRow from '../components/settings/ToggleRow';
import UnsavedChangesBar from '../components/settings/UnsavedChangesBar';
import Toast from '../components/settings/Toast';
import DeleteModal from '../components/settings/DeleteModal';

const API_BASE_URL = 'http://localhost:5000/api';
const TARGET_ROLES = ['Frontend', 'Backend', 'Full Stack', 'System Design'];

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const rawTab = searchParams.get('tab');
  const currentTab = ['account', 'notifications', 'security'].includes(rawTab) ? rawTab : 'account';

  const [loading, setLoading] = useState(true);
  const [savedSettings, setSavedSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Password state
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/me/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedSettings(response.data);
        setDraftSettings(response.data);
      } catch (err) {
        console.error('Failed to load settings:', err);
        showToast(err.response?.data?.message || 'Could not fetch settings from server.', 'error');
        const fallback = {
          name: localStorage.getItem('userName') || 'User',
          email: localStorage.getItem('userEmail') || 'user@example.com',
          college: '',
          targetRole: 'Full Stack',
          authProvider: 'email',
          interview: {
            level: 'Mid Level',
            questionCount: 4,
            timeLimitMin: 30,
            topics: ['React', 'Node.js'],
            voice: true,
            instantFeedback: true,
            saveRecordings: true
          },
          notifications: {
            reportReady: true,
            weeklySummary: true,
            practiceReminders: true,
            productUpdates: false
          }
        };
        setSavedSettings(fallback);
        setDraftSettings(fallback);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Check if draft differs from saved
  const hasUnsavedChanges =
    savedSettings &&
    draftSettings &&
    JSON.stringify(savedSettings) !== JSON.stringify(draftSettings);

  // Navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle tab change with unsaved warning
  const handleTabChange = (newTab) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes! Switch tab without saving?');
      if (!confirmLeave) return;
      setDraftSettings(JSON.parse(JSON.stringify(savedSettings)));
    }
    setSearchParams({ tab: newTab });
  };

  // Show auto-dismissing toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'success' });
    }, 4000);
  };

  // Field updater helpers
  const updateDraftRoot = (key, val) => {
    setDraftSettings((prev) => ({ ...prev, [key]: val }));
  };

  const updateDraftNotifications = (key, val) => {
    setDraftSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: val }
    }));
  };

  // Discard changes
  const handleDiscard = () => {
    setDraftSettings(JSON.parse(JSON.stringify(savedSettings)));
    showToast('Changes discarded', 'error');
  };

  // Save changes to Database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/users/me/settings`,
        draftSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = response.data.settings || draftSettings;
      setSavedSettings(updated);
      setDraftSettings(updated);

      if (updated.name) localStorage.setItem('userName', updated.name);

      showToast('Changes saved to database successfully!', 'success');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast(err.response?.data?.message || 'Failed to save changes to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Update Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordState;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await axios.put(
        `${API_BASE_URL}/users/me/password`,
        { currentPassword, newPassword, confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Delete Account from Database
  const handleDeleteAccountConfirm = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { email: draftSettings?.email || user?.email }
      });

      showToast(response.data.message || 'Account deleted permanently.', 'success');
      
      // Clear localStorage and auth state
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');

      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 500);

    } catch (err) {
      console.error('Failed to delete account:', err);
      showToast(err.response?.data?.message || 'Failed to delete account from database.', 'error');
      setIsDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header className="settings-page-header">
          <h1 className="settings-page-title">Settings</h1>
          <p style={{ color: 'var(--text-muted-ref)', fontSize: '0.95rem' }}>
            Manage your profile, notification preferences, and security settings.
          </p>
        </header>

        <SettingsTabs activeTab={currentTab} onTabChange={handleTabChange} />

        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: '', type: 'success' })}
          />
        )}

        {loading ? (
          <div className="settings-skeleton">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : (
          <div className="settings-content">
            {/* ================= ACCOUNT TAB ================= */}
            {currentTab === 'account' && draftSettings && (
              <>
                <SettingsCard
                  title="Profile Information"
                  hint="Update your basic account information and career goals."
                >
                  <div className="settings-grid">
                    <div className="settings-field">
                      <label className="settings-label" htmlFor="fullName">Full Name</label>
                      <input
                        id="fullName"
                        type="text"
                        className="settings-input"
                        value={draftSettings.name || ''}
                        onChange={(e) => updateDraftRoot('name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="emailAddress">Email Address</label>
                      <input
                        id="emailAddress"
                        type="email"
                        className="settings-input"
                        value={draftSettings.email || ''}
                        disabled
                        title="Email cannot be changed"
                      />
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="collegeName">College / University</label>
                      <input
                        id="collegeName"
                        type="text"
                        className="settings-input"
                        value={draftSettings.college || ''}
                        onChange={(e) => updateDraftRoot('college', e.target.value)}
                        placeholder="e.g. Stanford University"
                      />
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="targetRole">Target Role</label>
                      <select
                        id="targetRole"
                        className="settings-select"
                        value={draftSettings.targetRole || 'Full Stack'}
                        onChange={(e) => updateDraftRoot('targetRole', e.target.value)}
                      >
                        {TARGET_ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard
                  title="Connected Accounts"
                  hint="Social login providers linked to your candidate profile."
                >
                  <div className="connected-accounts-list">
                    <div className="account-provider-item">
                      <div className="account-provider-info">
                        <svg width="22" height="22" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        <span className="account-provider-name">Google</span>
                      </div>
                      {draftSettings.authProvider === 'google' ? (
                        <span className="badge-connected">✓ Connected</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary-outline"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                          onClick={() => showToast('Google SSO is connected for single sign-on.')}
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    <div className="account-provider-item">
                      <div className="account-provider-info">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#0077b5">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        <span className="account-provider-name">LinkedIn</span>
                      </div>
                      {draftSettings.authProvider === 'linkedin' ? (
                        <span className="badge-connected">✓ Connected</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary-outline"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                          onClick={() => showToast('LinkedIn OAuth is connected for single sign-on.')}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {/* ================= NOTIFICATIONS TAB ================= */}
            {currentTab === 'notifications' && draftSettings && (
              <SettingsCard
                title="Notification Preferences"
                hint="Choose how and when you receive portal alerts and progress updates."
              >
                <ToggleRow
                  id="toggle-report-ready"
                  label="Report Ready Alerts"
                  description="Notify when AI finishes evaluating your interview scorecard."
                  checked={draftSettings.notifications?.reportReady}
                  onChange={(val) => updateDraftNotifications('reportReady', val)}
                />

                <ToggleRow
                  id="toggle-weekly-summary"
                  label="Weekly Progress Summary"
                  description="Receive weekly analytics summarizing your score trends and skill growth."
                  checked={draftSettings.notifications?.weeklySummary}
                  onChange={(val) => updateDraftNotifications('weeklySummary', val)}
                />

                <ToggleRow
                  id="toggle-practice-reminders"
                  label="Practice Reminders"
                  description="Get scheduled reminders to keep your interview skills sharp."
                  checked={draftSettings.notifications?.practiceReminders}
                  onChange={(val) => updateDraftNotifications('practiceReminders', val)}
                />

                <ToggleRow
                  id="toggle-product-updates"
                  label="Product & Feature Updates"
                  description="Stay informed about new interview tracks and AI capabilities."
                  checked={draftSettings.notifications?.productUpdates}
                  onChange={(val) => updateDraftNotifications('productUpdates', val)}
                />
              </SettingsCard>
            )}

            {/* ================= SECURITY TAB ================= */}
            {currentTab === 'security' && draftSettings && (
              <>
                {draftSettings.authProvider === 'email' ? (
                  <SettingsCard
                    title="Change Password"
                    hint="Update your account password. Must be at least 8 characters."
                  >
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="settings-grid">
                        <div className="settings-field settings-grid-full">
                          <label className="settings-label" htmlFor="currentPassword">Current Password</label>
                          <input
                            id="currentPassword"
                            type="password"
                            className="settings-input"
                            placeholder="••••••••"
                            value={passwordState.currentPassword}
                            onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                            required
                          />
                        </div>

                        <div className="settings-field">
                          <label className="settings-label" htmlFor="newPassword">New Password</label>
                          <input
                            id="newPassword"
                            type="password"
                            className="settings-input"
                            placeholder="At least 8 characters"
                            value={passwordState.newPassword}
                            onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                            required
                          />
                        </div>

                        <div className="settings-field">
                          <label className="settings-label" htmlFor="confirmNewPassword">Confirm New Password</label>
                          <input
                            id="confirmNewPassword"
                            type="password"
                            className="settings-input"
                            placeholder="Re-enter new password"
                            value={passwordState.confirmPassword}
                            onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={isUpdatingPassword}
                          style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
                        >
                          {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </SettingsCard>
                ) : (
                  <SettingsCard
                    title="Password Management"
                    hint="Password management is disabled because your account uses social single sign-on."
                  >
                    <p style={{ color: 'var(--text-muted-ref)', fontSize: '0.9rem' }}>
                      You logged in using <strong>{draftSettings.authProvider.toUpperCase()}</strong> authentication. Password reset is managed directly through your provider.
                    </p>
                  </SettingsCard>
                )}

                <SettingsCard
                  title="Danger Zone"
                  hint="Permanently delete your user profile and all interview recordings."
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ color: 'var(--danger-ref)', fontSize: '1rem', marginBottom: '0.25rem' }}>Delete Account</h4>
                      <p style={{ color: 'var(--text-muted-ref)', fontSize: '0.85rem' }}>
                        Once deleted, your interview scorecards and transcripts cannot be recovered.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ background: 'var(--danger-ref)', borderColor: 'var(--danger-ref)', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      Delete Account...
                    </button>
                  </div>
                </SettingsCard>
              </>
            )}
          </div>
        )}

        {hasUnsavedChanges && (
          <UnsavedChangesBar
            onDiscard={handleDiscard}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}

        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteAccountConfirm}
          isDeleting={isDeletingAccount}
        />
      </main>
    </div>
  );
};

export default SettingsPage;
