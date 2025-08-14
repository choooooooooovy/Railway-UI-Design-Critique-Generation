// src/stores/useUICritiqueStore.ts
import { create, getState } from "zustand";

// 이 로그는 앱이 시작될 때 단 한 번만 보여야 정상입니다.
// 만약 이 로그가 여러 번 보인다면, 상태 저장소가 계속해서 재생성되고 있다는 의미입니다.
console.log('--- ZUSTAND STORE INITIALIZING ---');

interface UICritiqueState {
  task: string | null;
  image_base64: string | null;
  appUI: Record<string, any> | null;
  appUIComponents: Record<string, any> | null;
  step2Results: Record<string, any> | null;
  step3Results: Record<string, any> | null;
  step4Results: Record<string, any> | null;
  step5Result: Record<string, any> | null;
  step6Result: Record<string, any> | null;
  step7Result: Record<string, any> | null;
  guidelines: string | null;
  changeLog: string | null;
  setTask: (task: string) => void;
  setImageBase64: (base64: string) => void;
  setAppUI: (appUI: Record<string, any>) => void;
  setAppUIComponents: (components: Record<string, any>) => void;
  setStep2Results: (results: Record<string, any>) => void;
  setStep3Results: (results: Record<string, any>) => void;
  setStep4Results: (results: Record<string, any>) => void;
  setStep5Result: (result: Record<string, any>) => void;
  setStep6Result: (result: Record<string, any>) => void;
  setStep7Result: (result: Record<string, any>) => void;
  setGuidelines: (guidelines: string) => void;
  comprehensionSectionData: any;
  setComprehensionSectionData: (data: any) => void;
  projectionResultsData: any;
  setProjectionResultsData: (data: any) => void;
  setChangeLog: (log: string | null) => void;
  baselineSolution: string | null;
  baselineChangeLog: string | null;
  setBaselineSolution: (solution: string) => void;
  setBaselineChangeLog: (log: string | null) => void;
  resetState: () => void;
}

const initialState = {
  task: null,
  image_base64: null,
  appUI: {}, // Step 1
  appUIComponents: {}, // Step 2
  step2Results: null,
  step3Results: null,
  step4Results: null,
  step5Result: null,
  step6Result: null,
  step7Result: null,
  guidelines: null,
  changeLog: null,
  baselineSolution: null,
  baselineChangeLog: null,
  comprehensionSectionData: [],
  projectionResultsData: null,
};

console.log('STORE: Initial state on creation:', initialState);

export const useUICritiqueStore = create<UICritiqueState>((set) => ({
  ...initialState,
  setTask: (task) => set((state) => ({ ...state, task })),
  setImageBase64: (base64) => set((state) => ({ ...state, image_base64: base64 })),
  setAppUI: (appUI) => set((state) => ({ ...state, appUI })),
  setAppUIComponents: (components) => set((state) => ({ ...state, appUIComponents: components })),
  setStep2Results: (results) => set((state) => ({ ...state, step2Results: results })),
  setStep3Results: (results) => {
    console.log('STORE: Attempting to save Step 3 results:', results); // Debugging log before saving
    return new Promise((resolve) => {
      set((state) => {
        const newState = { ...state, step3Results: results };
        console.log('STORE: Step 3 results saved successfully:', newState.step3Results); // Debugging log after saving
        resolve(newState.step3Results);
        return newState;
      });
    });
  },
  setStep4Results: (results) => set((state) => ({ ...state, step4Results: results })),
  setStep5Result: (result) => set({ step5Result: result }),
  setStep6Result: (result) => set({ step6Result: result }),
  setStep7Result: (result) => set({ step7Result: result }),
  setGuidelines: (guidelines) => set({ guidelines }),
  setComprehensionSectionData: (data) => set((state) => ({ ...state, comprehensionSectionData: data })),
  setProjectionResultsData: (data) => set((state) => ({ ...state, projectionResultsData: data })),
  setChangeLog: (log) => set((state) => ({ ...state, changeLog: log })), // setChangeLog 구현
  setBaselineSolution: (solution) => set((state) => ({ ...state, baselineSolution: solution })),
  setBaselineChangeLog: (log) => set((state) => ({ ...state, baselineChangeLog: log })),
  resetState: () => set(initialState),
}));
