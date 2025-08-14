import { TabType, TableType } from '../types/critique';

// Norman's 10 Usability Heuristics (default guideline)
const defaultGuidelines = `
1. **Visibility of System Status**: The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time.
2. **Match Between the System and the Real World**: The design should speak the users' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon. Follow real-world conventions, making information appear in a natural and logical order.
3. **User Control and Freedom**: Users often perform actions by mistake. They need a clearly marked "emergency exit" to leave the unwanted action without having to go through an extended process.
4. **Consistency and Standards**: Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions.
5. **Error Prevention**: Good error messages are important, but the best designs carefully prevent problems from occurring in the first place. Either eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit to the action.
6. **Recognition Rather than Recall**: Minimize the user's memory load by making elements, actions, and options visible. The user should not have to remember information from one part of the interface to another. Information required to use the design (e.g. field labels or menu items) should be visible or easily retrievable when needed.
7. **Flexibility and Efficiency of Use**: Shortcuts — hidden from novice users — may speed up the interaction for the expert user so that the design can cater to both inexperienced and experienced users. Allow users to tailor frequent actions.
8. **Aesthetic and Minimalist Design**: Interfaces should not contain information that is irrelevant or rarely needed. Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility.
9. **Help Users Recognize, Diagnose, and Recover from Errors**: Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.
10. **Help and Documentation**: It's best if the system doesn't need any additional explanation. However, it may be necessary to provide documentation to help users understand how to complete their tasks.
`;
import { useUICritiqueStore } from '../stores/useUICritiqueStore';
import { logUserAction } from './logUserAction';

type ProjectionStateType = "heuristic" | "results";
type NavigationDirection = "prev" | "next";

interface NavigationResult {
  success: boolean;
  step?: string;
  data?: {
    app_ui_components?: any;
    [key: string]: any;
  };
  error?: any;
}

interface NavigationHandlerParams {
  direction: NavigationDirection;
  currentTab: TabType;
  perceptionState: TableType;
  comprehensionState: TableType;
  projectionState: ProjectionStateType;
  setCurrentTab: (tab: TabType) => void;
  setPerceptionState: (state: TableType) => void;
  setComprehensionState: (state: TableType) => void;
  setProjectionState: (state: ProjectionStateType) => void;
  setEditable: (editable: boolean) => void;
  onFinalReportNavigation?: () => void;
  latestProjectionResultsData?: any;
  confirmDiscardCallback?: () => Promise<boolean>; // 추가: 데이터 삭제 경고 모달 콜백
}

interface NavigationResult {
  success: boolean;
  step?: string;
  data?: {
    app_ui_components?: any;
    [key: string]: any;
  };
  error?: any;
}

