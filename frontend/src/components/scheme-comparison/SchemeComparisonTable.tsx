import React from "react";
import { Scheme, SchemeComparisonAttribute } from "@/types";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface SchemeComparisonTableProps {
  scheme1: Scheme;
  scheme2: Scheme;
  comparisonData: SchemeComparisonAttribute[];
}

/**
 * Table View Comparison
 * Side-by-side comparison in table format
 */
export const SchemeComparisonTable: React.FC<SchemeComparisonTableProps> = ({
  scheme1,
  scheme2,
  comparisonData,
}) => {
  const categories = [...new Set(comparisonData.map((c) => c.category))];

  return (
    <div className="space-y-6">
      {categories.map((category, categoryIdx) => {
        const attrs = comparisonData.filter((c) => c.category === category);

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIdx * 0.1 }}
          >
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              {category === "basic" && "📋 Basic Information"}
              {category === "eligibility" && "✅ Eligibility Criteria"}
              {category === "benefits" && "💰 Key Benefits"}
              {category === "process" && "🚀 Application Process"}
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="w-1/4 font-semibold">
                      Attribute
                    </TableHead>
                    <TableHead className="w-3/8">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        {scheme1.scheme_name}
                      </div>
                    </TableHead>
                    <TableHead className="w-3/8">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        {scheme2.scheme_name}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {attrs.map((attr, idx) => (
                    <motion.tr
                      key={attr.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`border-b border-border transition-colors hover:bg-muted/20 ${
                        attr.highlight ? "bg-yellow-50/50" : ""
                      }`}
                    >
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          {attr.label}
                          {attr.highlight && (
                            <AlertCircle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="space-y-2">
                          {Array.isArray(attr.scheme1Value)
                            ? attr.scheme1Value.map((val, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-blue-50 text-blue-900 px-2 py-1 rounded-full inline-block mr-2 mb-2"
                                >
                                  {val}
                                </div>
                              ))
                            : attr.scheme1Value && (
                                <p className="text-foreground">{attr.scheme1Value}</p>
                              )}
                          {!attr.scheme1Value && (
                            <p className="text-muted-foreground italic">Not specified</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="space-y-2">
                          {Array.isArray(attr.scheme2Value)
                            ? attr.scheme2Value.map((val, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-purple-50 text-purple-900 px-2 py-1 rounded-full inline-block mr-2 mb-2"
                                >
                                  {val}
                                </div>
                              ))
                            : attr.scheme2Value && (
                                <p className="text-foreground">{attr.scheme2Value}</p>
                              )}
                          {!attr.scheme2Value && (
                            <p className="text-muted-foreground italic">Not specified</p>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        );
      })}

      {/* Legend */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <h4 className="text-sm font-semibold text-foreground mb-3">Legend</h4>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            Scheme 1
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            Scheme 2
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            Different values
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SchemeComparisonTable;
