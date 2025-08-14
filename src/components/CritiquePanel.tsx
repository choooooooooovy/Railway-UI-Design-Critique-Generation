/* eslint-disable react/no-unescaped-entities */

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TableType, TabType } from "../types/critique";
import ProgressBar from "./common/ProgressBar";
import { PerceptionSectionTable } from "./tables/Perception/PerceptionSectionTable";
import { PerceptionComponentTable } from "./tables/Perception/PerceptionComponentTable";
import { ComprehensionComponentTable } from "./tables/Comprehension/ComprehensionComponentTable";
import { ComprehensionSectionTable } from "./tables/Comprehension/ComprehensionSectionTable";
import { ProjectionHeuristicTable } from "./tables/Projection/HeuristicTable";
import { ProjectionResultsTable } from "./tables/Projection/ProjectionResultsTable";
import { FinalReviewTable } from "./tables/Final/FinalReviewTable";
import { usePerceptionState } from "../hooks/usePerceptionState";
import { useCritiquePanelState } from "../hooks/useCritiquePanelState";
import { useComprehensionState } from "../hooks/useComprehensionState";
import { useProjectionState } from "../hooks/useProjectionState";
import { useFinalReviewState } from "../hooks/useFinalReviewState";
import { useAppContext } from "../contexts/AppContext";
import { getStepTitle, getStepDescription } from "../utils/stepUtils";
import { handleNavigation, isPrevButtonDisabled } from "../utils/navigationUtils";
import { getProgressSteps } from "../utils/progressUtils";

import { useUICritiqueStore } from "../stores/useUICritiqueStore";
import { ComprehensionSectionSyncPanel } from "./tables/Comprehension/ComprehensionSectionSyncPanel";

// Stable empty object to avoid new reference every render in selectors
const EMPTY_SECTION_ISSUES: Record<string, Array<{ expected_standard?: string; identified_gap?: string }>> = Object.freeze({});

