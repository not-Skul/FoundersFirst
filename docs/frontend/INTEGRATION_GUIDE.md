/**
 * INTEGRATION GUIDE: Founders First - Interactive Roadmap & Scheme Comparison
 * 
 * This guide demonstrates how to integrate the new roadmap and scheme comparison
 * features into your Founders First application.
 */

// ============================================================================
// PART 1: ROADMAP DATA MIGRATION
// ============================================================================

/**
 * Converting from old format (RoadmapPhase with tasks) to new format (RoadmapPhase with steps)
 */

import { RoadmapPhase as NewRoadmapPhase, RoadmapStep, RoadmapStatus } from "@/types";

// Old format (current)
interface OldRoadmapPhase {
  phase: number;
  title: string;
  description: string;
  tasks: string[];
}

// Adapter function to convert old format to new
export function migrateRoadmapPhases(
  oldPhases: OldRoadmapPhase[]
): NewRoadmapPhase[] {
  return oldPhases.map((phase, index) => ({
    phase: phase.phase,
    title: phase.title,
    description: phase.description,
    status: index === 0 ? "in_progress" : "not_started",
    estimatedDuration: "2-4 weeks",
    steps: phase.tasks.map((task, taskIndex) => ({
      id: `step_${phase.phase}_${taskIndex}`,
      title: task,
      description: "Step description", // Can be extracted from AI
      status: "not_started" as RoadmapStatus,
      priority: taskIndex === 0 ? "high" : "medium",
      relatedSchemes: [], // Will be populated from API
      resources: [],
      isCompleted: false,
    })),
  }));
}

// ============================================================================
// PART 2: SCHEME COMPARISON USAGE
// ============================================================================

import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";

/**
 * Example: Using scheme comparison in a component
 */
export function SchemeComparisonExample() {
  const {
    selectedSchemes,
    isComparisonOpen,
    addSchemeToComparison,
    removeSchemeFromComparison,
    swapSchemes,
    clearComparison,
  } = useSchemeComparison();

  return (
    <div>
      {/* Comparison Panel - renders when isComparisonOpen is true */}
      <SchemeComparisonPanel
        scheme1={selectedSchemes[0]}
        scheme2={selectedSchemes[1]}
        isOpen={isComparisonOpen}
        onClose={clearComparison}
        onSwap={swapSchemes}
        onRemoveScheme={(schemeName) =>
          removeSchemeFromComparison(schemeName)
        }
      />

      {/* UI for selecting schemes */}
      {/* Pass onCompare={addSchemeToComparison} to SchemeCard */}
    </div>
  );
}

// ============================================================================
// PART 3: ROADMAP CONTAINER USAGE
// ============================================================================

import { RoadmapContainer } from "@/components/roadmap/RoadmapContainer";

/**
 * Example: Using RoadmapContainer in AIBot page
 */
export function RoadmapExample() {
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [roadmapProgress, setRoadmapProgress] = useState<Map<string, boolean>>(
    new Map()
  );

  const handleStepComplete = (stepId: string) => {
    setRoadmapProgress((prev) => new Map(prev).set(stepId, true));
    // Call API to save progress
  };

  const handleSchemeSelect = (scheme: Scheme) => {
    // Navigate to scheme details or comparison
  };

  return (
    <RoadmapContainer
      phases={phases}
      isLoading={false}
      onStepComplete={handleStepComplete}
      onSchemeSelect={handleSchemeSelect}
      userPhase={1} // Current phase number
    />
  );
}

// ============================================================================
// PART 4: SCHEME CARD USAGE
// ============================================================================

import { SchemeCard } from "@/components/scheme/SchemeCard";
import { enrichSchemeWithMetadata } from "@/lib/scheme-utils";

/**
 * Example: Displaying schemes with comparison capability
 */
export function SchemeListExample() {
  const { addSchemeToComparison, selectedSchemes } = useSchemeComparison();
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {schemes.map((scheme) => (
        <SchemeCard
          key={scheme.scheme_name}
          scheme={enrichSchemeWithMetadata(
            scheme,
            selectedSchemes.some((s) => s.scheme_name === scheme.scheme_name)
          )}
          onCompare={addSchemeToComparison}
          onSelect={addSchemeToComparison}
          showComparisonCheckbox={true}
          variant="grid"
        />
      ))}
    </div>
  );
}

