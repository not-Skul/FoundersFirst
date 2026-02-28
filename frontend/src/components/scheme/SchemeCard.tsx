import React, { useState } from "react";
import { Scheme, SchemeCardProps, SchemeWithMetadata } from "@/types";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  CheckCircle2,
  BookmarkPlus,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";
import { formatBenefitTag } from "@/lib/scheme-utils";

/**
 * Enhanced Scheme Card Component
 * Display scheme with comparison checkbox and interactive features
 * Variants:
 * - grid: Default card layout
 * - list: Horizontal list layout
 * - compact: Minimal compact card
 */
export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  isSelected = false,
  onSelect,
  onCompare,
  showComparisonCheckbox = false,
  variant = "grid",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const schemeWithMeta = scheme as SchemeWithMetadata;

  const handleCompare = (e: React.evt) => {
    e.stopPropagation();
    onCompare?.(scheme as Scheme);
  };

  const tagInfo = formatBenefitTag(scheme.benefit_tags);

  // Grid Layout (default)
  if (variant === "grid") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="h-full"
      >
        <Card
          className={`relative h-full p-6 rounded-2xl border-2 transition-all cursor-pointer group overflow-hidden ${
            isSelected
              ? "border-primary bg-primary/5 shadow-lg"
              : "border-border hover:border-primary/30 hover:shadow-lg"
          }`}
        >
          {/* Background Gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 opacity-0 group-hover:opacity-5"
            animate={{ opacity: isHovered ? 0.1 : 0 }}
          />

          <div className="relative z-10 h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                  {scheme.scheme_name}
                </h3>

                {scheme.ministry && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {scheme.ministry}
                  </p>
                )}
              </div>

              {showComparisonCheckbox && (
                <motion.div
                  initial={false}
                  animate={{ scale: isSelected ? 1.1 : 1 }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      onSelect?.(scheme as Scheme);
                    }}
                    className="flex-shrink-0"
                  />
                </motion.div>
              )}
            </div>

            {/* Benefit Tag */}
            <div>
              <Badge className={`text-xs font-medium px-2 py-1 ${tagInfo.color}`}>
                {tagInfo.label}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
              {scheme.brief}
            </p>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/40">
              {scheme.key_sectors && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sector
                  </p>
                  <p className="text-sm text-foreground font-semibold mt-1">
                    {scheme.key_sectors.split("/")[0].trim()}
                  </p>
                </div>
              )}

              {scheme.tenure && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </p>
                  <p className="text-sm text-foreground font-semibold mt-1">
                    {scheme.tenure}
                  </p>
                </div>
              )}

              {schemeWithMeta.applicationComplexity && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Complexity
                  </p>
                  <p className="text-sm text-foreground font-semibold mt-1 capitalize">
                    {schemeWithMeta.applicationComplexity}
                  </p>
                </div>
              )}

              {schemeWithMeta.relevanceScore !== undefined && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Match
                  </p>
                  <p className="text-sm text-foreground font-semibold mt-1">
                    {schemeWithMeta.relevanceScore}%
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            {schemeWithMeta.tags && schemeWithMeta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {schemeWithMeta.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
                {schemeWithMeta.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{schemeWithMeta.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {scheme.application_link && (
                <a
                  href={scheme.application_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-lg gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apply
                  </Button>
                </a>
              )}

              {showComparisonCheckbox && (
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-2"
                  title="Select for comparison"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              )}

              <Button
                onClick={() => setIsBookmarked(!isBookmarked)}
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                <BookmarkPlus
                  className={`w-4 h-4 ${
                    isBookmarked ? "fill-primary text-primary" : ""
                  }`}
                />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // List Layout
  if (variant === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 4 }}
      >
        <Card
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            {showComparisonCheckbox && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect?.(scheme as Scheme)}
                className="flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1">
                {scheme.scheme_name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {scheme.brief}
              </p>
            </div>

            <Badge className={`text-xs flex-shrink-0 ${tagInfo.color}`}>
              {tagInfo.label}
            </Badge>

            {scheme.application_link && (
              <a
                href={scheme.application_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Compact Layout
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`p-4 rounded-lg border transition-all ${
        isSelected ? "border-primary bg-primary/5" : "border-border"
      }`}>
        <div className="flex items-center gap-3">
          {showComparisonCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.(scheme as Scheme)}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {scheme.scheme_name}
            </p>
          </div>
          {scheme.application_link && (
            <a href={scheme.application_link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default SchemeCard;
