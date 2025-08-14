import React, { useState } from 'react';
import { ProjectionHeuristicRow } from '../../../types/critique';
import { useUICritiqueStore } from '../../../stores/useUICritiqueStore';

interface HeuristicTableProps {
  projectionHeuristicData: ProjectionHeuristicRow[];
  setProjectionHeuristicData: (data: ProjectionHeuristicRow[]) => void;
  isGuidelineRevised: boolean;
  setIsGuidelineRevised: (isRevised: boolean) => void;
}

export const ProjectionHeuristicTable: React.FC<HeuristicTableProps> = ({
  projectionHeuristicData,
  setProjectionHeuristicData,
  isGuidelineRevised,
  setIsGuidelineRevised,
}) => {
  const { changeLog, setChangeLog } = useUICritiqueStore();
  const [userUpdate, setUserUpdate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [guidelines, setGuidelines] = useState(
    projectionHeuristicData
      .map((row) => `${row.id}. **${row.heuristic}**\n${row.description}`)
      .join('\n\n')
  );

  const handleSend = async () => {
    if (!userUpdate.trim()) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append('user_update', userUpdate);
    formData.append('default_guidelines', guidelines);
    formData.append('task', '');
    formData.append('image_base64', '');
    formData.append('step3_results_str', '');
    formData.append('step4_results_str', '');

    try {
      const res = await fetch('/api/update_guidelines/', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error:', errorText);
        alert(`An error occurred: ${errorText}`);
        return;
      }

      const data = await res.json();
      const { updatedGuidelines, newChangeLog } = data;
      <h4 className="font-semibold text-blue-800 mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>Change Log:</h4>

      if (updatedGuidelines) {
        setGuidelines(updatedGuidelines); // Update local state for display
        setChangeLog(newChangeLog || 'No change log provided.');
        if (typeof setIsGuidelineRevised === 'function') {
          setIsGuidelineRevised(true);
        }
        setUserUpdate('');
      } else {
        console.error('Failed to get updated guidelines from response:', data);
        alert('Failed to update guidelines. Please check the server response.');
      }
    } catch (err) {
      console.error('Guideline update failed:', err);
      alert(
        `An error occurred while updating guidelines: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-50 rounded-lg">
      {changeLog && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Change Log:</h4>
          <pre className="text-sm whitespace-pre-wrap font-sans text-blue-700">{changeLog}</pre>
        </div>
      )}
      <h3 className="text-md font-semibold mb-4 text-gray-800" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
        {isGuidelineRevised
          ? "디자인 가이드라인 초안 (수정)"
          : "디자인 가이드라인 초안"}
      </h3>
      <div className="flex-1 overflow-y-auto p-4 bg-white border rounded-md mb-4">
        <pre className="text-sm whitespace-pre-wrap font-sans text-[#121417]" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{guidelines}</pre>
      </div>
      <h3 className="text-md font-semibold mb-2 text-gray-800" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>수정하거나 추가할 내용이 있다면 입력해주세요</h3>
      <textarea
        className="w-full p-2 border rounded-md mb-4 text-sm text-gray-500 bg-gray-100 focus:outline-none"
        rows={4}
        placeholder="e.g., Revise the guidelines to place greater emphasis on aesthetics and visual hierarchy."
        value={userUpdate}
        onChange={(e) => setUserUpdate(e.target.value)}
        disabled={isLoading}
          style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
          />
      <button
        className="px-4 py-2 text-sm font-bold rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors self-end disabled:bg-gray-400"
        onClick={handleSend}
        disabled={isLoading}
          style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
          >
        {isLoading ? "Updating..." : "Modify"}
      </button>
    </div>
  );
};

