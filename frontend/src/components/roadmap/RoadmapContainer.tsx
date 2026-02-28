import React, { useState, useCallback } from "react";
import { RoadmapPhase as RoadmapPhaseType, RoadmapProps } from "@/types";
import { motion } from "framer-motion";
import { RoadmapPhase } from "./RoadmapPhase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  getCurrentPhase,
  getRoadmapProgress,
  getRecommendedActions,
  calculateTotalDuration,
} from "@/lib/roadmap-utils";
import { ArrowRight, Zap, Calendar, Trophy, AlertCircle } from "lucide-react";

/**
 * Main Roadmap Container
 * Features:
 * - Overall progress tracking
 * - Current phase highlighting
 * - Next steps recommendations
 * - Timeline summary
 * - Expandable phases
 * - Loading states
 */
export const RoadmapContainer: React.FC<RoadmapProps> = ({
  phases,
  isLoading = false,
  onStepComplete,
  onStepSelect,
  onSchemeSelect,
  userPhase,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const progress = getRoadmapProgress(phases);
  const currentPhase = getCurrentPhase(phases);
  const recommendedActions = getRecommendedActions(phases);
  const totalDuration = calculateTotalDuration(phases);

  const handleTogglePhase = useCallback(
    (phaseNumber: number) => {
      setExpandedPhases((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(phaseNumber)) {
          newSet.delete(phaseNumber);
        } else {
          newSet.add(phaseNumber);
        }
        return newSet;
      });
    },
    []
  );

  const handleToggleStep = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-48 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  // Empty State
  if (!phases || phases.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <AlertCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No Roadmap Yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Generate your personalized roadmap by filling out the startup profile.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Overall Progress Card */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Overall Progress
              </p>
              <p className="text-3xl font-bold text-primary mt-1">{progress}%</p>
            </div>
            <Trophy className="w-6 h-6 text-primary/60" />
          </div>
          <Progress value={progress} className="h-1.5" />
        </Card>

        {/* Current Phase */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-5 border-blue-200">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Current Phase
          </p>
          <p className="text-lg font-bold text-blue-700">
            {currentPhase?.title || "—"}
          </p>
          {currentPhase && (
            <p className="text-xs text-blue-600 mt-2">
              Phase {currentPhase.phase} of {phases.length}
            </p>
          )}
        </Card>

        {/* Timeline */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-5 border-amber-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estimated Timeline
              </p>
              <p className="text-lg font-bold text-amber-700 mt-1">
                {totalDuration}
              </p>
            </div>
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
        </Card>

        {/* Phases Completed */}
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-5 border-green-200">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Completed Phases
          </p>
          <p className="text-3xl font-bold text-green-700">
            {phases.filter((p) => p.status === "completed").length}/{phases.length}
          </p>
        </Card>
      </motion.div>

      {/* Recommended Next Steps */}
      {recommendedActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/5 to-primary/0 border border-primary/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-3">
                Recommended Next Steps
              </h3>
              <div className="space-y-2">
                {recommendedActions.slice(0, 3).map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        action.priority === "high"
                          ? "bg-red-500"
                          : action.priority === "medium"
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                    />
                    <span className="text-foreground">{action.action}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Phases */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Your Journey</h2>
        {phases.map((phase, index) => (
          <RoadmapPhase
            key={phase.phase}
            phase={phase}
            isExpanded={expandedPhases.has(phase.phase)}
            isCurrentPhase={
              userPhase ? userPhase === phase.phase : phase.phase === currentPhase?.phase
            }
            onToggleExpand={() => handleTogglePhase(phase.phase)}
            onStepComplete={onStepComplete}
            onStepSchemeSelect={(schemeId, phaseNum) =>
              onSchemeSelect?.({ scheme_name: schemeId } as any)
            }
            expandedSteps={expandedSteps}
            onToggleStep={handleToggleStep}
          />
        ))}
      </div>

      {/* CTA Section for Completion */}
      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center"
        >
          <Trophy className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-900 mb-2">
            Roadmap Complete! 🎉
          </h3>
          <p className="text-green-800 mb-6">
            You've completed all phases. Time to take your startup to the next level!
          </p>
          <Button size="lg" variant="default" className="rounded-lg">
            Explore Related Schemes
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default RoadmapContainer;
