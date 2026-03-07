'use client';

import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { authFetch } from '@/lib/auth/auth-fetch';

interface WebhookLog {
    id: string;
    direction: string;
    status_code: number;
    payload: string;
    response: string;
    duration_ms: number;
    created_at: string;
}

export default function SettingsPage() {
    const { user, profile, tenant } = useAuth();
    const [businessName, setBusinessName] = useState('');
    const [chatbotName, setChatbotName] = useState('');
    const [email, setEmail] = useState('');
    const [adSpend, setAdSpend] = useState('');
    const [outboundUrl, setOutboundUrl] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Integration state
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [existingKeyPrefix, setExistingKeyPrefix] = useState('');
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [integrationMessage, setIntegrationMessage] = useState('');
    const [testingWebhook, setTestingWebhook] = useState(false);
    const [savingIntegration, setSavingIntegration] = useState(false);

    // Quiet hours state
    const [quietStart, setQuietStart] = useState('');
    const [quietEnd, setQuietEnd] = useState('');
    const [quietTz, setQuietTz] = useState('Europe/London');

    useEffect(() => {
        if (tenant) {
            setBusinessName(tenant.name || '');
            setChatbotName(tenant.chatbot_name || 'Alex');
            setAdSpend(String(tenant.monthly_ad_spend || ''));
            setOutboundUrl(tenant.outbound_webhook_url || '');
            setQuietStart(tenant.quiet_hours_start || '');
            setQuietEnd(tenant.quiet_hours_end || '');
            setQuietTz(tenant.quiet_hours_tz || 'Europe/London');
        }
        if (user) {
            setEmail(user.email || '');
        }
    }, [tenant, user]);

    // Fetch existing API key prefix + webhook logs
    useEffect(() => {
        if (!tenant) return;

        async function fetchIntegrationData() {
            const { data: keys } = await supabase
                .from('api_keys')
                .select('key_prefix, created_at')
                .eq('tenant_id', tenant!.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (keys && keys.length > 0) {
                setExistingKeyPrefix((keys[0] as any).key_prefix);
            }

            // Fetch logs
            try {
                const res = await authFetch(`/api/webhook/logs?tenant_id=${tenant!.id}`);
                const data = await res.json();
                if (data.logs) setWebhookLogs(data.logs);
            } catch {
                // Non-fatal
            }
        }

        fetchIntegrationData();
    }, [tenant]);

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage('');

        try {
            if (tenant) {
                const updatePayload = {
                    name: businessName,
                    chatbot_name: chatbotName,
                    monthly_ad_spend: adSpend ? parseFloat(adSpend) : 0,
                    quiet_hours_start: quietStart || null,
                    quiet_hours_end: quietEnd || null,
                    quiet_hours_tz: quietTz,
                };

                const res = await authFetch('/api/settings/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload),
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || 'Failed to save');
            }

            if (email !== user?.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
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
            const { error } = await supabase.auth.updateUser({ password: newPassword });
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

    const handleGenerateKey = async () => {
        if (!tenant) return;
        setGeneratingKey(true);
        try {
            const res = await authFetch('/api/webhook/generate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenant.id }),
            });
            const data = await res.json();
            if (data.api_key) {
                setApiKey(data.api_key);
                setExistingKeyPrefix(data.api_key.substring(0, 8));
                setIntegrationMessage('⚠️ Copy this key now — it will not be shown again!');
            } else {
                setIntegrationMessage('❌ ' + (data.error || 'Failed to generate key'));
            }
        } catch {
            setIntegrationMessage('❌ Failed to generate key');
        } finally {
            setGeneratingKey(false);
        }
    };

    const handleSaveOutbound = async () => {
        if (!tenant) return;
        setSavingIntegration(true);
        try {
            const { error } = await supabase
                .from('tenants' as any)
                .update({ outbound_webhook_url: outboundUrl } as any)
                .eq('id', tenant.id);
            if (error) throw error;
            setIntegrationMessage('✅ Outbound webhook URL saved!');
        } catch (err: any) {
            setIntegrationMessage('❌ ' + err.message);
        } finally {
            setSavingIntegration(false);
        }
    };

    const handleTestOutbound = async () => {
        if (!outboundUrl) {
            setIntegrationMessage('❌ Set an outbound webhook URL first');
            return;
        }
        setTestingWebhook(true);
        setIntegrationMessage('');
        try {
            const res = await fetch(outboundUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test.ping',
                    timestamp: new Date().toISOString(),
                    tenant_id: tenant?.id,
                    data: { message: 'Test ping from ReplyDesk' },
                }),
            });
            setIntegrationMessage(res.ok
                ? `✅ Test successful! Status: ${res.status}`
                : `⚠️ Received status ${res.status}`
            );
        } catch (err: any) {
            setIntegrationMessage(`❌ Connection failed: ${err.message}`);
        } finally {
            setTestingWebhook(false);
        }
    };

    const webhookBaseUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhook/inbound/`
        : '/api/webhook/inbound/';

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
                        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rd-settings-input" placeholder="Edge Talent" />
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Chatbot Name</label>
                        <input type="text" value={chatbotName} onChange={(e) => setChatbotName(e.target.value)} className="rd-settings-input" placeholder="Alex" />
                        <span className="rd-settings-hint">This is the name your chatbot uses when talking to leads</span>
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rd-settings-input" placeholder="you@company.com" />
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Monthly Ad Spend (£)</label>
                        <input type="number" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} className="rd-settings-input" placeholder="2000" min="0" step="100" />
                        <span className="rd-settings-hint">Used to calculate cost per lead and cost per booking on the dashboard</span>
                    </div>

                    {message && <div className="rd-settings-message">{message}</div>}

                    <button onClick={handleSaveProfile} disabled={saving} className="rd-settings-save">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>

                {/* ── Quiet Hours Section ── */}
                <div className="rd-settings-card">
                    <h2 className="rd-settings-card-title">Quiet Hours</h2>
                    <p className="rd-settings-card-desc">Messages will not be sent to leads during these hours. Sandbox is not affected.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="rd-settings-field">
                            <label className="rd-settings-label">Start Time</label>
                            <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="rd-settings-input" />
                        </div>
                        <div className="rd-settings-field">
                            <label className="rd-settings-label">End Time</label>
                            <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="rd-settings-input" />
                        </div>
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Timezone</label>
                        <select value={quietTz} onChange={(e) => setQuietTz(e.target.value)} className="rd-settings-input">
                            <option value="Europe/London">Europe/London (GMT/BST)</option>
                            <option value="America/New_York">America/New York (EST/EDT)</option>
                            <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                            <option value="America/Denver">America/Denver (MST/MDT)</option>
                            <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                            <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                            <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                            <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                        </select>
                    </div>

                    {quietStart && quietEnd && (
                        <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: '13px', fontWeight: 500 }}>
                            🌙 Messages will be paused from <strong>{quietStart}</strong> to <strong>{quietEnd}</strong> ({quietTz})
                        </div>
                    )}

                    {quietStart && quietEnd && (
                        <button
                            onClick={() => { setQuietStart(''); setQuietEnd(''); }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: '8px 0' }}
                        >
                            Disable Quiet Hours
                        </button>
                    )}

                    <button onClick={handleSaveProfile} disabled={saving} className="rd-settings-save">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>

                {/* ── Password Section ── */}
                <div className="rd-settings-card">
                    <h2 className="rd-settings-card-title">Change Password</h2>
                    <p className="rd-settings-card-desc">Update your account password</p>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">New Password</label>
                        <div className="rd-settings-input-wrap">
                            <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rd-settings-input" placeholder="••••••••" />
                            <button type="button" className="rd-settings-eye" onClick={() => setShowNewPw(!showNewPw)}>{showNewPw ? '🙈' : '👁️'}</button>
                        </div>
                    </div>

                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Confirm New Password</label>
                        <div className="rd-settings-input-wrap">
                            <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rd-settings-input" placeholder="••••••••" />
                            <button type="button" className="rd-settings-eye" onClick={() => setShowConfirmPw(!showConfirmPw)}>{showConfirmPw ? '🙈' : '👁️'}</button>
                        </div>
                    </div>

                    {passwordMessage && <div className="rd-settings-message">{passwordMessage}</div>}

                    <button onClick={handleChangePassword} disabled={passwordSaving} className="rd-settings-save">
                        {passwordSaving ? 'Updating…' : 'Update Password'}
                    </button>
                </div>

                {/* ── CRM Integration Section ── */}
                <div className="rd-settings-card">
                    <h2 className="rd-settings-card-title">🔌 CRM Integration</h2>
                    <p className="rd-settings-card-desc">
                        Connect your CRM to send leads in and receive booking updates
                    </p>

                    {/* Inbound Webhook URL */}
                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Inbound Webhook URL</label>
                        <p className="rd-settings-hint" style={{ marginBottom: 8 }}>
                            Configure your CRM to POST new leads to this URL
                        </p>
                        <div className="rd-settings-input-wrap">
                            <input
                                type="text"
                                readOnly
                                value={existingKeyPrefix
                                    ? `${webhookBaseUrl}${'•'.repeat(40)}`
                                    : 'Generate an API key first'
                                }
                                className="rd-settings-input"
                                style={{ fontFamily: 'monospace', fontSize: 12 }}
                            />
                            {existingKeyPrefix && apiKey && (
                                <button
                                    type="button"
                                    className="rd-settings-eye"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${webhookBaseUrl}${apiKey}`);
                                        setIntegrationMessage('✅ Copied to clipboard!');
                                    }}
                                >
                                    📋
                                </button>
                            )}
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="rd-settings-field">
                        <label className="rd-settings-label">API Key</label>
                        {apiKey ? (
                            <div className="rd-webhook-key-display">
                                <code>{apiKey}</code>
                                <button
                                    type="button"
                                    className="rd-settings-eye"
                                    onClick={() => {
                                        navigator.clipboard.writeText(apiKey);
                                        setIntegrationMessage('✅ Key copied!');
                                    }}
                                >
                                    📋
                                </button>
                            </div>
                        ) : existingKeyPrefix ? (
                            <p className="rd-settings-hint">
                                Active key: <code>{existingKeyPrefix}••••••••</code>
                            </p>
                        ) : null}
                        <button
                            onClick={handleGenerateKey}
                            disabled={generatingKey}
                            className="rd-settings-save"
                            style={{ marginTop: 8, background: existingKeyPrefix ? '#64748b' : undefined }}
                        >
                            {generatingKey ? 'Generating…' : existingKeyPrefix ? 'Regenerate Key' : 'Generate API Key'}
                        </button>
                    </div>

                    {/* Outbound Webhook */}
                    <div className="rd-settings-field">
                        <label className="rd-settings-label">Outbound Webhook URL</label>
                        <p className="rd-settings-hint" style={{ marginBottom: 8 }}>
                            We&apos;ll POST lead events (status changes, bookings) to this URL
                        </p>
                        <input
                            type="url"
                            value={outboundUrl}
                            onChange={(e) => setOutboundUrl(e.target.value)}
                            className="rd-settings-input"
                            placeholder="https://your-crm.com/webhook/replydesk"
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={handleSaveOutbound} disabled={savingIntegration} className="rd-settings-save">
                                {savingIntegration ? 'Saving…' : 'Save URL'}
                            </button>
                            <button
                                onClick={handleTestOutbound}
                                disabled={testingWebhook}
                                className="rd-settings-save"
                                style={{ background: '#f59e0b' }}
                            >
                                {testingWebhook ? 'Testing…' : '🧪 Test'}
                            </button>
                        </div>
                    </div>

                    {integrationMessage && (
                        <div className="rd-settings-message">{integrationMessage}</div>
                    )}

                    {/* Webhook Logs */}
                    {webhookLogs.length > 0 && (
                        <div className="rd-settings-field" style={{ marginTop: 16 }}>
                            <label className="rd-settings-label">Recent Webhook Activity</label>
                            <div className="rd-webhook-logs">
                                {webhookLogs.slice(0, 10).map((log) => (
                                    <div key={log.id} className="rd-webhook-log-item">
                                        <span className={`rd-webhook-log-badge ${log.status_code < 300 ? 'success' : 'error'}`}>
                                            {log.status_code || 'ERR'}
                                        </span>
                                        <span className="rd-webhook-log-dir">
                                            {log.direction === 'inbound' ? '📥' : '📤'}
                                        </span>
                                        <span className="rd-webhook-log-time">
                                            {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {log.duration_ms ? (
                                            <span className="rd-webhook-log-dur">{log.duration_ms}ms</span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payload Format Docs */}
                    <div className="rd-settings-field" style={{ marginTop: 16 }}>
                        <label className="rd-settings-label">Inbound Payload Format</label>
                        <pre className="rd-webhook-code">{`POST ${webhookBaseUrl}<your-api-key>
Content-Type: application/json

{
  "name": "Jane Smith",
  "phone": "+447123456789",
  "email": "jane@example.com",
  "source": "Instagram Ad",
  "notes": "Interested in headshots"
}`}</pre>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
