/**
 * ENHANCED SCHEMES.TSX - PRACTICAL INTEGRATION EXAMPLE
 * 
 * This is a reference implementation showing how to integrate:
 * - SchemeCard with comparison checkboxes
 * - SchemeComparisonPanel modal
 * - useSchemeComparison context hook
 * 
 * You can gradually apply these changes to the existing Schemes page.
 */

import React, { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Search, Filter, Users, GraduationCap, MapPin, Wallet, Building, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SchemeCard } from "@/components/scheme/SchemeCard";
import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";
import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
import { enrichSchemeWithMetadata, calculateRelevanceScore } from "@/lib/scheme-utils";
import { Scheme } from "@/types";

const categories = [
  { id: "all", label: "All Schemes", icon: Building },
  { id: "women", label: "Women", icon: Users },
  { id: "student", label: "Students", icon: GraduationCap },
  { id: "geography", label: "State-wise", icon: MapPin },
  { id: "funding", label: "Funding", icon: Wallet },
];

// Your mock schemes data (replace with API call)
const mockSchemes: Scheme[] = [
  {
    scheme_name: "Startup India Seed Fund",
    ministry: "Ministry of Commerce & Industry",
    key_sectors: "All Sectors",
    brief: "Financial assistance for startups for proof of concept, prototype development, product trials, market entry, and commercialization.",
    eligibility: "All categories, Early stage startups",
    benefits: "Up to ₹50 Lakhs",
    benefit_tags: "Funding",
    tenure: "Active",
    application_link: "https://www.startupindia.gov.in/",
  },
  {
    scheme_name: "Stand Up India",
    ministry: "Ministry of Commerce & Industry",
    key_sectors: "All Sectors",
    brief: "Bank loans between ₹10 lakh and ₹1 Crore for SC, ST, and women entrepreneurs for greenfield enterprises.",
    eligibility: "SC/ST/Women, Greenfield projects",
    benefits: "₹10 Lakh - ₹1 Crore",
    benefit_tags: "Credit Benefit",
    tenure: "Active",
    application_link: "https://standupmitra.in/",
  },
  // Add more schemes...
];

