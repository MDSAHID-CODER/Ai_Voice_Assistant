import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, ShieldCheck, Key } from 'lucide-react';

function Credentials() {
  const [vapiApiKey, setVapiApiKey] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioNumber, setTwilioNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    async function loadCredentials() {
      try {
        const response = await axios.get('http://localhost:5000/api/credentials');
        const data = response.data;
        setVapiApiKey(data.vapiApiKey || '');
        setTwilioSid(data.twilioSid || '');
        setTwilioToken(data.twilioToken || '');
        setTwilioNumber(data.twilioNumber || '');
      } catch (err) {
        console.error("Failed to load credentials", err);
      } finally {
        setLoading(false);
      }
    }
    loadCredentials();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await axios.post('http://localhost:5000/api/credentials', {
        vapiApiKey,
        twilioSid,
        twilioToken,
        twilioNumber
      });
      setMessage({ text: 'Credentials updated successfully!', type: 'success' });
      
      // Reload credentials to fetch newly masked values
      const response = await axios.get('http://localhost:5000/api/credentials');
      const data = response.data;
      setVapiApiKey(data.vapiApiKey || '');
      setTwilioSid(data.twilioSid || '');
      setTwilioToken(data.twilioToken || '');
      setTwilioNumber(data.twilioNumber || '');
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to save credentials.', type: 'error' });
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: '750px' }}>
      <h1>API Configurations</h1>
      <p className="subtitle">Configure your third-party API credentials to establish calling routes</p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <h2>
          <span className="flex-align" style={{ gap: '10px' }}>
            <Key size={20} style={{ color: 'var(--primary)' }} />
            Provider Credentials
          </span>
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
          We use Vapi AI for low-latency dialogue orchestration, which handles speech-to-text and text-to-speech. 
          To make phone calls, Vapi routes them through your Twilio account.
        </p>

        <div className="form-group">
          <label htmlFor="vapiApiKey">Vapi Private API Key</label>
          <input 
            type="password" 
            id="vapiApiKey" 
            className="form-control"
            placeholder="e.g. vapi-api-key-xxxxxxxx"
            value={vapiApiKey}
            onChange={(e) => setVapiApiKey(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '6px', display: 'block' }}>
            Obtained from Vapi Dashboard &gt; Keys &gt; Account Token.
          </span>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '28px 0' }} />

        <h2>Twilio Configuration (Optional for POC Sandbox)</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
          To place actual phone calls, configure Twilio. If left empty, Vapi can run web-based audio testing or use default trial numbers.
        </p>

        <div className="form-group">
          <label htmlFor="twilioSid">Twilio Account SID</label>
          <input 
            type="text" 
            id="twilioSid" 
            className="form-control"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={twilioSid}
            onChange={(e) => setTwilioSid(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="twilioToken">Twilio Auth Token</label>
          <input 
            type="password" 
            id="twilioToken" 
            className="form-control"
            placeholder="Twilio Auth Token"
            value={twilioToken}
            onChange={(e) => setTwilioToken(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="twilioNumber">Vapi Phone Number ID (UUID)</label>
          <input 
            type="text" 
            id="twilioNumber" 
            className="form-control"
            placeholder="e.g. 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
            value={twilioNumber}
            onChange={(e) => setTwilioNumber(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '6px', display: 'block' }}>
            In the Vapi Dashboard &gt; Phone Numbers, click "Import Number" or "Buy Number", connect your Twilio credentials, and copy the Vapi Phone Number ID (UUID). If left empty, Vapi uses its free default sandbox number.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading-spinner"></span> : (
              <>
                <Save size={16} /> Save Configurations
              </>
            )}
          </button>
        </div>
      </form>

      <div className="card" style={{ border: '1px dashed var(--success)', background: 'rgba(16, 185, 129, 0.02)' }}>
        <h3 className="flex-align" style={{ color: 'var(--success)', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
          <ShieldCheck size={18} />
          POC Sandbox Testing Guidelines
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          You can test outbound calling using <strong>Vapi's $10 free signup credit</strong>. When you register, Vapi provides a testing web client. To route to actual phone numbers, you can purchase a Twilio trial number (costing ~$1.15) and register it in the Vapi console, or verify your personal number on Twilio to place calls to yourself for free.
        </p>
      </div>
    </div>
  );
}

export default Credentials;
