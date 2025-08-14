import { useState, useEffect } from 'react';
import { TableType, TabType } from '../types/critique';

type ProjectionStateType = "heuristic" | "results";

export function useCritiquePanelState() {
  const [currentTab, setCurrentTab] = useState<TabType>("perception");
  const [perceptionState, setPerceptionState] = useState<TableType>("section");
  const [comprehensionState, setComprehensionState] = useState<TableType>("component");
  const [projectionState, setProjectionState] = useState<ProjectionStateType>("heuristic");

  // Step 간 전환 핸들러: 탭이 변경될 때 각 단계의 초기 상태 설정
  useEffect(() => {
    if (currentTab === "perception" && perceptionState !== "section") {
      setPerceptionState("section");
    }
    if (currentTab === "comprehension" && comprehensionState !== "component" && comprehensionState !== "section") {
      setComprehensionState("component");
    }
    if (currentTab === "projection" && projectionState !== "heuristic" && projectionState !== "results") {
      setProjectionState("heuristic");
    }
  }, [currentTab, perceptionState, comprehensionState, projectionState]);

  return {
    currentTab,
    setCurrentTab,
    // perceptionState,
    // setPerceptionState,
    comprehensionState,
    setComprehensionState,
    projectionState,
    setProjectionState
  };
}