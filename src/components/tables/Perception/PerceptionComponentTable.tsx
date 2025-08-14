// PerceptionSectionGroup[] -> step2Results 구조 변환 함수
function convertToStep2Results(data: PerceptionSectionGroup[]): Record<string, any> {
  const result: Record<string, any> = {};
  data.forEach(group => {
    const sectionName = group.section.name;
    if (!result[sectionName]) result[sectionName] = {};
    group.components.forEach(component => {
      result[sectionName][component.name] = {
        position: component.position,
        size_shape: component.sizeShape,
        sub_components: component.subComponents
      };
    });
  });
  return result;
}
import React, { useState, useEffect } from 'react';
import { useUICritiqueStore } from '../../../stores/useUICritiqueStore';
import { logUserAction, logTableEditSnapshot } from '../../../utils/logUserAction';
import { PerceptionSectionGroup } from '../../../types/critique';

interface PerceptionComponentTableProps {
  perceptionComponentData: PerceptionSectionGroup[];
  addComponentRow: (sectionIndex: number) => void;
  deleteComponentRow: (sectionIndex: number, componentId: string) => void;
  isEditing?: boolean;
  onDataChange?: (data: PerceptionSectionGroup[]) => void;
  setPerceptionComponentData?: (data: PerceptionSectionGroup[]) => void;
}

