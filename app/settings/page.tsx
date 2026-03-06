'use client';

import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function SettingsPage() {
    const { user, profile, tenant } = useAuth();
    const [businessName, setBusinessName] = useState('');
    const [chatbotName, setChatbotName] = useState('');
    const [email, setEmail] = useState('');
    const [adSpend, setAdSpend] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    useEffect(() => {
        if (tenant) {
            setBusinessName(tenant.name || '');
            setChatbotName(tenant.chatbot_name || 'Alex');
            setAdSpend(String(tenant.monthly_ad_spend || ''));
        }
        if (user) {
            setEmail(user.email || '');
        }
    }, [tenant, user]);

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage('');

        try {
            // Update tenant name & chatbot name & ad spend
            if (tenant) {
                const { error: tenantError } = await supabase
                    .from('tenants' as any)
                    .update({
                        name: businessName,
                        chatbot_name: chatbotName,
                        monthly_ad_spend: adSpend ? parseFloat(adSpend) : 0,
                    } as any)
                    .eq('id', tenant.id);

                if (tenantError) throw tenantError;
            }

            // Update email if changed
            if (email !== user?.email) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: email,
                });
                if (emailError) throw emailError;
            }

            setMessage('✅ Settings saved successfully!');
        } catch (err: any) {
            setMessage('❌ ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordMessage('❌ Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage('❌ Password must be at least 6 characters');
            return;
        }

        setPasswordSaving(true);
        setPasswordMessage('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) throw error;

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMessage('✅ Password updated successfully!');
        } catch (err: any) {
            setPasswordMessage('❌ ' + err.message);
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <AppShell title="Settings">
            <div className="rd-settings">
                {/* ── Profile Section ── */}
                <div className="rd-settings-card">
                    <h2 className="rd-settings-card-title">Business Profile</h2>
                    <p className="rd-settings-card-desc">
                        Manage your business name and chatbot personality
                    </p>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Business Name</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="rd-settings-input"
                            placeholder="Edge Talent"
                        />
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Chatbot Name</label>
                        <input
                            type="text"
                            value={chatbotName}
                            onChange={(e) => setChatbotName(e.target.value)}
                            className="rd-settings-input"
                            placeholder="Alex"
                        />
                        <span className="rd-settings-hint">
                            This is the name your chatbot uses when talking to leads
                        </span>
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rd-settings-input"
                            placeholder="you@company.com"
                        />
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Monthly Ad Spend (£)</label>
                        <input
                            type="number"
                            value={adSpend}
                            onChange={(e) => setAdSpend(e.target.value)}
                            className="rd-settings-input"
                            placeholder="2000"
                            min="0"
                            step="100"
                        />
                        <span className="rd-settings-hint">
                            Used to calculate cost per lead and cost per booking on the dashboard
                        </span>
                    </div>

                    {message && (
                        <div className="rd-settings-message">{message}</div>
                    )}

                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="rd-settings-save"
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>

                {/* ── Password Section ── */}
                <div className="rd-settings-card">
                    <h2 className="rd-settings-card-title">Change Password</h2>
                    <p className="rd-settings-card-desc">
                        Update your account password
                    </p>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">New Password</label>
                        <div className="rd-settings-input-wrap">
                            <input
                                type={showNewPw ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="rd-settings-input"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="rd-settings-eye"
                                onClick={() => setShowNewPw(!showNewPw)}
                                aria-label="Toggle password visibility"
                            >
                                {showNewPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Confirm New Password</label>
                        <div className="rd-settings-input-wrap">
                            <input
                                type={showConfirmPw ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rd-settings-input"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="rd-settings-eye"
                                onClick={() => setShowConfirmPw(!showConfirmPw)}
                                aria-label="Toggle password visibility"
                            >
                                {showConfirmPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {passwordMessage && (
                        <div className="rd-settings-message">{passwordMessage}</div>
                    )}

                    <button
                        onClick={handleChangePassword}
                        disabled={passwordSaving}
                        className="rd-settings-save"
                    >
                        {passwordSaving ? 'Updating…' : 'Update Password'}
                    </button>
                </div>
            </div>
        </AppShell>
    );
}
