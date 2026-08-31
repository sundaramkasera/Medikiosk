import { useState, useRef } from 'react';

export function useGestureCursor() {
    const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });
    const [dwellProgress, setDwellProgress] = useState(0); // 0 to 100
    const [clicked, setClicked] = useState(false);
    
    const dwellTimer = useRef(null);
    const progressInterval = useRef(null);
    const lastPos = useRef({ x: 0, y: 0 });

    const clearTimers = () => {
        if (dwellTimer.current) clearTimeout(dwellTimer.current);
        if (progressInterval.current) clearInterval(progressInterval.current);
        dwellTimer.current = null;
        progressInterval.current = null;
        setDwellProgress(0);
    };

    const processPose = (results) => {
        if (!results.poseLandmarks) {
            setCursor(prev => ({ ...prev, active: false }));
            clearTimers();
            return;
        }

        // 20 is right index finger tip
        const rightIndex = results.poseLandmarks[20];
        
        if (rightIndex && rightIndex.visibility > 0.6) {
            // Mirror X because the camera is mirrored
            const x = (1 - rightIndex.x) * window.innerWidth;
            const y = rightIndex.y * window.innerHeight;

            setCursor({ x, y, active: true });

            const dx = x - lastPos.current.x;
            const dy = y - lastPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 60) {
                // Moved too far, reset dwell
                clearTimers();
                lastPos.current = { x, y };
                setClicked(false);
                
                // Start new dwell (2000ms)
                let elapsed = 0;
                progressInterval.current = setInterval(() => {
                    elapsed += 50;
                    setDwellProgress(Math.min((elapsed / 2000) * 100, 100));
                }, 50);

                dwellTimer.current = setTimeout(() => {
                    setClicked(true);
                    clearInterval(progressInterval.current);
                    
                    // Reset click after a moment so they can click again if they move and dwell
                    setTimeout(() => setClicked(false), 500);
                }, 2000);
            }
        } else {
            setCursor(prev => ({ ...prev, active: false }));
            clearTimers();
        }
    };

    return { cursor, dwellProgress, clicked, processPose };
}