const EnhancedSchemesPage = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile] = useState({
    sector: "Technology",
    location: "Maharashtra",
    targetAudience: "Student",
  });

  // ========== Use scheme comparison context ==========
  const {
    selectedSchemes,
    isComparisonOpen,
    addSchemeToComparison,
    removeSchemeFromComparison,
    swapSchemes,
    clearComparison,
  } = useSchemeComparison();

  // ========== Compute filtered and ranked schemes ==========
  const processedSchemes = useMemo(() => {
    return mockSchemes
      .map((scheme) => {
        const score = calculateRelevanceScore(scheme, userProfile);
        return {
          ...enrichSchemeWithMetadata(scheme, false, false),
          relevanceScore: score,
        };
      })
      .filter((scheme) => {
        // Category filter (simple - can be enhanced)
        const matchesCategory = 
          activeCategory === "all" || 
          scheme.benefit_tags?.toLowerCase().includes(activeCategory.toLowerCase());
        
        // Search filter
        const matchesSearch =
          scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scheme.brief.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }, [activeCategory, searchQuery, userProfile]);

  const selectedSchemeNames = selectedSchemes.map(s => s.scheme_name);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* ========== COMPARISON PANEL ==========
            Shows when user has selected 2 schemes for comparison */}
        <SchemeComparisonPanel
          scheme1={selectedSchemes[0]}
          scheme2={selectedSchemes[1]}
          isOpen={isComparisonOpen}
          onClose={clearComparison}
          onSwap={swapSchemes}
          onRemoveScheme={removeSchemeFromComparison}
        />

        {/* ========== HERO SECTION ========== */}
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
                Government Schemes
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Discover funding opportunities and support programs tailored to your startup profile.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search schemes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 rounded-2xl text-base"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ========== FILTERS & COMPARISON INFO ========== */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-3 mb-8">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  onClick={() => setActiveCategory(category.id)}
                  className="rounded-full"
                >
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.label}
                </Button>
              ))}
            </div>

            {/* Comparison Mode Indicator */}
            {selectedSchemes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedSchemes.length === 1
                        ? "Select one more scheme to compare"
                        : "Ready to compare"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      {selectedSchemes.map((s) => s.scheme_name).join(", ")}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={clearComparison}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  Clear Selection
                </Button>
              </motion.div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedSchemes.map((scheme, index) => (
                <motion.div
                  key={scheme.scheme_name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SchemeCard
                    scheme={scheme}
                    // Mark as selected if in comparison
                    isSelected={selectedSchemeNames.includes(scheme.scheme_name)}
                    // Called when user checks/unchecks comparison checkbox
                    onSelect={(scheme) => {
                      if (selectedSchemeNames.includes(scheme.scheme_name)) {
                        removeSchemeFromComparison(scheme.scheme_name);
                      } else {
                        addSchemeToComparison(scheme);
                      }
                    }}
                    // Called when user clicks compare button
                    onCompare={(scheme) => {
                      if (selectedSchemeNames.includes(scheme.scheme_name)) {
                        removeSchemeFromComparison(scheme.scheme_name);
                      } else {
                        addSchemeToComparison(scheme);
                      }
                    }}
                    // Enable comparison checkboxes
                    showComparisonCheckbox={true}
                    variant="grid"
                  />
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {processedSchemes.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <p className="text-muted-foreground text-lg">
                  No schemes found matching your criteria.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-4 rounded-lg"
                >
                  Reset Filters
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* ========== COMPARISON FLOATING BUTTON ========== 
            This is a sticky button that appears when user selects 2 schemes */}
        {selectedSchemes.length === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              size="lg"
              className="rounded-full shadow-lg gap-2 px-8"
              onClick={isComparisonOpen ? clearComparison : () => {}}
            >
              <Zap className="w-5 h-5" />
              {isComparisonOpen ? "Close Comparison" : "Compare Schemes"}
            </Button>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EnhancedSchemesPage;

/**
 * ========== STEP-BY-STEP INTEGRATION GUIDE ==========
 * 
 * To integrate the new scheme comparison feature into your existing Schemes.tsx:
 * 
 * 1. ADD IMPORTS at the top:
 *    - import { useSchemeComparison } from "@/contexts/SchemeComparisonContext";
 *    - import { SchemeComparisonPanel } from "@/components/scheme-comparison/SchemeComparisonPanel";
 *    - import { enrichSchemeWithMetadata, calculateRelevanceScore } from "@/lib/scheme-utils";
 *    - import { SchemeCard } from "@/components/scheme/SchemeCard";
 * 
 * 2. INSIDE COMPONENT, add comparison context hook:
 *    const { selectedSchemes, isComparisonOpen, ... } = useSchemeComparison();
 * 
 * 3. WRAP scheme display with SchemeComparisonPanel:
 *    <SchemeComparisonPanel
 *      scheme1={selectedSchemes[0]}
 *      scheme2={selectedSchemes[1]}
 *      isOpen={isComparisonOpen}
 *      onClose={clearComparison}
 *      ...
 *    />
 * 
 * 4. REPLACE SchemeCard component call with new version:
 *    <SchemeCard
 *      scheme={scheme}
 *      isSelected={selectedSchemeNames.includes(scheme.scheme_name)}
 *      onSelect={addSchemeToComparison}
 *      showComparisonCheckbox={true}
 *      variant="grid"
 *    />
 * 
 * 5. TEST the comparison flow:
 *    - Click checkboxes on schemes
 *    - Verify comparison panel opens with 2 schemes
 *    - Test split and table views
 *    - Test mobile responsiveness
 * 
 * ========== KEY INTEGRATION POINTS ==========
 * 
 * STATE MANAGEMENT:
 * - SchemeComparisonContext handles global comparison state
 * - selectedSchemes array stores up to 2 schemes
 * - isComparisonOpen controls modal visibility
 * 
 * USER INTERACTIONS:
 * - Checkbox on SchemeCard triggers addSchemeToComparison
 * - Max 2 schemes enforced at context level
 * - Comparison panel auto-opens when 2 schemes selected
 * 
 * DATA FLOW:
 * User clicks checkbox
 *   ↓ 
 * onSelect handler called with scheme
 *   ↓
 * addSchemeToComparison(scheme) from context
 *   ↓
 * Context state updates, component re-renders
 *   ↓
 * If 2 schemes selected, SchemeComparisonPanel opens
 *   ↓
 * User sees split or table view with highlighted differences
 * 
 * ========== MOBILE CONSIDERATIONS ==========
 * 
 * - Comparison checkbox stays visible on mobile
 * - SchemeCard uses responsive grid (1 col mobile, 3 col desktop)
 * - SchemeComparisonPanel uses full screen modal on mobile
 * - Split view switches to vertical stacking on mobile
 * - Touch targets minimum 44x44px
 * 
 * ========== PERFORMANCE TIPS ==========
 * 
 * - Memoize processedSchemes with useMemo
 * - Use useCallback for event handlers
 * - SchemeComparisonPanel is lazy-loaded (only renders when open)
 * - Consider pagination for very large scheme lists (100+)
 */
