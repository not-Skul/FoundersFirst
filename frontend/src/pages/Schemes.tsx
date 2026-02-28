import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Search, Users, MapPin, Wallet, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import schemesData from "./schemes_structured_documents.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Scheme {
  scheme_name: string;
  ministry: string;
  key_sectors: string;
  brief: string;
  eligibility: string;
  benefits: string;
  benefit_tags: string;
  tenure: string;
  application_link: string;
}

const categories = [
  { id: "all", label: "All Schemes", icon: Building },
  { id: "tech", label: "Technology", icon: Building },
  { id: "women", label: "Women", icon: Users },
  { id: "funding", label: "Funding", icon: Wallet },
  { id: "msme", label: "MSME", icon: Building },
  { id: "agri", label: "Agriculture", icon: MapPin },
];

const Schemes = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = () => {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      setIsLoggedIn(!!token);
    };

    // Initial check
    checkLoginStatus();

    // Listen for storage changes (login/logout in other tabs or same tab)
    const handleStorageChange = () => {
      checkLoginStatus();
    };

    // Listen for visibility changes (page comes back into focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkLoginStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const schemes: (Scheme & { id: string })[] = schemesData.map((scheme, index) => ({
    ...scheme,
    id: `scheme_${index}`,
  }));

  const getCategoryForScheme = (scheme: Scheme): string[] => {
    const categories: string[] = [];
    const text = `${scheme.scheme_name} ${scheme.brief} ${scheme.benefits} ${scheme.key_sectors}`.toLowerCase();

    if (text.includes("technology") || text.includes("tech") || text.includes("software") || text.includes("digital")) categories.push("tech");
    if (text.includes("women")) categories.push("women");
    if (text.includes("funding") || text.includes("loan") || text.includes("financial") || text.includes("equity")) categories.push("funding");
    if (text.includes("msme") || text.includes("micro") || text.includes("small")) categories.push("msme");
    if (text.includes("agriculture") || text.includes("agri") || text.includes("farmer")) categories.push("agri");

    return categories.length > 0 ? categories : ["all"];
  };

  const filteredSchemes = schemes.filter((scheme) => {
    const schemeCategories = getCategoryForScheme(scheme);
    const matchesCategory = activeCategory === "all" || schemeCategories.includes(activeCategory);
    const matchesSearch = scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.brief.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSchemeSelect = (schemeId: string) => {
    setSelectedSchemes((prev) =>
      prev.includes(schemeId) ? prev.filter((id) => id !== schemeId) : [...prev, schemeId]
    );
  };

  const getSelectedSchemeDetails = () => {
    return schemes.filter((scheme) => selectedSchemes.includes(scheme.id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="py-16 bg-surface-subtle">
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

              {/* Search */}
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

        {/* Filters & Results */}
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

            {/* Comparison Button - Only visible if logged in */}
            {isLoggedIn && selectedSchemes.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 flex gap-3"
              >
                <Button
                  onClick={() => setIsCompareOpen(true)}
                  className="rounded-xl bg-primary hover:bg-primary/90"
                >
                  Compare {selectedSchemes.length} Schemes
                </Button>
                {selectedSchemes.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSchemes([])}
                    className="rounded-xl"
                  >
                    Clear Selection
                  </Button>
                )}
              </motion.div>
            )}

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchemes.map((scheme, index) => (
                <motion.div
                  key={scheme.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all group relative"
                >
                  {/* Selection Checkbox - Only for logged in users */}
                  {isLoggedIn && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <Checkbox
                        checked={selectedSchemes.includes(scheme.id)}
                        onCheckedChange={() => handleSchemeSelect(scheme.id)}
                        className="w-5 h-5"
                      />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4 pr-8">
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {scheme.scheme_name}
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {scheme.brief}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ministry</span>
                      <p className="text-sm font-semibold text-primary">{scheme.ministry}</p>
                    </div>

                    {scheme.benefit_tags && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Benefits</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scheme.benefit_tags.split(",").slice(0, 2).map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {scheme.key_sectors && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sector</span>
                        <p className="text-sm text-foreground">{scheme.key_sectors}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="subtle"
                    className="w-full mt-4 rounded-xl"
                    onClick={() => {
                      if (scheme.application_link && scheme.application_link !== "#") {
                        window.open(scheme.application_link, "_blank");
                      }
                    }}
                  >
                    Learn More
                  </Button>
                </motion.div>
              ))}
            </div>

            {filteredSchemes.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No schemes found matching your criteria.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Comparison Modal */}
      {isLoggedIn && (
        <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Compare Schemes</DialogTitle>
            </DialogHeader>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-4 text-left font-semibold text-foreground w-48 sticky left-0 bg-background z-10">
                      Scheme Name
                    </th>
                    {getSelectedSchemeDetails().map((scheme) => (
                      <th
                        key={scheme.id}
                        className="p-4 text-left font-semibold text-foreground min-w-96 border-l border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-primary">
                            {scheme.scheme_name}
                          </h4>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Ministry", key: "ministry" },
                    { label: "Key Sectors", key: "key_sectors" },
                    { label: "Benefits", key: "benefit_tags" },
                    { label: "Eligibility", key: "eligibility" },
                    { label: "Tenure", key: "tenure" },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-border">
                      <td className="p-4 font-semibold text-foreground sticky left-0 bg-background z-10 w-48 text-sm">
                        {row.label}
                      </td>
                      {getSelectedSchemeDetails().map((scheme) => (
                        <td
                          key={scheme.id}
                          className="p-4 text-sm text-muted-foreground border-l border-border min-w-96"
                        >
                          {(scheme as any)[row.key] || "Not specified"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-b border-border bg-muted/30">
                    <td className="p-4 font-semibold text-foreground sticky left-0 bg-muted/30 z-10 w-48 text-sm">
                      Apply
                    </td>
                    {getSelectedSchemeDetails().map((scheme) => (
                      <td
                        key={scheme.id}
                        className="p-4 border-l border-border min-w-96"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => {
                            if (scheme.application_link && scheme.application_link !== "#") {
                              window.open(scheme.application_link, "_blank");
                            }
                          }}
                        >
                          Visit Link
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
};

export default Schemes;
