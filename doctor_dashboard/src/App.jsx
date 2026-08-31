import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import TriageQueue from './components/TriageQueue';
import ClinicalSummary from './components/ClinicalSummary';
import DocumentTimeline from './components/DocumentTimeline';

// Assuming backend runs on 8000
const socket = io('http://localhost:8000', {
  autoConnect: false,
});

function App() {
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Computed state
  const selectedEncounter = encounters.find(e => e.session_id === selectedEncounterId);

  // Fetch initial data
  const fetchEncounters = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/encounters');
      if (res.ok) {
        const data = await res.json();
        setEncounters(data);
        if (data.length > 0) {
          setSelectedEncounterId(prev => prev || data[0].session_id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch encounters", err);
    }
  };

  useEffect(() => {
    fetchEncounters();
    
    // Connect Socket.IO
    socket.connect();
    
    socket.on('connect', () => {
      setIsConnected(true);
      // Join the global doctor_dashboard room
      socket.emit('join_room_event', { room_id: 'doctor_dashboard', role: 'doctor' });
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('PATIENT_WAKEUP', () => {
      fetchEncounters();
    });

    socket.on('triage_update', () => {
      fetchEncounters();
    });

    socket.on('AI_SPEECH_RESPONSE', () => {
      fetchEncounters();
    });

    socket.on('document_processed', async (envelope) => {
      // Document added to an encounter, refetch to get the latest array
      await fetchEncounters();
      
      const eventSessionId = envelope?.session_id || (envelope?.payload && envelope.payload.session_id);
      
      // If data.session_id matches the currently selectedEncounter.session_id, re-fetch the specific encounter details
      if (eventSessionId && eventSessionId === selectedEncounterId) {
        try {
          const res = await fetch(`http://localhost:8000/api/encounters/${eventSessionId}`);
          if (res.ok) {
            const updatedEncounter = await res.json();
            // Update the specific encounter in the list so computed selectedEncounter updates immediately
            setEncounters(prev => prev.map(enc => 
              enc.session_id === eventSessionId ? updatedEncounter : enc
            ));
          }
        } catch (err) {
          console.error("Failed to fetch specific encounter on document_processed", err);
        }
      }
    });

    return () => {
      socket.disconnect();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('triage_update');
      socket.off('PATIENT_WAKEUP');
      socket.off('AI_SPEECH_RESPONSE');
      socket.off('document_processed');
    };
  }, []);

  const handleFinalize = async (session_id, summary_text) => {
    try {
      const res = await fetch(`http://localhost:8000/api/encounters/${session_id}/finalize`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary_text })
      });
      if (res.ok) {
        fetchEncounters();
      } else {
        alert("Failed to finalize encounter.");
      }
    } catch (err) {
      console.error(err);
      alert("Error finalizing encounter.");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <TriageQueue 
        encounters={encounters} 
        selectedEncounterId={selectedEncounterId}
        onSelectEncounter={setSelectedEncounterId} 
      />
      
      <ClinicalSummary 
        encounter={selectedEncounter} 
        onFinalize={handleFinalize} 
      />
      
      <DocumentTimeline 
        encounter={selectedEncounter} 
      />
      
      {/* Connection Status indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full border border-red-200 shadow-sm z-50">
          Disconnected from server
        </div>
      )}
    </div>
  );
}

export default App;
