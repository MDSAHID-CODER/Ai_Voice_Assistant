import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PhoneCall, Plus, Play, Info, Check, AlertTriangle, ChevronRight, X, FileText, Download } from 'lucide-react';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  
  // Drill-down Detail State
  const [activeCampaign, setActiveCampaign] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add direct recipient & individual dial states
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [dialingContactId, setDialingContactId] = useState(null);

  const handleAddContactDirectly = async (e) => {
    e.preventDefault();
    if (!newContactPhone) {
      setError('Phone number is required to add a recipient.');
      return;
    }
    setError('');
    setSuccess('');
    setAddingContact(true);
    try {
      await axios.post(`http://localhost:5000/api/campaigns/${activeCampaign.id}/contacts`, {
        name: newContactName || 'Customer',
        phone: newContactPhone
      });
      setSuccess('Recipient added successfully!');
      setNewContactName('');
      setNewContactPhone('');
      await viewCampaignDetail(activeCampaign.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add recipient.');
    } finally {
      setAddingContact(false);
    }
  };

  const handleDialIndividual = async (contactId) => {
    setError('');
    setSuccess('');
    setDialingContactId(contactId);
    try {
      await axios.post(`http://localhost:5000/api/campaigns/contacts/${contactId}/dial`);
      setSuccess('Call initiated successfully for this contact!');
      await viewCampaignDetail(activeCampaign.id);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to initiate individual call.');
    } finally {
      setDialingContactId(null);
    }
  };

  async function loadData() {
    try {
      const campRes = await axios.get('http://localhost:5000/api/campaigns');
      setCampaigns(campRes.data);
      
      const agentRes = await axios.get('http://localhost:5000/api/agents');
      setAgents(agentRes.data);
      if (agentRes.data.length > 0 && !agentId) {
        setAgentId(agentRes.data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch campaigns or agents.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Poll active campaigns every 5 seconds for status updates
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !agentId || !csvFile) {
      setError('Please provide a campaign name, select an agent, and upload a contacts CSV.');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('agentId', agentId);
    formData.append('csv', csvFile);

    try {
      await axios.post('http://localhost:5000/api/campaigns', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Campaign created successfully!');
      setName('');
      setCsvFile(null);
      setCreating(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartCampaign = async (id) => {
    setStartingId(id);
    setError('');
    try {
      await axios.post(`http://localhost:5000/api/campaigns/${id}/start`);
      setSuccess('Campaign dialing routine initiated successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start campaign.');
    } finally {
      setStartingId(null);
    }
  };

  const viewCampaignDetail = async (id) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/campaigns/${id}`);
      setActiveCampaign(res.data);
    } catch (err) {
      setError('Failed to load campaign details.');
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,phone,appointment_date,doctor_name\nRahul Sharma,+919876543210,June 20th at 10 AM,Dr. Sen\nJohn Doe,+15555555555,June 21st at 2 PM,Dr. Smith";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Are you sure you want to delete this campaign and all its call logs?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/campaigns/${id}`);
      setSuccess('Campaign deleted.');
      if (activeCampaign && activeCampaign.id === id) {
        setActiveCampaign(null);
      }
      loadData();
    } catch (err) {
      setError('Failed to delete campaign.');
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
          <h1>Voice Campaigns</h1>
          <p className="subtitle">Launch, pause, and track outbound dialing batches</p>
        </div>
        {!creating && !activeCampaign && (
          <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={agents.length === 0}>
            <Plus size={16} /> New Campaign
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Creation Modal View */}
      {creating && (
        <form onSubmit={handleCreateCampaign} className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h2>Create Voice Campaign</h2>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setCreating(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="campName">Campaign Name</label>
            <input 
              type="text" 
              id="campName" 
              className="form-control" 
              placeholder="e.g. Post-Appointment Feedback Batch A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="campAgent">AI Voice Agent</label>
            <select 
              id="campAgent" 
              className="form-control"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Upload Recipient List (CSV)</label>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={downloadSampleCsv}>
                <Download size={14} /> Download Sample CSV
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>
                CSV must contain "name" and "phone" columns (others will be parsed as variables).
              </span>
            </div>

            <div className="upload-zone" onClick={() => document.getElementById('csvInput').click()}>
              <FileText size={36} className="upload-icon" />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>
                {csvFile ? csvFile.name : 'Click to browse and upload your contacts file'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-dark)', marginTop: '4px' }}>
                Supports standard comma-separated spreadsheets (.csv)
              </p>
              <input 
                type="file" 
                id="csvInput" 
                accept=".csv" 
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner"></span> : 'Create Batch'}
            </button>
          </div>
        </form>
      )}

      {/* Campaign Drilldown View */}
      {activeCampaign && (
        <div>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', marginBottom: '8px' }} onClick={() => setActiveCampaign(null)}>
                &larr; Back to Campaigns
              </button>
              <h2>Campaign: {activeCampaign.name}</h2>
              <span className="flex-align" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Using Agent: <strong style={{ color: '#fff' }}>{activeCampaign.agent.name}</strong>
              </span>
            </div>
            
            <div className="flex-align">
              {activeCampaign.status === 'PENDING' && (
                <button 
                  className="btn btn-primary" 
                  disabled={startingId === activeCampaign.id}
                  onClick={() => { handleStartCampaign(activeCampaign.id); viewCampaignDetail(activeCampaign.id); }}
                >
                  <Play size={14} /> Start Call Queue
                </button>
              )}
              <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => handleDeleteCampaign(activeCampaign.id)}>
                Delete Batch
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2>Call Recipients List ({activeCampaign.contacts.length})</h2>
            </div>

            {/* Direct Add Recipient Form */}
            <form onSubmit={handleAddContactDirectly} style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '24px', 
              padding: '16px', 
              borderRadius: '12px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              alignItems: 'flex-end',
              flexWrap: 'wrap'
            }}>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Recipient Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  className="form-control" 
                  style={{ padding: '8px 12px' }}
                  value={newContactName} 
                  onChange={e => setNewContactName(e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
                <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 9250******" 
                  className="form-control" 
                  style={{ padding: '8px 12px' }}
                  value={newContactPhone} 
                  onChange={e => setNewContactPhone(e.target.value)} 
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={addingContact}>
                {addingContact ? <span className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '1px' }}></span> : <><Plus size={14} /> Add Recipient</>}
              </button>
            </form>

            {activeCampaign.contacts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No contacts found in this campaign.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Recipient Name</th>
                      <th>Phone</th>
                      <th>Custom Variables</th>
                      <th>Status</th>
                      <th>Latest Dial Record</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaign.contacts.map((contact) => (
                      <tr key={contact.id}>
                        <td style={{ fontWeight: 500 }}>{contact.name}</td>
                        <td>{contact.phone}</td>
                        <td>
                          {Object.keys(contact.variables).length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {Object.entries(contact.variables).map(([k, v]) => (
                                <span key={k} style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: '4px' }}>
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dark)', fontSize: '12px' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${contact.status.toLowerCase()}`}>
                            {contact.status}
                          </span>
                        </td>
                        <td>
                          {contact.latestCall ? (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              Duration: {contact.latestCall.duration}s | Status: {contact.latestCall.status}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dark)', fontSize: '13px' }}>Not dialed yet</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}
                            disabled={dialingContactId === contact.id || ['CALLING', 'COMPLETED'].includes(contact.status)}
                            onClick={() => handleDialIndividual(contact.id)}
                          >
                            {dialingContactId === contact.id ? (
                              <span className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '1px' }}></span>
                            ) : (
                              <Play size={12} />
                            )}
                            {contact.status === 'CALLING' ? 'Calling...' : 'Dial'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Campaign Grid */}
      {!creating && !activeCampaign && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              No campaigns defined yet. Click "New Campaign" to upload a lead spreadsheet.
            </div>
          ) : (
            campaigns.map(camp => (
              <div key={camp.id} className="card flex-between" style={{ gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div className="flex-align" style={{ marginBottom: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.08)', color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PhoneCall size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{camp.name}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Agent: {camp.agentName}</span>
                    </div>
                  </div>
                  
                  <div className="flex-align" style={{ gap: '16px', marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Total leads: <strong>{camp.counts.total}</strong>
                    </span>
                    <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}></span>
                    <span className="flex-align" style={{ gap: '4px', fontSize: '12px', color: 'var(--success)' }}>
                      <Check size={14} /> Completed: <strong>{camp.counts.completed}</strong>
                    </span>
                    <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}></span>
                    <span className="flex-align" style={{ gap: '4px', fontSize: '12px', color: 'var(--error)' }}>
                      <AlertTriangle size={14} /> Failed: <strong>{camp.counts.failed}</strong>
                    </span>
                    {camp.counts.calling > 0 && (
                      <>
                        <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}></span>
                        <span className="flex-align" style={{ gap: '6px', fontSize: '12px', color: 'var(--info)' }}>
                          <span className="loading-spinner" style={{ width: '10px', height: '10px', borderWidth: '1px' }}></span>
                          Calling: <strong>{camp.counts.calling}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-align" style={{ gap: '12px' }}>
                  <span className={`badge badge-${camp.status.toLowerCase()}`}>
                    {camp.status}
                  </span>

                  {camp.status === 'PENDING' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      disabled={startingId === camp.id}
                      onClick={() => handleStartCampaign(camp.id)}
                    >
                      <Play size={14} /> Dial
                    </button>
                  )}

                  <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => viewCampaignDetail(camp.id)}>
                    Details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Campaigns;
