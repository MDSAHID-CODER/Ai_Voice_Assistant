import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Plus, Trash2, Save, RefreshCw } from 'lucide-react';

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM'); // ElevenLabs Rachel default
  const [fields, setFields] = useState([]); // Array of { name, type, description, required }
  
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sample voices
  const voices = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (ElevenLabs Female)' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (ElevenLabs Female)' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (ElevenLabs Female)' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (ElevenLabs Male)' },
    { id: 'VR6A4UBqhstbcqdja95R', name: 'Arnold (ElevenLabs Male)' }
  ];

  async function loadAgents() {
    try {
      const res = await axios.get('http://localhost:5000/api/agents');
      setAgents(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load agents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'string', description: '', required: false }]);
  };

  const handleRemoveField = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  const handleFieldChange = (index, key, val) => {
    const updated = [...fields];
    updated[index][key] = val;
    setFields(updated);
  };

  const startCreate = () => {
    setEditingId('new');
    setName('');
    setSystemPrompt('You are a friendly customer feedback assistant. Your goal is to collect feedback from recent service users. Keep answers brief and professional.');
    setFirstMessage('Hello, this is Rachel calling from our clinic. Do you have 2 minutes to share your feedback about your visit today?');
    setVoiceId('21m00Tcm4TlvDq8ikWAM');
    setFields([
      { name: 'rating', type: 'number', description: 'Overall visit rating out of 10', required: true },
      { name: 'improvement', type: 'string', description: 'What we can improve', required: false }
    ]);
    setError('');
    setSuccess('');
  };

  const startEdit = (agent) => {
    setEditingId(agent.id);
    setName(agent.name);
    setSystemPrompt(agent.systemPrompt);
    setFirstMessage(agent.firstMessage);
    setVoiceId(agent.voiceId);
    try {
      setFields(JSON.parse(agent.extractionSchema || '[]'));
    } catch (e) {
      setFields([]);
    }
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Field validations
    const invalidFields = fields.some(f => !f.name.trim());
    if (invalidFields) {
      setError('All extraction fields must have a name.');
      return;
    }

    setSaving(true);
    const payload = {
      name,
      systemPrompt,
      firstMessage,
      voiceId,
      extractionSchema: fields
    };

    try {
      if (editingId === 'new') {
        await axios.post('http://localhost:5000/api/agents', payload);
        setSuccess('Agent created and synced with Vapi successfully!');
      } else {
        await axios.put(`http://localhost:5000/api/agents/${editingId}`, payload);
        setSuccess('Agent updated and synced successfully!');
      }
      setEditingId(null);
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save agent config.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/agents/${id}`);
      loadAgents();
      setSuccess('Agent deleted successfully.');
    } catch (err) {
      setError('Failed to delete agent.');
    }
  };

  const handleForceSync = async (id) => {
    setSyncingId(id);
    setError('');
    setSuccess('');
    try {
      await axios.post(`http://localhost:5000/api/agents/${id}/sync`);
      setSuccess('Agent state synced with Vapi Cloud successfully.');
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync with Vapi.');
    } finally {
      setSyncingId(null);
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
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1>AI Voice Agents</h1>
          <p className="subtitle">Build and train AI call agents with custom personalities and voices</p>
        </div>
        {!editingId && (
          <button className="btn btn-primary" onClick={startCreate}>
            <Plus size={16} /> Create Agent
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {editingId ? (
        <form onSubmit={handleSave} className="card">
          <h2>{editingId === 'new' ? 'Create New Voice Agent' : 'Edit Voice Agent'}</h2>
          
          <div className="form-group">
            <label htmlFor="name">Agent Name</label>
            <input 
              type="text" 
              id="name" 
              className="form-control" 
              placeholder="e.g. Clinical Survey Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="voice">Voice Profile (ElevenLabs)</label>
              <select 
                id="voice" 
                className="form-control"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              >
                {voices.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="firstMessage">Greeting message (AI Speaks First)</label>
              <input 
                type="text" 
                id="firstMessage" 
                className="form-control" 
                placeholder="The first phrase the AI says upon contact answer"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prompt">System Instruction Prompt (Brain / Instructions)</label>
            <textarea 
              id="prompt" 
              className="form-control" 
              rows="6"
              style={{ resize: 'vertical' }}
              placeholder="Describe the agent's behavior, goal, questions to ask, and context rules."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '6px', display: 'block' }}>
              Tip: Instruct the agent to keep responses short. The OpenAI/Gemini models perform best with clear boundary instructions.
            </span>
          </div>

          {/* Dynamic Extraction Schema Builder */}
          <div style={{ marginTop: '30px' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Structured Data Extraction Schema
              </h3>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleAddField}>
                <Plus size={14} /> Add Extraction Field
              </button>
            </div>
            <p style={{ color: 'var(--text-dark)', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
              Define the information you want the AI to extract from the conversation transcript. 
              These fields will be sent directly to your database and forwarded via webhook to your CRM.
            </p>

            {fields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', border: '1px dashed var(--border-color)', borderRadius: '10px', color: 'var(--text-dark)', fontSize: '13px' }}>
                No extraction fields added. The transcript will be logged but no structured metrics will be isolated.
              </div>
            ) : (
              fields.map((field, idx) => (
                <div key={idx} className="field-row">
                  <input 
                    type="text" 
                    placeholder="Field Key (e.g. rating)" 
                    className="form-control" 
                    style={{ flex: 1 }}
                    value={field.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    required
                  />
                  <select 
                    className="form-control" 
                    style={{ width: '130px' }}
                    value={field.type}
                    onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                  >
                    <option value="string">String (Text)</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Instructions for AI (e.g. customer's score from 1-10)" 
                    className="form-control" 
                    style={{ flex: 2 }}
                    value={field.description}
                    onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                  />
                  
                  <button type="button" className="btn btn-danger" style={{ padding: '10px' }} onClick={() => handleRemoveField(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner"></span> : (
                <>
                  <Save size={16} /> Save & Deploy
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid-2">
          {agents.length === 0 ? (
            <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No AI voice agents defined yet. Click "Create Agent" to build your first voice model.
            </div>
          ) : (
            agents.map(agent => {
              let extractedFields = [];
              try {
                extractedFields = JSON.parse(agent.extractionSchema || '[]');
              } catch (e) {}

              return (
                <div key={agent.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="flex-between" style={{ marginBottom: '14px' }}>
                      <div className="flex-align">
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bot size={20} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{agent.name}</h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>ID: {agent.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px' }} 
                        title="Force sync config with Vapi Cloud"
                        disabled={syncingId === agent.id}
                        onClick={() => handleForceSync(agent.id)}
                      >
                        <RefreshCw size={14} className={syncingId === agent.id ? 'loading-spinner' : ''} />
                      </button>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                      {agent.systemPrompt}
                    </p>

                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 600 }}>Greeting:</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                        "{agent.firstMessage}"
                      </p>
                    </div>

                    {extractedFields.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 600 }}>Extractions:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {extractedFields.map((f, i) => (
                            <span key={i} style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {f.name} ({f.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => startEdit(agent)}>
                      Configure
                    </button>
                    <button className="btn btn-danger" style={{ padding: '10px' }} onClick={() => handleDelete(agent.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default Agents;
