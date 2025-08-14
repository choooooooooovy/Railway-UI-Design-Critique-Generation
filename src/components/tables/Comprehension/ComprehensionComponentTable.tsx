import React, { useState, useEffect } from 'react';
import { logTableEditSnapshot } from '../../../utils/logUserAction';
import { ComprehensionSectionGroup } from '../../../types/critique';
import { ComprehensionSectionSyncPanel } from './ComprehensionSectionSyncPanel';

export interface ComprehensionComponentTableProps {
  comprehensionComponentData: ComprehensionSectionGroup[];
  comprehensionSectionData?: ComprehensionSectionGroup[];
  isEditing?: boolean;
  onDataChange?: (data: ComprehensionSectionGroup[]) => void;
  setComprehensionSectionData?: (data: ComprehensionSectionGroup[]) => void;
  setIsUserEdited?: (flag: boolean) => void;
  onExportStep3Data?: (data: ComprehensionSectionGroup[]) => void; // step4로 넘길 최신 데이터 export용 콜백
}

export const ComprehensionComponentTable: React.FC<ComprehensionComponentTableProps> = ({
  comprehensionComponentData,
  comprehensionSectionData,
  isEditing = false,
  onDataChange,
  setComprehensionSectionData,
  setIsUserEdited,
  onExportStep3Data,
}) => {

  // 편집 가능한 데이터 상태
  const [editableData, setEditableData] = useState<ComprehensionSectionGroup[]>(() => JSON.parse(JSON.stringify(comprehensionComponentData)));

  // 부모 데이터가 바뀔 때만 editableData 동기화
  useEffect(() => {
    if (JSON.stringify(editableData) !== JSON.stringify(comprehensionComponentData)) {
      setEditableData(JSON.parse(JSON.stringify(comprehensionComponentData)));
      prevEditableDataRef.current = JSON.parse(JSON.stringify(comprehensionComponentData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comprehensionComponentData]);

  // 이전 editableData 추적
  const prevEditableDataRef = React.useRef<ComprehensionSectionGroup[]>(JSON.parse(JSON.stringify(editableData)));

  // editableData가 바뀔 때만 부모로 전달 (무한루프 방지)
  useEffect(() => {
    if (
      typeof onDataChange === 'function' &&
      JSON.stringify(editableData) !== JSON.stringify(prevEditableDataRef.current)
    ) {
      onDataChange(editableData);
    }
    prevEditableDataRef.current = JSON.parse(JSON.stringify(editableData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableData]);

  useEffect(() => {
    logTableEditSnapshot({ tableName: 'COMPREHENSION-COMPONENT', state: editableData, when: isEditing ? 'BEFORE' : 'AFTER' });
    // When editing is finished, always propagate latest data to next step
    if (!isEditing) {
      const sectionData = editableData.map(group => ({
        section: group.section,
        components: group.components
      }));
      if (typeof setComprehensionSectionData === 'function') {
        setComprehensionSectionData(sectionData);
      }
      if (typeof setIsUserEdited === 'function') {
        setIsUserEdited(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // Synchronize editableData with comprehensionComponentData
  useEffect(() => {
    if (JSON.stringify(editableData) !== JSON.stringify(comprehensionComponentData)) {
      setEditableData(JSON.parse(JSON.stringify(comprehensionComponentData)));
    }
  }, [comprehensionComponentData]);

  // Always propagate latest editableData to onExportStep3Data
  useEffect(() => {
    if (typeof onExportStep3Data === 'function') {
      const step3Results: Record<string, any> = {};
      editableData.forEach(group => {
        const sectionName = group.section.name;
        if (!step3Results[sectionName]) step3Results[sectionName] = {};
        (group.components ?? []).forEach(component => {
          step3Results[sectionName][component.name] = {
            visual_characteristics: component.visualCharacteristics || '',
            functional_characteristics: component.functionalCharacteristics || '',
            position: component.position || '',
            size_shape: component.sizeShape || '',
            sub_components: component.subComponents || ''
          };
        });
      });
      console.log('Exporting latest step3Results:', step3Results); // Debugging log
      onExportStep3Data(step3Results as any);
    }
  }, [editableData, onExportStep3Data]);

  // 섹션 필드 업데이트 함수
  const updateSectionField = (sectionIndex: number, field: string, value: string) => {
    setEditableData(prev => 
      prev.map((group, index) => 
        index === sectionIndex ? {
          ...group,
          section: { ...group.section, [field]: value }
        } : group
      )
    );
  };

  // 컴포넌트 필드 업데이트 함수
  const updateComponentField = (sectionIndex: number, componentIndex: number, field: string, value: string) => {
    setEditableData(prev => 
      prev.map((section, sIndex) => 
        sIndex === sectionIndex ? {
          ...section,
          components: section.components?.map((component, cIndex) => 
            cIndex === componentIndex ? { ...component, [field]: value } : component
          )
        } : section
      )
    );
  };

  // Function to handle next button click
  const handleNextButtonClick = () => {
    // Next 버튼 클릭 시 항상 최신 editableData를 부모로 넘김
    if (typeof setComprehensionSectionData === 'function') {
      setComprehensionSectionData(editableData);
    }

    // Export latest data
    if (typeof onExportStep3Data === 'function') {
      const step3Results: Record<string, any> = {};
      editableData.forEach(group => {
        const sectionName = group.section.name;
        if (!step3Results[sectionName]) step3Results[sectionName] = {};
        (group.components ?? []).forEach(component => {
          step3Results[sectionName][component.name] = {
            visual_characteristics: component.visualCharacteristics || '',
            functional_characteristics: component.functionalCharacteristics || '',
            position: component.position || '',
            size_shape: component.sizeShape || '',
            sub_components: component.subComponents || ''
          };
        });
      });
      console.log('DEBUG: Exporting latest step3Results on Next button click:', step3Results); // Debugging log
      onExportStep3Data(step3Results as any);
    }
  };

  // Example button to trigger the next step
  return (
    <div className="w-full flex flex-col space-y-6">
      {(Array.isArray(editableData) && editableData.length > 0 && editableData.some(g => g.components && g.components.length > 0)
        ? editableData
        : comprehensionComponentData).map((group, index) => (
        <div key={index} className="w-full flex flex-col p-4 bg-[#F5F5F5] shadow rounded-xl">
          <h2 className="text-lg font-semibold text-black mb-2">{group.section.name ?? comprehensionComponentData?.[index]?.section?.name ?? '-'}</h2>
          <h3 className="text-sm font-semibold mb-2 text-gray-400">섹션</h3>

          {/* Section Info Table */}
          <div className="w-full rounded-lg border border-gray-200 mb-4">
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_1fr_1fr] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">이름</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">위치</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">크기/형태</div>
              </div>
            </div>
            <div className="w-full grid grid-cols-[1fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.name ?? comprehensionComponentData?.[index]?.section?.name ?? '-'}</span>
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.position ?? comprehensionComponentData?.[index]?.section?.position ?? '-'}</span>
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.sizeShape ?? comprehensionComponentData?.[index]?.section?.sizeShape ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* Components Label */}
          <h3 className="text-sm font-semibold mb-2 text-gray-400">컴포넌트</h3>

          {/* Components Table */}
          <div className="w-full rounded-lg border border-gray-200 mb-4">
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">이름</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">시각적 특성</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">기능적 특성</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">위치</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">크기/형태</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold">하위 구성 요소</div>
              </div>
            </div>
            <div className="overflow-auto">
              {(group.components && group.components.length > 0
                ? group.components
                : comprehensionComponentData?.[index]?.components ?? []).map((component, componentIndex) => (
                <div key={componentIndex} className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.name ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.name ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                    {isEditing ? (
                      <textarea
                        value={component.visualCharacteristics ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.visualCharacteristics ?? '-'}
                        onChange={(e) => updateComponentField(index, componentIndex, 'visualCharacteristics', e.target.value)}
                        className="w-full text-sm text-gray-600 border-none rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{component.visualCharacteristics ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.visualCharacteristics ?? '-'}</span>
                    )}
                  </div>
                  <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                    {isEditing ? (
                      <textarea
                        value={component.functionalCharacteristics ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.functionalCharacteristics ?? '-'}
                        onChange={(e) => updateComponentField(index, componentIndex, 'functionalCharacteristics', e.target.value)}
                        className="w-full text-sm text-gray-600 border-none rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{component.functionalCharacteristics ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.functionalCharacteristics ?? '-'}</span>
                    )}
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.position ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.position ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.sizeShape ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.sizeShape ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.subComponents ?? comprehensionComponentData?.[index]?.components?.[componentIndex]?.subComponents ?? '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