// 네비게이션 처리 함수
export async function handleNavigation({
  direction,
  currentTab,
  perceptionState,
  comprehensionState,
  projectionState,
  setCurrentTab,
  setPerceptionState,
  setComprehensionState,
  setProjectionState,
  setEditable,
  onFinalReportNavigation,
  latestProjectionResultsData,
  confirmDiscardCallback
}: NavigationHandlerParams): Promise<NavigationResult> {
  try {
    // Always disable editable state on navigation
    if (typeof setEditable === 'function') {
      setEditable(false);
    }
    // Navigation button log
    logUserAction({
      action_type: 'navigation',
      content: direction === 'prev' ? 'prev_button' : 'next_button',
      details: {
        direction,
        currentTab,
        perceptionState,
        comprehensionState,
        projectionState
      }
    });

    if (direction === "prev") {
      // 데이터 삭제되는 단계
      const isDiscardStep = (
        (currentTab === "perception" && perceptionState === "component") ||
        (currentTab === "comprehension" && comprehensionState === "component") ||
        (currentTab === "comprehension" && comprehensionState === "section") ||
        (currentTab === "projection" && projectionState === "heuristic")  ||
        (currentTab === "projection" && projectionState === "results") ||
        (currentTab === "review")
      );
      if (isDiscardStep && typeof confirmDiscardCallback === "function") {
        const confirmed = await confirmDiscardCallback();
        if (!confirmed) {
          // 사용자가 Stay on this step 선택 시 취소
          return { success: false, error: "discard_cancelled" };
        }
      }
      // '이전' 버튼 로직
      if (currentTab === "comprehension" && comprehensionState === "component") { // step 3
        setCurrentTab("perception"); 
        setPerceptionState("component"); 
      } else if (currentTab === "projection" && projectionState === "heuristic") { // step 5
        setCurrentTab("comprehension");
        setComprehensionState("section");
      } else if (currentTab === "review") { // step 7
        setCurrentTab("projection");
        setProjectionState("results");
      } else if (currentTab === "perception" && perceptionState === "component") { // step 2
        setCurrentTab("perception"); 
        setPerceptionState("section");
      } else if (currentTab === "comprehension" && comprehensionState === "section") { // step 4
        setCurrentTab("comprehension");
        setComprehensionState("component");
      } else if (currentTab === "projection" && projectionState === "results") {  // step 6
        setCurrentTab("projection");
        setProjectionState("heuristic");
      }
      return { success: true };
    } else {
      // '다음' 버튼 로직
      const state = useUICritiqueStore.getState();
      const API_BASE = (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_BASE && window.location.hostname === 'localhost')
        ? 'http://localhost:8000'
        : (process.env.NEXT_PUBLIC_API_BASE || '');

      // Step 1 -> 2
      if (currentTab === "perception" && perceptionState === "section") {
        if (!state.task || !state.image_base64 || !state.appUI) {
          throw new Error('Missing data for Step 2. Complete Step 1.');
        }
        const requestBody = {
          task: state.task,
          image_base64: state.image_base64.split(',')[1] || state.image_base64,
          app_ui: state.appUI
        };
        const response = await fetch(`${API_BASE}/api/step2/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) throw new Error(`Step 2 API failed: ${await response.text()}`);
        const data = await response.json();
        useUICritiqueStore.getState().setAppUIComponents(data.result);
        setPerceptionState("component");
        return { success: true, step: 'step2', data: { app_ui_components: data.result } };
      }

      // Step 2 -> 3
      else if (currentTab === "perception" && perceptionState === "component") {
        const { appUIComponents } = useUICritiqueStore.getState();
        if (!state.task || !state.image_base64 || !state.appUI || !appUIComponents) {
          throw new Error('Missing data for Step 3. Complete Step 2.');
        }
        const requestBody = {
          task: state.task,
          image_base64: state.image_base64.split(',')[1] || state.image_base64,
          app_ui: state.appUI,
          app_ui_components: appUIComponents
        };
        const response = await fetch(`${API_BASE}/api/step3/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) throw new Error(`Step 3 API failed: ${await response.text()}`);
        const data = await response.json();
        console.log('DEBUG: Step 3 API response data:', data);

        // Await state update
        await useUICritiqueStore.getState().setStep3Results(data.result);
        console.log('DEBUG: Step 3 results set in Zustand store:', data.result);

        // Verify state update
        const currentState = useUICritiqueStore.getState();
        if (!currentState.step3Results || currentState.step3Results !== data.result) {
          throw new Error('State synchronization failed. Step 3 results are not updated correctly.');
        }
        console.log('DEBUG: State after synchronization:', currentState);

        setCurrentTab("comprehension");
        setComprehensionState("component");
        return { success: true, step: 'step3', data: { component_descriptions: data.result } };
      }

      // Step 3 -> 4
      else if (currentTab === "comprehension" && comprehensionState === "component") {
        const currentState = useUICritiqueStore.getState();
        console.log('DEBUG: Current state before Step 4 navigation:', currentState);
        if (!currentState.task || !currentState.image_base64 || !currentState.appUI || !currentState.step3Results) {
          console.error('DEBUG: Missing data for Step 4. Current state:', currentState);
          throw new Error('Missing data for Step 4. Step 3 results are not available.');
        }
        const requestBody = {
          task: currentState.task,
          image_base64: currentState.image_base64.split(',')[1] || currentState.image_base64,
          app_ui: currentState.appUI,
          step3_results: currentState.step3Results
        };
        const response = await fetch(`${API_BASE}/api/step4/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) throw new Error(`Step 4 API failed: ${await response.text()}`);
        const data = await response.json();
        useUICritiqueStore.getState().setStep4Results(data.result);
        setComprehensionState("section");
        return { success: true, step: 'step4', data: { section_analysis: data.result } };
      }

      // Step 3 -> 4
      else if (currentTab === "comprehension" && comprehensionState === "section") {
        setCurrentTab("projection");
        setProjectionState("heuristic");
        return { success: true };
      }

      // Step 4 -> 5 & 6
      else if (currentTab === "projection" && projectionState === "heuristic") {
        let currentState = useUICritiqueStore.getState();
        // 가이드라인 없으면 자동 세팅
        if (!currentState.guidelines) {
          console.log('DEBUG: Initializing default guidelines.');
          await useUICritiqueStore.getState().setGuidelines(defaultGuidelines);
          currentState = useUICritiqueStore.getState();
        }
        // 나머지 필수 데이터 없으면 에러 대신 안내 메시지 반환
        if (!currentState.task || !currentState.image_base64 || !currentState.step3Results || !currentState.step4Results) {
          console.warn('Step 5 & 6: 필수 데이터가 부족합니다. 이전 단계를 완료해 주세요.');
          return { success: false, error: '필수 데이터가 부족합니다. 이전 단계를 완료해 주세요.' };
        }
        const formData = new FormData();
        formData.append('task', currentState.task ?? '');
        formData.append('image_base64', (currentState.image_base64 ? (currentState.image_base64.split(',')[1] || currentState.image_base64) : ''));
        formData.append('step3_results_str', JSON.stringify(currentState.step3Results ?? {}));
        formData.append('step4_results_str', JSON.stringify(currentState.step4Results ?? {}));
        // Always use the latest guidelines from Zustand store
        formData.append('guidelines_str', currentState.guidelines ?? '');
        const response = await fetch(`${API_BASE}/api/step5_6/`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error(`Step 5/6 API failed: ${await response.text()}`);
        const data = await response.json();
        useUICritiqueStore.getState().setStep5Result(data.step5_result);
        useUICritiqueStore.getState().setStep6Result(data.step6_result);
        setProjectionState("results");
        return { success: true, step: 'step5_6', data: data };
      }

      // 이후 단계들 (단순 상태 변경)
      // 중복 제거: comprehension section -> projection heuristic은 한 번만 처리
      else if (currentTab === "projection" && projectionState === "results") {
        // CritiquePanel에서 최신 projectionResultsData, step5Result, step6Result를 넘겨주면 반드시 그 값을 사용
        let currentState = useUICritiqueStore.getState();
        // 최신 projectionResultsData가 인자로 전달된 경우 zustand에 저장 후 사용
        if (typeof latestProjectionResultsData !== 'undefined' && latestProjectionResultsData !== null) {
          try {
            // 지원하는 형태:
            // 1) 배열 자체
            // 2) { projectionResultsData: ProjectionSection[], step5Result?, step6Result? }
            if (Array.isArray(latestProjectionResultsData)) {
              await useUICritiqueStore.getState().setProjectionResultsData(latestProjectionResultsData);
            } else if (typeof latestProjectionResultsData === 'object') {
              const maybeArray = (latestProjectionResultsData as any).projectionResultsData;
              if (Array.isArray(maybeArray)) {
                await useUICritiqueStore.getState().setProjectionResultsData(maybeArray);
              }
              if ((latestProjectionResultsData as any).step5Result) {
                await useUICritiqueStore.getState().setStep5Result((latestProjectionResultsData as any).step5Result);
              }
              if ((latestProjectionResultsData as any).step6Result) {
                await useUICritiqueStore.getState().setStep6Result((latestProjectionResultsData as any).step6Result);
              }
            }
          } catch (e) {
            console.warn('WARN: Failed to persist latest projection data before Step 7', e);
          }
          currentState = useUICritiqueStore.getState();
        }
        // step5Result/step6Result도 CritiquePanel에서 최신값을 넘겨줄 수 있도록 파라미터로 받음
        const step5Result = (Array.isArray(latestProjectionResultsData) ? undefined : (latestProjectionResultsData as any)?.step5Result) ?? currentState.step5Result;
        const step6Result = (Array.isArray(latestProjectionResultsData) ? undefined : (latestProjectionResultsData as any)?.step6Result) ?? currentState.step6Result;
        if (!currentState.task || !currentState.step3Results || !currentState.step4Results || !step5Result || !step6Result || !currentState.guidelines) {
          throw new Error('Missing data for Step 7. Complete previous steps.');
        }
        const formData = new FormData();
        formData.append('task', currentState.task ?? '');
        formData.append('step3_results_str', JSON.stringify(currentState.step3Results ?? {}));
        formData.append('step4_results_str', JSON.stringify(currentState.step4Results ?? {}));
        formData.append('step5_results_str', JSON.stringify(step5Result ?? {}));
        formData.append('step6_results_str', JSON.stringify(step6Result ?? {}));
        formData.append('projection_results_data_str', JSON.stringify(currentState.projectionResultsData ?? {}));
        formData.append('guidelines_str', currentState.guidelines ?? '');
        const response = await fetch(`${API_BASE}/api/step7/`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error(`Step 7 API failed: ${await response.text()}`);
        const data = await response.json();
        useUICritiqueStore.getState().setStep7Result(data.solution);
        setCurrentTab("review");
        return { success: true, step: 'step7', data: data };
      }

      // Final Report navigation
      else if (currentTab === "review") {
        // Optional callback for Final Report tab transitions
        if (typeof onFinalReportNavigation === 'function') {
          try {
            await Promise.resolve(onFinalReportNavigation());
          } catch (e) {
            console.warn('WARN: onFinalReportNavigation callback threw', e);
          }
        }
        return { success: true };
      }

      // Fallback for unsupported transitions
      return { success: false, error: 'unsupported_transition' };
    }
  } catch (error) {
    console.error('Navigation error:', error);
    return { success: false, error };
  }
}

// Helper: disable Prev button on the very first step
export function isPrevButtonDisabled(currentTab: TabType, perceptionState: TableType): boolean {
  return currentTab === 'perception' && perceptionState === 'section';
}