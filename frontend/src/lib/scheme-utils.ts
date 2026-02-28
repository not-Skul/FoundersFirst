import { Scheme, SchemeComparisonAttribute, SchemeWithMetadata } from "@/types";

/**
 * Extract key attributes from a scheme for comparison
 */
export const getSchemeAttributes = (scheme: Scheme): SchemeComparisonAttribute[] => {
  const attributes: SchemeComparisonAttribute[] = [];

  // Basic Info
  attributes.push({
    key: "scheme_name",
    label: "Scheme Name",
    category: "basic",
    scheme1Value: scheme.scheme_name,
  });

  attributes.push({
    key: "ministry",
    label: "Ministry/Department",
    category: "basic",
    scheme1Value: scheme.ministry,
  });

  if (scheme.department) {
    attributes.push({
      key: "department",
      label: "Department",
      category: "basic",
      scheme1Value: scheme.department,
    });
  }

  attributes.push({
    key: "key_sectors",
    label: "Key Sectors",
    category: "basic",
    scheme1Value: scheme.key_sectors,
  });

  attributes.push({
    key: "tenure",
    label: "Tenure/Duration",
    category: "basic",
    scheme1Value: scheme.tenure,
  });

  // Eligibility
  if (scheme.eligibility) {
    attributes.push({
      key: "eligibility",
      label: "Eligibility Criteria",
      category: "eligibility",
      scheme1Value: Array.isArray(scheme.eligibility)
        ? scheme.eligibility.join(", ")
        : scheme.eligibility,
    });
  }

  // Benefits
  if (scheme.benefits) {
    attributes.push({
      key: "benefits",
      label: "Key Benefits",
      category: "benefits",
      scheme1Value: Array.isArray(scheme.benefits)
        ? scheme.benefits.join(", ")
        : scheme.benefits,
    });
  }

  attributes.push({
    key: "benefit_tags",
    label: "Benefit Type",
    category: "benefits",
    scheme1Value: scheme.benefit_tags,
  });

  // Process
  attributes.push({
    key: "application_complexity",
    label: "Complexity",
    category: "process",
    scheme1Value: getApplicationComplexity(scheme),
  });

  if (scheme.application_link) {
    attributes.push({
      key: "application_link",
      label: "Apply Here",
      category: "process",
      scheme1Value: scheme.application_link,
    });
  }

  return attributes;
};

/**
 * Compare two schemes and return highlighted differences
 */
export const compareSchemes = (
  scheme1: Scheme,
  scheme2: Scheme
): SchemeComparisonAttribute[] => {
  const attributes1 = getSchemeAttributes(scheme1);

  const compared: SchemeComparisonAttribute[] = attributes1.map((attr) => {
    const scheme2Attr = getSchemeAttributes(scheme2).find(
      (a) => a.key === attr.key
    );

    if (!scheme2Attr) {
      return {
        ...attr,
        scheme2Value: undefined,
        isSame: false,
        highlight: true,
      };
    }

    const isSame =
      attr.scheme1Value === scheme2Attr.scheme1Value;

    return {
      ...attr,
      scheme2Value: scheme2Attr.scheme1Value,
      isSame,
      highlight: !isSame,
    };
  });

  // Add any attributes from scheme2 that aren't in scheme1
  const attrs2 = getSchemeAttributes(scheme2);
  attrs2.forEach((attr) => {
    if (!compared.some((a) => a.key === attr.key)) {
      compared.push({
        ...attr,
        scheme1Value: undefined,
        scheme2Value: attr.scheme1Value,
        isSame: false,
        highlight: true,
      });
    }
  });

  return compared;
};

/**
 * Derive application complexity from scheme details
 */