export const PerceptionComponentTable: React.FC<PerceptionComponentTableProps & { onEditToggle?: (enabled: boolean) => void }> = (props) => {
  // zustand store에서 step2Results 저장 함수 가져오기
  const { setStep2Results } = useUICritiqueStore();
  const {
    perceptionComponentData,
    addComponentRow,
    deleteComponentRow,
    isEditing = false,
    onEditToggle,
    onDataChange,
    setPerceptionComponentData,
  } = props;

  // 무한 호출 방지용 이전 editableData 추적
  const prevEditableDataRef = React.useRef<PerceptionSectionGroup[]>([]);

  // uuid 생성기 (간단 버전)
  const uuid = () => {
    return 'cmp-' + Math.random().toString(36).substr(2, 9);
  };

  // perceptionComponentData에서 id가 없는 컴포넌트에 대해 id를 자동 할당
  const ensureStableIds = (data: PerceptionSectionGroup[]): PerceptionSectionGroup[] => {
    return data.map(group => ({
      ...group,
      components: group.components.map(component => {
        if (!component.id || typeof component.id !== 'string' || component.id.length < 3) {
          // id가 없거나 너무 짧으면 새로 할당
          return { ...component, id: uuid() };
        }
        return component;
      })
    }));
  };

  // 편집 가능한 데이터 상태
  const [editableData, setEditableData] = useState<PerceptionSectionGroup[]>(ensureStableIds(perceptionComponentData));

// props가 변경될 때 editableData 동기화 (id 안정화 포함)
useEffect(() => {
  // perceptionComponentData가 바뀌었고, 편집 중이 아닐 때만 동기화
  if (!isEditing && JSON.stringify(perceptionComponentData) !== JSON.stringify(editableData)) {
    setEditableData(ensureStableIds(perceptionComponentData));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [perceptionComponentData, isEditing]);

// editableData가 perceptionComponentData와 실제로 다를 때만 상위로 전달 (무한루프 방지)
useEffect(() => {
  if (
    typeof onDataChange === 'function' &&
    JSON.stringify(editableData) !== JSON.stringify(perceptionComponentData) &&
    JSON.stringify(editableData) !== JSON.stringify(prevEditableDataRef.current)
  ) {
    onDataChange(editableData);
    setStep2Results(convertToStep2Results(editableData));
    if (typeof setPerceptionComponentData === 'function') {
      setPerceptionComponentData(editableData);
    }
    prevEditableDataRef.current = editableData;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editableData]);

  // isEditing 토글될 때마다 snapshot 로그 남기기
  useEffect(() => {
    handleEditToggle(isEditing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // 컴포넌트 행 삭제 핸들러: editableData에서 직접 삭제
  const handleDeleteComponentRow = (sectionIndex: number, componentId: string) => {
    setEditableData(prev =>
      prev.map((group, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...group,
              components: group.components.filter(component => component.id !== componentId)
            }
          : group
      )
    );
    // 부모의 deleteComponentRow 호출 제거 (undefined 에러 방지)
  };

  // 컴포넌트 필드 업데이트 함수
  const updateComponentField = (sectionIndex: number, componentIndex: number, field: string, value: string) => {
    setEditableData(prev => {
      const updated = prev.map((group, sIndex) =>
        sIndex === sectionIndex ? {
          ...group,
          components: group.components.map((component, cIndex) =>
            cIndex === componentIndex ? { ...component, [field]: value } : component
          )
        } : group
      );
      return updated;
    });
  };

  // Snapshot logging for table state
  const handleEditToggle = (enabled: boolean) => {
    if (enabled) {
      logTableEditSnapshot({ tableName: 'PERCEPTION-COMPONENT', state: editableData, when: 'BEFORE' });
    } else {
      logTableEditSnapshot({ tableName: 'PERCEPTION-COMPONENT', state: editableData, when: 'AFTER' });
      // 편집 종료 시 최신 editableData를 반드시 부모로 전달
      if (typeof onDataChange === 'function') {
        onDataChange(editableData);
        if (typeof setPerceptionComponentData === 'function') {
          setPerceptionComponentData(editableData);
        }
        // step2Results에도 저장 (변환)
    setStep2Results(convertToStep2Results(editableData));
        prevEditableDataRef.current = editableData;
      }
    }
    if (typeof onEditToggle === 'function') onEditToggle(enabled);
  };

  return (
  <div className="w-full flex flex-col space-y-6" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
      {editableData.map((group, index) => (
        <div key={index} className="w-full flex flex-col p-4 bg-[#F5F5F5] shadow rounded-xl" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
          <h2 className="text-lg font-semibold mb-2 text-black" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.section.name}</h2>
          <h3 className="text-sm font-semibold mb-2 text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>섹션</h3>

          {/* Section Info Table */}
          <div className="w-full rounded-lg border border-gray-200  bg-white mb-4" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_1fr_1fr] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>이름</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>위치</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>크기/형태</div>
              </div>
            </div>
            <div className="w-full grid grid-cols-[1fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.section.name}</span>
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.section.position}</span>
              </div>
              <div className="py-4 px-6">
                <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.section.sizeShape}</span>
              </div>
            </div>
          </div>

          {/* Components Label */}
          <h3 className="text-sm font-semibold mb-2 text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>컴포넌트</h3>

          {/* Components Table */}
          <div className="w-full rounded-lg border border-gray-200 mb-4" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <div className="border-b border-gray-200 bg-white">
              <div className="w-full grid grid-cols-[1fr_1fr_1fr_1fr_48px] gap-0 bg-gray-100">
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>이름</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>위치</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>크기/형태</div>
                <div className="py-4 px-6 text-sm text-gray-400 font-semibold" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>하위 컴포넌트</div>
                <div className="py-4 px-6"></div>
              </div>
            </div>
            <div className="overflow-auto">
              {group.components.map((component, componentIndex) => (
                <div key={component.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_48px] gap-0 border-b border-gray-100 bg-white">
                  <div className="py-4 px-6">
                    {isEditing ? (
                      <textarea
                        value={component.name}
                        onChange={(e) => updateComponentField(index, componentIndex, 'name', e.target.value)}
                        className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{component.name}</span>
                    )}
                  </div>
                  <div className="py-4 px-6">
                    {isEditing ? (
                      <textarea
                        value={component.position}
                        onChange={(e) => updateComponentField(index, componentIndex, 'position', e.target.value)}
                        className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{component.position}</span>
                    )}
                  </div>
                  <div className="py-4 px-6">
                    {isEditing ? (
                      <textarea
                        value={component.sizeShape}
                        onChange={(e) => updateComponentField(index, componentIndex, 'sizeShape', e.target.value)}
                        className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{component.sizeShape}</span>
                    )}
                  </div>
                  <div className="py-4 px-6">
                    {isEditing ? (
                      <textarea
                        value={component.subComponents}
                        onChange={(e) => updateComponentField(index, componentIndex, 'subComponents', e.target.value)}
                        className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{component.subComponents}</span>
                    )}
                  </div>
                  <div className="py-4 px-6">
                    <button
                      onClick={() => {
                        logUserAction({
                          action_type: 'delete_component',
                          content: 'delete_component',
                          details: { sectionIndex: index, componentId: component.id , componentName: component.name, componentPosition: component.position, componentSizeShape: component.sizeShape, componentSubComponents: component.subComponents  }
                        });
                        handleDeleteComponentRow(index, component.id);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      title="Delete row"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-center py-4 bg-white">
                <button
                  onClick={() => {
                    logUserAction({
                      action_type: 'add_component',
                      content: 'add_component',
                      details: { sectionIndex: index }
                    });
                    addComponentRow(index);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-300 transition-colors" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                  title="Add new row"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Guide Section */}
      <div className="text-sm text-gray-600 px-4" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
        <p className="mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 내용을 수정하려면 표 좌측 상단의 편집 모드를 활성화하세요</p>
        <p className="mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 섹션 추가는 '+' 버튼, 삭제는 'X' 버튼을 이용하세요</p>
        <p style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>• 완료 후 ▶️ 버튼을 눌러 다음 단계로 넘어가세요</p>
      </div>
    </div>
  );
};