export default function CritiquePanel() {
  const router = useRouter();
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  // 스피너 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  // Optimistic snapshot to keep edited projection results visible right after toggling off
  const [optimisticProjectionResults, setOptimisticProjectionResults] = useState<any[] | null>(null);

  // Existing state management
  const {
    currentTab,
    setCurrentTab,
    comprehensionState,
    setComprehensionState,
    projectionState,
    setProjectionState
  } = useCritiquePanelState();

  // 추가: discard modal 상태 및 콜백 관리
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const discardModalResolveRef = useRef<((result: boolean) => void) | null>(null);
  const confirmDiscardCallback = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setShowDiscardModal(true);
      discardModalResolveRef.current = resolve;
    });
  }, []);

  // Final Review 진입 후 step7Result가 채워지면 오버레이 무조건 꺼짐 (무한 루프 방지)
  const step7Result = useUICritiqueStore((state) => state.step7Result);
  useEffect(() => {
    if (currentTab === "review" && step7Result && Object.keys(step7Result).length > 0) {
      if (isLoading) setIsLoading(false);
    }
  }, [currentTab, step7Result, isLoading]);
  // Final Review 오버레이 강제 해제용 글로벌 함수 등록 (렌더링 오류 방지)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__setCritiquePanelLoadingFalse = () => setIsLoading(false);
    }
  }, []);


  // Perception state managed locally
  const [perceptionState, setPerceptionState] = useState<TableType>("section");

  const setAppUIComponents = useUICritiqueStore((state) => state.setAppUIComponents);
  const sectionIssues = useUICritiqueStore((state) => state.step5Result?.section_issues);
  const sectionIssuesFromStore = sectionIssues ?? EMPTY_SECTION_ISSUES;
  // Add selectors for step5/6 results
  const step5ResultState = useUICritiqueStore((state) => state.step5Result);
  const step6ResultState = useUICritiqueStore((state) => state.step6Result);

  const {
    perceptionSectionData,
    perceptionComponentData,
    addSectionRow,
    deleteSectionRow,
    addComponentRow,
    deleteComponentRow
  } = usePerceptionState();

  const {
    comprehensionComponentData,
    comprehensionSectionData,
    setComprehensionComponentData,
    setComprehensionSectionData: rawSetComprehensionSectionData,
    setIsUserEdited
  } = useComprehensionState();

  // 항상 최신값을 반영하는 setter (불필요한 stale 값 방지)
  const setComprehensionSectionData = useCallback((data: any) => {
    // 기존 데이터와 다를 때만 업데이트
    rawSetComprehensionSectionData(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(data)) {
        return data;
      }
      return prev;
    });
  }, [rawSetComprehensionSectionData]);

  const {
    projectionHeuristicData,
    projectionResultsData,
    setProjectionResultsData,
    isGuidelineRevised,
    setIsGuidelineRevised,
    setProjectionHeuristicData,
    perceptionResultsData,
    comprehensionResultsData,
    // 추가: final 및 표시용 결과 활용
    finalSectionResults,
    displayedProjectionResultsData
  } = useProjectionState();

  // ProjectionResultsTable의 최신 editableData를 참조하기 위한 ref
  const projectionTableRef = useRef<any>(null);

  const {
    finalReviewData
  } = useFinalReviewState();

  // Get setFinalReviewData from AppContext
  const { setFinalReviewData } = useAppContext();

  // New: editable tab check
  const isEditableTab = () => {
    if (currentTab === "perception") return true;
    if (currentTab === "comprehension") return true;
    if (currentTab === "projection" && projectionState === "results") return true;
    if (currentTab === "review") return true;
    return false;
  };

  // Final Review data -> 전역 상태 저장 (리뷰 탭에서만 동기화하여 루프 방지)
  useEffect(() => {
    if (currentTab === 'review') {
      setFinalReviewData(finalReviewData);
    }
  }, [currentTab, finalReviewData, setFinalReviewData]);

  // When entering Projection Results with empty data, auto-run Step 5/6 once
  const step56FetchTriggered = useRef(false);
  useEffect(() => {
    const needStep56 = currentTab === "projection" && projectionState === "results" && (!step5ResultState || !step6ResultState);
    if (!needStep56 || step56FetchTriggered.current) return;
    step56FetchTriggered.current = true;
    (async () => {
      try {
        setIsLoading(true);
        // Ensure step3Results exists (build from comprehensionComponentData)
        const store = useUICritiqueStore.getState();
        if (!store.step3Results || Object.keys(store.step3Results).length === 0) {
          const step3Results: Record<string, Record<string, any>> = {};
          (comprehensionComponentData || []).forEach((group: any) => {
            const sectionName = group.section?.name;
            if (!sectionName) return;
            if (!step3Results[sectionName]) step3Results[sectionName] = {};
            (group.components || []).forEach((component: any) => {
              if (!component?.name) return;
              step3Results[sectionName][component.name] = {
                visual_characteristics: component.visualCharacteristics || '',
                functional_characteristics: component.functionalCharacteristics || '',
                position: component.position || '',
                size_shape: component.sizeShape || '',
                sub_components: component.subComponents || ''
              };
            });
          });
          await useUICritiqueStore.getState().setStep3Results(step3Results);
        }
        // Ensure step4Results exists (build from comprehensionSectionData)
        const storeAfterStep3 = useUICritiqueStore.getState();
        if (!storeAfterStep3.step4Results || Object.keys(storeAfterStep3.step4Results).length === 0) {
          const step4Results: Record<string, any> = {};
          (comprehensionSectionData || []).forEach((group: any) => {
            const sectionName = group?.section?.name;
            if (!sectionName) return;
            step4Results[sectionName] = {
              visual_characteristics: group.section.visualCharacteristics || '',
              functional_characteristics: group.section.functionalCharacteristics || '',
              position: group.section.position || '',
              size_shape: group.section.sizeShape || ''
            };
          });
          await useUICritiqueStore.getState().setStep4Results(step4Results);
        }
        // Trigger Step 5/6 using the navigation helper
        await handleNavigation({
          direction: "next",
          currentTab,
          perceptionState,
          comprehensionState,
          // Force heuristic branch to run Step 5/6 API
          projectionState: "heuristic",
          setCurrentTab,
          setPerceptionState,
          setComprehensionState,
          setProjectionState,
          setEditable: setIsEditingEnabled,
          onFinalReportNavigation: () => router.push('/final-report'),
        });
      } catch (e) {
        console.error('Auto Step5/6 fetch failed:', e);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, projectionState, step5ResultState, step6ResultState, comprehensionComponentData, comprehensionSectionData]);

  // Clear optimistic snapshot when leaving projection results or when store catches up
  useEffect(() => {
    if (currentTab !== 'projection' || projectionState !== 'results') {
      if (optimisticProjectionResults) setOptimisticProjectionResults(null);
      return;
    }
  }, [currentTab, projectionState]);

  useEffect(() => {
    if (!optimisticProjectionResults) return;
    try {
      if (Array.isArray(projectionResultsData) && JSON.stringify(projectionResultsData) === JSON.stringify(optimisticProjectionResults)) {
        setOptimisticProjectionResults(null);
      }
    } catch {}
  }, [projectionResultsData, optimisticProjectionResults]);

  return (
    <div className="bg-white h-full p-6 rounded-lg shadow flex flex-col relative">
      {showDiscardModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{background: 'rgba(0, 0, 0, 0.3)', zIndex: 50, backdropFilter: 'blur(3px)'}}>
          <div className="bg-white p-6 rounded shadow-lg min-w-[320px]" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <div className="mb-2 font-semibold text-lg text-black" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
              정말 이전 단계로 돌아가시겠어요?
            </div>
            <div className="mb-2 text-base text-gray-500" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
              돌아가면 지금까지 입력한 내용이 모두 삭제돼요.<br />
              혹시 실수로 누르셨다면 아래 버튼으로 계속 진행할 수 있습니다.
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button
                className="px-10 py-2 bg-gray-200 text-black rounded transition-all duration-150 hover:bg-gray-300"
                style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                onClick={() => {
                  setShowDiscardModal(false);
                  discardModalResolveRef.current?.(true);
                }}
              >이전 단계로 돌아가기</button>
              <button
                className="px-10 py-2 bg-[#0088FF] text-white rounded transition-all duration-150 hover:bg-[#2D7FF9]"
                style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}
                onClick={() => {
                  setShowDiscardModal(false);
                  discardModalResolveRef.current?.(false);
                }}
              >계속 진행하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 화면 오버레이 스피너 */}
      {isLoading && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(3px)' }}
        >
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-24 w-24 border-[10px] border-[#2D7FF9] border-t-transparent mb-6"></div>
            <div className="text-white text-2xl font-semibold drop-shadow-lg">Loading ...</div>
          </div>
        </div>
      )}
      {/* Progress Bar */}
      <ProgressBar
        steps={getProgressSteps(currentTab, perceptionState, comprehensionState, projectionState)}
        currentStep={["perception", "comprehension", "projection", "review"].indexOf(currentTab)}
        onStepClick={async (index) => {
          console.log('[DEBUG] setIsLoading(true) called: ProgressBar onStepClick');
          setIsLoading(true);
          const tabs: TabType[] = ["perception", "comprehension", "projection", "review"];
          await Promise.resolve(setCurrentTab(tabs[index]));
          // review 진입 시 오버레이 즉시 해제
          if (tabs[index] === "review") {
            setIsLoading(false);
            return;
          }
          setIsLoading(false);
        }}
        onStateChange={async (state) => {
          console.log('[DEBUG] setIsLoading(true) called: ProgressBar onStateChange');
          setIsLoading(true);
          if (currentTab === "perception") {
            await Promise.resolve(setPerceptionState(state as TableType));
          } else if (currentTab === "comprehension") {
            await Promise.resolve(setComprehensionState(state as TableType));
          }
          setIsLoading(false);
        }}
        isLoading={isLoading}
      />

      {/* Navigation Bar with Step Title */}
      <div className="flex items-center mb-4 p-2 rounded-[8px] shadow-sm">
        <button
          onClick={async () => {
            // prev: 저장된 projectionResultsData를 그대로 사용 (finalSectionResults로 덮어쓰지 않음)
            await handleNavigation({
              direction: "prev",
              currentTab,
              perceptionState,
              comprehensionState,
              projectionState,
              setCurrentTab,
              setPerceptionState,
              setComprehensionState,
              setProjectionState,
              setEditable: setIsEditingEnabled,
              confirmDiscardCallback,
            });
            setIsEditingEnabled(false);
          }}
          disabled={isPrevButtonDisabled(currentTab, perceptionState)}
          className={`p-2 rounded-full ${isPrevButtonDisabled(currentTab, perceptionState)
            ? "bg-gray-200 cursor-not-allowed"
            : "bg-[#2D7FF9] hover:bg-gray-200"
            }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19L8 12L15 5" stroke={currentTab === "perception" && perceptionState === "section" ? "#999999" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1 mx-4">
          <h2 className="text-lg font-semibold mb-1 text-[#2D7FF9]">
            {getStepTitle(currentTab, perceptionState, comprehensionState, projectionState)}
          </h2>
          <p className="text-sm text-gray-600" style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
            <span style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
              {getStepDescription(currentTab, perceptionState, comprehensionState, projectionState)}
            </span>
            <br />
            <span style={{ fontFamily: 'IBM Plex Sans, IBM Plex Sans KR, sans-serif' }}>
              작업이 끝나면 오른쪽 다음 버튼(▶️)을 눌러주세요!
            </span>
          </p>
        </div>

        {/* Right Arrow */}
        <button
          onClick={async () => {
            console.log('[DEBUG] setIsLoading(true) called: Next button click');
            setIsLoading(true);
            if (currentTab === "perception" && perceptionState === "section") {
              const appUI = useUICritiqueStore.getState().appUI;
              if (!appUI || Object.keys(appUI).length === 0) {
                const appUIObject: { [key: string]: any } = {};
                perceptionSectionData.forEach(row => {
                  const key = row.section && row.section.trim() ? row.section : row.id;
                  appUIObject[key] = {
                    position: row.position,
                    size_shape: row.sizeShape
                  };
                });
                if (JSON.stringify(appUIObject) !== JSON.stringify(appUI)) {
                  console.log('DEBUG: Updating appUI with perceptionSectionData:', appUIObject);
                  await useUICritiqueStore.getState().setAppUI(appUIObject);
                }
              }

              // Initialize step3Results if missing
              const step3Results = useUICritiqueStore.getState().step3Results || {};
              if (Object.keys(step3Results).length === 0) {
                console.log('DEBUG: Initializing step3Results for perception tab.');
                await useUICritiqueStore.getState().setStep3Results({});
              }

              // Ensure comprehensionState is set for step 2
              if (!comprehensionState) {
                console.log('DEBUG: Initializing comprehensionState for step 2.');
                setComprehensionState("section");
              }
            }

            // 최신 comprehensionSectionData를 zustand store에 저장 (section 단계)
            if (currentTab === "comprehension" && comprehensionState === "section") {
              console.log('DEBUG: comprehensionSectionData before save:', comprehensionSectionData);
              await useUICritiqueStore.getState().setComprehensionSectionData(comprehensionSectionData);
            }

            if (currentTab === "comprehension" && comprehensionState === "component") {
              const step3Results: Record<string, Record<string, any>> = {};
              comprehensionComponentData.forEach(group => {
                const sectionName = group.section.name;
                if (!step3Results[sectionName]) {
                  step3Results[sectionName] = {};
                }
                group.components?.forEach(component => {
                  step3Results[sectionName][component.name] = {
                    visual_characteristics: component.visualCharacteristics || '',
                    functional_characteristics: component.functionalCharacteristics || '',
                    position: component.position || '',
                    size_shape: component.sizeShape || '',
                    sub_components: component.subComponents || ''
                  };
                });
              });

              console.log('DEBUG: Setting step3Results:', step3Results);
              await useUICritiqueStore.getState().setStep3Results(step3Results);
            }

            // projection 단계로 넘어갈 때 step4Results에 최신 comprehensionSectionData 저장
            if (currentTab === "projection" && projectionState === "heuristic") {
              // step4Results 구조: sectionName별로 section 정보 저장
              const step4Results: Record<string, any> = {};
              comprehensionSectionData.forEach(group => {
                const sectionName = group.section.name;
                step4Results[sectionName] = {
                  visual_characteristics: group.section.visualCharacteristics || '',
                  functional_characteristics: group.section.functionalCharacteristics || '',
                  position: group.section.position || '',
                  size_shape: group.section.sizeShape || ''
                };
              });
              console.log('DEBUG: Setting step4Results:', step4Results);
              await useUICritiqueStore.getState().setStep4Results(step4Results);

              // Always force fresh Step 5/6 by clearing previous results before navigating to Results
              try {
                await useUICritiqueStore.getState().setProjectionResultsData([]);
                await useUICritiqueStore.getState().setStep5Result(undefined as any);
                await useUICritiqueStore.getState().setStep6Result(undefined as any);
              } catch (e) {
                console.warn('WARN: Failed to clear previous projection results before Step 5/6 re-run', e);
              }
              // Also clear optimistic snapshot so old edits don't flash
              setOptimisticProjectionResults(null);
            }

            // step5&6(Projection Results)로 넘어갈 때 최신 projectionResultsData 저장
            if (currentTab === "projection" && projectionState === "results") {
              // ProjectionResultsTable의 최신 editableData를 강제로 받아서 저장
              let latestProjectionResultsData = projectionResultsData;
              if (projectionTableRef.current && projectionTableRef.current.getLatestData) {
                latestProjectionResultsData = projectionTableRef.current.getLatestData();
              }
              // step5Result 구조: { section_issues: { [sectionName]: [ { expected_standard, identified_gap } ] } }
              const prevStep5 = useUICritiqueStore.getState().step5Result || {};
              const prevSectionIssues = (prevStep5 as any).section_issues || {};
              const section_issues: Record<string, Array<{ expected_standard: string; identified_gap: string }>> = {};
              latestProjectionResultsData.forEach((group: any) => {
                const sectionName = group.name;
                const issuesArr = prevSectionIssues[sectionName];
                const expectedStandard = group.expectedStandard || (issuesArr?.[0]?.expected_standard) || '';
                const identifiedGap = group.identifiedGap || (issuesArr?.[0]?.identified_gap) || '';
                section_issues[sectionName] = [
                  { expected_standard: expectedStandard, identified_gap: identifiedGap }
                ];
              });
              const step5ResultPayload = { section_issues };
              console.log('DEBUG: Setting step5Result (normalized):', step5ResultPayload);
              await useUICritiqueStore.getState().setStep5Result(step5ResultPayload as any);

              // Normalize rows so section expected/identified are filled before navigation (prevents '-')
              const normalizedRows = latestProjectionResultsData.map((group: any) => {
                const sectionName = group.name;
                const issue = section_issues[sectionName]?.[0] || { expected_standard: '', identified_gap: '' };
                return {
                  ...group,
                  expectedStandard: group.expectedStandard || issue.expected_standard || '',
                  identifiedGap: group.identifiedGap || issue.identified_gap || ''
                };
              });

              // step6Result(component_issues)도 컴포넌트 편집값으로 병합하여 저장
              const prevStep6 = useUICritiqueStore.getState().step6Result || {};
              const nextStep6: Record<string, any> = JSON.parse(JSON.stringify(prevStep6 || {}));
              normalizedRows.forEach((group: any) => {
                const sectionName = group.name;
                if (!nextStep6[sectionName]) nextStep6[sectionName] = {};
                if (!nextStep6[sectionName].component_issues) nextStep6[sectionName].component_issues = {};
                const compIssues = nextStep6[sectionName].component_issues;
                (Array.isArray(group.components) ? group.components : []).forEach((comp: any) => {
                  const name = comp.name;
                  const existingArr = Array.isArray(compIssues[name]) ? compIssues[name] : [];
                  const baseIssue = (existingArr[0] && typeof existingArr[0] === 'object') ? existingArr[0] : {};
                  compIssues[name] = [{
                    ...baseIssue,
                    expected_standard: (typeof comp.expectedStandard === 'string' ? comp.expectedStandard : (baseIssue.expected_standard || '')),
                    identified_gap: (typeof comp.identifiedGap === 'string' ? comp.identifiedGap : (baseIssue.identified_gap || '')),
                    // 보조 필드도 가능하면 유지/보강
                    functional_characteristics: baseIssue.functional_characteristics || comp.functionalCharacteristics || '',
                    visual_characteristics: baseIssue.visual_characteristics || comp.visualCharacteristics || '',
                    position: baseIssue.position || comp.position || '',
                    size_shape: baseIssue.size_shape || comp.sizeShape || ''
                  }];
                });
              });
              await useUICritiqueStore.getState().setStep6Result(nextStep6 as any);

              await useUICritiqueStore.getState().setProjectionResultsData(normalizedRows);
              const latestStep6Result = nextStep6;
              await handleNavigation({
                direction: "next",
                currentTab,
                perceptionState,
                comprehensionState,
                projectionState,
                setCurrentTab,
                setPerceptionState,
                setComprehensionState,
                setProjectionState,
                setEditable: setIsEditingEnabled,
                onFinalReportNavigation: () => router.push('/final-report'),
                latestProjectionResultsData: {
                  projectionResultsData: normalizedRows,
                  step5Result: step5ResultPayload,
                  step6Result: latestStep6Result
                }
              });
              setIsEditingEnabled(false);
              return;
            }

            const currentState = useUICritiqueStore.getState();
            console.log('DEBUG: Current state before navigation:', currentState);

            if (!currentState.step3Results) {
              console.error('ERROR: Missing step3Results in current state. Navigation aborted.');
              setIsLoading(false);
              return;
            }

            // step7 평가 시 항상 최신 projectionResultsData 사용하도록 전달
            const latestProjectionResultsData = useUICritiqueStore.getState().projectionResultsData;
            await handleNavigation({
              direction: "next",
              currentTab,
              perceptionState,
              comprehensionState,
              projectionState,
              setCurrentTab,
              setPerceptionState,
              setComprehensionState,
              setProjectionState,
              setEditable: setIsEditingEnabled,
              onFinalReportNavigation: () => router.push('/final-report'),
              latestProjectionResultsData: { projectionResultsData: latestProjectionResultsData }
            });
            setIsEditingEnabled(false);
            // Final Review 진입 시 오버레이 무조건 해제
            if (currentTab === "review") {
              setIsLoading(false);
              return;
            }
            // step7 결과가 비어있지 않으면 오버레이 무조건 해제
            const step7Result = useUICritiqueStore.getState().step7Result;
            if (step7Result && Object.keys(step7Result).length > 0) {
              setIsLoading(false);
            } else {
              setIsLoading(false); // 결과가 비어도 오버레이 해제 (UX 보장)
            }
          }}
          className="p-2 rounded-full hover:bg-gray-200 bg-[#2D7FF9]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L16 12L9 19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Edit Toggle Section */}
      {isEditableTab() && (
        <div className="flex justify-start items-center mb-4">
          <div className="flex items-center gap-5">
            <button
              onClick={async () => {
                const newValue = !isEditingEnabled;
                // Turning off editing in Projection Results: optimistically persist and keep UI on edited snapshot
                if (!newValue && currentTab === "projection" && projectionState === "results") {
                  try {
                    const latest = (projectionTableRef.current && projectionTableRef.current.getLatestData)
                      ? projectionTableRef.current.getLatestData()
                      : projectionResultsData;
                    if (Array.isArray(latest) && latest.length > 0) {
                      setOptimisticProjectionResults(latest);
                      await useUICritiqueStore.getState().setProjectionResultsData(latest);
                    }
                  } catch (e) {
                    console.warn('WARN: Failed to persist latest projection edits on toggle off', e);
                  }
                }
                setIsEditingEnabled(newValue);
                // 로그 기록
                import("../utils/logUserAction").then(({ logUserAction }) => {
                  logUserAction({
                    action_type: 'toggle_editing',
                    content: 'toggle_editing',
                    details: { enabled: newValue, tab: currentTab }
                  });
                });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2D7FF9] focus:ring-offset-2 ${
                isEditingEnabled ? 'bg-[#2D7FF9]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEditingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className="text-sm font-semibold text-gray-600"
              style={{ fontFamily: 'IBM Plex Sans KR, IBM Plex Sans, sans-serif', fontWeight: 600 }}
            >
              편집 모드를 활성화하면 내용을 수정할 수 있어요
            </span>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="h-full">
          {currentTab === "perception" && (
            perceptionState === "section" ?
              <PerceptionSectionTable
                perceptionSectionData={perceptionSectionData}
                addSectionRow={addSectionRow}
                deleteSectionRow={deleteSectionRow}
                isEditing={isEditingEnabled}
                onDataChange={(data) => {
                  // 배열 -> 딕셔너리 변환
                  const appUIObject: { [key: string]: any } = {};
                  data.forEach(row => {
                    // section 값이 비어있으면 id를 key로 사용
                    const key = row.section && row.section.trim() ? row.section : row.id;
                    appUIObject[key] = {
                      position: row.position,
                      size_shape: row.sizeShape
                    };
                  });
                  useUICritiqueStore.getState().setAppUI(appUIObject);
                }}
              /> :
              <PerceptionComponentTable
                perceptionComponentData={perceptionComponentData}
                addComponentRow={addComponentRow}
                deleteComponentRow={deleteComponentRow}
                isEditing={isEditingEnabled}
                onDataChange={(data) => {
                  // section별로 components를 딕셔너리로 변환하여 저장
                  const appUIComponentsObject: { [sectionName: string]: { [componentName: string]: any } } = {};
                  data.forEach(group => {
                    const sectionName = group.section?.name;
                    if (sectionName) {
                      const componentsDict: { [componentName: string]: any } = {};
                      group.components.forEach(component => {
                        if (component.name) {
                          componentsDict[component.name] = {
                            position: component.position,
                            size_shape: component.sizeShape,
                            sub_components: component.subComponents
                          };
                        }
                      });
                      appUIComponentsObject[sectionName] = componentsDict;
                    }
                  });
                  setAppUIComponents(appUIComponentsObject);
                  // perceptionComponentData도 최신값으로 갱신
                  if (typeof usePerceptionState === 'function') {
                    // hook이 함수일 경우 (혹은 context에서 setter를 직접 가져올 경우)
                    // setPerceptionComponentData(data);
                  } else {
                    // usePerceptionState에서 setter를 가져온 경우
                    // no-op
                  }
                }}
              />
          )}
          {currentTab === "comprehension" && (
            comprehensionState === "component" ? (
              <ComprehensionComponentTable
                comprehensionComponentData={comprehensionComponentData}
                comprehensionSectionData={comprehensionSectionData}
                isEditing={isEditingEnabled}
                onDataChange={setComprehensionComponentData}
                setComprehensionSectionData={setComprehensionSectionData}
              />
            ) : (
              <ComprehensionSectionTable
                comprehensionSectionData={comprehensionSectionData}
                isEditing={isEditingEnabled}
                onDataChange={(data) => {
                  setComprehensionSectionData(data);
                  if (typeof setIsUserEdited === 'function') setIsUserEdited(true);
                }}
              />
            )
          )}
          {currentTab === "projection" && (
            projectionState === "heuristic" ?
              <ProjectionHeuristicTable
                projectionHeuristicData={projectionHeuristicData}
                setProjectionHeuristicData={setProjectionHeuristicData}
                isGuidelineRevised={isGuidelineRevised}
                setIsGuidelineRevised={setIsGuidelineRevised}
              /> :
              <ProjectionResultsTable
                ref={projectionTableRef}
                projectionResultsData={(optimisticProjectionResults && optimisticProjectionResults.length > 0)
                  ? optimisticProjectionResults
                  : ((Array.isArray(projectionResultsData) && projectionResultsData.length > 0)
                    ? projectionResultsData
                    : displayedProjectionResultsData)}
                perceptionResultsData={perceptionResultsData}
                comprehensionResultsData={comprehensionResultsData}
                comprehensionSectionData={comprehensionSectionData}
                 sectionIssues={sectionIssuesFromStore}
                isEditing={isEditingEnabled}
                onDataChange={setProjectionResultsData}
              />
          )}
          {currentTab === "review" &&
            <FinalReviewTable
              finalReviewData={finalReviewData}
              isEditing={isEditingEnabled}
              onDataChange={setFinalReviewData}
            />
          }
        </div>
      </div>
    </div>
  );
}