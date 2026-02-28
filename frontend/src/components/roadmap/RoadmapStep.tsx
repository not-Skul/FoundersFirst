import React, { useState } from "react";
import { RoadmapStep as RoadmapStepType } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, BookmarkPlus, ChevronDown } from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/lib/roadmap-utils";

interface RoadmapStepProps {
  step: RoadmapStepType;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onComplete?: (stepId: string) => void;
  onSchemeSelect?: (schemeId: string) => void;
  onSaveResource?: (resourceId: string) => void;
}

/**
 * Individual step component within a roadmap phase
 * Features:
 * - Expandable details
 * - Mark as complete
 * - View related schemes
 * - Save resources
 * - Priority indicators
 * - Timeline estimates
 */
export const RoadmapStep: React.FC<RoadmapStepProps> = ({
  step,
  isExpanded = false,
  onToggleExpand,
  onComplete,
  onSchemeSelect,
  onSaveResource,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const statusColor = getStatusColor(step.status);
  const isPriority = step.priority === "high";

  const handleToggleExpand = () => {
    onToggleExpand?.();
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.(step.id);
  };

  const handleSaveResource = (resourceId: string) => {
    setIsSaved(!isSaved);
    onSaveResource?.(resourceId);
  };

  const isCompleted = step.status === "completed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`relative ml-6 pb-6 group`}
    >
      {/* Timeline Dot */}
      <div className="absolute -left-8 top-2 z-10">
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
          >
            <CheckCircle2 className="w-6 h-6 text-green-500 bg-background" />
          </motion.div>
        ) : step.status === "in_progress" ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Circle className="w-6 h-6 text-primary fill-primary/20 bg-background" />
          </motion.div>
        ) : (
          <Circle className="w-6 h-6 text-muted-foreground bg-background" />
        )}
      </div>

      {/* Step Card */}
      <motion.button
        onClick={handleToggleExpand}
        className={`w-full text-left p-4 rounded-xl border transition-all ${
          statusColor.border
        } ${statusColor.bg} hover:border-primary/50 hover:shadow-md group`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className={`font-semibold ${statusColor.text}`}>
                {step.title}
              </h4>
              {isPriority && (
                <Badge variant="destructive" className="text-xs">
                  Priority
                </Badge>
              )}
              {step.priority === "medium" && (
                <Badge variant="secondary" className="text-xs">
                  Medium
                </Badge>
              )}
            </div>

            <p className={`text-sm ${statusColor.text} opacity-75 mb-2`}>
              {step.description}
            </p>

            {/* Timeline Info */}
            {step.estimatedDuration && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Clock className="w-3 h-3" />
                {step.estimatedDuration}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Expand/Collapse Indicator */}
            {(step.relatedSchemes?.length || 0) > 0 ||
            (step.resources?.length || 0) > 0 ? (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ) : null}
          </div>
        </div>
      </motion.button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-3"
          >
            {/* Related Schemes */}
            {step.relatedSchemes && step.relatedSchemes.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h5 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                  Related Schemes
                </h5>
                <div className="space-y-2">
                  {step.relatedSchemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      className="flex items-start justify-between p-2 rounded bg-background border border-border hover:border-primary/30 group transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary">
                          {scheme.name}
                        </p>
                        {scheme.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {scheme.reason}
                          </p>
                        )}
                      </div>
                      {scheme.relevance && (
                        <Badge
                          variant={
                            scheme.relevance === "high"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs ml-2 flex-shrink-0"
                        >
                          {scheme.relevance}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {step.resources && step.resources.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                <h5 className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">
                  Resources
                </h5>
                <div className="space-y-2">
                  {step.resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-start justify-between p-2 rounded bg-background border border-border hover:border-secondary/30 group transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-secondary hover:underline group-hover:text-secondary"
                        >
                          {resource.title}
                        </a>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {resource.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        {resource.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!isCompleted && (
                <Button
                  onClick={handleComplete}
                  size="sm"
                  variant="default"
                  className="flex-1 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
              )}

              {isCompleted && (
                <Button
                  disabled
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-lg opacity-50"
                >
                  ✓ Completed
                </Button>
              )}

              {step.resources && step.resources.length > 0 && (
                <Button
                  onClick={() => handleSaveResource(step.id)}
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoadmapStep;
