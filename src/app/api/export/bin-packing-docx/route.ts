import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  PageBreak,
} from "docx";

// ============ Types ============
interface BinAssignment {
  bin_id: number;
  items: string[];
  item_sizes: number[];
  total_size: number;
  remaining_capacity: number;
  utilization: number;
}

interface KeyInsight {
  title: string;
  description: string;
  status: "positive" | "neutral" | "warning";
}

interface RequestBody {
  results: {
    success: boolean;
    results: {
      bins: BinAssignment[];
      num_bins_used: number;
      total_items: number;
      total_size: number;
      bin_capacity: number;
      avg_utilization: number;
      min_utilization: number;
      max_utilization: number;
      wasted_space: number;
      unassigned_items: string[];
    };
    key_insights: KeyInsight[];
    summary: {
      algorithm: string;
      num_items: number;
      num_bins: number;
      bin_capacity: number;
      avg_utilization: number;
      solve_time_ms: number;
    };
  };
  algorithm: string;
  binCapacity: string;
}

// ============ Styles ============
const COLORS = {
  primary: "1e40af",
  secondary: "64748b",
  success: "16a34a",
  warning: "ea580c",
  danger: "dc2626",
  headerBg: "1e3a5f",
  altRowBg: "f1f5f9",
  lightBorder: "cbd5e1",
};

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.lightBorder };
const borders = { top: border, bottom: border, left: border, right: border };

// ============ Helper Functions ============
function getAlgorithmLabel(algo: string): string {
  const labels: Record<string, string> = {
    first_fit_decreasing: "First Fit Decreasing",
    best_fit_decreasing: "Best Fit Decreasing",
    optimal: "Optimal (OR-Tools)",
  };
  return labels[algo] || algo.replace(/_/g, " ");
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)}%`;
}

// ============ Table Builders ============
function createHeaderCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: COLORS.headerBg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
      }),
    ],
  });
}

function createDataCell(
  text: string,
  width: number,
  isAlt: boolean = false,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  textColor?: string
): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: isAlt ? { fill: COLORS.altRowBg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, size: 20, color: textColor })],
      }),
    ],
  });
}

function createSummaryTable(
  summary: RequestBody["results"]["summary"],
  r: RequestBody["results"]["results"]
): Table {
  const colWidths = [3200, 2300, 3200, 2300];
  const minBinsTheoretical = Math.ceil(r.total_size / r.bin_capacity);
  const efficiency = (minBinsTheoretical / r.num_bins_used) * 100;

  const rows = [
    ["Algorithm", getAlgorithmLabel(summary.algorithm), "Total Items", formatNumber(r.total_items)],
    ["Bins Used", formatNumber(r.num_bins_used), "Theoretical Minimum", formatNumber(minBinsTheoretical)],
    ["Bin Capacity", formatNumber(r.bin_capacity), "Total Size", formatNumber(r.total_size)],
    ["Avg Utilization", formatPercent(r.avg_utilization), "Efficiency", formatPercent(efficiency)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: rows.map((row, idx) =>
      new TableRow({
        children: [
          createDataCell(row[0], colWidths[0], idx % 2 === 1, AlignmentType.LEFT),
          createDataCell(row[1], colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
          createDataCell(row[2], colWidths[2], idx % 2 === 1, AlignmentType.LEFT),
          createDataCell(row[3], colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
        ],
      })
    ),
  });
}

function createBinSummaryTable(bins: BinAssignment[], capacity: number): Table {
  const colWidths = [1400, 1600, 2000, 2000, 1600, 1400];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Bin", colWidths[0]),
          createHeaderCell("Items", colWidths[1]),
          createHeaderCell("Size Used", colWidths[2]),
          createHeaderCell("Remaining", colWidths[3]),
          createHeaderCell("Utilization", colWidths[4]),
          createHeaderCell("Status", colWidths[5]),
        ],
      }),
      ...bins.map((bin, idx) => {
        const status = bin.utilization >= 80 ? "Good" : bin.utilization >= 50 ? "Fair" : "Low";
        const statusColor = bin.utilization >= 80 ? COLORS.success : bin.utilization >= 50 ? COLORS.warning : COLORS.danger;

        return new TableRow({
          children: [
            createDataCell(`Bin ${bin.bin_id}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(formatNumber(bin.items.length), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(`${bin.total_size} / ${capacity}`, colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(bin.remaining_capacity), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(bin.utilization), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(status, colWidths[5], idx % 2 === 1, AlignmentType.CENTER, statusColor),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(r: RequestBody["results"]["results"]): Table {
  const colWidths = [5000, 5000];
  const minBins = Math.ceil(r.total_size / r.bin_capacity);

  const rows = [
    ["Total Items Packed", formatNumber(r.total_items)],
    ["Total Size", formatNumber(r.total_size)],
    ["Bins Used", formatNumber(r.num_bins_used)],
    ["Theoretical Minimum Bins", formatNumber(minBins)],
    ["Wasted Space", formatNumber(r.wasted_space)],
    ["Average Utilization", formatPercent(r.avg_utilization)],
    ["Minimum Utilization", formatPercent(r.min_utilization)],
    ["Maximum Utilization", formatPercent(r.max_utilization)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: rows.map((row, idx) =>
      new TableRow({
        children: [
          createDataCell(row[0], colWidths[0], idx % 2 === 1),
          createDataCell(row[1], colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
        ],
      })
    ),
  });
}

// ============ Content Builders ============
function createKeyInsightsParagraphs(insights: KeyInsight[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  insights.forEach((insight) => {
    const statusIcon = insight.status === "positive" ? "✓" : insight.status === "warning" ? "⚠" : "•";
    const statusColor = insight.status === "positive" ? COLORS.success :
      insight.status === "warning" ? COLORS.warning : COLORS.secondary;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `${statusIcon} `, color: statusColor, size: 22 }),
          new TextRun({ text: insight.title, bold: true, size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ text: insight.description, size: 20, color: COLORS.secondary })],
      })
    );
  });

  return paragraphs;
}

