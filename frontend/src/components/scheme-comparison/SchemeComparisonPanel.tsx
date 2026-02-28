import React, { useState } from "react";
import { Scheme, SchemeComparisonProps } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRightLeft,
  X,
  Download,
  Share2,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import { compareSchemes } from "@/lib/scheme-utils";
import { SchemeComparisonTable } from "./SchemeComparisonTable";
import { SchemeComparisonSplit } from "./SchemeComparisonSplit";

interface SchemeComparisonPanelProps {
  scheme1?: Scheme;
  scheme2?: Scheme;
  isOpen: boolean;
  onClose: () => void;
  onSwap?: () => void;
  onRemoveScheme?: (schemeName: string) => void;
  onSave?: () => void;
}

/**
 * Main Scheme Comparison Panel
 * Features:
 * - Split or table view
 * - Side-by-side attribute comparison
 * - Highlight differences
 * - Swap schemes
 * - Save/share comparison
 * - Responsive design
 */
export const SchemeComparisonPanel: React.FC<
  SchemeComparisonPanelProps
> = ({
  scheme1,
  scheme2,
  isOpen,
  onClose,
  onSwap,
  onRemoveScheme,
  onSave,
}) => {
  const [viewMode, setViewMode] = useState<"split" | "table">("split");
  const [isSaved, setIsSaved] = useState(false);

  if (!scheme1 || !scheme2) {
    return null;
  }

  const comparisonData = compareSchemes(scheme1, scheme2);

  const handleSave = () => {
    setIsSaved(true);
    onSave?.();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDownload = () => {
    const csv = generateComparisonCSV(scheme1, scheme2, comparisonData);
    downloadCSV(csv, `comparison_${scheme1.scheme_name}_vs_${scheme2.scheme_name}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-screen-2xl max-h-[95vh] p-0 border-0 rounded-3xl overflow-hidden bg-gradient-to-b from-background to-background/95">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-6 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-2xl font-bold mb-2">
                    Compare Government Schemes
                  </DialogTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-sm font-medium">
                      {scheme1.scheme_name}
                    </Badge>
                    <motion.div
                      animate={{ rotate: 0 }}
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                    <Badge variant="outline" className="text-sm font-medium">
                      {scheme2.scheme_name}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* View Toggle */}
                  <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === "split" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("split")}
                      className="text-xs"
                    >
                      Split
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="text-xs"
                    >
                      Table
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSwap}
                    title="Swap schemes"
                    className="rounded-lg"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <ScrollArea className="h-[calc(95vh-140px)]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6"
              >
                {viewMode === "split" ? (
                  <SchemeComparisonSplit
                    scheme1={scheme1}
                    scheme2={scheme2}
                    comparisonData={comparisonData}
                    onRemoveScheme={onRemoveScheme}
                  />
                ) : (
                  <SchemeComparisonTable
                    scheme1={scheme1}
                    scheme2={scheme2}
                    comparisonData={comparisonData}
                  />
                )}
              </motion.div>
            </ScrollArea>

            {/* Footer Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border px-6 py-4 flex items-center justify-end gap-3"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="rounded-lg gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>

              <Button
                onClick={handleSave}
                size="sm"
                className="rounded-lg gap-2"
              >
                <Bookmark className="w-4 h-4" />
                {isSaved ? "Saved!" : "Save Comparison"}
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

/**
 * Generate CSV from comparison data
 */
function generateComparisonCSV(
  scheme1: Scheme,
  scheme2: Scheme,
  comparisons: any[]
): string {
  const headers = ["Attribute", scheme1.scheme_name, scheme2.scheme_name];
  const rows = comparisons.map((comp) => [
    comp.label,
    Array.isArray(comp.scheme1Value)
      ? comp.scheme1Value.join("; ")
      : comp.scheme1Value || "",
    Array.isArray(comp.scheme2Value)
      ? comp.scheme2Value.join("; ")
      : comp.scheme2Value || "",
  ]);

  const allRows = [headers, ...rows];
  return allRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Download CSV file
 */
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default SchemeComparisonPanel;
