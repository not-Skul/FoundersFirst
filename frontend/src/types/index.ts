/**
 * Core type definitions for Founders First platform
 * Includes Roadmap, Schemes, and Comparison features
 */

/**
 * Roadmap Phase Type
 * Represents a major phase in the entrepreneurial journey
 */
export interface RoadmapPhase {
  phase: number;
  title: string;
  description: string;
  estimatedDuration?: string; // e.g., "2-4 weeks"
  status: RoadmapStatus;
  steps?: RoadmapStep[];
}

/**
 * Individual step or task within a phase
 */
export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  estimatedDuration?: string;
  status: RoadmapStatus;
  priority?: "low" | "medium" | "high";
  relatedSchemes?: SchemeReference[];
  resources?: StepResource[];
  isCompleted?: boolean;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight reference to a scheme from roadmap
 */
export interface SchemeReference {
  id: string;
  name: string;
  relevance?: "high" | "medium" | "low";
  reason?: string;
}

/**
 * Resource or link associated with a step
 */
export interface StepResource {
  id: string;
  title: string;
  type: "link" | "guide" | "tool" | "template";
  url?: string;
  description?: string;
}

/**
 * Complete Government Scheme data structure
 * Matches backend JSON schema
 */
export interface Scheme {
  id?: string;
  scheme_name: string;
  ministry: string;
  department?: string;
  key_sectors?: string;
  brief: string;
  eligibility: string | string[];
  benefits: string | string[];
  benefit_tags?: string;
  tenure?: string;
  application_link?: string;
  // Computed properties
  targetAudience?: string[];
  applicationComplexity?: "low" | "medium" | "high";
  estimatedProcessingTime?: string;
}

/**
 * Scheme with UI metadata
 */
export interface SchemeWithMetadata extends Scheme {
  isSelected?: boolean;
  isSaved?: boolean;
  tags?: string[];
  relevanceScore?: number;
}

/**
 * State of a roadmap phase or step
 */
export type RoadmapStatus = "not_started" | "in_progress" | "completed" | "paused";

/**
 * Scheme comparison context
 * Stores state for comparing up to 2 schemes
 */
export interface SchemeComparisonState {
  selectedSchemes: Scheme[];
  isOpen: boolean;
  comparisonMode?: "split" | "table";
}

/**
 * Attribute comparison between schemes
 */
export interface SchemeComparisonAttribute {
  key: string;
  label: string;
  category: "basic" | "benefits" | "eligibility" | "process";
  scheme1Value?: string | string[];
  scheme2Value?: string | string[];
  isSame?: boolean;
  highlight?: boolean;
}

/**
 * Saved comparison snapshot
 */
export interface SavedComparison {
  id: string;
  createdAt: Date;
  schemes: [Scheme, Scheme];
  notes?: string;
}

/**
 * User's roadmap session
 */
export interface RoadmapSession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  roadmapPhases: RoadmapPhase[];
  completedSteps: string[]; // array of step IDs
  savedResources: StepResource[];
  relatedSchemes: Scheme[];
}

/**
 * Bookmark for later reference
 */
export interface BookmarkedItem {
  id: string;
  itemType: "step" | "scheme" | "resource";
  itemId: string;
  itemData: RoadmapStep | Scheme | StepResource;
  savedAt: Date;
  notes?: string;
}

/**
 * UI state for roadmap display
 */
export interface RoadmapUIState {
  expandedPhases: Set<number>;
  selectedStepId?: string;
  scrollToPhase?: number;
  showCompletionAnimation: boolean;
}

/**
 * Props for roadmap components
 */
export interface RoadmapProps {
  phases: RoadmapPhase[];
  isLoading?: boolean;
  onStepComplete?: (stepId: string) => void;
  onStepSelect?: (stepId: string) => void;
  onSchemeSelect?: (scheme: Scheme) => void;
  userPhase?: number; // highlight current phase
}

/**
 * Props for scheme components
 */
export interface SchemeCardProps {
  scheme: SchemeWithMetadata;
  isSelected?: boolean;
  onSelect?: (scheme: Scheme) => void;
  onCompare?: (scheme: Scheme) => void;
  showComparisonCheckbox?: boolean;
  variant?: "grid" | "list" | "compact";
}

/**
 * Comparison panel props
 */
export interface SchemeComparisonProps {
  schemes: [Scheme, Scheme];
  onClose?: () => void;
  onSwap?: () => void;
  onSave?: () => void;
  mode?: "split" | "table";
}
