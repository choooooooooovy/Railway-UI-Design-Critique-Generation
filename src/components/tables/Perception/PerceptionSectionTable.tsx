/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import { logUserAction, logTableEditSnapshot } from '../../../utils/logUserAction';
import { PerceptionSectionRow } from '../../../types/critique';

interface PerceptionSectionTableProps {
  perceptionSectionData: PerceptionSectionRow[];
  addSectionRow: () => void;
  deleteSectionRow: (id: string) => void;
  isEditing?: boolean;
  onDataChange?: (data: PerceptionSectionRow[]) => void;
}
export const PerceptionSectionTable = ({
  perceptionSectionData,
  addSectionRow,
  deleteSectionRow,
  isEditing = false,
  onEditToggle,
  onDataChange,
}: PerceptionSectionTableProps & { onEditToggle?: (enabled: boolean) => void, onDataChange?: (data: PerceptionSectionRow[]) => void }) => {




  // 편집 가능한 데이터 상태: 최초 한 번만 perceptionSectionData로 초기화
  const [editableData, setEditableData] = useState<PerceptionSectionRow[]>(() => perceptionSectionData);

  // step1 결과가 비동기적으로 들어올 때 editableData가 비어 있으면 한 번만 동기화
  useEffect(() => {
    if (
      editableData.length === 0 &&
      perceptionSectionData.length > 0
    ) {
      setEditableData(perceptionSectionData);
    }
  }, [perceptionSectionData]);

  // 무한루프 방지: prevEditableDataRef로 이전 상태 추적
  const prevEditableDataRef = React.useRef<PerceptionSectionRow[]>(editableData);
  useEffect(() => {
    if (
      typeof onDataChange === 'function' &&
      JSON.stringify(editableData) !== JSON.stringify(prevEditableDataRef.current)
    ) {
      onDataChange(editableData);
      prevEditableDataRef.current = editableData;
    }
  }, [editableData, onDataChange]);

  // isEditing 토글될 때마다 snapshot 로그 남기기
  useEffect(() => {
    handleEditToggle(isEditing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // 필드 업데이트 함수
  const updateRowField = (rowId: string, field: keyof PerceptionSectionRow, value: string) => {
    setEditableData(prev =>
      prev.map(row => row.id === rowId ? { ...row, [field]: value } : row)
    );
  };


  // Snapshot logging for table state
  const handleEditToggle = (enabled: boolean) => {
    if (enabled) {
      logTableEditSnapshot({ tableName: 'PERCEPTION-SECTION', state: editableData, when: 'BEFORE' });
    } else {
      // 최신 상태를 바로 로그 남기기
      logTableEditSnapshot({ tableName: 'PERCEPTION-SECTION', state: editableData, when: 'AFTER' });
      // 편집 종료 시 동기화 로직 제거 (무한루프 근본 차단)
    }
    if (typeof onEditToggle === 'function') onEditToggle(enabled);
  };

  // 행 추가/삭제: PerceptionComponentTable 참고, editableData 직접 갱신
  const handleAddSectionRow = () => {
    const uuid = () => 'sec-' + Math.random().toString(36).substr(2, 9);
    setEditableData(prev => [
      ...prev,
      { id: uuid(), section: '', position: '', sizeShape: '' }
    ]);
    if (typeof addSectionRow === 'function') addSectionRow();
  };

  const handleDeleteSectionRow = (id: string) => {
    setEditableData(prev => prev.filter(row => row.id !== id));
    if (typeof deleteSectionRow === 'function') deleteSectionRow(id);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="w-full rounded-lg border border-gray-200 mb-6">
        {/* Fixed Header */}
        <div className="border-b border-gray-200 bg-white sticky top-0">
          <div className="w-full grid grid-cols-[48px_1fr_1fr_1fr_48px] gap-0 bg-gray-100">
            <div className="py-4 px-6 text-sm font-semibold"></div>
            <div className="py-4 px-6 text-sm text-gray-400 font-semibold">Section</div>
            <div className="py-4 px-6 text-sm text-gray-400 font-semibold">Position</div>
            <div className="py-4 px-6 text-sm text-gray-400 font-semibold">Size & Shape</div>
            <div className="py-4 px-6 text-sm text-gray-400 font-semibold"></div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-auto">
          {editableData.map((row, index) => (
            <div key={row.id} className="grid grid-cols-[48px_1fr_1fr_1fr_48px] gap-0 border-b border-gray-100">
              <div className="py-4 px-6 flex items-center">
                <span className="text-sm text-gray-400">{index + 1}</span>
              </div>
              <div className="py-4 px-6">
                {isEditing === true ? (
                  <textarea
                    value={row.section}
                    onChange={(e) => updateRowField(row.id, 'section', e.target.value)}
                    className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-gray-600">{row.section}</span>
                )}
              </div>
              <div className="py-4 px-6">
                {isEditing === true ? (
                  <textarea
                    value={row.position}
                    onChange={(e) => updateRowField(row.id, 'position', e.target.value)}
                    className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-gray-600">{row.position}</span>
                )}
              </div>
              <div className="py-4 px-6">
                {isEditing === true ? (
                  <textarea
                    value={row.sizeShape}
                    onChange={(e) => updateRowField(row.id, 'sizeShape', e.target.value)}
                    className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-gray-600">{row.sizeShape}</span>
                )}
              </div>
              <div className="py-4 px-6">
                <button
                  onClick={() => {
                    logUserAction({
                      action_type: 'delete_section',
                      content: 'delete_section',
                      details: {
                        sectionId: row.id,
                        sectionName: row.section,
                        sectionPosition: row.position,
                        sectionSizeShape: row.sizeShape
                      }
                    });
                    handleDeleteSectionRow(row.id);
                    // snapshot logging removed; handled by editing toggle
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Delete row"
                >
                  X
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-center py-4">
            <button
              onClick={() => {
                logUserAction({
                  action_type: 'add_section',
                  content: 'add_section',
                  details: {}
                });
                handleAddSectionRow();
                // snapshot logging removed; handled by editing toggle
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-300 transition-colors"
              title="Add new row"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Guide Section */}
      <div className="text-sm text-gray-600 px-4" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
        <p className="mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 내용을 수정하려면 표 좌측 상단의 편집 모드를 활성화하세요</p>
        <p className="mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 섹션 추가는 '+' 버튼, 삭제는 'X' 버튼을 이용하세요</p>
        <p style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 완료 후 ▶️ 버튼을 눌러 다음 단계로 넘어가세요</p>
      </div>
    </div>
  );
};
