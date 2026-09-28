import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const ReportPage = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessionReport = async () => {
      try {
        let loadedSession = null;
        let loadedQuestions = [];

        // 1. Try backend
        try {
          const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data && response.data.session) {
            loadedSession = response.data.session;
            loadedQuestions = response.data.questions || [];
            if ((!loadedSession.score || loadedSession.score === 0) && loadedSession.summary && loadedSession.summary.includes('pending')) {
              try {
                const localHistory = JSON.parse(localStorage.getItem('portal_history') || '[]');
                const match = localHistory.find(item => item._id === sessionId);
                if (match && match.score > 0) {
                  loadedSession = { ...loadedSession, score: match.score, summary: match.summary };
                  if (match.questions && match.questions.length > 0) loadedQuestions = match.questions;
                }
              } catch (e) {}
            }
          }
        } catch (err) {
          console.warn('Backend session fetch note:', err.message);
        }




        if (loadedSession) {
          setSession(loadedSession);
          setQuestions(loadedQuestions);
          setError('');
        } else {
          setError('Interview session details could not be found.');
        }
      } catch (err) {
        console.error('Failed to load session report:', err);
        setError('Unable to load report from server. Please verify the session exists in History.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionReport();
  }, [sessionId, token]);

  const handleRetake = async () => {
    if (!session) return;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/sessions`,
        { role: session.role, questionCount: questions.length || 4 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/interview/${response.data.sessionId}`);
    } catch (err) {
      console.error('Failed to create new session', err);
      navigate(`/interview/session_${Date.now()}?role=${encodeURIComponent(session.role)}`);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading interview report card...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="card-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '4rem auto' }}>
            <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-family-display)' }}>Session Not Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {error || 'The requested interview scorecard does not exist or has expired.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary-outline" onClick={() => navigate('/history')}>
                Go to History
              </button>
              <button className="btn-primary" onClick={() => navigate('/interviews')}>
                Start New Interview
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const answeredCount = questions.filter(q => (q.transcript || '').trim() && q.transcript !== 'No response recorded.').length;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span className="badge-difficulty" style={{ margin: 0 }}>
                {session?.role || 'Technical Interview'}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {questions.length} Questions &bull; {answeredCount} Answered
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '2.2rem', marginBottom: '0.25rem' }}>
              Interview Report Card
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Completed on {new Date(session?.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(session?.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="btn-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary-outline" onClick={() => navigate('/history')}>
              Back to History
            </button>
            <button className="btn-secondary-outline" onClick={() => navigate('/profile')}>
              Dashboard
            </button>
            <button className="btn-primary" onClick={handleRetake}>
              Retake Interview
            </button>
          </div>
        </header>

        <div className="report-grid">
          {/* Summary Box */}
          <div className="report-summary-box">
            <div className="score-summary-wrapper">
              <div className="overall-score-badge">
                <span className="score-num">{session?.score || 0}%</span>
                <span className="score-lbl">Overall Score</span>
              </div>
              <div className="summary-text-block">
                <h3>AI Performance Executive Summary</h3>
                <p>
                  {session?.summary || 'The candidate has completed the interview session. Review detailed question-by-question scoring and feedback below.'}
                </p>
              </div>
            </div>
          </div>

          {/* Questions Breakdown */}
          <div className="question-feedback-list">
            <h3 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.4rem', fontWeight: 700, margin: '1.5rem 0 1rem' }}>
              Question-by-Question Evaluation ({questions.length} Questions)
            </h3>
            
            {questions.map((q, idx) => (
              <div key={q._id || idx} className="question-feedback-card" style={{ marginBottom: '1.5rem' }}>
                <div className="q-card-header">
                  <h4>Question {idx + 1} of {questions.length}: {q.text}</h4>
                  <span className={`q-score-indicator ${(q.score || 0) >= 70 ? 'good' : (q.score || 0) >= 50 ? 'average' : 'poor'}`}>
                    {q.score || 0}/100
                  </span>
                </div>
                
                <div className="qa-section">
                  <div className="qa-sub-block">
                    <span className="qa-sub-title">Candidate's Response</span>
                    <p className="qa-sub-content transcript-text">
                      {q.transcript ? `"${q.transcript}"` : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No answer provided or recorded.</span>}
                    </p>
                  </div>

                  {q.recordingUrl && (
                    <div className="qa-sub-block">
                      <span className="qa-sub-title">Voice Replay</span>
                      <audio 
                        src={q.recordingUrl} 
                        controls 
                        className="custom-audio-element" 
                        controlsList="nodownload"
                        style={{ marginTop: '0.4rem', width: '100%', maxWidth: '380px' }}
                      />
                    </div>
                  )}

                  <div className="qa-sub-block">
                    <span className="qa-sub-title">Gemini AI Feedback & Technical Assessment</span>
                    <p className="qa-sub-content" style={{ color: 'var(--text-secondary)' }}>
                      {q.feedback || 'Answer was not evaluated or response was empty.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportPage;
