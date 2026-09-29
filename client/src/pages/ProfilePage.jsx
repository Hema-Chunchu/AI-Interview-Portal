import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import Sidebar from '../components/Sidebar';

const ProfilePage = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'John Doe';
  const userEmail = localStorage.getItem('userEmail') || 'john.doe@email.com';
  const token = localStorage.getItem('token');
  const API_BASE_URL = 'http://localhost:5000/api';

  const [activeTab, setActiveTab] = useState('Overview');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch session history for active user
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(response.data);
      } catch (err) {
        console.error('Failed to load history', err);
        // Fallback mock history
        const d1 = new Date(); d1.setDate(d1.getDate() - 5);
        const d2 = new Date(); d2.setDate(d2.getDate() - 3);
        const d3 = new Date(); d3.setDate(d3.getDate() - 1);
        
        setHistory([
          { _id: 'mock_s1', role: 'System Design Interview', score: 82, createdAt: d1 },
          { _id: 'mock_s2', role: 'Backend Developer Mock', score: 75, createdAt: d2 },
          { _id: 'mock_s3', role: 'DP & Algorithms', score: 70, createdAt: d3 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  // Format history data for Recharts (Chronological order)
  const chartData = [...history]
    .reverse()
    .map(session => ({
      date: new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: session.score,
      role: session.role
    }));

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading profile dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  const handleEditProfile = () => {
    const newName = prompt('Enter your name:', userName);
    if (newName) {
      localStorage.setItem('userName', newName);
      window.location.reload();
    }
  };

  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length) 
    : 0;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="profile-main-grid">
          
          {/* Left Grid Content: Profile details and Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header Card (Clean layout without mini graph) */}
            <div className="profile-card-header">
              <div className="profile-user-section">
                <img 
                  className="profile-large-avatar" 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80" 
                  alt="User Profile" 
                />
                <div className="profile-details">
                  <h2>{userName}</h2>
                  <p>{userEmail}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--primary-green)', fontWeight: 600 }}>Software Developer</p>
                </div>
              </div>
            </div>

            {/* Stats Counter Row */}
            <div className="stats-container">
              <div className="stat-box">
                <div className="stat-value">{history.length}</div>
                <div className="stat-label">Interviews</div>
              </div>
              <div className="stat-box">
                <div className="stat-value glow-green">{avgScore}%</div>
                <div className="stat-label">Avg. Score</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">0</div>
                <div className="stat-label">Total Time</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">0</div>
                <div className="stat-label">Badges</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-navigation">
              {['Overview', 'History', 'Achievements', 'Bookmarks', 'Settings'].map((tab) => (
                <button 
                  key={tab} 
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content conditional rendering */}
            {activeTab === 'Overview' && (
              <div className="card-panel recent-interviews-card">
                <div className="panel-title">Recent Interviews</div>
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Interview Role</th>
                        <th>Completed Date</th>
                        <th>Score</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((session, idx) => (
                        <tr key={idx} className="history-row">
                          <td className="td-role">{session.role}</td>
                          <td className="td-date">{new Date(session.createdAt).toLocaleDateString()}</td>
                          <td className="td-score">{session.score}%</td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn-secondary-outline" 
                              onClick={() => navigate(`/report/${session._id}`)}
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link to="/history" className="view-all-link">View All</Link>
              </div>
            )}

            {activeTab === 'History' && (
              <div className="card-panel">
                <div className="panel-title">All Session History</div>
                {history.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>You haven't taken any interviews yet.</p>
                ) : (
                  <div className="history-table-wrapper">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Date</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((session, idx) => (
                          <tr key={idx}>
                            <td>{session.role}</td>
                            <td>{new Date(session.createdAt).toLocaleString()}</td>
                            <td style={{ color: 'var(--primary-green)', fontWeight: 'bold' }}>{session.score}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'Overview' && activeTab !== 'History' && (
              <div className="card-panel" style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{activeTab} module details are offline or in mock mode.</p>
              </div>
            )}
          </div>

          {/* Right Grid Content: Performance Graph replacing Skills Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div className="panel-title" style={{ margin: 0 }}>Score Progress</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                  {history.length} Sessions
                </span>
              </div>

              {chartData.length > 0 ? (
                <div style={{ width: '100%', height: '240px', marginTop: '0.5rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#8a98a8" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke="#8a98a8" 
                        fontSize={11} 
                        tickLine={false} 
                        ticks={[0, 25, 50, 75, 100]} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#121820', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}
                        labelStyle={{ color: '#8a98a8', fontSize: '11px', marginBottom: '4px' }}
                        itemStyle={{ color: '#00c853', fontSize: '13px', fontWeight: 'bold' }}
                        formatter={(value) => [`${value}%`, 'Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#00c853" 
                        strokeWidth={3} 
                        dot={{ fill: '#00c853', stroke: '#0c1015', strokeWidth: 2, r: 4 }}
                        activeDot={{ fill: '#00c853', stroke: '#fff', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.8rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Complete your first interview to track your performance trend!
                  </p>
                </div>
              )}

             
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
