import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const InterviewSelectionPage = () => {
  const [interviews, setInterviews] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingRole, setStartingRole] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch saved user preferences
        const prefRes = await axios.get(`${API_BASE_URL}/users/me/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);

        if (prefRes?.data) {
          setUserPreferences(prefRes.data);
        }

        // Fetch interview templates
        const response = await axios.get(`${API_BASE_URL}/interviews`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let loaded = response.data;
        if (prefRes?.data?.interview) {
          const { level, questionCount, timeLimitMin } = prefRes.data.interview;
          loaded = loaded.map(item => ({
            ...item,
            difficulty: level || item.difficulty,
            questionCount: questionCount || item.questionCount,
            timeLimitMin: timeLimitMin || 30
          }));
        }
        setInterviews(loaded);
      } catch (err) {
        console.error('Failed to load interviews', err);
        setInterviews([
          { role: 'Frontend Developer', difficulty: 'Mid Level', questionCount: 4, timeLimitMin: 30 },
          { role: 'Backend Developer', difficulty: 'Mid Level', questionCount: 4, timeLimitMin: 30 },
          { role: 'System Design Interview', difficulty: 'Mid Level', questionCount: 4, timeLimitMin: 30 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleStartInterview = async (role) => {
    setStartingRole(role);

    const questionCount = userPreferences?.interview?.questionCount || 4;
    const timeLimitMin = userPreferences?.interview?.timeLimitMin || 30;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/sessions`,
        { role, questionCount, timeLimitMin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { sessionId } = response.data;
      navigate(`/interview/${sessionId}`);
    } catch (err) {
      console.error('Failed to create session', err);
      const mockSessionId = 'mock_session_' + Date.now();
      navigate(`/interview/${mockSessionId}?role=${encodeURIComponent(role)}`);
    } finally {
      setStartingRole(null);
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
          {userPreferences?.interview && (
            <div style={{ marginTop: '0.75rem', display: 'inline-flex', gap: '0.75rem', background: 'var(--panel-ref)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-ref)', fontSize: '0.85rem', color: 'var(--green-ref)' }}>
              <span>⚙ Preferences Loaded:</span>
              <span>Level: {userPreferences.interview.level}</span>
              <span>•</span>
              <span>Questions: {userPreferences.interview.questionCount}</span>
              <span>•</span>
              <span>Time: {userPreferences.interview.timeLimitMin}m</span>
            </div>
          )}
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
                  <span className="badge-difficulty">{item.difficulty || userPreferences?.interview?.level || 'Mid Level'}</span>
                  <h3>{item.role}</h3>
                  <p>
                    {item.questionCount || userPreferences?.interview?.questionCount || 4} Questions &bull; {item.timeLimitMin || userPreferences?.interview?.timeLimitMin || 30} Minutes
                  </p>
                </div>
                <button 
                  className="btn-primary" 
                  disabled={startingRole !== null}
                  onClick={() => handleStartInterview(item.role)}
                >
                  {startingRole === item.role ? 'Initializing...' : 'Start Interview'}
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
