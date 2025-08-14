import React, { useState, useEffect } from 'react';
import { ComprehensionSectionGroup } from '../../../types/critique';
import { ComprehensionComponentTable } from './ComprehensionComponentTable';
import { ComprehensionSectionTable } from './ComprehensionSectionTable';

interface ComprehensionSectionSyncPanelProps {
  initialData: ComprehensionSectionGroup[];
  isEditing?: boolean;
  onDataChange?: (data: ComprehensionSectionGroup[]) => void;
}

export const ComprehensionSectionSyncPanel: React.FC<ComprehensionSectionSyncPanelProps> = ({ initialData, isEditing = false, onDataChange }) => {
  const [comprehensionData, setComprehensionData] = useState<ComprehensionSectionGroup[]>(initialData);

  // initialData가 변경될 때마다 comprehensionData 동기화
  useEffect(() => {
    setComprehensionData(initialData);
  }, [initialData]);

  // 데이터 변경 시 상위로 전달
  useEffect(() => {
    if (onDataChange && typeof onDataChange === 'function') {
      onDataChange(comprehensionData);
    }
  }, [comprehensionData, onDataChange]);

  return (
    <div className="w-full flex flex-col gap-8">
      <ComprehensionComponentTable
        comprehensionComponentData={comprehensionData}
        isEditing={isEditing}
        onDataChange={setComprehensionData}
      />
      <ComprehensionSectionTable
        comprehensionSectionData={comprehensionData}
        isEditing={isEditing}
        onDataChange={setComprehensionData}
      />
    </div>
  );
};
