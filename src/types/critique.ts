// Define types for table and tab states
export type TableType = "section" | "component";
export type TabType = "perception" | "comprehension" | "projection" | "review" | "인식" | "이해" | "평가" | "최종 리뷰";
export type ProjectionStateType = "heuristic" | "results";

// Base interfaces for common properties
export interface BaseRow {
  position: string;
  sizeShape: string;
}

// 1. Perception Phase Interfaces
export interface PerceptionSectionRow {
  id: string;
  section: string;
  position: string;
  sizeShape: string;
}

export interface PerceptionComponentDetails extends BaseRow {
  name: string;
  subComponents: string;
}

export interface PerceptionComponentRow extends PerceptionComponentDetails {
  id: string;
}

export interface PerceptionSectionGroup {
  section: {
    name: string;
    position: string;
    sizeShape: string;
  };
  components: PerceptionComponentRow[];
}

// 2. Comprehension Phase Interfaces
export interface ComprehensionDetails extends BaseRow {
  name: string;
  visualCharacteristics: string;
  functionalCharacteristics: string;
}

export type ComprehensionSectionDetails = ComprehensionDetails;

export interface ComprehensionComponentDetails extends ComprehensionDetails {
  subComponents: string;
}

export interface ComprehensionSectionGroup {
  section: ComprehensionSectionDetails;
  components?: ComprehensionComponentDetails[];
}

// 3-1. Projection Phase Interfaces
export interface ProjectionHeuristicRow {
  id: string;
  heuristic: string;
  description: string;
}

// 3-2. Projection Result Interfaces
export interface ProjectionSection {
  id: string;
  name: string;
  expectedStandard: string;
  identifiedGap: string;
  functionalCharacteristics: string;
  visualCharacteristics: string;
  position?: string;
  sizeShape?: string;
  components: ProjectionComponent[];
}

export interface ProjectionComponent {
  id: string;
  name: string;
  expectedStandard: string;
  identifiedGap: string;
  functionalCharacteristics: string;
  visualCharacteristics: string;
  position?: string;
  sizeShape?: string;
}

export interface ProjectionResultRow {
  id: string;
  section: string;
  component: string;
  evaluation: string;
  reason: string;
}

// 4. Final Review Interfaces
export interface FinalReviewItem {
  id: string;
  title: string; // Category Name
  description: string; // Root Cause
  component: string;
  expectedStandard: string;
  identifiedGap: string;
  proposeFix: string;
}

// Baseline Solution Interfaces
export interface BaselineSolutionItem {
  component: string;
  finalSolution: {
    expectedStandard: string;
    identifiedGap: string;
    proposedFix: string;
  };
}

export interface BaselineSolutionResponse {
  solutions: string; // formatted string for display
  change_log: string | null;
}

// Progress Bar Component
export interface ProgressStep {
  name: string;
  state: string;
  isActive: boolean;
  progress: number;
}