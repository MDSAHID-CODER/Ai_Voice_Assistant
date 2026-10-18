import React, { useState } from 'react';
import axios from 'axios';
import { Mic } from 'lucide-react';

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@calling.ai');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    if (!email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      onLogin(response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to authenticate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: 'var(--primary-glow)',
            color: 'var(--primary)',
            marginBottom: '16px'
          }}>
            <Mic size={32} />
          </div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>VoiceAgent AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sign in to manage campaigns and voice configurations</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              className="form-control" 
              placeholder="e.g. admin@calling.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? <span className="loading-spinner"></span> : 'Sign In'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-dark)' }}>
          Tip: First-time logins auto-seed `admin@calling.ai` with `admin123`
        </div>
      </div>
    </div>
  );
}

export default Login;
