import React, { useState, useEffect } from 'react';
import { logTableEditSnapshot } from '../../../utils/logUserAction';
import { FinalReviewItem } from '../../../types/critique';

interface FinalReviewTableProps {
  finalReviewData: FinalReviewItem[];
  isEditing?: boolean;
  onDataChange?: (data: FinalReviewItem[]) => void;
}

export function FinalReviewTable(props: FinalReviewTableProps) {
  const { finalReviewData, isEditing = false, onDataChange } = props;
  // finalReviewData가 undefined/null일 경우 빈 배열로 처리
  const safeData = Array.isArray(finalReviewData) ? finalReviewData : [];
  const [editableData, setEditableData] = useState<FinalReviewItem[]>(safeData);

  useEffect(() => {
    setEditableData(Array.isArray(finalReviewData) ? finalReviewData : []);
  }, [finalReviewData]);

  // editableData가 변경될 때마다 onDataChange로 최신 데이터 전달
  useEffect(() => {
    if (onDataChange) {
      onDataChange(editableData);
    }
  }, [editableData, onDataChange]);

  // isEditing 토글될 때마다 snapshot 로그 남기기
  useEffect(() => {
    logTableEditSnapshot({ tableName: 'FINAL-REVIEW', state: editableData, when: isEditing ? 'BEFORE' : 'AFTER' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const updateField = (itemId: string, field: keyof FinalReviewItem, value: string) => {
    setEditableData(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Group items by title
  const grouped = editableData.reduce((acc, item) => {
    if (!acc[item.title]) acc[item.title] = [];
    acc[item.title].push(item);
    return acc;
  }, {} as Record<string, FinalReviewItem[]>);

  return (
    <div className="w-full flex flex-col space-y-6">
      {Object.entries(grouped).map(([title, items]) => (
        <div key={title} className="w-full p-4 bg-[#F5F5F5] shadow rounded-xl">
          {/* Category Title and Description (first item) */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-2">{title}</h2>
            <p className="text-gray-600">{items[0].description}</p>
          </div>
          {/* All issues in this category */}
          {items.map((item) => (
            <div key={item.id} className="mb-6">
              <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
                {/* Component Row */}
                <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                  <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold">섹션/컴포넌트</div>
                  <div className="p-4 text-gray-600 text-sm bg-white">{item.component}</div>
                </div>
                {/* Expected Standard Row */}
                <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                  <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold">권장 기준</div>
                  <div className="p-4 text-gray-600 text-sm bg-white">
                    {isEditing ? (
                      <textarea
                        value={item.expectedStandard}
                        onChange={(e) => updateField(item.id, 'expectedStandard', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      item.expectedStandard
                    )}
                  </div>
                </div>
                {/* Identified Gap Row */}
                <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                  <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold">발견된 문제점</div>
                  <div className="p-4 text-gray-600 text-sm bg-white">
                    {isEditing ? (
                      <textarea
                        value={item.identifiedGap}
                        onChange={(e) => updateField(item.id, 'identifiedGap', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      item.identifiedGap
                    )}
                  </div>
                </div>
                {/* Propose Fix Row */}
                <div className="grid grid-cols-[200px_1fr]">
                  <div className="p-4 bg-gray-100 text-sm text-gray-400 font-semibold">개선 방안</div>
                  <div className="p-4 text-gray-600 text-sm bg-white">
                    {isEditing ? (
                      <textarea
                        value={item.proposeFix}
                        onChange={(e) => updateField(item.id, 'proposeFix', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      item.proposeFix
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}