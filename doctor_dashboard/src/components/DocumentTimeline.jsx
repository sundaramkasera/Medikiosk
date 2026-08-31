import React, { useState } from 'react';
import { FileText, AlertCircle, FileSearch, ArrowDown, Image as ImageIcon, X } from 'lucide-react';

const DocumentTimeline = ({ encounter }) => {
  if (!encounter) {
    return (
      <div className="w-96 border-l border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center h-full p-6 shrink-0 text-center text-slate-500 overflow-y-auto">
        <FileSearch className="w-12 h-12 mb-3 text-slate-700" />
        <p>Document timeline will appear here for selected patient</p>
      </div>
    );
  }

  const [previewImages, setPreviewImages] = useState(null);

  const docs = encounter.document_intelligence || [];

  return (
    <div className="w-96 border-l border-slate-800 bg-slate-900/50 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="p-6 border-b border-slate-800 sticky top-0 z-10 bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Document Timeline
        </h3>
        <p className="text-sm text-slate-400 mt-1">{docs.length} uploaded document(s)</p>
      </div>
      
      <div className="flex-1 p-6">
        {docs.length === 0 ? (
          <div className="text-center text-slate-500 mt-10 text-sm">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800"></div>
            
            <div className="space-y-6 relative">
              {docs.map((doc, index) => {
                const needsReview = doc.requires_manual_review;
                return (
                  <div key={doc.document_id || index} className="relative pl-10">
                    {/* Timeline Node */}
                    <div className={`absolute left-2.5 -ml-1 top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-sm ${needsReview ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    
                    <div className={`p-4 rounded-lg border shadow-sm ${needsReview ? 'bg-red-900/10 border-red-900/50' : 'bg-slate-800/50 border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Document #{index + 1}
                        </span>
                        {needsReview && (
                          <span title="Requires Manual Review" className="text-red-400">
                            <AlertCircle className="w-5 h-5" />
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300 mb-2 leading-relaxed">
                        {/* Summary of extracted entities or fallback to document type */}
                        {(() => {
                          const hasEntities = doc.extracted_entities && (
                            (doc.extracted_entities.diagnoses && doc.extracted_entities.diagnoses.length > 0) ||
                            (doc.extracted_entities.medications && doc.extracted_entities.medications.length > 0) ||
                            (doc.extracted_entities.investigations && doc.extracted_entities.investigations.length > 0)
                          );

                          if (hasEntities) {
                            return (
                              <div className="space-y-1">
                                {doc.extracted_entities.diagnoses?.length > 0 && (
                                  <div><span className="font-semibold text-slate-400">Diagnoses:</span> {doc.extracted_entities.diagnoses.join(", ")}</div>
                                )}
                                {doc.extracted_entities.medications?.length > 0 && (
                                  <div><span className="font-semibold text-slate-400">Medications:</span> {doc.extracted_entities.medications.length} found</div>
                                )}
                                {doc.extracted_entities.investigations?.length > 0 && (
                                  <div><span className="font-semibold text-slate-400">Labs/Tests:</span> {doc.extracted_entities.investigations.length} found</div>
                                )}
                              </div>
                            );
                          } else {
                            // Fallback to a snippet of raw text if no structured entities
                            const snippet = doc.raw_text ? (doc.raw_text.substring(0, 100) + (doc.raw_text.length > 100 ? "..." : "")) : "Processing details pending...";
                            return <p className="italic text-slate-500">"{snippet}"</p>;
                          }
                        })()}
                      </div>
                      
                      {/* Hidden full text that expands on hover */}
                      <details className="text-xs text-slate-400 group">
                        <summary className="cursor-pointer font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                          View Raw Text
                          <ArrowDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 p-3 bg-slate-950 rounded border border-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono text-[10px]">
                          {doc.raw_text || "No raw text available."}
                        </div>
                      </details>
                      
                      {doc.image_urls && doc.image_urls.length > 0 && (
                        <button 
                          onClick={() => setPreviewImages(doc.image_urls)}
                          className="mt-3 flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded border border-slate-700 transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          View Original Scan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImages && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-start p-8 overflow-y-auto">
          <div className="w-full max-w-4xl flex justify-end mb-4">
            <button 
              onClick={() => setPreviewImages(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-full transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              <span className="text-sm font-medium pr-1">Close</span>
            </button>
          </div>
          
          <div className="w-full max-w-4xl space-y-6 flex flex-col items-center pb-20">
            {previewImages.map((url, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-2 rounded-lg shadow-2xl">
                <img 
                  src={`http://localhost:8000${url}`} 
                  alt={`Original Scan ${idx + 1}`} 
                  className="max-w-full h-auto rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTimeline;
