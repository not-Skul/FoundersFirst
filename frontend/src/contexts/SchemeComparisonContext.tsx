import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Scheme, SavedComparison } from "@/types";

interface SchemeComparisonContextType {
  // State
  selectedSchemes: Scheme[];
  isComparisonOpen: boolean;
  
  // Methods
  addSchemeToComparison: (scheme: Scheme) => void;
  removeSchemeFromComparison: (schemeId: string) => void;
  swapSchemes: () => void;
  clearComparison: () => void;
  openComparison: () => void;
  closeComparison: () => void;
  
  // Saved comparisons
  savedComparisons: SavedComparison[];
  saveComparison: (schemes: [Scheme, Scheme], notes?: string) => void;
  deleteSavedComparison: (id: string) => void;
}

const SchemeComparisonContext = createContext<SchemeComparisonContextType | undefined>(
  undefined
);

export const SchemeComparisonProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedSchemes, setSelectedSchemes] = useState<Scheme[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);

  const addSchemeToComparison = useCallback(
    (scheme: Scheme) => {
      if (selectedSchemes.length < 2) {
        // Check if already selected
        if (
          !selectedSchemes.some(
            (s) => s.scheme_name === scheme.scheme_name
          )
        ) {
          setSelectedSchemes((prev) => [...prev, scheme]);
          setIsComparisonOpen(true);
        }
      }
    },
    [selectedSchemes]
  );

  const removeSchemeFromComparison = useCallback((schemeId: string) => {
    setSelectedSchemes((prev) =>
      prev.filter((s) => s.scheme_name !== schemeId)
    );
  }, []);

  const swapSchemes = useCallback(() => {
    setSelectedSchemes((prev) =>
      prev.length === 2 ? [prev[1], prev[0]] : prev
    );
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedSchemes([]);
    setIsComparisonOpen(false);
  }, []);

  const openComparison = useCallback(() => {
    setIsComparisonOpen(true);
  }, []);

  const closeComparison = useCallback(() => {
    setIsComparisonOpen(false);
  }, []);

  const saveComparison = useCallback(
    (schemes: [Scheme, Scheme], notes?: string) => {
      const comparison: SavedComparison = {
        id: `comparison_${Date.now()}`,
        createdAt: new Date(),
        schemes,
        notes,
      };
      setSavedComparisons((prev) => [comparison, ...prev]);
    },
    []
  );

  const deleteSavedComparison = useCallback((id: string) => {
    setSavedComparisons((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value: SchemeComparisonContextType = {
    selectedSchemes,
    isComparisonOpen,
    addSchemeToComparison,
    removeSchemeFromComparison,
    swapSchemes,
    clearComparison,
    openComparison,
    closeComparison,
    savedComparisons,
    saveComparison,
    deleteSavedComparison,
  };

  return (
    <SchemeComparisonContext.Provider value={value}>
      {children}
    </SchemeComparisonContext.Provider>
  );
};

/**
 * Hook to use scheme comparison context
 */
export const useSchemeComparison = () => {
  const context = useContext(SchemeComparisonContext);
  if (!context) {
    throw new Error(
      "useSchemeComparison must be used within SchemeComparisonProvider"
    );
  }
  return context;
};
