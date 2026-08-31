import React from 'react';
import { User, Clock, AlertTriangle } from 'lucide-react';

const TriageQueue = ({ encounters, selectedEncounterId, onSelectEncounter }) => {
  return (
    <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-400" />
          Triage Queue
        </h2>
        <p className="text-sm text-slate-400 mt-1">{encounters.length} Active Patients</p>
      </div>
      
      <div className="flex-1 p-3 space-y-3">
        {encounters.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 text-sm">
            No active patients in queue
          </div>
        ) : (
          encounters.map(encounter => {
            const isEmergency = encounter.triage_level?.toUpperCase() === 'EMERGENCY';
            const isSelected = selectedEncounterId === encounter.session_id;
            
            return (
              <div 
                key={encounter.session_id}
                onClick={() => onSelectEncounter(encounter.session_id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-900/30 shadow-sm' 
                    : 'border-slate-700 bg-slate-800/50 hover:border-indigo-500/50 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-slate-200 truncate pr-2">
                    {encounter.session_id.substring(0, 8)}...
                  </div>
                  {isEmergency && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-200 border border-red-800">
                      <AlertTriangle className="w-3 h-3" />
                      URGENT
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-slate-400 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(encounter.created_at || Date.now()).toLocaleTimeString()}
                  </div>
                  {encounter.socrates_site && (
                    <div className="truncate">
                      <span className="font-medium text-slate-300">Site:</span> {encounter.socrates_site}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TriageQueue;