export const getApplicationComplexity = (
  scheme: Scheme
): "low" | "medium" | "high" => {
  const eligibilityStr = Array.isArray(scheme.eligibility)
    ? scheme.eligibility.join(" ")
    : scheme.eligibility || "";
  const benefitsStr = Array.isArray(scheme.benefits)
    ? scheme.benefits.join(" ")
    : scheme.benefits || "";

  const combinedText = `${eligibilityStr} ${benefitsStr}`.toLowerCase();

  // Simple heuristic: more requirements = higher complexity
  const complexityIndicators = [
    "extensive",
    "multiple",
    "various",
    "complex",
    "detailed",
    "comprehensive",
  ];
  const matchCount = complexityIndicators.filter((indicator) =>
    combinedText.includes(indicator)
  ).length;

  if (matchCount >= 3) return "high";
  if (matchCount >= 1) return "medium";
  return "low";
};

/**
 * Add metadata to schemes for display
 */
export const enrichSchemeWithMetadata = (
  scheme: Scheme,
  isSelected = false,
  isSaved = false
): SchemeWithMetadata => {
  return {
    ...scheme,
    isSelected,
    isSaved,
    applicationComplexity: getApplicationComplexity(scheme),
    tags: extractTags(scheme),
  };
};

/**
 * Extract relevant tags from scheme
 */
export const extractTags = (scheme: Scheme): string[] => {
  const tags: string[] = [];

  if (scheme.benefit_tags) {
    tags.push(scheme.benefit_tags);
  }

  if (scheme.key_sectors) {
    scheme.key_sectors.split("/").forEach((sector) => {
      tags.push(sector.trim());
    });
  }

  // Add complexity tag
  const complexity = getApplicationComplexity(scheme);
  tags.push(complexity === "low" ? "Easy to apply" : complexity === "high" ? "Complex process" : "Moderate");

  return [...new Set(tags)]; // Remove duplicates
};

/**
 * Calculate relevance score between scheme and user profile
 * (Can be enhanced with ML in the future)
 */
export const calculateRelevanceScore = (
  scheme: Scheme,
  userProfile: Record<string, unknown>
): number => {
  let score = 0;

  // Simple scoring based on matching keywords
  const schemeText = `${scheme.scheme_name} ${scheme.brief} ${scheme.eligibility} ${scheme.benefits}`
    .toLowerCase();

  if (userProfile.sector && schemeText.includes(String(userProfile.sector).toLowerCase())) {
    score += 30;
  }

  if (userProfile.location && schemeText.includes(String(userProfile.location).toLowerCase())) {
    score += 20;
  }

  if (userProfile.targetAudience) {
    const audience = String(userProfile.targetAudience).toLowerCase();
    if (schemeText.includes(audience)) {
      score += 25;
    }
  }

  // Base score
  score += 25;

  return Math.min(score, 100);
};

/**
 * Filter schemes based on user profile
 */
export const filterSchemesByProfile = (
  schemes: Scheme[],
  userProfile: Record<string, unknown>
): SchemeWithMetadata[] => {
  return schemes
    .map((scheme) => {
      const score = calculateRelevanceScore(scheme, userProfile);
      return {
        ...enrichSchemeWithMetadata(scheme),
        relevanceScore: score,
      };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};

/**
 * Format scheme benefit tag for display
 */
export const formatBenefitTag = (tag?: string): { label: string; color: string } => {
  const tagMap: Record<string, { label: string; color: string }> = {
    "Funding": { label: "💰 Funding", color: "bg-green-100 text-green-800" },
    "Infrastructure": { label: "🏗️ Infrastructure", color: "bg-blue-100 text-blue-800" },
    "Regulatory": { label: "📋 Regulatory", color: "bg-purple-100 text-purple-800" },
    "Credit Benefit Schemes": { label: "💳 Credit", color: "bg-yellow-100 text-yellow-800" },
    "Facilitation Benefit": { label: "🚀 Facilitation", color: "bg-indigo-100 text-indigo-800" },
    "Credit Benefit": { label: "💳 Credit", color: "bg-yellow-100 text-yellow-800" },
  };

  return tagMap[tag || ""] || { label: tag || "Support", color: "bg-gray-100 text-gray-800" };
};
