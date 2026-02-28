import React, { useState } from "react";
import { RoadmapPhase as RoadmapPhaseType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Zap,
  Calendar,
  CheckCircle,
  Circle,
  Target,
} from "lucide-react";
import { getPhaseProgress, getStatusColor, getStatusLabel } from "@/lib/roadmap-utils";
import { RoadmapStep } from "./RoadmapStep";

interface RoadmapPhaseProps {
  phase: RoadmapPhaseType;
  isExpanded?: boolean;
  isCurrentPhase?: boolean;
  onToggleExpand?: () => void;
  onStepComplete?: (stepId: string) => void;
  onStepSchemeSelect?: (schemeId: string, phaseNumber: number) => void;
  onSaveResource?: (resourceId: string) => void;
  expandedSteps?: Set<string>;
  onToggleStep?: (stepId: string) => void;
}

/**
 * Roadmap Phase Component
 * Displays a collapsible phase with all steps
 * Features:
 * - Progress indicator
 * - Expandable steps
 * - Current phase highlighting
 * - Status badges
 * - Status animations
 */
export const RoadmapPhase: React.FC<RoadmapPhaseProps> = ({
  phase,
  isExpanded = false,
  isCurrentPhase = false,
  onToggleExpand,
  onStepComplete,
  onStepSchemeSelect,
  onSaveResource,
  expandedSteps = new Set(),
  onToggleStep,
}) => {
  const progress = getPhaseProgress(phase);
  const statusColor = getStatusColor(phase.status);
  const statusLabel = getStatusLabel(phase.status);
  const isCompleted = phase.status === "completed";

  const handleTogglePhase = () => {
    onToggleExpand?.();
  };

  const handleToggleStep = (stepId: string) => {
    onToggleStep?.(stepId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 overflow-hidden transition-all ${
        isCurrentPhase
          ? "border-primary/60 bg-primary/5 shadow-lg ring-2 ring-primary/20"
          : statusColor.border +
            " " +
            statusColor.bg +
            " hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {/* Phase Header */}
      <button
        onClick={handleTogglePhase}
        className="w-full p-6 hover:bg-black/2.5 transition-colors text-left"
      >
        <div className="flex items-start gap-4">
          {/* Phase Number Indicator */}
          <div
            className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : isCurrentPhase
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key="check"
              >
                <CheckCircle className="w-7 h-7" />
              </motion.div>
            ) : (
              <span key="number">{phase.phase}</span>
            )}

            {/* Current Phase Pulse */}
            {isCurrentPhase && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary"
                animate={{ scale: [1, 1.15] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Phase Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-foreground">
                {phase.title}
              </h3>
              {isCurrentPhase && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Current
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                  ✓ Complete
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {phase.description}
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  Progress
                </span>
                <span className="font-bold text-foreground">{progress}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {phase.estimatedDuration && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{phase.estimatedDuration}</span>
              </div>
            )}

            {/* Expand Icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-border px-6 py-4 bg-background/40"
          >
            {/* Steps Summary */}
            {phase.steps && phase.steps.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Target className="w-4 h-4" />
                  <span>
                    {phase.steps.filter((s) => s.status === "completed").length} of{" "}
                    {phase.steps.length} steps completed
                  </span>
                </div>

                {/* Steps Timeline */}
                <div className="space-y-0 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[-17px] top-4 bottom-0 w-0.5 bg-gradient-to-b from-primary/60 to-primary/20 rounded-full" />

                  {/* Steps */}
                  {phase.steps.map((step) => (
                    <RoadmapStep
                      key={step.id}
                      step={step}
                      isExpanded={expandedSteps.has(step.id)}
                      onToggleExpand={() => handleToggleStep(step.id)}
                      onComplete={onStepComplete}
                      onSchemeSelect={onStepSchemeSelect}
                      onSaveResource={onSaveResource}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!phase.steps || phase.steps.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <p>No steps for this phase yet.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoadmapPhase;
