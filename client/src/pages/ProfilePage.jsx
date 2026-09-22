import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import Sidebar from '../components/Sidebar';

const ProfilePage = () => {
  const navigate = useNavigate();

  const userName =
    localStorage.getItem('userName') || 'John Doe';

  const userEmail =
    localStorage.getItem('userEmail') || 'john.doe@email.com';

  const token = localStorage.getItem('token');

  const API_BASE_URL = 'http://localhost:5000/api';

  const [activeTab, setActiveTab] = useState('Overview');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch session history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setHistory(response.data);
      } catch (err) {
        console.error('Failed to load history', err);

        // Fallback mock history
        const d1 = new Date();
        d1.setDate(d1.getDate() - 5);

        const d2 = new Date();
        d2.setDate(d2.getDate() - 3);

        const d3 = new Date();
        d3.setDate(d3.getDate() - 1);

        setHistory([
          {
            _id: 'mock_s1',
            role: 'System Design Interview',
            score: 82,
            createdAt: d1
          },
          {
            _id: 'mock_s2',
            role: 'Backend Developer Mock',
            score: 75,
            createdAt: d2
          },
          {
            _id: 'mock_s3',
            role: 'DP & Algorithms',
            score: 70,
            createdAt: d3
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  // Prepare graph data
  const chartData = [...history]
    .reverse()
    .map((session) => ({
      date: new Date(session.createdAt).toLocaleDateString(
        undefined,
        {
          month: 'short',
          day: 'numeric'
        }
      ),
      score: session.score
    }));

  // Loading screen
  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />

        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>

            <p
              style={{
                color: 'var(--text-secondary)'
              }}
            >
              Loading profile dashboard...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Edit profile
  const handleEditProfile = () => {
    const newName = prompt(
      'Enter your name:',
      userName
    );

    if (newName) {
      localStorage.setItem('userName', newName);
      window.location.reload();
    }
  };

  return (
    <div className="app-container">

      <Sidebar />

      <main className="main-content">

        <div className="profile-main-grid">

          {/* =====================================================
              LEFT SIDE
              ===================================================== */}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >

            {/* Profile Header */}
            <div className="profile-card-header">

              <div className="profile-user-section">

                <img
                  className="profile-large-avatar"
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
                  alt="User Profile"
                />

                <div className="profile-details">

                  <h2>{userName}</h2>

                  <p>{userEmail}</p>

                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--primary-green)',
                      fontWeight: 600
                    }}
                  >
                    Software Developer
                  </p>

                  <button
                    className="btn-secondary-outline"
                    onClick={handleEditProfile}
                  >
                    Edit Profile
                  </button>

                </div>

              </div>

            </div>

            {/* =====================================================
                STATISTICS
                ===================================================== */}

            <div className="stats-container">

              <div className="stat-box">
                <div className="stat-value">
                  {history.length + 19}
                </div>

                <div className="stat-label">
                  Interviews
                </div>
              </div>


              <div className="stat-box">

                <div className="stat-value glow-green">

                  {history.length > 0
                    ? Math.round(
                        history.reduce(
                          (acc, curr) =>
                            acc + curr.score,
                          0
                        ) / history.length
                      )
                    : 78}
                  %

                </div>

                <div className="stat-label">
                  Avg. Score
                </div>

              </div>


              <div className="stat-box">

                <div className="stat-value">
                  18h 30m
                </div>

                <div className="stat-label">
                  Total Time
                </div>

              </div>


              <div className="stat-box">

                <div className="stat-value">
                  7
                </div>

                <div className="stat-label">
                  Badges
                </div>

              </div>

            </div>


            {/* =====================================================
                NAVIGATION TABS
                ===================================================== */}

            <div className="tabs-navigation">

              {[
                'Overview',
                'History',
                'Achievements',
                'Bookmarks',
                'Settings'
              ].map((tab) => (

                <button
                  key={tab}
                  className={`tab-btn ${
                    activeTab === tab
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setActiveTab(tab)
                  }
                >
                  {tab}
                </button>

              ))}

            </div>


            {/* =====================================================
                OVERVIEW TAB
                ===================================================== */}

            {activeTab === 'Overview' && (

              <div className="card-panel recent-interviews-card">

                <div className="panel-title">
                  Recent Interviews
                </div>

                <div className="history-table-wrapper">

                  <table className="history-table">

                    <thead>

                      <tr>

                        <th>
                          Interview Role
                        </th>

                        <th>
                          Completed Date
                        </th>

                        <th>
                          Score
                        </th>

                        <th
                          style={{
                            textAlign: 'right'
                          }}
                        >
                          Actions
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {history.map(
                        (session, idx) => (

                          <tr
                            key={idx}
                            className="history-row"
                          >

                            <td className="td-role">
                              {session.role}
                            </td>

                            <td className="td-date">
                              {new Date(
                                session.createdAt
                              ).toLocaleDateString()}
                            </td>

                            <td className="td-score">
                              {session.score}%
                            </td>

                            <td
                              style={{
                                textAlign: 'right'
                              }}
                            >

                              <button
                                className="btn-secondary-outline"
                                onClick={() =>
                                  navigate(
                                    `/report/${session._id}`
                                  )
                                }
                                style={{
                                  padding:
                                    '0.35rem 0.85rem',
                                  fontSize:
                                    '0.8rem'
                                }}
                              >
                                View
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

                <Link
                  to="/interviews"
                  className="view-all-link"
                >
                  View All
                </Link>

              </div>

            )}


            {/* =====================================================
                HISTORY TAB
                ===================================================== */}

            {activeTab === 'History' && (

              <div className="card-panel">

                <div className="panel-title">
                  All Session History
                </div>


                {history.length === 0 ? (

                  <p
                    style={{
                      color:
                        'var(--text-secondary)'
                    }}
                  >
                    You haven't taken any
                    interviews yet.
                  </p>

                ) : (

                  <div className="history-table-wrapper">

                    <table className="history-table">

                      <thead>

                        <tr>

                          <th>
                            Role
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Score
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {history.map(
                          (session, idx) => (

                            <tr key={idx}>

                              <td>
                                {session.role}
                              </td>

                              <td>
                                {new Date(
                                  session.createdAt
                                ).toLocaleString()}
                              </td>

                              <td
                                style={{
                                  color:
                                    'var(--primary-green)',
                                  fontWeight:
                                    'bold'
                                }}
                              >
                                {session.score}%
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            )}


            {/* =====================================================
                OTHER TABS
                ===================================================== */}

            {activeTab !== 'Overview' &&
              activeTab !== 'History' && (

                <div
                  className="card-panel"
                  style={{
                    textAlign: 'center',
                    padding: '3rem 0'
                  }}
                >

                  <p
                    style={{
                      color:
                        'var(--text-secondary)'
                    }}
                  >
                    {activeTab} module details
                    are offline or in mock mode.
                  </p>

                </div>

              )}

          </div>


          {/* =====================================================
              RIGHT SIDE
              SKILLS + SCORE GRAPH
              ===================================================== */}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >

            {/* =====================================================
                SKILLS OVERVIEW
                ===================================================== */}

            <div className="card-panel">

              <div className="panel-title">
                Skills Overview
              </div>


              <div className="skills-overview-list">

                {/* System Design */}
                <div className="skill-bar-group">

                  <div className="skill-bar-header">

                    <span className="skill-name">
                      System Design
                    </span>

                    <span className="skill-pct">
                      85%
                    </span>

                  </div>

                  <div className="skill-track">

                    <div
                      className="skill-fill"
                      style={{
                        width: '85%'
                      }}
                    />

                  </div>

                </div>


                {/* Data Structures */}
                <div className="skill-bar-group">

                  <div className="skill-bar-header">

                    <span className="skill-name">
                      Data Structures
                    </span>

                    <span className="skill-pct">
                      78%
                    </span>

                  </div>

                  <div className="skill-track">

                    <div
                      className="skill-fill"
                      style={{
                        width: '78%'
                      }}
                    />

                  </div>

                </div>


                {/* Algorithms */}
                <div className="skill-bar-group">

                  <div className="skill-bar-header">

                    <span className="skill-name">
                      Algorithms
                    </span>

                    <span className="skill-pct">
                      80%
                    </span>

                  </div>

                  <div className="skill-track">

                    <div
                      className="skill-fill"
                      style={{
                        width: '80%'
                      }}
                    />

                  </div>

                </div>


                {/* Communication */}
                <div className="skill-bar-group">

                  <div className="skill-bar-header">

                    <span className="skill-name">
                      Communication
                    </span>

                    <span className="skill-pct">
                      75%
                    </span>

                  </div>

                  <div className="skill-track">

                    <div
                      className="skill-fill"
                      style={{
                        width: '75%'
                      }}
                    />

                  </div>

                </div>

              </div>


              {/* Badges */}
              <div className="badges-showcase">

                <div
                  className="badge-item"
                  title="Star Architect"
                  style={{
                    fontSize: '1.25rem'
                  }}
                >
                  🏆
                </div>

                <div
                  className="badge-item"
                  title="Algorithmic Guru"
                  style={{
                    fontSize: '1.25rem'
                  }}
                >
                  ⚡
                </div>

                <div
                  className="badge-item"
                  title="Master Communicator"
                  style={{
                    fontSize: '1.25rem'
                  }}
                >
                  🗣️
                </div>

                <div
                  className="badge-item"
                  title="Perfect Score"
                  style={{
                    fontSize: '1.25rem'
                  }}
                >
                  🎯
                </div>

                <div
                  className="badge-item"
                  title="Fast Responder"
                  style={{
                    fontSize: '1.25rem'
                  }}
                >
                  🚀
                </div>

              </div>

            </div>


            {/* =====================================================
                SCORE GRAPH
                NOW BELOW SKILLS OVERVIEW
                ===================================================== */}

            {chartData.length > 0 && (

              <div className="card-panel score-chart-card">

                <div className="panel-title">
                  Score Progress
                </div>


                <div className="score-chart">

                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >

                    <LineChart
                      data={chartData}
                    >

                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: '#8a98a8',
                          fontSize: 12
                        }}
                      />

                      <YAxis
                        domain={[0, 100]}
                        tick={{
                          fill: '#8a98a8',
                          fontSize: 12
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          background:
                            '#121820',
                          border:
                            '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '6px'
                        }}
                        labelStyle={{
                          color: '#8a98a8',
                          fontSize: '11px'
                        }}
                        itemStyle={{
                          color: '#00c853',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#00c853"
                        strokeWidth={2.5}
                        dot={{
                          fill: '#00c853',
                          r: 4
                        }}
                        activeDot={{
                          r: 6,
                          strokeWidth: 0
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              </div>

            )}

          </div>

        </div>

      </main>

    </div>
  );
};

export default ProfilePage;