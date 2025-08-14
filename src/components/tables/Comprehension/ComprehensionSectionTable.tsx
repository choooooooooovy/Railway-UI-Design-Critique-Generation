import React, { useState, useEffect } from 'react';
import { logTableEditSnapshot } from '../../../utils/logUserAction';
import { ComprehensionSectionGroup } from '../../../types/critique';

interface ComprehensionSectionTableProps {
  comprehensionSectionData: ComprehensionSectionGroup[];
  isEditing?: boolean;
  onDataChange?: (data: ComprehensionSectionGroup[]) => void;
}

export const ComprehensionSectionTable: React.FC<ComprehensionSectionTableProps> = ({
  comprehensionSectionData,
  isEditing = false,
  onDataChange,
}) => {

  // 깊은 복사로 초기값 설정
  const [editableData, setEditableData] = useState<ComprehensionSectionGroup[]>(() => JSON.parse(JSON.stringify(comprehensionSectionData)));

  // props가 변경될 때 editableData를 항상 동기화
  useEffect(() => {
    setEditableData(JSON.parse(JSON.stringify(comprehensionSectionData)));
  }, [comprehensionSectionData]);

  // 수정 시점에 바로 부모로 최신값 저장 (textarea onBlur에서 호출)
  const handleSectionFieldBlur = () => {
    if (typeof onDataChange === 'function') {
      onDataChange(editableData);
    }
  };

  const handleComponentFieldBlur = () => {
    if (typeof onDataChange === 'function') {
      onDataChange(editableData);
    }
  };


  // isEditing 토글될 때마다 snapshot 로그 남기기
  useEffect(() => {
    logTableEditSnapshot({ tableName: 'COMPREHENSION-SECTION', state: editableData, when: isEditing ? 'BEFORE' : 'AFTER' });
    if (!isEditing && typeof onDataChange === 'function') {
      onDataChange(editableData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

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
      prev.map((group, sIndex) => 
        sIndex === sectionIndex ? {
          ...group,
          components: group.components?.map((component, cIndex) => 
            cIndex === componentIndex ? { ...component, [field]: value } : component
          )
        } : group
      )
    );
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {editableData.map((group, index) => (
        <div key={index} className="w-full flex flex-col p-4 bg-[#F5F5F5] shadow rounded-xl">
          <h2 className="text-lg font-semibold text-black mb-2">{group.section.name ?? comprehensionComponentData?.[index]?.section?.name ?? '-'}</h2>
          {/* Section Info Table */}
          <h3 className="text-sm font-semibold mb-2 text-gray-400">섹션</h3>
          <div className="w-full rounded-lg border border-gray-200 mb-4">
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_3fr_3fr_1fr_1fr] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-gray-400 font-semibold">이름</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">시각적 특성</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">기능적 특성</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">위치</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">크기/형태</div>
              </div>
            </div>
            <div className="w-full grid grid-cols-[1fr_3fr_3fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.name ?? comprehensionSectionData?.[index]?.section?.name ?? '-'}</span>
              </div>
              <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                {isEditing ? (
                  <textarea
                    value={group.section.visualCharacteristics ?? comprehensionSectionData?.[index]?.section?.visualCharacteristics ?? '-'}
                    onChange={(e) => updateSectionField(index, 'visualCharacteristics', e.target.value)}
                    onBlur={handleSectionFieldBlur}
                    className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-gray-600">{group.section.visualCharacteristics ?? comprehensionSectionData?.[index]?.section?.visualCharacteristics ?? '-'}</span>
                )}
              </div>
              <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                {isEditing ? (
                  <textarea
                    value={group.section.functionalCharacteristics ?? comprehensionSectionData?.[index]?.section?.functionalCharacteristics ?? '-'}
                    onChange={(e) => updateSectionField(index, 'functionalCharacteristics', e.target.value)}
                    onBlur={handleSectionFieldBlur}
                    className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-gray-600">{group.section.functionalCharacteristics ?? comprehensionSectionData?.[index]?.section?.functionalCharacteristics ?? '-'}</span>
                )}
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.position ?? comprehensionSectionData?.[index]?.section?.position ?? '-'}</span>
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400">{group.section.sizeShape ?? comprehensionSectionData?.[index]?.section?.sizeShape ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* Components Label */}
          <h3 className="text-sm font-semibold mb-2 text-gray-400">컴포넌트</h3>

          {/* Components Table */}
          <div className="w-full rounded-lg border border-gray-200 mb-4">
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-gray-400 font-semibold">이름</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">시각적 특성</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">기능적 특성</div>

                <div className="py-4 px-6 text-gray-400 font-semibold">위치</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">크기/형태</div>
                <div className="py-4 px-6 text-gray-400 font-semibold">하위 컴포넌트</div>
              </div>
            </div>
            <div className="overflow-auto">
              {(group.components && group.components.length > 0
                ? group.components
                : comprehensionSectionData?.[index]?.components ?? []).map((component, componentIndex) => (
                <div key={componentIndex} className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.name ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.name ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.visualCharacteristics ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.visualCharacteristics ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.functionalCharacteristics ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.functionalCharacteristics ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.position ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.position ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.sizeShape ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.sizeShape ?? '-'}</span>
                  </div>
                  <div className="py-4 px-6">
                    <span className="text-sm text-gray-400">{component.subComponents ?? comprehensionSectionData?.[index]?.components?.[componentIndex]?.subComponents ?? '-'}</span>
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
