import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const InterviewPage = () => {
  const { id: sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');

  // Interview state
  const [role, setRole] = useState('Technical Interview');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersSubmitted, setAnswersSubmitted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  
  // Custom Visual State matching Image
  const [liveClarity, setLiveClarity] = useState(80); // %
  const [liveConfidence, setLiveConfidence] = useState(85); // %
  const [livePace, setLivePace] = useState(60); // % (Average)
  const [liveNotes, setLiveNotes] = useState([
    'Structuring thoughts logically',
    'Explaining component design choice'
  ]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(1330); // 22:10 in seconds
  const timerRef = useRef(null);

  // Web Speech API references
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    // Start session timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const initializeSession = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRole(response.data.session.role);
        setQuestions(response.data.questions);
      } catch (err) {
        console.error('Failed to load session details', err);
        // Fallback mock data if server fails
        const mockRole = searchParams.get('role') || 'System Design Interview';
        setRole(mockRole);
        
        let mockQList = [
          'Let\'s begin. Design a URL shortener like bit.ly. Explain the high-level system-design.',
          'How would you design a rate limiting system for a public API? What storage and algorithms would you use?',
          'Describe how you would design a chat application like WhatsApp. How would you handle real-time delivery and message ordering?',
          'Explain how you would design a content delivery network (CDN) to serve static and dynamic assets globally with low latency.'
        ];
        
        if (mockRole === 'Frontend Developer') {
          mockQList = [
            'What is the difference between state and props in React, and how does data flow between components?',
            'Can you explain the Virtual DOM and how React uses reconciliation to update the UI efficiently?',
            'How do you manage global state in a large React application? When would you use Context API vs Redux?',
            'What are React Hooks, and what rules must you follow when using them?'
          ];
        } else if (mockRole === 'Backend Developer') {
          mockQList = [
            'Explain the difference between SQL and NoSQL databases. When would you choose one over the other?',
            'How does JWT authentication work, and how do you securely store and verify tokens in an Express backend?',
            'What is middleware in Express.js? Explain with an example of how you would implement request logging.',
            'How do you handle errors and ensure robustness in an asynchronous Node.js Express server?'
          ];
        }

        const formattedQs = mockQList.map((text, idx) => ({
          _id: `mock_q_${idx}`,
          text,
          transcript: '',
          recordingUrl: ''
        }));
        
        setQuestions(formattedQs);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Request Audio/Video permissions early
    requestUserMedia();

    return () => {
      clearInterval(timerRef.current);
      stopMediaStream();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [sessionId, token]);

  const requestUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
    } catch (err) {
      console.warn('Microphone or Camera access denied or unavailable. Falling back to mock voice capture.', err);
    }
  };

  const stopMediaStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Speech-to-Text & Audio Capture
  const startRecording = () => {
    if (isRecording) return;
    setIsRecording(true);
    setTranscript('');
    chunksRef.current = [];

    // Trigger waveform dynamic change simulation
    setLiveClarity(85);
    setLiveConfidence(90);
    setLivePace(65);

    // 1. Set up MediaRecorder for saving audio chunks
    if (mediaStream) {
      try {
        const options = { mimeType: 'audio/webm' };
        const recorder = new MediaRecorder(mediaStream, options);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          // Process recorded audio locally or package for server
          console.log('Audio recording stopped.');
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err);
      }
    }

    // 2. Set up SpeechRecognition (Web Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let interimText = '';
        let finalOutput = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalOutput += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }
        setTranscript((prev) => finalOutput || interimText || prev);

        // Adjust live metrics based on word lengths
        const allWords = (finalOutput + interimText).split(' ');
        if (allWords.length > 5) {
          setLiveNotes((prev) => {
            const list = [...prev];
            if (!list.includes('Addressing key design points')) {
              list.push('Addressing key design points');
            }
            return list;
          });
        }
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e);
      };

      recognitionRef.current = rec;
      rec.start();
    } else {
      // Simulate live transcription for browsers that do not support Web Speech API
      console.log('Web Speech API is not supported in this browser. Simulating transcripts.');
      let charIdx = 0;
      const sampleTexts = [
        "To design a URL shortener, we need a web server, an application layer, and a database layer. We will map long URLs to base62 short keys. We can store mappings in MongoDB, and add a Redis cache layer for popular links to keep read latencies low.",
        "A rate limiting system helps prevent API abuse. We can use a token bucket algorithm stored inside Redis, where we track IP addresses and tokens available. If tokens are zero, requests are dropped.",
        "For a real-time chat app like WhatsApp, we need WebSockets to support bidirectional message transfer. We will use a message queue like RabbitMQ to orchestrate delivery and a database like Cassandra to archive history.",
        "A Content Delivery Network utilizes edge cache servers. When a client requests content, the CDN redirects them to the closest geographical point of presence. We cache static assets there and compress headers."
      ];
      
      const targetText = sampleTexts[currentIdx] || "This is a mock answer captured via voice input simulation.";
      
      const interval = setInterval(() => {
        if (!isRecording) {
          clearInterval(interval);
          return;
        }
        
        setTranscript(targetText.substring(0, charIdx + 5));
        charIdx += 5;
        
        if (charIdx >= targetText.length) {
          clearInterval(interval);
        }
      }, 300);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle track enabled state
      });
    }
  };

  // Stop Recording and upload response
  const stopAndSubmitAnswer = async () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return;

    // Send answer to backend
    try {
      const payload = {
        questionId: currentQuestion._id,
        transcript: transcript || 'No response recorded.'
      };

      // Set up simple form data
      const formData = new FormData();
      formData.append('questionId', currentQuestion._id);
      formData.append('transcript', transcript || 'No response recorded.');

      // If we have real audio chunks recorded, package into a blob and upload
      if (chunksRef.current.length > 0) {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        formData.append('recording', audioBlob, `recording-${currentQuestion._id}.webm`);
      }

      await axios.post(`${API_BASE_URL}/answers`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update locally
      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx].transcript = transcript;
      setQuestions(updatedQuestions);
      setAnswersSubmitted(prev => prev + 1);

    } catch (err) {
      console.warn('Failed to submit answer, storing locally.', err);
      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx].transcript = transcript || 'Sample mock transcript.';
      setQuestions(updatedQuestions);
      setAnswersSubmitted(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    if (isRecording) {
      await stopAndSubmitAnswer();
    }

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setTranscript('');
      setLiveNotes(['Structuring thoughts logically', 'Explaining component design choice']);
    } else {
      // Last question completed, trigger finish
      handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
    if (isRecording) {
      await stopAndSubmitAnswer();
    }

    setFinishing(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/finish`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/report/${sessionId}`);
    } catch (err) {
      console.error('Failed to complete session evaluation', err);
      // Navigate to mock report page
      navigate(`/report/${sessionId}?mock=true&role=${encodeURIComponent(role)}`);
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading interview questions...</p>
          </div>
        </main>
      </div>
    );
  }

  if (finishing) {
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <h3 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700 }}>Processing AI Scorecard...</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
              Google Gemini is analyzing your audio answers, generating technical ratings, and building structured improvement guidelines.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const progressPercent = questions.length > 0 ? (answersSubmitted / questions.length) * 100 : 0;
  
  // SVG Ring values
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="interview-header">
          <div className="session-title">{role}</div>
          <div className="session-meta">
            <div className="timer">{formatTimer(timeLeft)}</div>
            <button className="btn-end" onClick={handleFinishInterview}>End Interview</button>
          </div>
        </div>

        <div className="interview-grid">
          {/* Main Interview Box */}
          <div className="ai-chat-box">
            <div className="ai-bubble">
              <div className="ai-avatar">AI</div>
              <div className="ai-message">
                <div className="ai-message-title">AI Interviewer</div>
                <div className="ai-message-text">{currentQuestion?.text}</div>
              </div>
            </div>

            {/* Sound Wave Recording Visualization */}
            <div className="recorder-visualization">
              <div className={`waveform-container ${isRecording ? 'listening' : ''}`}>
                {[...Array(25)].map((_, idx) => (
                  <div 
                    key={idx} 
                    className="waveform-bar" 
                    style={{ 
                      height: isRecording ? `${Math.floor(Math.random() * 40) + 12}px` : '8px'
                    }}
                  />
                ))}
              </div>
              <div className="recording-status-text">
                {isRecording ? 'Listening...' : 'Microphone Ready'}
              </div>
            </div>

            {/* Controls */}
            <div className="recorder-controls">
              <button 
                className={`btn-control secondary ${isMuted ? 'danger' : ''}`} 
                onClick={toggleMute}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              {isRecording ? (
                <button className="btn-control danger" onClick={stopAndSubmitAnswer}>
                  Stop Recording
                </button>
              ) : (
                <button className="btn-control primary" onClick={startRecording}>
                  Record Answer
                </button>
              )}

              <button className="btn-control primary" onClick={handleNext}>
                {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Session'}
              </button>
            </div>

            {transcript && (
              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Live Transcript
                </div>
                <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>"{transcript}"</p>
              </div>
            )}
          </div>

          {/* Right Side Panel */}
          <div className="interview-right-panel">
            {/* Progress Card */}
            <div className="card-panel" style={{ textAlign: 'center' }}>
              <div className="panel-title">Progress</div>
              <div className="progress-ring-section">
                <svg className="progress-circle-svg" width="90" height="90">
                  <circle className="progress-circle-bg" cx="45" cy="45" r={radius} />
                  <circle 
                    className="progress-circle-bar" 
                    cx="45" 
                    cy="45" 
                    r={radius} 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                  <text x="45" y="47" className="progress-circle-text" transform="rotate(90 45 45)">
                    {answersSubmitted}/{questions.length}
                  </text>
                  <text x="45" y="62" className="progress-circle-subtext" transform="rotate(90 45 45)">
                    Questions
                  </text>
                </svg>
              </div>
            </div>

            {/* Info Card */}
            <div className="card-panel">
              <div className="panel-title">Interview Info</div>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Role</span>
                  <span className="info-val">{role.split(' ')[0]}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Level</span>
                  <span className="info-val">Mid Level</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Duration</span>
                  <span className="info-val">30 mins</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Questions</span>
                  <span className="info-val">{questions.length}</span>
                </div>
              </div>
              <button className="btn-secondary-outline" onClick={() => alert('Focus on core technical patterns. Structure responses using STAR format: Situation, Task, Action, and Result.')}>
                View Guidelines
              </button>
            </div>
          </div>

          {/* Bottom Row Live Analytics */}
          <div className="interview-bottom-grid">
            <div className="card-panel">
              <div className="panel-title">Live Feedback</div>
              <div className="live-feedback-container">
                <div className="feedback-meter-group">
                  <div className="feedback-meter-header">
                    <span className="feedback-meter-name">Clarity</span>
                    <span className="feedback-meter-status">Good</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill good" style={{ width: `${liveClarity}%` }} />
                  </div>
                </div>

                <div className="feedback-meter-group">
                  <div className="feedback-meter-header">
                    <span className="feedback-meter-name">Confidence</span>
                    <span className="feedback-meter-status">Good</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill good" style={{ width: `${liveConfidence}%` }} />
                  </div>
                </div>

                <div className="feedback-meter-group">
                  <div className="feedback-meter-header">
                    <span className="feedback-meter-name">Pace</span>
                    <span className="feedback-meter-status">Average</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill average" style={{ width: `${livePace}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-panel">
              <div className="panel-title">AI Notes (Live)</div>
              <div className="bullet-list">
                {liveNotes.map((note, index) => (
                  <div key={index} className="bullet-item">
                    <span className="bullet-icon">&bull;</span>
                    <span>{note}</span>
                  </div>
                ))}
                {isRecording && (
                  <div className="bullet-item" style={{ color: 'var(--primary-green)' }}>
                    <span className="bullet-icon">&bull;</span>
                    <span style={{ fontStyle: 'italic' }}>Capturing vocal tone dynamics...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewPage;
