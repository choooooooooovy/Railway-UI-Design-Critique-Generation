import { ProgressStep, TabType, TableType } from '../types/critique';

type ProjectionStateType = "heuristic" | "results";

// 현재 진행 단계 번호 계산
export function getCurrentProgress(
  currentTab: TabType,
  perceptionState: TableType,
  comprehensionState: TableType,
  projectionState: ProjectionStateType
): number {
  if (currentTab === "perception") {
    return perceptionState === "section" ? 1 : 2;
  }
  if (currentTab === "comprehension") {
    return comprehensionState === "component" ? 3 : 4;
  }
  if (currentTab === "projection") {
    return projectionState === "heuristic" ? 5 : 6;
  }
  if (currentTab === "review") {
    return 7;
  }
  return 1;
}

// 프로그레스 스텝 설정
export function getProgressSteps(
  currentTab: TabType,
  perceptionState: TableType,
  comprehensionState: TableType,
  projectionState: ProjectionStateType
): ProgressStep[] {
  const currentProgress = getCurrentProgress(currentTab, perceptionState, comprehensionState, projectionState);

  const steps: ProgressStep[] = [
    {
      name: "Perception",
      state: perceptionState,
      isActive: currentTab === "perception",
      progress: Math.min(currentProgress / 7, currentTab === "perception" ? currentProgress / 7 : 2 / 7)
    },
    {
      name: "Comprehension",
      state: comprehensionState,
      isActive: currentTab === "comprehension",
      progress: Math.min(currentProgress / 7, currentTab === "comprehension" ? currentProgress / 7 : 4 / 7)
    },
    {
      name: "Projection",
      state: projectionState,
      isActive: currentTab === "projection",
      progress: Math.min(currentProgress / 7, currentTab === "projection" ? currentProgress / 7 : 6 / 7)
    },
    {
      name: "Final Review",
      state: "review",
      isActive: currentTab === "review",
      progress: currentProgress / 7
    }
  ];

  return steps;
}
