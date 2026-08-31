import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioIO(socket, roomId, status) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const audioContext = useRef(null);
    const analyser = useRef(null);
    const microphone = useRef(null);
    const rafId = useRef(null);
    const silenceStart = useRef(null);
    const streamRef = useRef(null);
    const isRecordingRef = useRef(false);

    // VAD Configuration
    const VOLUME_THRESHOLD = 40; // out of 255
    const SILENCE_DEBOUNCE_MS = 1500; // 1.5 seconds of silence before stopping

    const processAudioFrame = () => {
        if (!analyser.current || isPlaying) {
            rafId.current = requestAnimationFrame(processAudioFrame);
            return;
        }

        const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
        analyser.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        if (average > VOLUME_THRESHOLD) {
            // Patient is speaking
            silenceStart.current = null;
            if (!isRecordingRef.current) {
                // Start a new chunk recording
                startChunk();
            }
        } else {
            // Patient is silent
            if (isRecordingRef.current) {
                if (!silenceStart.current) {
                    silenceStart.current = Date.now();
                } else if (Date.now() - silenceStart.current > SILENCE_DEBOUNCE_MS) {
                    // Silence timeout reached, stop recording and send
                    stopChunk();
                }
            }
        }

        rafId.current = requestAnimationFrame(processAudioFrame);
    };

    const startChunk = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'inactive') {
            audioChunks.current = [];
            mediaRecorder.current.start();
            isRecordingRef.current = true;
            setIsSpeaking(true);
        }
    };

    const stopChunk = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            isRecordingRef.current = false;
            setIsSpeaking(false);
            silenceStart.current = null;
        }
    };

    const initVAD = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // Setup Web Audio API Analyser
            audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            analyser.current = audioContext.current.createAnalyser();
            analyser.current.fftSize = 512;
            analyser.current.smoothingTimeConstant = 0.8;
            
            microphone.current = audioContext.current.createMediaStreamSource(stream);
            microphone.current.connect(analyser.current);

            // Setup MediaRecorder
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result.split(',')[1];
                    if (socket && roomId) {
                        socket.emit('PATIENT_SPEECH_AUDIO', {
                            room_id: roomId,
                            payload: { audio_b64: base64data }
                        });
                    }
                };
            };

            // Start VAD Loop
            processAudioFrame();
        } catch (err) {
            console.error("VAD Setup Error:", err);
        }
    };

    useEffect(() => {
        if (status === 'ACTIVE' && !streamRef.current) {
            initVAD();
        }
        
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
            if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                mediaRecorder.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            if (audioContext.current && audioContext.current.state !== 'closed') {
                audioContext.current.close();
            }
        };
    }, [status]);

    const playAudioBuffer = async (base64Data) => {
        if (!base64Data || !audioContext.current) return;
        
        try {
            setIsPlaying(true);
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            try {
                const audioBuffer = await audioContext.current.decodeAudioData(bytes.buffer);
                const source = audioContext.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.current.destination);
                
                source.onended = () => {
                    setIsPlaying(false);
                };
                
                source.start(0);
            } catch(decodeErr) {
                console.warn("Audio decoding failed (Mock Backend fallback):", decodeErr);
                setTimeout(() => {
                    setIsPlaying(false);
                }, 2000);
            }
        } catch (err) {
            console.error("Error playing audio:", err);
            setIsPlaying(false);
        }
    };

    return { isSpeaking, isPlaying, playAudioBuffer };
}
