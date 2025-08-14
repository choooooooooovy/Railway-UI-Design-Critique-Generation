import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { logTableEditSnapshot } from '../../../utils/logUserAction';
import { ProjectionSection } from '../../../types/critique';


interface ProjectionResultsTableProps {
  projectionResultsData: any[];
  perceptionResultsData: any[]; // Replace `any` with the actual type
  comprehensionResultsData: any[]; // Replace `any` with the actual type
  comprehensionSectionData?: any[];
  sectionIssues?: Record<string, Array<{ expected_standard?: string; identified_gap?: string }>>;
  isEditing?: boolean;
  onDataChange?: (data: ProjectionSection[]) => void;
}

export const ProjectionResultsTable = forwardRef<any, ProjectionResultsTableProps>((props, ref) => {
  const {
    projectionResultsData,
    perceptionResultsData,
    comprehensionResultsData,
    comprehensionSectionData,
    sectionIssues,
    isEditing = false,
    onDataChange,
  } = props;
  // 깊은 복사로 초기값 설정 (undefined/null 방지)
  const [editableData, setEditableData] = useState<ProjectionSection[]>(() => Array.isArray(projectionResultsData) ? JSON.parse(JSON.stringify(projectionResultsData)) : []);
  // Skip one prop-sync right after saving edits to avoid showing stale data
  const skipNextPropSyncRef = React.useRef(false);

  // projectionResultsData가 변경될 때마다 editableData를 즉시 동기화 (처음 마운트/데이터 변경 시 바로 반영)
  useEffect(() => {
    if (skipNextPropSyncRef.current) {
      // Wait until parent store reflects our edits
      const equal = JSON.stringify(projectionResultsData) === JSON.stringify(editableData);
      if (equal) {
        // Store caught up, clear the flag
        skipNextPropSyncRef.current = false;
      } else {
        // Keep current edited view; don't override yet
        return;
      }
    }
    setEditableData(Array.isArray(projectionResultsData) ? JSON.parse(JSON.stringify(projectionResultsData)) : []);
  }, [projectionResultsData]);

  // 디버깅: 섹션 데이터 확인
  console.log('projectionResultsData:', projectionResultsData);
  console.log('editableData:', editableData);

  // 외부에서 최신 editableData를 참조할 수 있도록 ref에 getLatestData 메서드 노출
  useImperativeHandle(ref, () => ({
    getLatestData: () => {
      // 항상 최신 editableData를 반환
      return editableData;
    }
  }), [editableData]);

  // isEditing 토글될 때마다 editableData를 초기화하거나 저장
  useEffect(() => {
    if (isEditing) {
      // 편집 시작 시 projectionResultsData로 초기화하되, 빈 칸은 즉시 fallback으로 채워 편집 입력값이 비지 않도록 보정
      const base: ProjectionSection[] = Array.isArray(projectionResultsData)
        ? JSON.parse(JSON.stringify(projectionResultsData))
        : [];
      const hydrated = base.map((section: any) => {
        const name = section.name;
        const issuesArr = (props.sectionIssues || {})[name];
        // expectedStandard
        let expected = section.expectedStandard;
        if (!expected || expected === '-' || (typeof expected === 'string' && expected.trim() === '')) {
          const compMatch = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g: any) => (g.name === name) || (g.section?.name === name))
            : undefined;
          expected = issuesArr?.[0]?.expected_standard
            || compMatch?.section?.expectedStandard
            || compMatch?.expectedStandard
            || compMatch?.section?.standard
            || compMatch?.standard
            || (Array.isArray(props.comprehensionSectionData)
              ? (props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.expectedStandard
                || props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.standard
                || props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.criteria)
              : undefined)
            || '';
        }
        // identifiedGap
        let identified = section.identifiedGap;
        if (!identified || identified === '-' || (typeof identified === 'string' && identified.trim() === '')) {
          const compMatch = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g: any) => (g.name === name) || (g.section?.name === name))
            : undefined;
          identified = issuesArr?.[0]?.identified_gap
            || compMatch?.section?.identifiedGap
            || compMatch?.identifiedGap
            || compMatch?.section?.gap
            || compMatch?.gap
            || compMatch?.section?.issue
            || compMatch?.issue
            || (Array.isArray(props.comprehensionSectionData)
              ? (props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.identifiedGap
                || props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.gap
                || props.comprehensionSectionData.find((g: any) => g.section?.name === name)?.section?.issue)
              : undefined)
            || '';
        }
        // visual/functional 보정
        let visual = section.visualCharacteristics;
        let functional = section.functionalCharacteristics;
        if (!visual || visual === '-') {
          const compMatch = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g: any) => (g.name === name) || (g.section?.name === name))
            : undefined;
          visual = compMatch?.section?.visualCharacteristics || compMatch?.visualCharacteristics || visual || '';
        }
        if (!functional || functional === '-') {
          const compMatch = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g: any) => (g.name === name) || (g.section?.name === name))
            : undefined;
          functional = compMatch?.section?.functionalCharacteristics || compMatch?.functionalCharacteristics || functional || '';
        }
        return {
          ...section,
          expectedStandard: expected,
          identifiedGap: identified,
          visualCharacteristics: visual,
          functionalCharacteristics: functional,
        } as ProjectionSection;
      });
      setEditableData(hydrated);
    } else {
      // 편집 종료 시 onDataChange로 저장
      if (onDataChange) {
        // Signal to skip one prop-sync until store reflects edits
        skipNextPropSyncRef.current = true;
        onDataChange(editableData);
      }
    }
    // snapshot 로그 남기기
    logTableEditSnapshot({ tableName: 'PROJECTION-RESULTS', state: editableData, when: isEditing ? 'BEFORE' : 'AFTER' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // isEditing 토글될 때마다 snapshot 로그 남기기만 수행 (상위 저장은 navigation에서 직접 호출)
  useEffect(() => {
    logTableEditSnapshot({ tableName: 'PROJECTION-RESULTS', state: editableData, when: isEditing ? 'BEFORE' : 'AFTER' });
    // onDataChange 호출 제거: navigation 버튼 클릭 시에만 상위로 전달
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // SECTION 필드가 비어 있으면 step5(section_issues)와 comprehension에서 fallback해서 채움
  useEffect(() => {
    setEditableData(prev =>
      prev.map(section => {
        if ((!section.expectedStandard || section.expectedStandard === '') || (!section.identifiedGap || section.identifiedGap === '')) {
          // step5(section_issues) 구조 활용
          const sectionIssues = props.sectionIssues || {};
          const issuesArr = sectionIssues[section.name];
          let expectedStandard = section.expectedStandard || (issuesArr?.[0]?.expected_standard) || '-';
          let identifiedGap = section.identifiedGap || (issuesArr?.[0]?.identified_gap) || '-';

          // 기존 fallback도 병행
          const secGroup = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g) => (g.name === section.name) || (g.section?.name === section.name))
            : undefined;
          if ((expectedStandard === '-' || !expectedStandard)) {
            expectedStandard = secGroup?.section?.expectedStandard || secGroup?.expectedStandard || secGroup?.section?.standard || secGroup?.standard || secGroup?.section?.criteria || secGroup?.criteria || expectedStandard;
          }
          if ((identifiedGap === '-' || !identifiedGap)) {
            identifiedGap = secGroup?.section?.identifiedGap || secGroup?.identifiedGap || secGroup?.section?.gap || secGroup?.gap || secGroup?.section?.issue || secGroup?.issue || identifiedGap;
          }
          // comprehensionSectionData 활용
          if ((expectedStandard === '-' || !expectedStandard) && Array.isArray(props.comprehensionSectionData)) {
            const secFallback = props.comprehensionSectionData.find((g: any) => g.section?.name === section.name);
            if (secFallback) {
              expectedStandard = secFallback.section?.expectedStandard || secFallback.section?.standard || secFallback.section?.criteria || expectedStandard;
            }
          }
          if ((identifiedGap === '-' || !identifiedGap) && Array.isArray(props.comprehensionSectionData)) {
            const secFallback = props.comprehensionSectionData.find((g: any) => g.section?.name === section.name);
            if (secFallback) {
              identifiedGap = secFallback.section?.identifiedGap || secFallback.section?.gap || secFallback.section?.issue || identifiedGap;
            }
          }
          return {
            ...section,
            expectedStandard,
            identifiedGap,
            visualCharacteristics: section.visualCharacteristics || secGroup?.section?.visualCharacteristics || secGroup?.visualCharacteristics || '-',
            functionalCharacteristics: section.functionalCharacteristics || secGroup?.section?.functionalCharacteristics || secGroup?.functionalCharacteristics || '-',
          };
        }
        return section;
      })
    );
  }, [comprehensionResultsData, props.sectionIssues, projectionResultsData, props.comprehensionSectionData]);

  // 필드 업데이트 함수
  const updateSectionField = (sectionIndex: number, field: keyof ProjectionSection, value: string) => {
    setEditableData(prev =>
      prev.map((section: any, index: number) =>
        index === sectionIndex ? { ...section, [field]: value } : section
      )
    );
  };

  const updateComponentField = (sectionIndex: number, componentIndex: number, field: string, value: string) => {
    setEditableData(prev =>
      prev.map((section: any, sIndex: number) =>
        sIndex === sectionIndex ? {
          ...section,
          components: section.components.map((component: any, cIndex: number) =>
            cIndex === componentIndex ? { ...component, [field]: value } : component
          )
        } : section
      )
    );
  };

  // editableData 변경 시마다 onDataChange 호출 제거 (편집 종료 시에만 저장)

  // 항상 editableData만 렌더링 (수정 후, 편집 토글 후, 다음 단계에서도 최신값)
  // PATCH: projectionResultsData가 비어있고 editableData도 비어있을 때, props로 전달된 데이터가 있는지 추가 확인
  const fallbackData = Array.isArray(props.projectionResultsData) && props.projectionResultsData.length > 0
    ? props.projectionResultsData
    : Array.isArray(projectionResultsData) && projectionResultsData.length > 0
      ? projectionResultsData
      : [];
  const tableData = editableData.length > 0 ? editableData : fallbackData;
  if (!Array.isArray(tableData) || tableData.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <span className="text-gray-400 text-lg">No projection results available.</span>
      </div>
    );
  }
  return (
  <div className="w-full flex flex-col space-y-6" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
      {tableData.map((group: any, index: number) => {
        // All logic must be inside this callback function
        // SECTION의 visual/functional characteristics는 기존 로직 유지
        let visual = group.visualCharacteristics || '-';
        let functional = group.functionalCharacteristics || '-';
        if (visual === '-' || functional === '-') {
          const secGroups = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.filter((g) => g.section?.name === group.name)
            : [];
          const secGroup = secGroups.find((g) =>
            (g.section?.visualCharacteristics && g.section?.visualCharacteristics.trim() !== '') ||
            (g.section?.functionalCharacteristics && g.section?.functionalCharacteristics.trim() !== '')
          );
          if (visual === '-' && secGroup?.section?.visualCharacteristics) {
            visual = secGroup.section.visualCharacteristics;
          }
          if (functional === '-' && secGroup?.section?.functionalCharacteristics) {
            functional = secGroup.section.functionalCharacteristics;
          }
        }

        // SECTION의 expectedStandard, identifiedGap: editableData 우선 > sectionIssues(백엔드) > comprehensionResultsData 순서로 fallback
        const sectionIssues = props.sectionIssues || {};
        const issuesArr = sectionIssues[group.name];
        let sectionExpectedStandard = (group.expectedStandard && group.expectedStandard !== '-')
          ? group.expectedStandard
          : (issuesArr?.[0]?.expected_standard && issuesArr?.[0]?.expected_standard !== '-')
            ? issuesArr[0].expected_standard
            : '-';
        let sectionIdentifiedGap = (group.identifiedGap && group.identifiedGap !== '-')
          ? group.identifiedGap
          : (issuesArr?.[0]?.identified_gap && issuesArr?.[0]?.identified_gap !== '-')
            ? issuesArr[0].identified_gap
            : '-';
        // comprehensionResultsData에서 추가 fallback
        if ((sectionExpectedStandard === '-' || !sectionExpectedStandard) || (sectionIdentifiedGap === '-' || !sectionIdentifiedGap)) {
          const secGroup = Array.isArray(comprehensionResultsData)
            ? comprehensionResultsData.find((g) => (g.name === group.name) || (g.section?.name === group.name))
            : undefined;
          if ((sectionExpectedStandard === '-' || !sectionExpectedStandard)) {
            if (secGroup?.section?.expectedStandard) {
              sectionExpectedStandard = secGroup.section.expectedStandard;
            } else if (secGroup?.expectedStandard) {
              sectionExpectedStandard = secGroup.expectedStandard;
            }
          }
          if ((sectionIdentifiedGap === '-' || !sectionIdentifiedGap)) {
            if (secGroup?.section?.identifiedGap) {
              sectionIdentifiedGap = secGroup.section.identifiedGap;
            } else if (secGroup?.identifiedGap) {
              sectionIdentifiedGap = secGroup.identifiedGap;
            }
          }
        }

        // onBlur에서 onDataChange 호출 제거 (편집 종료 시에만 상위로 전달)
        const handleSectionFieldBlur = () => {};
        const handleComponentFieldBlur = () => {};
        return (
          <div key={index} className="w-full flex flex-col p-4 bg-[#F5F5F5] shadow rounded-xl">
            <h2 className="text-lg font-semibold text-black mb-2" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.name}</h2>
            <h3 className="text-sm font-semibold mb-2 text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>섹션</h3>
            {/* Section Info Table */}
            <div className="w-full rounded-lg border border-gray-200 mb-4">
              <div className="border-b border-gray-200 bg-white">
                <div className="w-full grid grid-cols-[1fr_3fr_3fr_2fr_2fr_1fr_1fr] gap-0 bg-gray-100">
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>이름</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>권장 기준</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>발견된 문제점</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>시각적 특성</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>기능적 특성</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>위치</div>
                  <div className="py-4 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>크기/형태</div>
                </div>
              </div>
              <div className="w-full grid grid-cols-[1fr_3fr_3fr_2fr_2fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
                <div className="py-4 px-6">
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.name || '-'}</span>
                </div>
                <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                  {isEditing ? (
                    <textarea
                      value={group.expectedStandard ?? ''}
                      onChange={(e) => updateSectionField(index, 'expectedStandard', e.target.value)}
                      onBlur={handleSectionFieldBlur}
                      className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                      rows={2}
                      style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                    />
                  ) : (
                    <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
                      {(sectionExpectedStandard && sectionExpectedStandard !== '-')
                        ? sectionExpectedStandard
                        : '-'}
                    </span>
                  )}
                </div>
                <div className="py-4 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                  {isEditing ? (
                    <textarea
                      value={group.identifiedGap ?? ''}
                      onChange={(e) => updateSectionField(index, 'identifiedGap', e.target.value)}
                      onBlur={handleSectionFieldBlur}
                      className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                      rows={2}
                      style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                    />
                  ) : (
                    <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
                      {(sectionIdentifiedGap && sectionIdentifiedGap !== '-')
                        ? sectionIdentifiedGap
                        : '-'}
                    </span>
                  )}
                </div>
                <div className="py-4 px-6">
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{visual || '-'}</span>
                </div>
                <div className="py-4 px-6">
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{functional || '-'}</span>
                </div>
                <div className="py-4 px-6">
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.position || '-'}</span>
                </div>
                <div className="py-4 px-6">
                  <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{group.sizeShape || '-'}</span>
                </div>
              </div>
            </div>

            {/* Components Table */}
            {Array.isArray(group.components) && group.components.length > 0 && (
              <div className="w-full mt-2">
                <h3 className="text-sm font-semibold mb-2 text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>컴포넌트</h3>
                <div className="w-full rounded-lg border border-gray-200 mb-2">
                  <div className="border-b border-gray-200 bg-white">
                    <div className="w-full grid grid-cols-[1fr_3fr_3fr_2fr_2fr_1fr_1fr] gap-0 bg-gray-100">
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>이름</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>권장 기준</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>발견된 문제점</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>시각적 특성</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>기능적 특성</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>위치</div>
                      <div className="py-3 px-6 text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>크기/형태</div>
                    </div>
                  </div>
                  {group.components.map((comp: any, cIndex: number) => {
                    // Compute fallbacks for display fields
                    let compVisual = comp.visualCharacteristics || '-';
                    let compFunctional = comp.functionalCharacteristics || '-';
                    let compPosition = comp.position || '-';
                    let compSizeShape = comp.sizeShape || '-';

                    if (compVisual === '-' || compFunctional === '-' || compPosition === '-' || compSizeShape === '-') {
                      const compGroup = Array.isArray(comprehensionResultsData)
                        ? comprehensionResultsData.find((g: any) => (g.section?.name === group.name) || (g.name === group.name))
                        : undefined;
                      const compMatch = compGroup?.components?.find((c: any) => c.name === comp.name);
                      if (compVisual === '-' && (compMatch?.visualCharacteristics)) compVisual = compMatch.visualCharacteristics;
                      if (compFunctional === '-' && (compMatch?.functionalCharacteristics)) compFunctional = compMatch.functionalCharacteristics;
                      if (compPosition === '-' && (compMatch?.position)) compPosition = compMatch.position;
                      if (compSizeShape === '-' && (compMatch?.sizeShape)) compSizeShape = compMatch.sizeShape;
                    }

                    const compExpected = comp.expectedStandard && comp.expectedStandard !== '-' ? comp.expectedStandard : '-';
                    const compGap = comp.identifiedGap && comp.identifiedGap !== '-' ? comp.identifiedGap : '-';

                    return (
                      <div key={comp.id ?? cIndex} className="w-full grid grid-cols-[1fr_3fr_3fr_2fr_2fr_1fr_1fr] gap-0 border-b border-gray-100 bg-white">
                        <div className="py-3 px-6">
                          <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{comp.name || '-'}</span>
                        </div>
                        <div className="py-3 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                          {isEditing ? (
                            <textarea
                              value={comp.expectedStandard ?? ''}
                              onChange={(e) => updateComponentField(index, cIndex, 'expectedStandard', e.target.value)}
                              onBlur={handleComponentFieldBlur}
                              className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                              rows={2}
                              style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                            />
                          ) : (
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compExpected}</span>
                          )}
                        </div>
                        <div className="py-3 px-6 border-2 border-dashed" style={{ borderColor: '#0091FF' }}>
                          {isEditing ? (
                            <textarea
                              value={comp.identifiedGap ?? ''}
                              onChange={(e) => updateComponentField(index, cIndex, 'identifiedGap', e.target.value)}
                              onBlur={handleComponentFieldBlur}
                              className="w-full text-sm text-gray-600 border border-gray-300 rounded p-2 resize-none"
                              rows={2}
                              style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                            />
                          ) : (
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compGap}</span>
                          )}
                        </div>
                        <div className="py-3 px-6">
                          <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compVisual || '-'}</span>
                        </div>
                        <div className="py-3 px-6">
                          <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compFunctional || '-'}</span>
                        </div>
                        <div className="py-3 px-6">
                          <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compPosition || '-'}</span>
                        </div>
                        <div className="py-3 px-6">
                          <span className="text-sm text-gray-400" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>{compSizeShape || '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});