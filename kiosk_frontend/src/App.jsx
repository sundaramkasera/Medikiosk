import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Mirror } from './components/Mirror';
import { useFaceWakeup } from './hooks/useFaceWakeup';
import { useGestureCursor } from './hooks/useGestureCursor';
import { useAudioIO } from './hooks/useAudioIO';
import './App.css';

const socket = io('http://localhost:8000', { transports: ['websocket', 'polling'] });

function App() {
    const [status, setStatus] = useState('IDLE');
    const [roomId, setRoomId] = useState(null);
    const [transcripts, setTranscripts] = useState([]);
    const [triageStatus, setTriageStatus] = useState('NORMAL');
    const [docCount, setDocCount] = useState(0);

    const { isSpeaking, isPlaying, playAudioBuffer } = useAudioIO(socket, roomId, status);

    useEffect(() => {
        const handleAiSpeech = (data) => {
            console.log("📥 Received payload from backend:", data);
            // Handle both structure scenarios just in case
            const payload = data.payload || data;
            
            setTranscripts(prev => {
                const newTranscripts = [...prev];
                if (payload.patient_transcript) {
                    newTranscripts.push({ speaker: 'Patient', text: payload.patient_transcript });
                }
                if (payload.text) {
                    newTranscripts.push({ speaker: 'AI', text: payload.text });
                }
                return newTranscripts;
            });

            if (payload.triage_level) {
                setTriageStatus(payload.triage_level);
            }
            if (payload.audio_b64) {
                try {
                    const audio = new Audio("data:audio/wav;base64," + payload.audio_b64);
                    audio.play().catch(e => console.error("Autoplay/Parsing error:", e));
                } catch (error) {
                    console.error("Audio instantiation error:", error);
                }
            }
        };

        socket.on('AI_SPEECH_RESPONSE', handleAiSpeech);
        
        const handleDocProcessed = (data) => {
            console.log("📄 Document attached:", data);
            setDocCount((prev) => prev + 1);
        };
        socket.on('document_processed', handleDocProcessed);

        return () => {
            socket.off('AI_SPEECH_RESPONSE', handleAiSpeech);
            socket.off('document_processed', handleDocProcessed);
        };
    }, []);

    const onWakeup = () => {
        if (status === 'IDLE') {
            const newRoomId = `session_${crypto.randomUUID()}`;
            setRoomId(newRoomId);
            setStatus('ACTIVE');
            
            socket.emit('join_room_event', { room_id: newRoomId.replace('session_', ''), role: 'kiosk' });
            
            setTimeout(() => {
                socket.emit('PATIENT_WAKEUP', { 
                    room_id: newRoomId.replace('session_', ''), 
                    payload: { timestamp: new Date().toISOString() } 
                });
            }, 500);
        }
    };

    const { faceDetected, processFace } = useFaceWakeup(onWakeup);
    const { cursor, dwellProgress, clicked, processPose } = useGestureCursor();

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-8">
            <h1 className="text-4xl font-bold mb-2">MediKiosk Vision Engine (Phase 3)</h1>
            <p className="text-gray-400 mb-2">
                Status: <span className={status === 'ACTIVE' ? 'text-green-500' : 'text-yellow-500'}>{status}</span> | Face Detected: {faceDetected ? 'Yes' : 'No'} | Triage: <span className={triageStatus === 'EMERGENCY' ? 'text-red-500 font-bold' : 'text-gray-300'}>{triageStatus}</span>
            </p>
            {roomId ? (
                <div className="flex flex-col items-center mb-8 gap-3">
                    <p className="text-blue-500 text-sm">Room ID: {roomId}</p>
                    <div className="bg-white p-2 rounded-lg">
                        <QRCodeSVG 
                            value={`https://new-goats-shake.loca.lt/mobile/${roomId.replace('session_', '')}`}
                            size={128}
                            level={"H"}
                        />
                    </div>
                    <p className="text-xs text-gray-400">Scan to upload documents</p>
                </div>
            ) : (
                <p className="text-gray-500 text-sm mb-8">Awaiting Session...</p>
            )}
            
            {docCount > 0 && (
              <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-xl text-sm shadow-sm transition-all animate-fade-in my-2 mb-6">
                <span className="text-base">📎</span>
                <span>
                  <strong className="font-semibold">{docCount} {docCount === 1 ? 'Document' : 'Documents'}</strong> attached to your visit.
                </span>
              </div>
            )}

            {/* STRICT GRID CONTAINER: Forces two exact halves, preventing any overlap */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', maxWidth: '1200px', gap: '2rem', alignItems: 'start' }}>
                
                {/* LEFT COLUMN: Webcam (Locked inside the grid cell) */}
                <div style={{ backgroundColor: '#000', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #374151', position: 'relative', minHeight: '480px', width: '100%', minWidth: '0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Mirror onFaceResults={processFace} onPoseResults={processPose} />
                    
                    {/* Virtual Cursor Overlay */}
                    {cursor && cursor.active && (
                        <div style={{
                            position: 'fixed',
                            left: cursor.x,
                            top: cursor.y,
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: clicked ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.6)',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                            transition: 'background-color 0.2s'
                        }}>
                            {dwellProgress > 0 && (
                                <svg width="40" height="40" style={{ position: 'absolute', top: -5, left: -5 }}>
                                    <circle cx="20" cy="20" r="18" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="113" strokeDashoffset={113 - (113 * (dwellProgress || 0) / 100)} transform="rotate(-90 20 20)" />
                                </svg>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Transcript & Gesture */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', minWidth: '0' }}>
                    
                    {/* TOP: Transcript Box (Added bg-gray-800 equivalent: #1f2937) */}
                    <div style={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1rem' }}>Live Transcript</h3>
                        
                        {/* Inner Black Transcript Area */}
                        <div style={{ width: '100%', backgroundColor: '#000', border: '1px solid #374151', borderRadius: '0.5rem', padding: '1rem', height: '250px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            {transcripts && transcripts.length > 0 ? (
                                transcripts.map((t, idx) => (
                                    <div key={idx} style={{ marginBottom: '0.75rem', width: '100%', textAlign: t.speaker === 'AI' ? 'left' : 'right' }}>
                                        <strong style={{ color: t.speaker === 'AI' ? '#60a5fa' : '#4ade80' }}>{t.speaker}:</strong> 
                                        <p style={{ margin: '0.25rem 0', color: '#d1d5db', fontSize: '1.125rem' }}>{t.text}</p>
                                    </div>
                                ))
                            ) : (
                                <div style={{ margin: 'auto', color: '#6b7280', textAlign: 'center', width: '100%' }}>Waiting for greeting...</div>
                            )}
                        </div>
                        
                        {/* Mic Indicator */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ 
                                width: '3rem', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', transition: 'all 0.3s',
                                backgroundColor: isSpeaking ? '#ef4444' : (isPlaying ? '#3b82f6' : '#22c55e'),
                                boxShadow: isSpeaking ? '0 0 15px rgba(239,68,68,0.5)' : (isPlaying ? '0 0 15px rgba(59,130,246,0.5)' : '0 0 15px rgba(34,197,94,0.5)')
                            }}>
                                <span style={{ fontSize: '1.25rem' }}>{isSpeaking ? '🎙️' : (isPlaying ? '🔊' : '🎤')}</span>
                            </div>
                            <span style={{ 
                                fontWeight: 'bold', fontSize: '0.875rem',
                                color: isSpeaking ? '#ef4444' : (isPlaying ? '#3b82f6' : '#22c55e') 
                            }}>
                                {isSpeaking ? "Listening..." : (isPlaying ? "AI is speaking..." : "Ready (Speak naturally)")}
                            </span>
                        </div>
                    </div>

                    {/* BOTTOM: Gesture Target (Added bg-gray-800 equivalent: #1f2937) */}
                    <div style={{ backgroundColor: '#1f2937', border: '1px dashed #6b7280', borderRadius: '0.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.5rem' }}>Gesture Test Target</h3>
                        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>Move your hand to control the red cursor.<br/>Hover over this box for 2 seconds to trigger a click.</p>
                        <button style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', maxWidth: '200px', cursor: 'pointer', border: 'none' }}>
                            Hover to Click
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default App;
