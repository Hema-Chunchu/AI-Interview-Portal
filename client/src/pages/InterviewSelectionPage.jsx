import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const InterviewSelectionPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/interviews`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInterviews(response.data);
      } catch (err) {
        console.error('Failed to load interviews', err);
        // Fallback mock templates if backend is slow/offline
        setInterviews([
          { role: 'Frontend Developer', difficulty: 'Mid Level', questionCount: 4 },
          { role: 'Backend Developer', difficulty: 'Mid Level', questionCount: 4 },
          { role: 'System Design Interview', difficulty: 'Mid Level', questionCount: 4 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [token]);

  const handleStartInterview = async (role) => {
    setStarting(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/sessions`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { sessionId } = response.data;
      navigate(`/interview/${sessionId}`);
    } catch (err) {
      console.error('Failed to create session', err);
      // Mock start if server fails
      const mockSessionId = 'mock_session_' + Date.now();
      navigate(`/interview/${mockSessionId}?role=${encodeURIComponent(role)}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 800, fontSize: '2.2rem', marginBottom: '0.5rem' }}>
            Select Mock Interview
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Choose a technical path to practice your skills and receive instant AI feedback.
          </p>
        </header>

        {loading ? (
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading interview templates...</p>
          </div>
        ) : (
          <div className="selection-grid">
            {interviews.map((item, idx) => (
              <div key={idx} className="selection-card">
                <div className="card-top">
                  <span className="badge-difficulty">{item.difficulty}</span>
                  <h3>{item.role}</h3>
                  <p>{item.questionCount} Questions &bull; 30 Minutes</p>
                </div>
                <button 
                  className="btn-primary" 
                  disabled={starting}
                  onClick={() => handleStartInterview(item.role)}
                >
                  {starting ? 'Initializing...' : 'Start Interview'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSelectionPage;
