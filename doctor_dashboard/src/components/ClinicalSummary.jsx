import React, { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle } from 'lucide-react';

const ClinicalSummary = ({ encounter, onFinalize }) => {
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAyush, setShowAyush] = useState(false);

  useEffect(() => {
    if (encounter) {
      let initialText = encounter.final_summary || '';
      if (!initialText) {
        // Build an initial markdown string based on current SOCRATES
        initialText = `# Clinical Summary\n\n## History of Presenting Illness\n`;
        if (encounter.socrates_site) initialText += `- **Site**: ${encounter.socrates_site}\n`;
        if (encounter.socrates_onset) initialText += `- **Onset**: ${encounter.socrates_onset}\n`;
        if (encounter.socrates_character) initialText += `- **Character**: ${encounter.socrates_character}\n`;
        if (encounter.socrates_severity) initialText += `- **Severity**: ${encounter.socrates_severity}\n`;
        initialText += `\n## Doctor's Notes\n`;
      }
      setSummary(initialText);
    } else {
      setSummary('');
    }
  }, [encounter]);

  const handleAyushToggle = (e) => {
    const isChecked = e.target.checked;
    setShowAyush(isChecked);
    
    const ayushTemplate = "\n\n## AYUSH Parameters\n- **Prakriti**: \n- **Vikriti**: \n";
    
    if (isChecked) {
      if (!summary.includes("## AYUSH Parameters")) {
        setSummary(prev => prev + ayushTemplate);
      }
    } else {
      setSummary(prev => prev.replace(ayushTemplate, ""));
    }
  };

  const handleFinalize = async () => {
    if (!encounter) return;
    setIsSaving(true);
    let finalPayload = summary;
    await onFinalize(encounter.session_id, finalPayload);
    setIsSaving(false);
  };

  if (!encounter) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500">
        <FileText className="w-16 h-16 mb-4 text-slate-700" />
        <p>Select a patient from the queue to view clinical summary.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 bg-slate-950">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-lg">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Clinical Summary
          {encounter.status === 'FINALIZED' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-900/50 text-green-200 ml-2 border border-green-800">
              <CheckCircle className="w-4 h-4" /> Finalized
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showAyush} 
              onChange={handleAyushToggle}
              className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            Include AYUSH Sections
          </label>
          <button 
            onClick={handleFinalize}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Finalize Encounter'}
          </button>
        </div>
      </div>
      <div className="flex-1 p-0 bg-slate-950 rounded-b-lg overflow-hidden border border-slate-800 border-t-0">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full h-full p-6 bg-slate-900 text-slate-200 border-0 focus:ring-0 resize-none font-mono text-sm"
          placeholder="Type markdown summary here..."
        />
      </div>
    </div>
  );
};

export default ClinicalSummary;
