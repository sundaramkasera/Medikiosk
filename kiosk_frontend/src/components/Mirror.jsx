import React, { useRef, useEffect } from 'react';
import { VisionEngine } from '../core/VisionEngine';

const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;
const POSE_CONNECTIONS = window.POSE_CONNECTIONS;

export function Mirror({ onFaceResults, onPoseResults }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const engineRef = useRef(null);

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');

        const wrappedPoseResults = (results) => {
            // Clear previous drawings
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            // Draw skeleton on transparent canvas
            if (results.poseLandmarks) {
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
                drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
            }
            
            // Forward to parent
            if (onPoseResults) onPoseResults(results);
        };

        const wrappedFaceResults = (results) => {
            if (onFaceResults) onFaceResults(results);
        };

        engineRef.current = new VisionEngine(videoElement, wrappedFaceResults, wrappedPoseResults);
        engineRef.current.start();

        return () => {
            if (engineRef.current) engineRef.current.stop();
        };
    }, [onFaceResults, onPoseResults]);

    return (
        <div style={{ position: 'relative', width: '640px', height: '480px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <video 
                ref={videoRef} 
                style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror video horizontally for natural interaction
                }} 
            />
            <canvas 
                ref={canvasRef} 
                width="640" 
                height="480"
                style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%', 
                    zIndex: 10,
                    transform: 'scaleX(-1)' // Match video mirroring
                }} 
            />
        </div>
    );
}
