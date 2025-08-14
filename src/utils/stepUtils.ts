import { TabType, TableType } from '../types/critique';

type ProjectionStateType = "heuristic" | "results";

// 현재 단계에 따른 타이틀 반환
export function getStepTitle(
  currentTab: TabType, 
  perceptionState: TableType, 
  comprehensionState: TableType, 
  projectionState: ProjectionStateType
): string {
  if (currentTab === "perception" && perceptionState === "section") {
    return "1.1단계: UI 섹션 식별";
  }
  if (currentTab === "perception" && perceptionState === "component") {
    return "1.2단계: UI 컴포넌트 식별";
  }
  if (currentTab === "comprehension" && comprehensionState === "component") {
    return "2.1단계: UI 컴포넌트 분석";
  }
  if (currentTab === "comprehension" && comprehensionState === "section") {
    return "2.2단계: UI 섹션 분석";
  }
  if (currentTab === "projection" && projectionState === "heuristic") {
    return "3.1단계: 디자인 가이드라인 설정";
  }
  if (currentTab === "projection" && projectionState === "results") {
    return "3.2단계: 디자인 이슈 도출";
  }
  return "최종 단계: 크리틱 리뷰";
}

// 현재 단계에 따른 설명 반환
export function getStepDescription(
  currentTab: TabType, 
  perceptionState: TableType, 
  comprehensionState: TableType, 
  projectionState: ProjectionStateType
): string {
  if (currentTab === "perception" && perceptionState === "section") {
    return "Criticmate가 식별한 UI 섹션 목록입니다. 필요에 따라 추가, 삭제, 수정해 주세요.";
  }
  if (currentTab === "perception" && perceptionState === "component") {
    return "Criticmate가 식별한 UI 컴포넌트 목록입니다. 필요에 따라 추가, 삭제, 수정해 주세요.";
  }
  if (currentTab === "comprehension" && comprehensionState === "component") {
    return "Criticmate가 분석한 UI 컴포넌트의 시각적/기능적 특성입니다. 필요에 따라 수정해 주세요.";
  }
  if (currentTab === "comprehension" && comprehensionState === "section") {
    return "Criticmate가 식별한 UI 섹션 목록입니다. 필요에 따라 수정해 주세요.";
  }
  if (currentTab === "projection" && projectionState === "heuristic") {
    return "크리틱에 사용할 가이드라인을 정의합니다. 기본 가이드라인은 Nielsen의 10가지 사용성 휴리스틱을 기반으로 구성되어 있고, 필요에 따라 추가 요구사항이나 수정사항을 아래 채팅창에 작성해주시면 됩니다.";
  }
  if (currentTab === "projection" && projectionState === "results") {
    return "디자인 가이드라인을 기반으로 평가한 결과입니다. 섹션/컴포넌트별로 권장 기준과 발견된 문제점을 도출했습니다. 필요에 따라 수정해주세요.";
  }
  return "Criticmate와 함께 도출한 디자인 크리틱입니다. 평가 내용을 확인하고, 수정이 필요한 부분이 있다면 반영해주세요.";
}
