import React from "react";
import { Scheme, SchemeComparisonAttribute } from "@/types";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, CheckCircle2, XCircle, Info } from "lucide-react";
import { formatBenefitTag } from "@/lib/scheme-utils";

interface SchemeComparisonSplitProps {
  scheme1: Scheme;
  scheme2: Scheme;
  comparisonData: SchemeComparisonAttribute[];
  onRemoveScheme?: (schemeName: string) => void;
}

/**
 * Split View Comparison
 * Side-by-side comparison of two schemes
 */
export const SchemeComparisonSplit: React.FC<SchemeComparisonSplitProps> = ({
  scheme1,
  scheme2,
  comparisonData,
  onRemoveScheme,
}) => {
  const categories = [...new Set(comparisonData.map((c) => c.category))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Scheme 1 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        {/* Scheme Header */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-5 border-blue-200 relative">
          <button
            onClick={() => onRemoveScheme?.(scheme1.scheme_name)}
            className="absolute top-3 right-3 p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-blue-600" />
          </button>

          <h3 className="font-bold text-lg text-foreground mb-3">
            {scheme1.scheme_name}
          </h3>

          {scheme1.benefit_tags && (
            <div className="mb-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge className="text-xs">
                  {formatBenefitTag(scheme1.benefit_tags).label}
                </Badge>
              </motion.div>
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {scheme1.brief}
          </p>

          {scheme1.application_link && (
            <Button variant="outline" size="sm" className="w-full rounded-lg gap-2">
              <ExternalLink className="w-4 h-4" />
              Visit Official Site
            </Button>
          )}
        </Card>

        {/* Content by Category */}
        {categories.map((category, categoryIdx) => {
          const attrs = comparisonData.filter((c) => c.category === category);
          const scheme1Attrs = attrs.filter(
            (a) => (a.highlight && a.scheme1Value) || !a.highlight
          );

          if (scheme1Attrs.length === 0) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIdx * 0.1 }}
            >
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {category === "basic" && "📋 Basic Info"}
                {category === "eligibility" && "✅ Eligibility"}
                {category === "benefits" && "💰 Benefits"}
                {category === "process" && "🚀 Process"}
              </h4>

              <div className="space-y-3">
                {scheme1Attrs.map((attr) => (
                  <motion.div
                    key={attr.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-3 rounded-lg border transition-colors ${
                      attr.highlight
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-background border-border"
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {attr.label}
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      {Array.isArray(attr.scheme1Value)
                        ? attr.scheme1Value.join(", ")
                        : attr.scheme1Value || "—"}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Right Column - Scheme 2 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        {/* Scheme Header */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-5 border-purple-200 relative">
          <button
            onClick={() => onRemoveScheme?.(scheme2.scheme_name)}
            className="absolute top-3 right-3 p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-purple-600" />
          </button>

          <h3 className="font-bold text-lg text-foreground mb-3">
            {scheme2.scheme_name}
          </h3>

          {scheme2.benefit_tags && (
            <div className="mb-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Badge className="text-xs">
                  {formatBenefitTag(scheme2.benefit_tags).label}
                </Badge>
              </motion.div>
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {scheme2.brief}
          </p>

          {scheme2.application_link && (
            <Button variant="outline" size="sm" className="w-full rounded-lg gap-2">
              <ExternalLink className="w-4 h-4" />
              Visit Official Site
            </Button>
          )}
        </Card>

        {/* Content by Category */}
        {categories.map((category, categoryIdx) => {
          const attrs = comparisonData.filter((c) => c.category === category);
          const scheme2Attrs = attrs.map((a) => ({
            ...a,
            scheme1Value: a.scheme2Value,
            scheme2Value: undefined,
          }));

          if (scheme2Attrs.length === 0) return null;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIdx * 0.1 }}
            >
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {category === "basic" && "📋 Basic Info"}
                {category === "eligibility" && "✅ Eligibility"}
                {category === "benefits" && "💰 Benefits"}
                {category === "process" && "🚀 Process"}
              </h4>

              <div className="space-y-3">
                {scheme2Attrs.map((attr) => (
                  <motion.div
                    key={attr.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-3 rounded-lg border transition-colors ${
                      attr.highlight
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-background border-border"
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {attr.label}
                    </p>
                    <p className="text-sm text-foreground font-medium">
                      {Array.isArray(attr.scheme1Value)
                        ? attr.scheme1Value.join(", ")
                        : attr.scheme1Value || "—"}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Difference Summary - Desktop Only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden lg:col-span-2 lg:block"
      >
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <h4 className="font-semibold text-foreground mb-4">Key Differences</h4>
          <div className="grid grid-cols-2 gap-4">
            {comparisonData
              .filter((c) => c.highlight)
              .slice(0, 4)
              .map((attr, idx) => (
                <motion.div
                  key={attr.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border"
                >
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {attr.label}
                    </p>
                    <p className="text-sm text-foreground">
                      {attr.scheme1Value && attr.scheme2Value
                        ? `Different approaches`
                        : attr.scheme1Value
                          ? `Only in ${scheme1.scheme_name}`
                          : `Only in ${scheme2.scheme_name}`}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default SchemeComparisonSplit;
