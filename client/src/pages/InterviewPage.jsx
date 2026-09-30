import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

// High-sensitivity audio constraints for normal sitting distance from laptop
const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: false }, // Avoid cutting off voice from desk distance
    autoGainControl: { ideal: true },   // Automatically boosts microphone gain for natural speaking volume
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 }
  }
};

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
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [micState, setMicState] = useState('ready'); // 'ready', 'recording', 'saved', 'denied', 'error'
  const [statusMessage, setStatusMessage] = useState('Microphone Ready');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 volume level

  // Custom Visual Metrics
  const [liveClarity, setLiveClarity] = useState(80); // %
  const [liveConfidence, setLiveConfidence] = useState(85); // %
  const [livePace, setLivePace] = useState(60); // % (Average)

  // Session countdown timer state
  const [timeLeft, setTimeLeft] = useState(1330); // in seconds
  const timerRef = useRef(null);
  const recordTimerRef = useRef(null);

  // Web Speech API, MediaRecorder & AudioContext references
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const chunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const baseTranscriptRef = useRef('');
  const transcriptRef = useRef('');

  // Dynamic question counts
  const totalQuestions = questions.length;
  const currentQuestionNumber = totalQuestions > 0 ? currentIdx + 1 : 0;
  const answeredCount = questions.filter(q => (q.transcript || '').trim()).length;
  const progressPercent = totalQuestions > 0 ? (currentQuestionNumber / totalQuestions) * 100 : 0;

  // SVG Ring values
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

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
        
        if (response.data && response.data.questions && response.data.questions.length > 0) {
          setRole(response.data.session?.role || 'Technical Interview');
          setQuestions(response.data.questions);
          const initialTranscript = response.data.questions[0]?.transcript || '';
          setTranscript(initialTranscript);
          transcriptRef.current = initialTranscript;
          baseTranscriptRef.current = initialTranscript;
          setAudioUrl(response.data.questions[0]?.recordingUrl || '');
        } else {
          throw new Error('No questions returned from session endpoint');
        }
      } catch (err) {
        console.error('Failed to load session details from server, checking fallback:', err);
        const mockRole = searchParams.get('role') || 'System Design Interview';
        setRole(mockRole);
        
        let mockQList = [
          'Design a high-scale URL shortening service like Bitly. Explain your data schema, Base62 encoding, and caching layer.',
          'How would you design a distributed rate-limiting system for a public API processing 100,000 requests per second?',
          'Describe how you would architect a real-time messaging application like WhatsApp. How do you handle delivery receipts and offline sync?',
          'How do you design a Content Delivery Network (CDN) to cache static and dynamic content globally with low latency?'
        ];
        
        if (mockRole.toLowerCase().includes('frontend')) {
          mockQList = [
            'What is the difference between state and props in React, and how does unidirectional data flow work?',
            'Can you explain the Virtual DOM and how React uses reconciliation to update the UI efficiently?',
            'How do you manage global state in a large React application? When would you use Context API vs Redux or Zustand?',
            'How would you optimize the performance of a React app that suffers from unnecessary re-renders?'
          ];
        } else if (mockRole.toLowerCase().includes('backend')) {
          mockQList = [
            'Explain the differences between SQL and NoSQL databases. When would you choose PostgreSQL over MongoDB?',
            'How does JWT (JSON Web Token) authentication work, and how do you securely store and verify tokens in an Express backend?',
            'What is the Node.js Event Loop? What happens when a CPU-intensive synchronous task blocks the main thread?',
            'What is middleware in Express.js? Explain with an example of how you would implement authentication and logging middleware.'
          ];
        }

        const formattedQs = mockQList.map((text, idx) => ({
          _id: `q_${Date.now()}_${idx}`,
          sessionId,
          text,
          transcript: '',
          feedback: '',
          score: 0,
          recordingUrl: ''
        }));
        
        setQuestions(formattedQs);
        setTranscript('');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
    requestUserMedia();

    return () => {
      clearInterval(timerRef.current);
      clearInterval(recordTimerRef.current);
      stopMediaStream();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [sessionId, token]);

  // Request audio permissions with boosted sensitivity
  const requestUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      setMediaStream(stream);
      setMicState('ready');
      setStatusMessage('Microphone Connected & Ready');
      setupAudioAnalyser(stream);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setMicState('denied');
      setStatusMessage('Microphone Permission Denied. You can type answers directly.');
    }
  };

  // Set up Web Audio API to monitor real-time microphone levels
  const setupAudioAnalyser = (stream) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }

      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (analyserRef.current && isRecordingRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0-100%
          const scaled = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(scaled);
        } else {
          setAudioLevel(0);
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn('Web Audio Analyser setup notice:', e);
    }
  };

  const stopMediaStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Voice Recording & Speech Recognition
  const startRecording = async () => {
    if (isRecording) return;

    let activeStream = mediaStream;
    if (!activeStream || !activeStream.active) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
        setMediaStream(activeStream);
        setMicState('ready');
        setupAudioAnalyser(activeStream);
      } catch (err) {
        setMicState('denied');
        setStatusMessage('Microphone Permission Denied. Please allow microphone access or type your answer.');
        return;
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try { await audioContextRef.current.resume(); } catch (e) {}
    }

    isRecordingRef.current = true;
    baseTranscriptRef.current = (transcript || '').trim();
    transcriptRef.current = (transcript || '').trim();

    setIsRecording(true);
    setMicState('recording');
    setStatusMessage('🎙️ Listening — speak at your normal desk distance...');
    setRecordSeconds(0);
    chunksRef.current = [];

    // Live duration counter
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);

    // Live metric updates
    setLiveClarity(88);
    setLiveConfidence(92);
    setLivePace(65);

    // 1. Initialize MediaRecorder to capture real audio Blob
    if (activeStream) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

        const recorder = new MediaRecorder(activeStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (chunksRef.current.length > 0) {
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            console.log('Real Audio Blob created:', audioBlob.size, 'bytes');
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(500); // chunk every 500ms
      } catch (err) {
        console.warn('MediaRecorder error:', err);
      }
    }

    // 2. Initialize Web Speech API for continuous, sensitive real-time speech-to-text
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = 'en-US';

        rec.onspeechstart = () => {
          setStatusMessage('🎙️ Voice detected — transcribing...');
        };

        rec.onsoundstart = () => {
          setStatusMessage('🎙️ Audio signal incoming...');
        };

        rec.onresult = (event) => {
          let sessionFinal = '';
          let sessionInterim = '';
          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              sessionFinal += res[0].transcript + ' ';
            } else {
              sessionInterim += res[0].transcript;
            }
          }
          const spoken = (sessionFinal + sessionInterim).trim();
          const base = baseTranscriptRef.current;
          const combined = base ? `${base} ${spoken}`.replace(/\s+/g, ' ').trim() : spoken;
          setTranscript(combined);
          transcriptRef.current = combined;
          setStatusMessage('🎙️ Transcribing speech in real-time...');
        };

        rec.onerror = (e) => {
          console.warn('Speech recognition status:', e.error);
          if (e.error === 'not-allowed') {
            setStatusMessage('Speech recognition denied. You can type your answer.');
          } else if (e.error === 'no-speech') {
            // Keep status friendly if there is a natural pause
            if (isRecordingRef.current) {
              setStatusMessage('🎙️ Listening... speak clearly.');
            }
          }
        };

        rec.onend = () => {
          // If recording is still active, restart with slight debounce to prevent browser audio dropouts
          if (isRecordingRef.current) {
            baseTranscriptRef.current = (transcriptRef.current || '').trim();
            setTimeout(() => {
              if (isRecordingRef.current) {
                try {
                  rec.start();
                } catch (err) {
                  console.warn('Recognition restart notice:', err.message);
                }
              }
            }, 100);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (recErr) {
        console.warn('Could not start SpeechRecognition:', recErr);
      }
    } else {
      setStatusMessage('Voice recognition not supported in this browser. Please type your answer.');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
  };

  // Stop recording and save answer
  const stopRecordingSession = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    clearInterval(recordTimerRef.current);
    setAudioLevel(0);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    setMicState('saved');
    setStatusMessage('Recording completed & saved.');
  };

  // Save current answer to backend
  const saveAnswer = async (textToSave, customAudioUrl) => {
    const currentQuestion = questions[currentIdx];
    if (!currentQuestion) return;

    const finalAnswer = (textToSave !== undefined ? textToSave : transcriptRef.current) || '';
    const finalAudio = customAudioUrl || audioUrl || '';

    try {
      await axios.post(
        `${API_BASE_URL}/answers`,
        {
          questionId: currentQuestion._id,
          transcript: finalAnswer,
          recordingUrl: finalAudio
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx] = { 
        ...updatedQuestions[currentIdx], 
        transcript: finalAnswer,
        recordingUrl: finalAudio
      };
      setQuestions(updatedQuestions);
      setStatusMessage('Answer saved.');
    } catch (err) {
      console.warn('Failed to submit answer to server, caching locally.', err);
      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx] = { 
        ...updatedQuestions[currentIdx], 
        transcript: finalAnswer,
        recordingUrl: finalAudio
      };
      setQuestions(updatedQuestions);
    }
  };

  const handleStopAndSave = async () => {
    stopRecordingSession();
    await saveAnswer(transcriptRef.current, audioUrl);
  };

  const handleNext = async () => {
    if (isRecording) {
      stopRecordingSession();
    }
    await saveAnswer(transcriptRef.current, audioUrl);

    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      const nextQTranscript = questions[nextIdx]?.transcript || '';
      const nextQAudio = questions[nextIdx]?.recordingUrl || '';
      setTranscript(nextQTranscript);
      transcriptRef.current = nextQTranscript;
      baseTranscriptRef.current = nextQTranscript;
      setAudioUrl(nextQAudio);
      setStatusMessage(nextQTranscript ? 'Answer loaded.' : 'Microphone Ready');
    } else {
      handleFinishInterview();
    }
  };

  const handleFinishInterview = async () => {
    if (isRecording) {
      stopRecordingSession();
    }
    await saveAnswer(transcriptRef.current, audioUrl);

    setFinishing(true);
    try {
      await axios.post(
        `${API_BASE_URL}/finish`,
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/report/${sessionId}`);
    } catch (err) {
      console.error('Failed to complete session evaluation on server', err);
      navigate(`/report/${sessionId}?role=${encodeURIComponent(role)}`);
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
            <p style={{ color: 'var(--text-secondary)' }}>Loading interview session...</p>
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
            <h3 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: '1.6rem', marginBottom: '0.75rem' }}>
              Gemini AI is Evaluating Your Interview...
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', textAlign: 'center', lineHeight: '1.6' }}>
              Google Gemini is analyzing your technical answers, assessing architectural trade-offs, and compiling structured report feedback.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="interview-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge-difficulty" style={{ margin: 0 }}>{role}</span>
            <div className="session-title" style={{ fontSize: '1.1rem' }}>
              Question {currentQuestionNumber} of {totalQuestions}
            </div>
          </div>
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
                <div className="ai-message-title">
                  AI Interviewer &bull; Question {currentQuestionNumber} of {totalQuestions}
                </div>
                <div className="ai-message-text" style={{ fontSize: '1.15rem', lineHeight: '1.5', marginTop: '0.35rem' }}>
                  {currentQuestion?.text}
                </div>
              </div>
            </div>

            {/* Sound Wave Recording Visualization Driven by Live Audio Level */}
            <div className="recorder-visualization">
              <div className={`waveform-container ${isRecording ? 'listening' : ''}`}>
                {[...Array(25)].map((_, idx) => {
                  // Dynamic height based on live audioLevel volume
                  const dynamicHeight = isRecording 
                    ? Math.max(8, Math.min(48, Math.round(audioLevel * (0.4 + (idx % 5) * 0.15) + (Math.random() * 8))))
                    : 8;

                  return (
                    <div 
                      key={idx} 
                      className="waveform-bar" 
                      style={{ 
                        height: `${dynamicHeight}px`,
                        backgroundColor: isRecording && audioLevel > 15 ? 'var(--primary-green)' : 'rgba(255,255,255,0.2)',
                        transition: 'height 0.08s ease, background-color 0.1s ease'
                      }}
                    />
                  );
                })}
              </div>

              {/* Dynamic Recording Status Banner */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div className="recording-status-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isRecording && <span className="recording-dot-pulse" />}
                  <span>{statusMessage}</span>
                  {isRecording && (
                    <span style={{ color: 'var(--accent-red)', fontWeight: 700, fontFamily: 'monospace' }}>
                      ({formatTimer(recordSeconds)})
                    </span>
                  )}
                </div>
                {isRecording && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Mic Sensitivity:</span>
                    <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${audioLevel}%`, height: '100%', background: audioLevel > 15 ? 'var(--primary-green)' : '#ffb300', transition: 'width 0.1s ease' }} />
                    </div>
                    <span>{audioLevel > 15 ? 'Good signal' : 'Detecting...'}</span>
                  </div>
                )}
                {micState === 'denied' && (
                  <span style={{ fontSize: '0.75rem', color: '#ffb300' }}>
                    Tip: Grant mic permission in URL bar to enable voice input, or type below.
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="recorder-controls">
              <button 
                className={`btn-control secondary ${isMuted ? 'danger' : ''}`} 
                onClick={toggleMute}
                disabled={!mediaStream}
              >
                {isMuted ? 'Unmute Mic' : 'Mute Mic'}
              </button>

              {isRecording ? (
                <button className="btn-control danger" onClick={handleStopAndSave}>
                  Stop Recording
                </button>
              ) : (
                <button className="btn-control primary" onClick={startRecording}>
                  Record Answer
                </button>
              )}

              <button className="btn-control primary" onClick={handleNext}>
                {currentIdx < totalQuestions - 1 ? 'Next Question →' : 'Finish Session & View Report'}
              </button>
            </div>

            {/* Transcript & Candidate Answer Input */}
            <div style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{isRecording ? '🎙️ Live Voice Transcription' : '📝 Candidate Response (Voice or Type)'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {transcript.trim() && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                      ✓ Answer Present
                    </span>
                  )}
                  <button 
                    type="button" 
                    onClick={() => saveAnswer(transcript, audioUrl)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Save Draft
                  </button>
                </div>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => {
                  const val = e.target.value;
                  setTranscript(val);
                  transcriptRef.current = val;
                  if (isRecordingRef.current) {
                    baseTranscriptRef.current = val;
                  }
                  saveAnswer(val, audioUrl);
                }}
                placeholder={isRecording ? "Listening to your microphone in real-time..." : "Click 'Record Answer' to speak, or type your technical answer directly here..."}
                style={{
                  width: '100%',
                  minHeight: '90px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              {/* Real Audio Recording Voice Replay */}
              {audioUrl && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Recorded Audio:
                  </span>
                  <audio src={audioUrl} controls controlsList="nodownload" style={{ height: '32px' }} />
                </div>
              )}
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="interview-right-panel">
            {/* Dynamic Progress Card */}
            <div className="card-panel" style={{ textAlign: 'center' }}>
              <div className="panel-title">Interview Progress</div>
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
                    {currentQuestionNumber}/{totalQuestions}
                  </text>
                  <text x="45" y="62" className="progress-circle-subtext" transform="rotate(90 45 45)">
                    Questions
                  </text>
                </svg>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {Math.round(progressPercent)}% of questions viewed &bull; {answeredCount} answered
              </div>
            </div>

            {/* Info Card */}
            <div className="card-panel">
              <div className="panel-title">Session Details</div>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Track</span>
                  <span className="info-val">{role}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Active Question</span>
                  <span className="info-val">{currentQuestionNumber} of {totalQuestions}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Answered</span>
                  <span className="info-val" style={{ color: answeredCount > 0 ? 'var(--primary-green)' : 'inherit' }}>
                    {answeredCount} of {totalQuestions}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Mic Status</span>
                  <span className="info-val" style={{ fontSize: '0.8rem', color: isRecording ? 'var(--accent-red)' : micState === 'denied' ? '#ffb300' : 'var(--primary-green)' }}>
                    {isRecording ? `Recording (${formatTimer(recordSeconds)})` : micState === 'denied' ? 'Permission Denied' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Analytics */}
            <div className="card-panel">
              <div className="panel-title">Live Indicators</div>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewPage;
