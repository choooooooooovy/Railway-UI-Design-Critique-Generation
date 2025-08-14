import { useState, useEffect, useMemo } from 'react';
import { ProjectionHeuristicRow, ProjectionSection } from '../types/critique';
import { useUICritiqueStore } from '../stores/useUICritiqueStore';

export function useProjectionState() {
  // navigation 방향 상태: 'next'면 항상 백엔드 최신값, 'prev'면 store 최신값
  const [navigationDirection, setNavigationDirection] = useState<'next' | 'prev'>('next');
  // step7 이후에도 섹션 결과를 유지하기 위한 별도 상태
  const [finalSectionResults, setFinalSectionResults] = useState<ProjectionSection[]>([]);
  const [isGuidelineRevised, setIsGuidelineRevised] = useState(false);

  // Nielsen's Heuristics Data
  const [projectionHeuristicData, setProjectionHeuristicData] = useState<ProjectionHeuristicRow[]>([
    {
      id: "1",
      heuristic: "Visibility of System Status",
      description: "The design should always keep users informed about what is going on."
    },
    {
      id: "2",
      heuristic: "Match Between the System and the Real World",
      description: "The design should speak the users' language and follow real-world conventions."
    },
    {
      id: "3",
      heuristic: "User Control and Freedom",
      description: "Users should be able to easily undo and redo actions."
    },
    {      id: "4",
      heuristic: "Consistency and Standards",
      description: "Users should not have to wonder whether different words, situations, or actions mean the same thing."
    },
    {      id: "5",
      heuristic: "Error Prevention",
      description: "The design should prevent problems from occurring in the first place."
    },
    {      id: "6",
      heuristic: "Recognition Rather Than Recall",
      description: "Minimize the user's memory load by making objects, actions, and options visible."
    },
    {      id: "7",
      heuristic: "Flexibility and Efficiency of Use",
      description: "The design should cater to both inexperienced and experienced users."
    },
    {      id: "8",
      heuristic: "Aesthetic and Minimalist Design",
      description: "Dialogues should not contain irrelevant or rarely needed information."
    },
    {      id: "9",
      heuristic: "Help Users Recognize, Diagnose, and Recover from Errors",
      description: "Error messages should be expressed in plain language and suggest a solution."
    },
    {      id: "10",
      heuristic: "Help and Documentation",
      description: "Help and documentation should be easy to search and focused on the user's task."
    }
  ]);

  // Results Data
  const {
    appUI,
    appUIComponents,
    step5Result,
    step6Result,
    step3Results,
    step4Results,
    projectionResultsData,
    setProjectionResultsData,
    setProjectionResultsData: setStoreProjectionResultsData
  } = useUICritiqueStore();
  // PATCH: storeProjectionResultsData를 zustand에서 별도 변수로 가져옴
  const storeProjectionResultsData = useUICritiqueStore((state) => state.projectionResultsData);

  // PATCH: projectionResultsData가 null일 경우 빈 배열로 초기화
  const safeProjectionResultsData = Array.isArray(projectionResultsData) ? projectionResultsData : [];

  // Perception 단계: STEP 1(step1Results), STEP 2(appUIComponents) 결과를 병합
  const perceptionResultsData = useMemo(() => {
    // STEP 1: 섹션별 정보 (step1Results)
    let sectionArr: any[] = [];
    if (typeof appUI === 'object' && appUI !== null && !Array.isArray(appUI)) {
      sectionArr = Object.entries(appUI).map(([name, obj]) => ({
        name,
        position: (obj as any).position || '',
        sizeShape: (obj as any).size_shape || '',
        subComponents: (obj as any).sub_components || [],
      }));
    }

    // STEP 2: 컴포넌트별 정보 (appUIComponents: section별로 컴포넌트 객체)
    let componentArr: any[] = [];
    if (typeof appUIComponents === 'object' && appUIComponents !== null && !Array.isArray(appUIComponents)) {
      // 각 섹션별로 컴포넌트 객체 펼치기
      Object.entries(appUIComponents).forEach(([sectionName, compsObj]) => {
        if (typeof compsObj === 'object' && compsObj !== null) {
          (Object.entries(compsObj as any) as [string, any][]).forEach(([compName, comp]) => {
            componentArr.push({
              name: compName,
              section: sectionName,
              position: (comp as any).position || '',
              sizeShape: (comp as any).size_shape || '',
              subComponents: (comp as any).sub_components || [],
            });
          });
        }
      });
    }

    // 섹션+컴포넌트 모두 포함된 배열 반환 (find에서 name으로 접근 가능)
    return [...sectionArr, ...componentArr];
  }, [appUI, appUIComponents]);
  const comprehensionResultsData = useMemo(() => {
    // step3Results 구조: {Header: {...}, Navigation Tabs: {...}, Video Selection Grid: {...}}
    // 각 섹션별로 내부 객체를 펼쳐서 [{section, components}] 형태로 변환
    const flattenSection = (sectionName: string, sectionObj: any) => {
      if (!sectionObj || typeof sectionObj !== 'object') return null;
      // 섹션 자체의 visual/functional characteristics 추출 (step4에서 주로 존재)
      const sectionVisual = sectionObj.visual_characteristics || '';
      const sectionFunctional = sectionObj.functional_characteristics || '';
      // 컴포넌트: 하위 키들 (예: Menu Icon, Title Text 등)
      const components = Object.entries(sectionObj)
        .filter(([key, value]) => value && typeof value === 'object')
        .map(([name, value]) => {
          const v = value as any;
          return {
            name,
            visualCharacteristics: v.visual_characteristics || '',
            functionalCharacteristics: v.functional_characteristics || '',
          };
        });
      return {
        section: {
          name: sectionName,
          visualCharacteristics: sectionVisual,
          functionalCharacteristics: sectionFunctional,
        },
        components,
      };
    };

    const allSections: any[] = [];
    [step3Results, step4Results].forEach((step) => {
      if (step && typeof step === 'object') {
        Object.entries(step).forEach(([sectionName, sectionObj]) => {
          const group = flattenSection(sectionName, sectionObj);
          if (group) allSections.push(group);
        });
      }
    });
    return allSections;
  }, [step3Results, step4Results]);

  // step7Result 선언을 useEffect 위로 이동하여 ReferenceError 방지
  const step7Result = useUICritiqueStore.getState().step7Result;
  // 최초 마운트 또는 step5/6 변경 시: store에 값 있으면 복원, 없으면 새로 생성
  useEffect(() => {
    // step5Result, step6Result 구조 확인용 로그 추가
    console.log('[DEBUG] useEffect triggered');
    // console.log('[DEBUG] storeProjectionResultsData:', storeProjectionResultsData);
    console.log('[DEBUG] step5Result:', step5Result);
    console.log('[DEBUG] step6Result:', step6Result);
    // navigationDirection이 변경될 때만 setState 호출
    if (navigationDirection === 'next') {
      // 백엔드 최신값 생성
      if (step5Result && step6Result) {
        // ...sectionResults 생성 로직 (기존 코드)...
        const allSectionNames = new Set([
          ...Object.keys(step5Result.section_issues || {}),
          ...Object.keys(step6Result || {}),
        ]);
        // ...생성 로직 생략...
        // 실제 코드에서는 기존 sectionResults 생성부를 그대로 사용
        // setProjectionResultsData(sectionResults);
        // setStoreProjectionResultsData(sectionResults);
      }
    } else if (navigationDirection === 'prev') {
      // 이전 버튼: zustand store 최신값 복원
      setProjectionResultsData(storeProjectionResultsData);
    }
    // PATCH: step7Result가 변경되면 finalSectionResults에 step5Result를 ProjectionSection 타입에 맞게 변환해서 저장
    if (step7Result && Object.keys(step7Result).length > 0) {
      const finalResults: ProjectionSection[] = Object.entries(step7Result).map(([sectionName, sectionObj]) => ({
        id: (sectionObj as any).id || sectionName,
        name: sectionName,
        expectedStandard: (sectionObj as any).expected_standard || '',
        identifiedGap: (sectionObj as any).identified_gap || '',
        functionalCharacteristics: (sectionObj as any).functional_characteristics || '',
        visualCharacteristics: (sectionObj as any).visual_characteristics || '',
        components: Array.isArray((sectionObj as any).components)
          ? (sectionObj as any).components.map((comp: any) => ({
              id: comp.id || comp.name || '',
              name: comp.name || '',
              expectedStandard: comp.expected_standard || '',
              identifiedGap: comp.identified_gap || '',
              functionalCharacteristics: comp.functional_characteristics || '',
              visualCharacteristics: comp.visual_characteristics || ''
            }))
          : []
      }));
      setFinalSectionResults(finalResults);
    }
  }, [navigationDirection, step7Result]);

  // STEP 5&6 결과를 항상 projectionResultsData에 변환해서 저장 (최신값 유지)
  useEffect(() => {
    // 리뷰 결과가 존재해도 projectionResultsData 자동 갱신을 막지 않음
    // 사용자 편집이 이미 반영된 경우 덮어쓰지 않음
    const hasUserEdits = Array.isArray(safeProjectionResultsData) && safeProjectionResultsData.some((row: any) => {
      const secHas = (row?.expectedStandard && row.expectedStandard.trim() !== '') || (row?.identifiedGap && row.identifiedGap.trim() !== '');
      const compHas = Array.isArray(row?.components) && row.components.some((c: any) => (c?.expectedStandard && c.expectedStandard.trim() !== '') || (c?.identifiedGap && c.identifiedGap.trim() !== ''));
      return secHas || compHas;
    });
    if (hasUserEdits) return;
    // Allow mapping if either step5 or step6 exists (backend may omit section-level issues)
    if (step5Result || step6Result) {
      // STEP 5, STEP 6 핵심 데이터 로그 출력
      const transformIssue = (issue: any) => {
        if (!issue) return {} as any;
        return {
          expectedStandard: issue.expected_standard || '',
          identifiedGap: issue.identified_gap || '',
          functionalCharacteristics: issue.functional_characteristics || '',
          visualCharacteristics: issue.visual_characteristics || '',
          position: issue.position || '',
          sizeShape: issue.size_shape || '',
          subComponents: issue.sub_components || []
        };
      };
      const allSectionNames = new Set([
        ...Object.keys((step5Result as any)?.section_issues || {}),
        ...Object.keys(step6Result || {}),
      ]);
      const allComprehensionComponents = comprehensionResultsData.flatMap((group: any) => group.components || []);
      const findComprehensionComponent = (name: string) =>
        allComprehensionComponents.find((c: any) => c.name === name) || {};
      const findComprehensionSection = (name: string) =>
        ((comprehensionResultsData.find((g: any) => g.section?.name === name) as any)?.section) || {};
      const allPerceptionSections = Array.isArray(perceptionResultsData) ? perceptionResultsData : [];
      const findPerceptionSection = (name: string) =>
        allPerceptionSections.find((s: any) => s.name === name) || {};
      const findPerceptionComponent = (name: string) =>
        allPerceptionSections.find((c: any) => c.name === name) || {};
      const sectionResults = Array.from(allSectionNames).map(sectionName => {
        const sectionIssueArr = (step5Result as any)?.section_issues?.[sectionName] || [];
        const sectionIssue = Array.isArray(sectionIssueArr) && sectionIssueArr.length > 0 ? sectionIssueArr[0] : {};
        const componentIssuesData = (step6Result as any)?.[sectionName]?.component_issues;
        const perceptionSecData = findPerceptionSection(sectionName);
        const comprehensionSecData = findComprehensionSection(sectionName);
        const components = componentIssuesData 
          ? Object.entries<any[]>(componentIssuesData).map(([componentName, issues]) => {
              const componentPerceptionData = findPerceptionComponent(componentName);
              const componentComprehensionData = findComprehensionComponent(componentName);
              let issueObj: any = {};
              if (Array.isArray(issues) && issues.length > 0 && typeof issues[0] === 'object' && issues[0] !== null) {
                issueObj = issues[0];
              }
              const transformed = transformIssue(issueObj);
              return {
                id: `comp-${sectionName}-${componentName}`,
                name: componentName,
                expectedStandard: transformed.expectedStandard || '',
                identifiedGap: transformed.identifiedGap || '',
                perceptionPosition: (componentPerceptionData as any).position || '',
                perceptionSizeShape: (componentPerceptionData as any).sizeShape || (componentPerceptionData as any).size_shape || '',
                perceptionSubComponents: (componentPerceptionData as any).subComponents || (componentPerceptionData as any).sub_components || '',
                comprehensionVisualCharacteristics: (componentComprehensionData as any).visualCharacteristics || (componentComprehensionData as any).visual_characteristics || '',
                comprehensionFunctionalCharacteristics: (componentComprehensionData as any).functionalCharacteristics || (componentComprehensionData as any).functional_characteristics || '',
                functionalCharacteristics:
                  transformed.functionalCharacteristics
                  || (componentComprehensionData as any).functionalCharacteristics
                  || (componentComprehensionData as any).functional_characteristics
                  || '',
                visualCharacteristics:
                  transformed.visualCharacteristics
                  || (componentComprehensionData as any).visualCharacteristics
                  || (componentComprehensionData as any).visual_characteristics
                  || '',
                position: transformed.position || (componentPerceptionData as any).position || '',
                sizeShape: transformed.sizeShape || (componentPerceptionData as any).size_shape || '',
              };
            })
          : [];
        const transformedSection = transformIssue({
          expected_standard: (sectionIssue as any).expected_standard,
          identified_gap: (sectionIssue as any).identified_gap,
          functional_characteristics: (sectionIssue as any).functionalCharacteristics || (sectionIssue as any).functional_characteristics,
          visual_characteristics: (sectionIssue as any).visualCharacteristics || (sectionIssue as any).visual_characteristics,
          position: (sectionIssue as any).position,
          size_shape: (sectionIssue as any).size_shape,
          sub_components: (sectionIssue as any).sub_components
        });
        return {
          id: `sec-${sectionName}`,
          name: sectionName,
          expectedStandard: (transformedSection as any).expectedStandard || '',
          identifiedGap: (transformedSection as any).identifiedGap || '',
          perceptionPosition: (perceptionSecData as any).position || '',
          perceptionSizeShape: (perceptionSecData as any).sizeShape || (perceptionSecData as any).size_shape || '',
          perceptionSubComponents: (perceptionSecData as any).subComponents || (perceptionSecData as any).sub_components || '',
          comprehensionVisualCharacteristics: (comprehensionSecData as any).visualCharacteristics || (comprehensionSecData as any).visual_characteristics || '',
          comprehensionFunctionalCharacteristics: (comprehensionSecData as any).functionalCharacteristics || (comprehensionSecData as any).functional_characteristics || '',
          functionalCharacteristics:
            (transformedSection as any).functionalCharacteristics
            || (comprehensionSecData as any).functionalCharacteristics
            || (comprehensionSecData as any).functional_characteristics
            || '',
          visualCharacteristics:
            (transformedSection as any).visualCharacteristics
            || (comprehensionSecData as any).visualCharacteristics
            || (comprehensionSecData as any).visual_characteristics
            || '',
          position: (transformedSection as any).position || (perceptionSecData as any).position || '',
          sizeShape: (transformedSection as any).sizeShape || (perceptionSecData as any).size_shape || '',
          components: components,
        };
      });
      if (JSON.stringify(projectionResultsData) !== JSON.stringify(sectionResults)) {
        setProjectionResultsData(sectionResults);
        setStoreProjectionResultsData(sectionResults);
      }
    }
  }, [step5Result, step6Result, perceptionResultsData, comprehensionResultsData, finalSectionResults]);

  // 화면에 보여줄 섹션 결과: step7 이후에는 finalSectionResults, 그 전에는 projectionResultsData
  // If projectionResultsData is empty but we have step6, compute a minimal display list to avoid empty table
  const computedFromStep6 = useMemo(() => {
    if (finalSectionResults.length > 0) return [] as ProjectionSection[];
    if (Array.isArray(safeProjectionResultsData) && safeProjectionResultsData.length > 0) return [] as ProjectionSection[];
    if (!step6Result) return [] as ProjectionSection[];
    const sectionNames = Object.keys(step6Result || {});
    if (sectionNames.length === 0) return [] as ProjectionSection[];
    return sectionNames.map((sectionName) => {
      const compIssues = ((step6Result as any)[sectionName]?.component_issues) || {};
      return {
        id: `sec-${sectionName}`,
        name: sectionName,
        expectedStandard: '',
        identifiedGap: '',
        functionalCharacteristics: (((comprehensionResultsData.find((g: any) => g.section?.name === sectionName) as any)?.section) || {}).functionalCharacteristics || '',
        visualCharacteristics: (((comprehensionResultsData.find((g: any) => g.section?.name === sectionName) as any)?.section) || {}).visualCharacteristics || '',
        position: (((perceptionResultsData as any[]) || []).find((s: any) => s.name === sectionName) as any)?.position || '',
        sizeShape: (((perceptionResultsData as any[]) || []).find((s: any) => s.name === sectionName) as any)?.sizeShape || '',
        components: Object.entries<any[]>(compIssues).map(([compName, issues]) => {
          const issue = Array.isArray(issues) && issues.length > 0 ? (issues[0] as any) : {};
          const compFromComprehension = (comprehensionResultsData.flatMap((g: any) => g.components || [])).find((c: any) => c.name === compName) as any;
          const compFromPerception = ((perceptionResultsData as any[]) || []).find((c: any) => c.name === compName) as any;
          return {
            id: `comp-${sectionName}-${compName}`,
            name: compName,
            expectedStandard: issue.expected_standard || '',
            identifiedGap: issue.identified_gap || '',
            functionalCharacteristics: issue.functional_characteristics
              || compFromComprehension?.functionalCharacteristics
              || compFromComprehension?.functional_characteristics
              || '',
            visualCharacteristics: issue.visual_characteristics
              || compFromComprehension?.visualCharacteristics
              || compFromComprehension?.visual_characteristics
              || '',
            position: issue.position || compFromPerception?.position || '',
            sizeShape: issue.size_shape || compFromPerception?.sizeShape || compFromPerception?.size_shape || '',
          };
        }),
      } as ProjectionSection;
    });
  }, [step6Result, comprehensionResultsData, perceptionResultsData, finalSectionResults, safeProjectionResultsData]);

  const displayedSectionResults = safeProjectionResultsData.length > 0
    ? safeProjectionResultsData
    : (finalSectionResults.length > 0
        ? finalSectionResults
        : computedFromStep6);

  // navigationDirection setter를 외부에서 사용할 수 있도록 반환
  return {
    isGuidelineRevised,
    setIsGuidelineRevised,
    projectionHeuristicData,
    setProjectionHeuristicData,
    projectionResultsData: safeProjectionResultsData,
    setProjectionResultsData,
    setNavigationDirection,
    perceptionResultsData,
    comprehensionResultsData,
    finalSectionResults,
    // 화면 표시용 데이터도 외부로 반환
    displayedProjectionResultsData: displayedSectionResults
  };
}

