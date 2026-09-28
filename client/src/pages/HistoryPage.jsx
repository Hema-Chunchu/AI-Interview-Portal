import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const HistoryPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const API_BASE_URL = 'http://localhost:5000/api';

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [scoreFilter, setScoreFilter] = useState('All Scores');
  const [sortBy, setSortBy] = useState('Newest First');

  // Topics for filter pills
  const topics = ['All', 'Frontend', 'Backend', 'React', 'Java', 'DSA', 'System Design'];

  // Fetch session history from both Backend API and LocalStorage
  useEffect(() => {
    const fetchHistory = async () => {
      let combined = [];
      const seenIds = new Set();

      // 1. Fetch from Backend API
      try {
        const response = await axios.get(`${API_BASE_URL}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((item) => {
            if (item._id && !seenIds.has(item._id)) {
              seenIds.add(item._id);
              combined.push(item);
            }
          });
        }
      } catch (err) {
        console.warn('Backend history fetch note:', err.message);
      }

      // 2. Fetch and merge from user-scoped LocalStorage
      const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
      const storageKey = userEmail ? `portal_history_${userEmail}` : null;
      if (storageKey) {
        try {
          const localHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
          if (Array.isArray(localHistory)) {
            localHistory.forEach((item) => {
              if (item._id && !seenIds.has(item._id)) {
                seenIds.add(item._id);
                combined.push(item);
              }
            });
          }
        } catch (storageErr) {
          console.warn('LocalStorage history fetch note:', storageErr);
        }
      }
      // Clean up legacy shared key so previous accounts never leak data
      localStorage.removeItem('portal_history');

      const enriched = combined
        .filter((item) => {
          const isCompleted = item.status === 'Completed' || item.status === 'completed' || (item.summary && item.summary !== 'Session started.');
          // Filter out abandoned empty sessions with 0 answers
          if (!isCompleted && item.summary === 'Session started.') {
            const hasAnswers = item.questions?.some(q => (q.transcript || '').trim().length > 0);
            if (!hasAnswers) return false;
          }
          return true;
        })
        .map((item) => {
          const created = item.createdAt ? new Date(item.createdAt) : new Date();
          const roleName = item.role || 'Technical Interview';
          let iconType = 'frontend';
          const lowerRole = roleName.toLowerCase();
          if (lowerRole.includes('system design')) iconType = 'system-design';
          else if (lowerRole.includes('backend')) iconType = 'backend';
          else if (lowerRole.includes('react')) iconType = 'react';
          else if (lowerRole.includes('java')) iconType = 'java';
          else if (lowerRole.includes('dsa') || lowerRole.includes('algorithm')) iconType = 'dsa';

          const isCompleted = item.status === 'Completed' || item.status === 'completed' || (item.summary && item.summary !== 'Session started.');

          return {
            _id: item._id,
            role: roleName,
            topic: item.topic || roleName.split(' ')[0],
            date: created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            createdAt: created,
            duration: item.duration || '25 min',
            questionsCount: item.questionsCount || (item.questions ? item.questions.length : 4),
            score: typeof item.score === 'number' ? item.score : 0,
            status: isCompleted ? 'Completed' : 'In Progress',
            isCompleted,
            iconType
          };
        });

      setHistory(enriched);
      setLoading(false);
    };

    fetchHistory();
  }, [token]);

  // Filtering logic
  const filteredHistory = history.filter((item) => {
    // Search filter
    const matchesSearch =
      item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase());

    // Topic pill filter
    const matchesTopic =
      selectedTopic === 'All' ||
      item.topic.toLowerCase() === selectedTopic.toLowerCase() ||
      item.role.toLowerCase().includes(selectedTopic.toLowerCase());

    // Score filter
    let matchesScore = true;
    if (scoreFilter === 'Above 80%') matchesScore = item.score >= 80;
    else if (scoreFilter === '70% - 80%') matchesScore = item.score >= 70 && item.score < 80;
    else if (scoreFilter === 'Below 70%') matchesScore = item.score < 70;

    // Date filter
    let matchesDate = true;
    const now = Date.now();
    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (dateFilter === 'Last 7 days') matchesDate = itemTime >= now - 7 * 86400000;
    else if (dateFilter === 'Last 30 days') matchesDate = itemTime >= now - 30 * 86400000;
    else if (dateFilter === 'Last 3 months') matchesDate = itemTime >= now - 90 * 86400000;

    return matchesSearch && matchesTopic && matchesScore && matchesDate;
  });

  // Sorting logic
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (sortBy === 'Newest First') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'Oldest First') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'Highest Score') return b.score - a.score;
    if (sortBy === 'Lowest Score') return a.score - b.score;
    return 0;
  });

  // Direct navigation to the existing Interview Report
  const handleViewReport = (sessionId) => {
    navigate(`/report/${sessionId}`);
  };

  // Helper for topic icons
  const renderTopicIcon = (type) => {
    switch (type) {
      case 'system-design':
        return (
          <div className="history-icon-circle purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
        );
      case 'backend':
        return (
          <div className="history-icon-circle blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
        );
      case 'react':
        return (
          <div className="history-icon-circle cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/>
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/>
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150 12 12)"/>
            </svg>
          </div>
        );
      case 'java':
        return (
          <div className="history-icon-circle indigo">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
          </div>
        );
      case 'dsa':
        return (
          <div className="history-icon-circle pink">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a5 5 0 0 1 5 5c0 .7-.1 1.4-.4 2h.4a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-1a5 5 0 0 1-4 4 5 5 0 0 1-4-4H7a5 5 0 0 1-5-5 5 5 0 0 1 5-5h.4A5 5 0 0 1 12 2z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="history-icon-circle cyan">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="history-layout full-view">
          <div className="history-left-panel">
            {/* Header */}
            <div className="history-header">
              <div>
                <h1 className="history-title">Interview History</h1>
                <p className="history-subtitle">
                  Track your past interviews, review detailed AI report cards, and monitor progress.
                </p>
              </div>

              {/* Dropdown Filters & Sorting */}
              <div className="history-header-filters">
                {/* Sort Filter */}
                <div className="history-select-wrapper">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="history-filter-select"
                  >
                    <option value="Newest First">Sort: Newest First</option>
                    <option value="Oldest First">Sort: Oldest First</option>
                    <option value="Highest Score">Sort: Highest Score</option>
                    <option value="Lowest Score">Sort: Lowest Score</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="history-select-wrapper">
                  <svg className="select-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="history-filter-select"
                  >
                    <option value="All Time">Date: All Time</option>
                    <option value="Last 7 days">Last 7 days</option>
                    <option value="Last 30 days">Last 30 days</option>
                    <option value="Last 3 months">Last 3 months</option>
                  </select>
                </div>

                {/* Score Filter */}
                <div className="history-select-wrapper">
                  <select 
                    value={scoreFilter} 
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="history-filter-select"
                  >
                    <option value="All Scores">Score: All Scores</option>
                    <option value="Above 80%">Score: Above 80%</option>
                    <option value="70% - 80%">Score: 70% - 80%</option>
                    <option value="Below 70%">Score: Below 70%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="history-search-bar">
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search by role, topic or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="history-search-input"
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            {/* Topic Pills */}
            <div className="history-pills-row">
              {topics.map((t) => (
                <button
                  key={t}
                  className={`topic-pill ${selectedTopic === t ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* History Table Card */}
            <div className="history-table-card">
              {loading ? (
                <div className="loading-wrapper" style={{ padding: '3rem 0' }}>
                  <div className="spinner"></div>
                  <p style={{ color: 'var(--text-secondary)' }}>Loading history records...</p>
                </div>
              ) : sortedHistory.length === 0 ? (
                <div className="empty-history-state" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 500 }}>
                    {history.length === 0
                      ? 'No interview sessions yet for this account. Start your first interview to track your progress and view AI report cards!'
                      : 'No interview sessions match your current filters.'}
                  </p>
                  <Link to="/interviews" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                    Start an Interview
                  </Link>
                </div>
              ) : (
                <div className="history-table-container">
                  <table className="history-list-table">
                    <thead>
                      <tr>
                        <th>Interview</th>
                        <th>Date & Time</th>
                        <th>Duration</th>
                        <th>Questions</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((item) => (
                        <tr
                          key={item._id}
                          className="history-data-row"
                          onClick={() => handleViewReport(item._id)}
                        >
                          <td className="col-interview">
                            <div className="interview-title-cell">
                              {renderTopicIcon(item.iconType)}
                              <div className="interview-name-group">
                                <span className="role-text">{item.role}</span>
                                <span className="topic-badge">{item.topic}</span>
                              </div>
                            </div>
                          </td>
                          <td className="col-date">
                            <div className="date-time-cell">
                              <span className="date-line">{item.date}</span>
                              <span className="time-line">{item.time}</span>
                            </div>
                          </td>
                          <td className="col-duration">{item.duration}</td>
                          <td className="col-questions">{item.questionsCount}</td>
                          <td className="col-score">
                            {item.isCompleted ? (
                              <span className="score-highlight">{item.score}%</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>In Progress</span>
                            )}
                          </td>
                          <td className="col-status">
                            {item.isCompleted ? (
                              <span className="badge-status-completed">Completed</span>
                            ) : (
                              <span className="badge-difficulty" style={{ margin: 0, background: 'rgba(255, 179, 0, 0.1)', color: '#ffb300', borderColor: 'rgba(255, 179, 0, 0.3)' }}>
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="col-action" style={{ textAlign: 'right' }}>
                            <button
                              className="btn-view-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReport(item._id);
                              }}
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Footer / Pagination */}
              {sortedHistory.length > 0 && (
                <div className="history-table-footer">
                  <span className="footer-count">
                    Showing 1 - {sortedHistory.length} of {sortedHistory.length} interviews
                  </span>
                  <div className="pagination-controls">
                    <button className="btn-page-arrow" disabled>‹</button>
                    <button className="btn-page-number active">1</button>
                    <button className="btn-page-arrow" disabled>›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
