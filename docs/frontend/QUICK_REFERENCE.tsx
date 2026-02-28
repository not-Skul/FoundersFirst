/**
 * QUICK REFERENCE GUIDE
 * Copy-paste snippets for common operations
 */

// ============================================================================
// 1. USE SCHEME COMPARISON IN ANY COMPONENT
// ============================================================================

import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";

function MyComponent() {
  const {
    selectedSchemes,           // Array of selected schemes
    isComparisonOpen,          // Is comparison modal open?
    addSchemeToComparison,     // Add scheme to comparison
    removeSchemeFromComparison,// Remove scheme from comparison
    swapSchemes,              // Swap scheme order
    clearComparison,          // Clear all selections
    saveComparison,           // Save comparison
  } = useSchemeComparison();

  return (
    <div>
      {/* Display selected schemes count */}
      <p>{selectedSchemes.length} schemes selected</p>
      
      {/* Add scheme button */}
      <button onClick={() => addSchemeToComparison(scheme)}>
        Compare
      </button>

      {/* Show comparison when 2 selected */}
      {selectedSchemes.length === 2 && (
        <button onClick={saveComparison}>Save Comparison</button>
      )}
    </div>
  );
}

// ============================================================================
// 2. DISPLAY ROADMAP WITH FULL FEATURES
// ============================================================================

import { RoadmapContainer } from "@/components/roadmap/RoadmapContainer";
import { RoadmapPhase } from "@/types";

function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);

  const handleStepComplete = (stepId: string) => {
    // Update local state
    setRoadmap(prev => 
      prev.map(phase => ({
        ...phase,
        steps: phase.steps?.map(step =>
          step.id === stepId ? { ...step, status: "completed" } : step
        ),
      }))
    );

    // Persist to backend
    api.post(`/steps/${stepId}/complete`);
  };

  return (
    <RoadmapContainer
      phases={roadmap}
      isLoading={false}
      onStepComplete={handleStepComplete}
      userPhase={1}
    />
  );
}

// ============================================================================
// 3. DISPLAY SCHEME WITH COMPARISON CHECKBOX
// ============================================================================

import { SchemeCard } from "@/components/scheme/SchemeCard";
import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
import { enrichSchemeWithMetadata } from "@/lib/scheme-utils";

function SchemesList() {
  const { selectedSchemes, addSchemeToComparison } = useSchemeComparison();
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {schemes.map(scheme => (
        <SchemeCard
          key={scheme.scheme_name}
          scheme={enrichSchemeWithMetadata(scheme)}
          isSelected={selectedSchemes.some(
            s => s.scheme_name === scheme.scheme_name
          )}
          onCompare={addSchemeToComparison}
          showComparisonCheckbox={true}
          variant="grid"
        />
      ))}
    </div>
  );
}

// ============================================================================
// 4. CONVERT OLD ROADMAP FORMAT TO NEW
// ============================================================================

import { RoadmapPhase as NewRoadmapPhase, RoadmapStatus } from "@/types";

interface OldRoadmapPhase {
  phase: number;
  title: string;
  description: string;
  tasks: string[];
}

function convertRoadmap(oldPhases: OldRoadmapPhase[]): NewRoadmapPhase[] {
  return oldPhases.map((phase, index) => ({
    phase: phase.phase,
    title: phase.title,
    description: phase.description,
    status: index === 0 ? "in_progress" : "not_started" as RoadmapStatus,
    estimatedDuration: "2-4 weeks",
    steps: phase.tasks.map((task, taskIndex) => ({
      id: `step_${phase.phase}_${taskIndex}`,
      title: task,
      description: "Step description",
      status: "not_started" as RoadmapStatus,
      priority: taskIndex === 0 ? "high" : "medium",
      relatedSchemes: [],
      resources: [],
      isCompleted: false,
    })),
  }));
}

// Usage:
const newRoadmap = convertRoadmap(apiResponse.roadmap);

