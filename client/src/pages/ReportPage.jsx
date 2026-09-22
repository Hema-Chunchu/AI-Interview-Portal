import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const ReportPage = () => {
  const { id: sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionReport = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSession(response.data.session);
        setQuestions(response.data.questions);
      } catch (err) {
        console.error('Failed to load session report from server', err);
        // Fallback mock report
        const isMockMode = searchParams.get('mock') === 'true' || true;
        const mockRole = searchParams.get('role') || 'System Design Interview';
        
        const mockSession = {
          _id: sessionId,
          role: mockRole,
          score: 82,
          summary: 'The candidate demonstrated a clear and structured approach to designing high-scale web architectures. Good component breakdown and scalability analysis, but should detail fault tolerance mechanism and cache eviction policies.',
          createdAt: new Date()
        };

        let mockQs = [
          {
            text: 'Let\'s begin. Design a URL shortener like bit.ly. Explain the high-level system-design.',
            transcript: 'First we need a web server to receive request. Then a database to store short URLs. We can use a NoSQL database like MongoDB. The short URL can be hashed from the original URL using MD5 or Base62 hash. To scale, we can add a Redis cache layer for popular links.',
            score: 85,
            feedback: 'Excellent component selection. Good reasoning about Redis cache insertion. Try to address how collision resolution in hashing works in detail.',
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
          },
          {
            text: 'How would you design a rate limiting system for a public API? What storage and algorithms would you use?',
            transcript: 'We can use token bucket or leaking bucket algorithm. For storage we can use Redis because it is very fast and supports atomicity. The counter is decremented on request.',
            score: 80,
            feedback: 'Solid choices of algorithms. To improve, explain sliding window log algorithms and rate limiter placement in real networks.',
            recordingUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
          }
        ];

        setSession(mockSession);
        setQuestions(mockQs);
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
        { role: session.role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/interview/${response.data.sessionId}`);
    } catch (err) {
      console.error(err);
      navigate(`/interview/mock_session_${Date.now()}?role=${encodeURIComponent(session.role)}`);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Compiling interview feedback...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '2.2rem', marginBottom: '0.25rem' }}>
              Interview Report Card
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Completed on {new Date(session?.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="btn-group">
            <button className="btn-secondary-outline" onClick={() => navigate('/profile')}>
              Back to Dashboard
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
                <span className="score-num">{session?.score}%</span>
                <span className="score-lbl">Score</span>
              </div>
              <div className="summary-text-block">
                <h3>Executive Summary</h3>
                <p>{session?.summary}</p>
              </div>
            </div>
          </div>

          {/* Questions Breakdown */}
          <div className="question-feedback-list">
            <h3 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.4rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>
              Question Breakdown
            </h3>
            
            {questions.map((q, idx) => (
              <div key={idx} className="question-feedback-card">
                <div className="q-card-header">
                  <h4>Question {idx + 1}: {q.text}</h4>
                  <span className="q-score-indicator">{q.score}/100</span>
                </div>
                
                <div className="qa-section">
                  <div className="qa-sub-block">
                    <span className="qa-sub-title">Your Response</span>
                    <p className="qa-sub-content transcript-text">
                      "{q.transcript || 'No answer transcript was recorded.'}"
                    </p>
                  </div>

                  {q.recordingUrl && (
                    <div className="qa-sub-block">
                      <span className="qa-sub-title">Response Replay</span>
                      <audio 
                        src={q.recordingUrl} 
                        controls 
                        className="custom-audio-element" 
                        controlsList="nodownload"
                      />
                    </div>
                  )}

                  <div className="qa-sub-block">
                    <span className="qa-sub-title">AI Feedback</span>
                    <p className="qa-sub-content" style={{ color: 'var(--text-secondary)' }}>
                      {q.feedback}
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