// ============================================================================
// PART 5: COMPLETE AIBot.tsx INTEGRATION EXAMPLE
// ============================================================================

/**
 * Pseudo code showing complete AIBot integration
 */
export function AIBotWithNewComponents() {
  // ... existing imports ...
  import { RoadmapContainer } from "@/components/roadmap/RoadmapContainer";
  import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
  import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";
  import { migrateRoadmapPhases } from "@/lib/roadmap-utils";

  const { selectedSchemes, isComparisonOpen, closeComparison } = useSchemeComparison();
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);

  // Convert old format to new when receiving from API
  const handleRoadmapReceived = (oldFormatRoadmap: OldRoadmapPhase[]) => {
    const newFormatRoadmap = migrateRoadmapPhases(oldFormatRoadmap);
    setRoadmap(newFormatRoadmap);
  };

  return (
    <div>
      {/* Comparison Panel */}
      <SchemeComparisonPanel
        scheme1={selectedSchemes[0]}
        scheme2={selectedSchemes[1]}
        isOpen={isComparisonOpen}
        onClose={closeComparison}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Chat Section */}
        <div className="lg:col-span-2">{/* existing chat UI */}</div>

        {/* Roadmap Section - NEW */}
        <div className="lg:col-span-3">
          <RoadmapContainer
            phases={roadmap}
            isLoading={false}
            onStepComplete={(stepId) => {
              // Call API to save progress
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PART 6: SCHEMES PAGE INTEGRATION EXAMPLE
// ============================================================================

/**
 * Enhanced Schemes page with comparison
 */
export function SchemesPageExample() {
  const { addSchemeToComparison, selectedSchemes, isComparisonOpen } =
    useSchemeComparison();
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  return (
    <div>
      {/* Comparison Panel */}
      <SchemeComparisonPanel
        scheme1={selectedSchemes[0]}
        scheme2={selectedSchemes[1]}
        isOpen={isComparisonOpen}
      />

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.scheme_name}
            scheme={enrichSchemeWithMetadata(scheme)}
            onCompare={addSchemeToComparison}
            showComparisonCheckbox={true}
          />
        ))}
      </div>

      {/* Selection Summary */}
      {selectedSchemes.length > 0 && (
        <div className="fixed bottom-4 right-4 p-4 bg-primary text-primary-foreground rounded-lg">
          {selectedSchemes.length} scheme(s) selected for comparison
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PART 7: STATE PERSISTENCE
// ============================================================================

/**
 * Persisting roadmap progress to localStorage
 */
export function usePersistentRoadmapProgress() {
  const [progress, setProgress] = useState<Map<string, boolean>>(
    new Map(JSON.parse(localStorage.getItem("roadmapProgress") || "[]"))
  );

  useEffect(() => {
    localStorage.setItem("roadmapProgress", JSON.stringify(Array.from(progress)));
  }, [progress]);

  return [progress, setProgress] as const;
}

// ============================================================================
// PART 8: ANIMATION PRESETS
// ============================================================================

/**
 * Common animation presets for consistency
 */
export const animationPresets = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
  },
};

// ============================================================================
// KEY FEATURES CHECKLIST
// ============================================================================

/**
 * Features implemented:
 * 
 * ✅ Interactive Roadmap:
 *    - Accordion-style phase expansion
 *    - Step-level details and actions
 *    - Progress tracking per phase
 *    - Visual timeline display
 *    - Completion animations
 * 
 * ✅ Scheme Comparison:
 *    - Multi-view comparison (split & table)
 *    - Up to 2 scheme selection
 *    - Attribute difference highlighting
 *    - Save/share comparisons
 *    - CSV export
 * 
 * ✅ UX Polish:
 *    - Framer Motion animations
 *    - Responsive design (mobile-first)
 *    - Loading states & skeletons
 *    - Empty states
 *    - Accessibility features
 * 
 * ✅ State Management:
 *    - React Context for comparison
 *    - Local state for phase expansion
 *    - Session persistence
 * 
 * ✅ Component Architecture:
 *    - Modular, reusable components
 *    - TypeScript for type safety
 *    - Utility functions for common operations
 *    - Custom hooks for state logic
 */