// ============================================================================
// 5. COMPARE TWO SCHEMES PROGRAMMATICALLY
// ============================================================================

import { compareSchemes, getSchemeAttributes } from "@/lib/scheme-utils";

function CompareSchemes(scheme1: Scheme, scheme2: Scheme) {
  // Get comparison data with highlighted differences
  const comparison = compareSchemes(scheme1, scheme2);

  // Check if schemes are the same
  const areSame = comparison.every(attr => attr.isSame);

  // Get only different attributes
  const differences = comparison.filter(attr => attr.highlight);

  return {
    comparison,
    areSame,
    differences,
    highlightedCount: differences.length,
  };
}

// ============================================================================
// 6. GET SMART SCHEME RECOMMENDATIONS
// ============================================================================

import {
  filterSchemesByProfile,
  calculateRelevanceScore,
  enrichSchemeWithMetadata,
} from "@/lib/scheme-utils";

function getRecommendedSchemes(
  allSchemes: Scheme[],
  userProfile: {
    sector?: string;
    location?: string;
    targetAudience?: string;
  }
): SchemeWithMetadata[] {
  return filterSchemesByProfile(allSchemes, userProfile);
}

// Usage:
const recommended = getRecommendedSchemes(schemes, {
  sector: "Technology",
  location: "Maharashtra",
  targetAudience: "Student",
});

// ============================================================================
// 7. SAVE ROADMAP PROGRESS
// ============================================================================

function persistRoadmapProgress(
  completedSteps: string[],
  currentPhaseIndex: number
) {
  // Local storage
  localStorage.setItem(
    "roadmapProgress",
    JSON.stringify({
      completedSteps,
      currentPhaseIndex,
      lastSaved: new Date().toISOString(),
    })
  );

  // Backend
  api.post("/roadmap/progress", {
    completedSteps,
    currentPhaseIndex,
  });
}

// Load from storage
function loadRoadmapProgress() {
  const saved = localStorage.getItem("roadmapProgress");
  return saved ? JSON.parse(saved) : null;
}

// ============================================================================
// 8. GET ROADMAP PROGRESS METRICS
// ============================================================================

import {
  getPhaseProgress,
  getRoadmapProgress,
  getCurrentPhase,
  getRecommendedActions,
  getRelatedSchemes,
} from "@/lib/roadmap-utils";

function getRoadmapMetrics(phases: RoadmapPhase[]) {
  return {
    phaseProgressPercent: getPhaseProgress(phases[0]),
    overallProgressPercent: getRoadmapProgress(phases),
    currentPhase: getCurrentPhase(phases),
    nextActions: getRecommendedActions(phases),
    allRelatedSchemes: getRelatedSchemes(phases[0].steps || []),
  };
}

// ============================================================================
// 9. HANDLE COMPARISON PANEL OPEN/CLOSE
// ============================================================================

import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";

function ComparisonUI() {
  const {
    selectedSchemes,
    isComparisonOpen,
    closeComparison,
    swapSchemes,
    removeSchemeFromComparison,
    saveComparison,
  } = useSchemeComparison();

  return (
    <>
      <SchemeComparisonPanel
        scheme1={selectedSchemes[0]}
        scheme2={selectedSchemes[1]}
        isOpen={isComparisonOpen}
        onClose={closeComparison}
        onSwap={swapSchemes}
        onRemoveScheme={removeSchemeFromComparison}
        onSave={() => saveComparison(selectedSchemes as [Scheme, Scheme])}
      />

      {/* Floating button to open comparison */}
      {selectedSchemes.length === 2 && !isComparisonOpen && (
        <button onClick={() => {
          // Context auto-opens, but you can trigger manually
          document.querySelector('[data-comparison]')?.click();
        }}>
          Open Comparison
        </button>
      )}
    </>
  );
}

// ============================================================================
// 10. FILTER SCHEMES BY CATEGORY
// ============================================================================

import { Scheme, SchemeWithMetadata } from "@/types";

