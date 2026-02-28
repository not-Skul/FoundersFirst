import { RoadmapPhase, RoadmapStep, RoadmapStatus } from "@/types";

/**
 * Get readable status label
 */
export const getStatusLabel = (status: RoadmapStatus): string => {
  const statusMap: Record<RoadmapStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    paused: "Paused",
  };
  return statusMap[status];
};

/**
 * Get status badge color for Tailwind
 */
export const getStatusColor = (
  status: RoadmapStatus
): {
  bg: string;
  text: string;
  border: string;
} => {
  const colorMap: Record<
    RoadmapStatus,
    { bg: string; text: string; border: string }
  > = {
    not_started: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
    in_progress: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    completed: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    paused: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
    },
  };
  return colorMap[status];
};

/**
 * Get progress percentage for a phase
 */
export const getPhaseProgress = (phase: RoadmapPhase): number => {
  if (!phase.steps || phase.steps.length === 0) return 0;

  const completedSteps = phase.steps.filter(
    (step) => step.status === "completed"
  ).length;

  return Math.round((completedSteps / phase.steps.length) * 100);
};

/**
 * Get progress percentage for entire roadmap
 */
export const getRoadmapProgress = (phases: RoadmapPhase[]): number => {
  const allSteps = phases.flatMap((p) => p.steps || []);
  if (allSteps.length === 0) return 0;

  const completedSteps = allSteps.filter(
    (step) => step.status === "completed"
  ).length;

  return Math.round((completedSteps / allSteps.length) * 100);
};

/**
 * Get user's current phase based on progress
 */
export const getCurrentPhase = (phases: RoadmapPhase[]): RoadmapPhase | null => {
  // Find the first phase that's not completed
  const currentPhase = phases.find((p) => p.status !== "completed");
  return currentPhase || phases[phases.length - 1] || null;
};

/**
 * Calculate estimated timeline from phases
 */
export const calculateTotalDuration = (phases: RoadmapPhase[]): string => {
  const durations = phases
    .map((p) => parseDuration(p.estimatedDuration || ""))
    .filter((d) => d !== null) as number[];

  if (durations.length === 0) return "Timeline varies";

  const totalWeeks = durations.reduce((a, b) => a + b, 0);
  const months = Math.ceil(totalWeeks / 4);

  if (months < 1) return "Few weeks";
  if (months === 1) return "~1 month";
  if (months < 12) return `${months} months`;

  return `${Math.ceil(months / 12)} year${Math.ceil(months / 12) > 1 ? "s" : ""}`;
};

/**
 * Parse duration string to weeks
 * Supports formats like "2-4 weeks", "1 month", "3 months"
 */
export const parseDuration = (duration: string): number | null => {
  if (!duration) return null;

  const weekMatch = duration.match(/(\d+)/);
  if (duration.toLowerCase().includes("week")) {
    return weekMatch ? parseInt(weekMatch[1]) : 2;
  }

  if (duration.toLowerCase().includes("month")) {
    const months = weekMatch ? parseInt(weekMatch[1]) : 1;
    return months * 4;
  }

  return null;
};

/**
 * Get next recommended step
 */
export const getNextStep = (phases: RoadmapPhase[]): RoadmapStep | null => {
  for (const phase of phases) {
    if (!phase.steps) continue;

    for (const step of phase.steps) {
      if (step.status === "not_started") {
        return step;
      }
    }
  }
  return null;
};

/**
 * Get steps by priority level
 */
export const getStepsByPriority = (
  phase: RoadmapPhase,
  priority?: "low" | "medium" | "high"
): RoadmapStep[] => {
  if (!phase.steps) return [];

  if (!priority) return phase.steps;

  return phase.steps.filter((step) => step.priority === priority);
};

/**
 * Get related schemes for multiple steps
 */
export const getRelatedSchemes = (steps: RoadmapStep[]) => {
  const schemeMap = new Map();

  steps.forEach((step) => {
    step.relatedSchemes?.forEach((scheme) => {
      const existing = schemeMap.get(scheme.id);
      schemeMap.set(scheme.id, {
        ...scheme,
        occurrences: (existing?.occurrences || 0) + 1,
      });
    });
  });

  return Array.from(schemeMap.values()).sort(
    (a, b) => b.occurrences - a.occurrences
  );
};

/**
 * Check if roadmap is complete
 */
export const isRoadmapComplete = (phases: RoadmapPhase[]): boolean => {
  return phases.every((phase) => phase.status === "completed");
};

/**
 * Get phase duration estimate
 */
export const getPhaseDuration = (phase: RoadmapPhase): string => {
  if (!phase.steps || phase.steps.length === 0) return "Unknown";

  const durations = (phase.steps || [])
    .map((step) => parseDuration(step.estimatedDuration || ""))
    .filter((d) => d !== null) as number[];

  if (durations.length === 0) return "Timeline varies";

  const totalWeeks = durations.reduce((a, b) => a + b, 0);
  const minWeeks = Math.ceil(totalWeeks * 0.75);
  const maxWeeks = totalWeeks;

  return `${minWeeks}-${maxWeeks} weeks`;
};

/**
 * Generate milestone summary
 */
export const getMilestoneSummary = (phases: RoadmapPhase[]): string => {
  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const totalPhases = phases.length;

  return `Completed ${completedPhases} of ${totalPhases} phases`;
};

/**
 * Get recommended actions based on current state
 */
export const getRecommendedActions = (
  phases: RoadmapPhase[]
): { action: string; phase: number; priority: "high" | "medium" | "low" }[] => {
  const actions = [];

  const currentPhase = getCurrentPhase(phases);
  if (!currentPhase) return [];

  // Get next steps in current phase
  const nextSteps =
    currentPhase.steps?.filter((s) => s.status === "not_started") || [];

  nextSteps.slice(0, 3).forEach((step, index) => {
    actions.push({
      action: step.title,
      phase: currentPhase.phase,
      priority: index === 0 ? "high" : index === 1 ? "medium" : "low",
    });
  });

  return actions;
};
