import { useState, useRef } from 'react';

export function useFaceWakeup(onWakeup) {
    const [faceDetected, setFaceDetected] = useState(false);
    const faceTimer = useRef(null);
    
    const processFace = (results) => {
        if (results.detections && results.detections.length > 0) {
            // Only trigger if we weren't already tracking a face
            if (!faceTimer.current) {
                setFaceDetected(true);
                faceTimer.current = setTimeout(() => {
                    onWakeup();
                }, 3000);
            }
        } else {
            // Face lost, reset timer
            setFaceDetected(false);
            if (faceTimer.current) {
                clearTimeout(faceTimer.current);
                faceTimer.current = null;
            }
        }
    };
    
    return { faceDetected, processFace };
}