function createBinDetailsParagraphs(bins: BinAssignment[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  bins.forEach((bin) => {
    const utilizationColor = bin.utilization >= 80 ? COLORS.success : 
      bin.utilization >= 50 ? COLORS.warning : COLORS.danger;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `Bin ${bin.bin_id}`, bold: true, size: 22 }),
          new TextRun({
            text: ` — ${bin.items.length} items | ${bin.total_size} used | `,
            size: 20,
            color: COLORS.secondary
          }),
          new TextRun({
            text: `${bin.utilization.toFixed(1)}% utilization`,
            size: 20,
            color: utilizationColor
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Items: ", bold: true, size: 20 }),
          new TextRun({ 
            text: bin.items.length <= 10 
              ? bin.items.map((item, i) => `${item} (${bin.item_sizes[i]})`).join(", ")
              : bin.items.slice(0, 10).map((item, i) => `${item} (${bin.item_sizes[i]})`).join(", ") + ` ... and ${bin.items.length - 10} more`,
            size: 20, 
            color: COLORS.secondary 
          }),
        ],
      })
    );
  });

  return paragraphs;
}

function createMethodologySection(algorithm: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({
        text: "Bin Packing optimization finds the minimum number of bins needed to pack all items while respecting capacity constraints.",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Algorithm Used:", bold: true, size: 22 })],
    })
  );

  if (algorithm === "first_fit_decreasing") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "First Fit Decreasing (FFD): Sorts items by size in descending order, then places each item in the first bin with sufficient remaining capacity. Time complexity: O(n log n).",
          size: 20
        })],
      })
    );
  } else if (algorithm === "best_fit_decreasing") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Best Fit Decreasing (BFD): Sorts items by size in descending order, then places each item in the bin with minimum remaining capacity that can still fit the item. Reduces fragmentation but slower than FFD.",
          size: 20
        })],
      })
    );
  } else if (algorithm === "optimal") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Optimal (OR-Tools): Uses constraint programming to find the globally optimal solution. Guarantees minimum number of bins but may take longer for large problem instances.",
          size: 20
        })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Problem Characteristics:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Bin Packing is NP-hard - no polynomial-time optimal algorithm exists", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• FFD guarantees solution within 11/9 × OPT + 6/9 of optimal", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Heuristics provide fast, near-optimal solutions for practical use", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Utilization Benchmarks:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 80%+ utilization: Excellent packing efficiency", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 65-80% utilization: Good efficiency with room for improvement", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Below 65%: Consider different bin sizes or packing strategy", size: 20, color: COLORS.danger })],
    })
  );

  return paragraphs;
}

