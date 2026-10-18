import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Calendar, Clock, DollarSign, User, Bot, Award, FileText, ChevronRight } from 'lucide-react';

function Calls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [callDetail, setCallDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const transcriptEndRef = useRef(null);

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [callDetail]);

  async function loadCalls() {
    try {
      const response = await axios.get('http://localhost:5000/api/calls');
      setCalls(response.data);
      if (response.data.length > 0 && !selectedCallId) {
        setSelectedCallId(response.data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load call history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    async function loadCallDetail() {
      if (!selectedCallId) return;
      setDetailLoading(true);
      try {
        const response = await axios.get(`http://localhost:5000/api/calls/${selectedCallId}`);
        setCallDetail(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    }
    loadCallDetail();
  }, [selectedCallId]);

  // Parse raw text transcript into structured dialog bubbles
  const parseTranscript = (rawText) => {
    if (!rawText) return [];
    
    // Split by speaker tokens (AI:, User:, Assistant:, Customer:, Agent:, Caller:)
    const regex = /(AI:|User:|Assistant:|Customer:|Agent:|Caller:)/gi;
    const parts = rawText.split(regex);
    const dialogue = [];
    let currentSender = 'ai';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      if (regex.test(part)) {
        const lower = part.toLowerCase();
        if (lower.startsWith('user') || lower.startsWith('customer') || lower.startsWith('caller')) {
          currentSender = 'user';
        } else {
          currentSender = 'ai';
        }
      } else {
        dialogue.push({ sender: currentSender, text: part });
      }
    }
    
    // If no parts were split (e.g. no speaker tokens), return raw text as a single bubble
    if (dialogue.length === 0) {
      dialogue.push({ sender: 'ai', text: rawText });
    }
    
    return dialogue;
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
      <div style={{ marginBottom: '24px' }}>
        <h1>Call Logs & Transcripts</h1>
        <p className="subtitle">Review dial audio recordings, dialogue transcripts, and key extracted fields</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {calls.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
          No call history found. Go to Campaigns to start dials.
        </div>
      ) : (
        <div className="call-log-layout">
          {/* Left Column: List of calls */}
          <div className="call-meta-panel">
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Call List
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {calls.map((c) => (
                <div 
                  key={c.id} 
                  className="card" 
                  style={{ 
                    padding: '16px', 
                    marginBottom: '0', 
                    cursor: 'pointer',
                    borderLeft: selectedCallId === c.id ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: selectedCallId === c.id ? 'rgba(255,255,255,0.02)' : 'var(--bg-card)'
                  }}
                  onClick={() => setSelectedCallId(c.id)}
                >
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{c.contactName}</span>
                    <span className={`badge badge-${c.status.toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {c.status}
                    </span>
                  </div>
                  
                  <div className="flex-between" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{c.campaignName}</span>
                    <span>{c.duration}s</span>
                  </div>
                  
                  <div className="flex-between" style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '8px' }}>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    <span>${c.cost.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Active Call details & Dialogue */}
          <div className="transcript-panel" style={{ background: 'none', border: 'none', padding: 0 }}>
            {detailLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span className="loading-spinner" style={{ width: '40px', height: '40px' }}></span>
              </div>
            ) : callDetail ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px', height: '100%', minHeight: 0 }}>
                
                {/* Left Pane of details: Metadata, Audio, Extractions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto' }}>
                  {/* Header info card */}
                  <div className="card" style={{ margin: 0 }}>
                    <div className="flex-between" style={{ marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{callDetail.contact.name}</h3>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{callDetail.contact.phone}</span>
                      </div>
                      
                      <span className={`badge badge-${callDetail.status.toLowerCase()}`}>
                        {callDetail.status}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <span className="flex-align" style={{ gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(callDetail.createdAt).toLocaleString()}
                      </span>
                      <span className="flex-align" style={{ gap: '6px' }}>
                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                        Duration: {callDetail.duration}s
                      </span>
                      <span className="flex-align" style={{ gap: '6px' }}>
                        <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
                        Billing cost: ${callDetail.cost.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Audio Recording Card */}
                  {callDetail.recordingUrl && (
                    <div className="card" style={{ margin: 0 }}>
                      <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Call Recording
                      </h2>
                      <div className="audio-player-container" style={{ border: 'none', background: 'rgba(255,255,255,0.02)', padding: '6px 0', display: 'flex', justifyContent: 'center' }}>
                        <audio src={callDetail.recordingUrl} controls style={{ width: '100%' }} />
                      </div>
                    </div>
                  )}

                  {/* Extractions Panel Card */}
                  <div className="card" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
                    <h2>Extracted Data</h2>
                    {callDetail.extractions.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
                        No structured keys were extracted from this call session. Configure an Agent extraction schema to isolate data points automatically.
                      </p>
                    ) : (
                      <div className="extraction-grid" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {callDetail.extractions.map((ext, idx) => (
                          <div key={idx} className="extraction-tag" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="key">{ext.key}</span>
                            <span className="value" style={{ wordBreak: 'break-all' }}>{ext.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane of details: Dialogue Chat Bubble Box */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', margin: 0, height: '100%', minHeight: 0 }}>
                  <h2 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Call Dialogue
                  </h2>
                  
                  {!callDetail.transcript ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-dark)', fontSize: '13px', padding: '30px', textAlign: 'center' }}>
                      No dialogue logs generated.<br/>(Ensure call completed fully and audio transcripts are enabled).
                    </div>
                  ) : (
                    <div className="transcript-body" style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '12px' }}>
                      {parseTranscript(callDetail.transcript).map((bubble, idx) => {
                        const isAi = bubble.sender === 'ai';
                        return (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            flexDirection: isAi ? 'row' : 'row-reverse', 
                            alignItems: 'flex-start', 
                            gap: '12px',
                            marginBottom: '20px',
                            width: '100%'
                          }}>
                            {/* Avatar Icon */}
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: isAi ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.05)',
                              color: isAi ? 'var(--primary-hover)' : 'var(--text-muted)',
                              border: '1px solid ' + (isAi ? 'rgba(139, 92, 246, 0.2)' : 'var(--border-color)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {isAi ? <Bot size={16} /> : <User size={16} />}
                            </div>

                            {/* Speech Bubble */}
                            <div style={{ 
                              margin: 0, 
                              maxWidth: '75%',
                              backgroundColor: isAi ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid ' + (isAi ? 'rgba(139, 92, 246, 0.15)' : 'var(--border-color)'),
                              borderRadius: '16px',
                              borderTopLeftRadius: isAi ? '4px' : '16px',
                              borderTopRightRadius: isAi ? '16px' : '4px',
                              padding: '12px 16px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}>
                              <div style={{ 
                                fontSize: '10px', 
                                color: isAi ? 'var(--primary-hover)' : 'var(--text-muted)', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                marginBottom: '6px',
                                letterSpacing: '0.5px'
                              }}>
                                {isAi ? 'AI Assistant' : 'Customer'}
                              </div>
                              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#fff' }}>
                                {bubble.text}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={transcriptEndRef} />
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Select a call log on the left to inspect transcripts.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calls;
