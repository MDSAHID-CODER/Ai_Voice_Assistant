import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Share2, RefreshCw, Send, HelpCircle, AlertCircle } from 'lucide-react';

function CrmIntegration() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [authHeaderName, setAuthHeaderName] = useState('X-API-Key');
  const [authHeaderVal, setAuthHeaderVal] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Test State
  const [testUrl, setTestUrl] = useState('');
  const [testHeaderName, setTestHeaderName] = useState('X-API-Key');
  const [testHeaderVal, setTestHeaderVal] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    async function loadCrmConfig() {
      try {
        const response = await axios.get('http://localhost:5000/api/crm');
        const data = response.data;
        setWebhookUrl(data.webhookUrl || '');
        setAuthHeaderName(data.authHeaderName || 'X-API-Key');
        setAuthHeaderVal(data.authHeaderVal || '');
        setIsEnabled(data.isEnabled || false);
        
        // Sync test fields with active values initially
        setTestUrl(data.webhookUrl || '');
        setTestHeaderName(data.authHeaderName || 'X-API-Key');
        setTestHeaderVal(data.authHeaderVal || '');
      } catch (err) {
        console.error("Failed to load CRM configurations", err);
      } finally {
        setLoading(false);
      }
    }
    loadCrmConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await axios.post('http://localhost:5000/api/crm', {
        webhookUrl,
        authHeaderName,
        authHeaderVal,
        isEnabled
      });
      setMessage({ text: 'CRM integration configurations saved successfully!', type: 'success' });
      
      // Update test inputs
      setTestUrl(response.data.webhookUrl || '');
      setTestHeaderName(response.data.authHeaderName || 'X-API-Key');
      setTestHeaderVal(response.data.authHeaderVal || '');
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to save CRM settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (e) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/crm/test', {
        webhookUrl: testUrl,
        authHeaderName: testHeaderName,
        authHeaderVal: testHeaderVal
      });
      
      setTestResult({
        success: true,
        status: response.data.status,
        statusText: response.data.statusText,
        data: response.data.data
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
        response: err.response?.data?.response || null
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <span className="loading-spinner" style={{ width: '40px', height: '40px' }}></span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px' }}>
      <h1>CRM & ERP Integrations</h1>
      <p className="subtitle">Configurable outbound webhooks to map call extractions directly to external systems</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'flex-start', gap: '30px' }}>
        
        {/* Active Webhook Form */}
        <form onSubmit={handleSave} className="card">
          <h2>
            <span className="flex-align" style={{ gap: '10px' }}>
              <Share2 size={20} style={{ color: 'var(--primary)' }} />
              Webhook Dispatcher
            </span>
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
            Whenever an AI call completes, this server fires an HTTP POST request containing structured JSON variables, cost, durations, and transcript summary.
          </p>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <input 
              type="checkbox" 
              id="isEnabled" 
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            <label htmlFor="isEnabled" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontWeight: 600, color: '#fff' }}>
              Enable CRM Outbound Syncing
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="webhookUrl">Target Webhook Endpoint URL</label>
            <input 
              type="url" 
              id="webhookUrl" 
              className="form-control"
              placeholder="e.g. https://hooks.zapier.com/hooks/catch/123/abc"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required={isEnabled}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="headerName">Security Header Name</label>
              <input 
                type="text" 
                id="headerName" 
                className="form-control"
                placeholder="e.g. Authorization"
                value={authHeaderName}
                onChange={(e) => setAuthHeaderName(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="headerVal">Security Header Value</label>
              <input 
                type="password" 
                id="headerVal" 
                className="form-control"
                placeholder="Header Value / Token"
                value={authHeaderVal}
                onChange={(e) => setAuthHeaderVal(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner"></span> : 'Save Integration'}
            </button>
          </div>
        </form>

        {/* Webhook Testing Console */}
        <div className="card">
          <h2>Webhook Testing Console</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
            Verify your external server successfully parses call payloads. (Use services like Webhook.site for testing endpoints).
          </p>

          <form onSubmit={handleTestWebhook}>
            <div className="form-group">
              <label htmlFor="testUrl">Test Destination URL</label>
              <input 
                type="url" 
                id="testUrl" 
                className="form-control"
                placeholder="e.g. https://webhook.site/xxx-xxx-xxx"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Auth Header Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={testHeaderName}
                  onChange={(e) => setTestHeaderName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Auth Header Value</label>
                <input 
                  type="password" 
                  className="form-control"
                  placeholder="Token"
                  value={testHeaderVal}
                  onChange={(e) => setTestHeaderVal(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', gap: '8px' }} disabled={testLoading}>
              {testLoading ? <span className="loading-spinner"></span> : (
                <>
                  <Send size={14} /> Dispatch Test Payload
                </>
              )}
            </button>
          </form>

          {/* Test responses */}
          {testResult && (
            <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }}>
              <h3 className="flex-align" style={{ fontSize: '13px', fontWeight: 600, color: testResult.success ? 'var(--success)' : 'var(--error)', marginBottom: '8px' }}>
                <AlertCircle size={16} />
                {testResult.success ? `Success Code: ${testResult.status} ${testResult.statusText}` : 'Integration Test Failed'}
              </h3>
              
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '10px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 600 }}>Response Payload:</span>
                <pre style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {testResult.success 
                    ? JSON.stringify(testResult.data, null, 2) 
                    : `Error message: ${testResult.message}\nServer Response: ${JSON.stringify(testResult.response, null, 2)}`}
                </pre>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Webhook Payload Guidelines */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3 className="flex-align" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
          Outbound Webhook JSON Spec
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
          Your CRM/ERP backend will receive an HTTP POST request with a header matching your safety settings. The request body matches the standard JSON format shown below:
        </p>
        <pre style={{ fontSize: '12px', padding: '16px', borderRadius: '10px', backgroundColor: '#000', color: 'var(--success)', overflowX: 'auto', fontFamily: 'monospace' }}>
{`{
  "event": "call.completed",
  "timestamp": "2026-06-18T12:00:00.000Z",
  "data": {
    "callId": "c47b59e3-8687-4ee4-90fa-400908ebbb21",
    "vapiCallId": "call_vapi_xxx_xxx",
    "contactName": "Rahul",
    "contactPhone": "+919876543210",
    "campaignName": "Appointment Followups",
    "agentName": "Rachel AI Survey",
    "duration": 54, // seconds
    "status": "completed", // completed, failed
    "recordingUrl": "https://api.vapi.ai/recording-path.mp3",
    "transcript": "AI: Hello Mr Rahul... Customer: Yes I am here... AI: On a scale 1-10...",
    "cost": 0.08,
    "extractions": {
      "rating": "8",
      "reason": "Waiting room waiting time was slightly long"
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}

export default CrmIntegration;