function createRecommendationsSection(r: RequestBody["results"]["results"]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const minBins = Math.ceil(r.total_size / r.bin_capacity);
  const efficiency = (minBins / r.num_bins_used) * 100;

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Efficiency Assessment:", bold: true, size: 22 })],
    })
  );

  if (r.num_bins_used === minBins) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "✓ Optimal solution achieved! Using the theoretical minimum number of bins.",
          size: 20,
          color: COLORS.success
        })],
      })
    );
  } else if (efficiency >= 90) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `✓ Near-optimal solution (${efficiency.toFixed(1)}% efficiency). Only ${r.num_bins_used - minBins} extra bin(s) used.`,
          size: 20,
          color: COLORS.success
        })],
      })
    );
  } else {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `△ ${efficiency.toFixed(1)}% efficiency. ${r.num_bins_used - minBins} extra bins used vs theoretical minimum.`,
          size: 20,
          color: COLORS.warning
        })],
      })
    );
  }

  // Utilization recommendations
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Utilization Recommendations:", bold: true, size: 22 })],
    })
  );

  if (r.avg_utilization < 70) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• Low average utilization (${r.avg_utilization.toFixed(1)}%). Consider smaller bin sizes or combining shipments.`,
          size: 20
        })],
      })
    );
  }

  if (r.max_utilization - r.min_utilization > 30) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• High utilization variance (${r.min_utilization.toFixed(0)}% - ${r.max_utilization.toFixed(0)}%). Some bins are significantly underfilled.`,
          size: 20
        })],
      })
    );
  }

  if (r.unassigned_items.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• ${r.unassigned_items.length} items could not be assigned. Check capacity constraints or add more bins.`,
          size: 20,
          color: COLORS.danger
        })],
      })
    );
  }

  // Operational tips
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Operational Tips:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Place heavier items at the bottom of bins", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Group fragile items together with appropriate padding", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Label bins clearly with contents and destination", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Consider weight distribution for shipping/transport", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Re-optimize when item mix changes significantly", size: 20 })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, algorithm, binCapacity } = body;

    const summary = results.summary;
    const r = results.results;
    const keyInsights = results.key_insights;
    const bins = r.bins;
    const minBinsTheoretical = Math.ceil(r.total_size / r.bin_capacity);
    const efficiency = (minBinsTheoretical / r.num_bins_used) * 100;

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: "Arial", size: 22 },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 32, bold: true, color: COLORS.primary },
            paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 0 },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 26, bold: true, color: COLORS.primary },
            paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: "Bin Packing Optimization Report",
                      size: 18,
                      color: COLORS.secondary,
                      italics: true,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "Page ", size: 18, color: COLORS.secondary }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.secondary }),
                    new TextRun({ text: " of ", size: 18, color: COLORS.secondary }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.secondary }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // ===== TITLE =====
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Bin Packing Optimization",
                  size: 56,
                  bold: true,
                  color: COLORS.primary,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: "Report",
                  size: 40,
                  bold: true,
                  color: COLORS.primary,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: getAlgorithmLabel(algorithm),
                  size: 28,
                  italics: true,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: `Report Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                  size: 22,
                  color: COLORS.secondary,
                }),
              ],
            }),

            // ===== 1. EXECUTIVE SUMMARY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("1. Executive Summary")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: `This optimization successfully packed ${r.total_items} items into ${r.num_bins_used} bins with ${r.avg_utilization.toFixed(1)}% average utilization. ` +
                    `The theoretical minimum is ${minBinsTheoretical} bins, achieving ${efficiency.toFixed(1)}% packing efficiency. ` +
                    `Total wasted space: ${r.wasted_space} units.`,
                  size: 22,
                }),
              ],
            }),
            createSummaryTable(summary, r),

            // ===== 2. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== 3. BIN SUMMARY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Bin Summary")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `Overview of all ${r.num_bins_used} bins with utilization metrics.`,
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createBinSummaryTable(bins, r.bin_capacity),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. BIN DETAILS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Bin Details")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Detailed breakdown of items in each bin.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createBinDetailsParagraphs(bins),

            // ===== 5. PERFORMANCE METRICS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Performance Metrics")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Key performance indicators for the packing solution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createMetricsTable(r),

            // ===== 6. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("6. Methodology")],
            }),
            ...createMethodologySection(algorithm),

            // ===== 7. RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("7. Recommendations")],
            }),
            ...createRecommendationsSection(r),

            // ===== 8. UNASSIGNED ITEMS =====
            ...(r.unassigned_items.length > 0 ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun("8. Unassigned Items")],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `The following ${r.unassigned_items.length} item(s) could not be assigned to any bin:`,
                    size: 20,
                    color: COLORS.danger,
                  }),
                ],
              }),
              ...r.unassigned_items.map(item => new Paragraph({
                spacing: { after: 60 },
                indent: { left: 360 },
                children: [new TextRun({ text: `• ${item}`, size: 20 })],
              })),
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({
                    text: "Consider increasing bin capacity, adding more bins, or splitting oversized items.",
                    size: 20,
                    italics: true,
                    color: COLORS.secondary,
                  }),
                ],
              }),
            ] : []),

            // ===== ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(r.unassigned_items.length > 0 ? "9. About This Report" : "8. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated using bin packing optimization algorithms. Results represent the best solution found for the given constraints.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({ text: "Algorithm: ", bold: true, size: 20 }),
                new TextRun({ text: getAlgorithmLabel(algorithm), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Items: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.total_items), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Bins Used: ", bold: true, size: 20 }),
                new TextRun({ text: `${r.num_bins_used} (theoretical min: ${minBinsTheoretical})`, size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Bin Capacity: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.bin_capacity), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Average Utilization: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(r.avg_utilization), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Solve Time: ", bold: true, size: 20 }),
                new TextRun({ text: `${summary.solve_time_ms}ms`, size: 20 }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

return new  NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=bin_packing_report_${new Date().toISOString().split("T")[0]}.docx`,
      },
    });
  } catch (error) {
    console.error("Word generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}