function filterSchemesByCategory(
  schemes: Scheme[],
  category: string
): SchemeWithMetadata[] {
  return schemes
    .filter(scheme => {
      if (category === "all") return true;
      return scheme.benefit_tags?.toLowerCase().includes(category.toLowerCase());
    })
    .map(scheme => enrichSchemeWithMetadata(scheme));
}

// Usage:
const fundingSchemes = filterSchemesByCategory(schemes, "Funding");
const infrastructureSchemes = filterSchemesByCategory(schemes, "Infrastructure");

// ============================================================================
// 11. EXTRACT TAGS FROM SCHEME
// ============================================================================

import { extractTags, formatBenefitTag } from "@/lib/scheme-utils";

function SchemeTagCloud(scheme: Scheme) {
  const tags = extractTags(scheme);
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => {
        const tagInfo = formatBenefitTag(tag);
        return (
          <span key={tag} className={`px-2 py-1 rounded text-xs ${tagInfo.color}`}>
            {tagInfo.label}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================================
// 12. GET STATUS INDICATOR STYLING
// ============================================================================

import { getStatusColor, getStatusLabel } from "@/lib/roadmap-utils";

function StatusBadge(status: RoadmapStatus) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  
  return (
    <div className={`px-3 py-1 rounded-full ${color.bg} ${color.text}`}>
      {label}
    </div>
  );
}

// ============================================================================
// 13. CALCULATE RELEVANCE SCORE DYNAMICALLY
// ============================================================================

import { calculateRelevanceScore } from "@/lib/scheme-utils";

function SchemeRelevance(scheme: Scheme) {
  const userProfile = {
    sector: "Technology",
    location: "Maharashtra",
    targetAudience: "Student",
  };

  const score = calculateRelevanceScore(scheme, userProfile);

  return (
    <div className="text-sm">
      <span className={`font-bold ${
        score >= 70 ? 'text-green-600' :
        score >= 50 ? 'text-yellow-600' :
        'text-red-600'
      }`}>
        {score}% Match
      </span>
    </div>
  );
}

// ============================================================================
// 14. EXPORT COMPARISON AS CSV
// ============================================================================

function exportComparisonToCSV(
  scheme1: Scheme,
  scheme2: Scheme,
  fileName: string = "comparison"
) {
  const { compareSchemes } = require("@/lib/scheme-utils");
  const comparison = compareSchemes(scheme1, scheme2);

  const headers = ["Attribute", scheme1.scheme_name, scheme2.scheme_name];
  const rows = comparison.map(attr => [
    attr.label,
    Array.isArray(attr.scheme1Value)
      ? attr.scheme1Value.join("; ")
      : attr.scheme1Value || "",
    Array.isArray(attr.scheme2Value)
      ? attr.scheme2Value.join("; ")
      : attr.scheme2Value || "",
  ]);

  const csv = [
    headers,
    ...rows,
  ]
    .map(row => row.map(cell => `"${cell}"`).join(","))
    .join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern 1: Get current phase status
const currentPhase = phases.find(p => p.status === "in_progress");

// Pattern 2: Get completed percentage
const completed = phases.reduce((count, p) => 
  count + (p.status === "completed" ? 1 : 0), 0
);
const percentage = (completed / phases.length) * 100;

// Pattern 3: Filter schemes by eligibility
const eligibleSchemes = schemes.filter(s => 
  s.eligibility?.includes("Students")
);

// Pattern 4: Get next unfinished task
const nextTask = phases
  .flatMap(p => p.steps || [])
  .find(step => step.status !== "completed");

// Pattern 5: Group schemes by benefit type
const groupedByBenefit = schemes.reduce((groups, scheme) => {
  const tag = scheme.benefit_tags || "Other";
  if (!groups[tag]) groups[tag] = [];
  groups[tag].push(scheme);
  return groups;
}, {} as Record<string, Scheme[]>);

// ============================================================================
// END OF QUICK REFERENCE
// ============================================================================
