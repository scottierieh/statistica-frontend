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
interface Location {
  location_id: string;
  name?: string;
  x: number;
  y: number;
  order?: number;
}

interface Metrics {
  avg_leg_distance: number;
  min_leg_distance: number;
  max_leg_distance: number;
  improvement_vs_naive: number;
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
      route: Location[];
      total_distance: number;
      num_locations: number;
      distances: number[];
      metrics: Metrics;
    };
    key_insights: KeyInsight[];
    summary: {
      algorithm: string;
      num_locations: number;
      total_distance: number;
      solve_time_ms: number;
    };
  };
  algorithm: string;
  returnToStart: boolean;
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
    automatic: "Automatic (OR-Tools Default)",
    greedy: "Greedy (Nearest Neighbor)",
    christofides: "Christofides Algorithm",
    savings: "Clarke-Wright Savings",
  };
  return labels[algo] || algo;
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDistance(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)} units`;
}

function formatPercent(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)}%`;
}

function formatCoordinates(x: number, y: number): string {
  return `(${x.toFixed(1)}, ${y.toFixed(1)})`;
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

function createSummaryTable(summary: RequestBody["results"]["summary"], metrics: Metrics, algorithm: string, returnToStart: boolean): Table {
  const colWidths = [3200, 2300, 3200, 2300];

  const rows = [
    ["Algorithm", getAlgorithmLabel(algorithm).split(" ")[0], "Total Locations", formatNumber(summary.num_locations)],
    ["Total Distance", formatDistance(summary.total_distance), "Number of Legs", formatNumber(summary.num_locations - (returnToStart ? 0 : 1))],
    ["Route Type", returnToStart ? "Round Trip" : "One Way", "Solve Time", `${summary.solve_time_ms}ms`],
    ["Improvement", formatPercent(metrics.improvement_vs_naive), "Avg Leg Distance", formatDistance(metrics.avg_leg_distance)],
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

function createRouteTable(route: Location[], distances: number[]): Table {
  const colWidths = [1200, 2800, 2000, 2000, 2000];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Order", colWidths[0]),
          createHeaderCell("Location", colWidths[1]),
          createHeaderCell("Coordinates", colWidths[2]),
          createHeaderCell("Distance to Next", colWidths[3]),
          createHeaderCell("Cumulative", colWidths[4]),
        ],
      }),
      ...route.map((location, idx) => {
        const distance = distances[idx] || 0;
        const cumulative = distances.slice(0, idx + 1).reduce((sum, d) => sum + d, 0);
        
        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(location.name || location.location_id, colWidths[1], idx % 2 === 1),
            createDataCell(formatCoordinates(location.x, location.y), colWidths[2], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(idx < distances.length ? formatDistance(distance) : "-", colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatDistance(cumulative), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(metrics: Metrics): Table {
  const colWidths = [5000, 5000];

  const rows = [
    ["Average Leg Distance", formatDistance(metrics.avg_leg_distance)],
    ["Minimum Leg Distance", formatDistance(metrics.min_leg_distance)],
    ["Maximum Leg Distance", formatDistance(metrics.max_leg_distance)],
    ["Improvement vs Naive", formatPercent(metrics.improvement_vs_naive)],
    ["Distance Variance", formatDistance(metrics.max_leg_distance - metrics.min_leg_distance)],
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

function createLegAnalysisTable(route: Location[], distances: number[], metrics: Metrics): Table {
  const colWidths = [1200, 2400, 2400, 2000, 2000];

  // 상위 5개 긴 구간
  const legsWithIndex = distances.map((d, i) => ({ index: i, distance: d, from: route[i], to: route[i + 1] }))
    .filter(leg => leg.to !== undefined)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 5);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Rank", colWidths[0]),
          createHeaderCell("From", colWidths[1]),
          createHeaderCell("To", colWidths[2]),
          createHeaderCell("Distance", colWidths[3]),
          createHeaderCell("% of Total", colWidths[4]),
        ],
      }),
      ...legsWithIndex.map((leg, idx) => {
        const totalDistance = distances.reduce((sum, d) => sum + d, 0);
        const percentage = totalDistance > 0 ? (leg.distance / totalDistance) * 100 : 0;
        
        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(leg.from?.name || leg.from?.location_id || "-", colWidths[1], idx % 2 === 1),
            createDataCell(leg.to?.name || leg.to?.location_id || "-", colWidths[2], idx % 2 === 1),
            createDataCell(formatDistance(leg.distance), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(percentage), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
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

function createMethodologySection(algorithm: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({
        text: "This optimization uses Google OR-Tools to solve the Traveling Salesman Problem (TSP) - finding the shortest route that visits all locations exactly once.",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Algorithm Used:", bold: true, size: 22 })],
    })
  );

  if (algorithm === "automatic") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Automatic: OR-Tools selects the best strategy based on problem size and characteristics.",
          size: 20
        })],
      })
    );
  } else if (algorithm === "greedy") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Greedy (Nearest Neighbor): Starts from the first location and repeatedly visits the nearest unvisited location. Fast but may not be optimal.",
          size: 20
        })],
      })
    );
  } else if (algorithm === "christofides") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Christofides Algorithm: Provides a 1.5-approximation guarantee. Builds a minimum spanning tree and adds a minimum weight matching for odd-degree vertices.",
          size: 20
        })],
      })
    );
  } else if (algorithm === "savings") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Clarke-Wright Savings: Starts with direct routes from depot and merges routes based on distance savings. Effective for symmetric TSP.",
          size: 20
        })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Solution Process:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "1. Calculate distance matrix between all location pairs", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "2. Generate initial solution using selected heuristic", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "3. Improve using local search (2-opt, 3-opt swaps)", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "4. Apply metaheuristics to escape local optima", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Complexity:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• TSP is NP-hard with O(n!) possible routes", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Heuristics provide near-optimal solutions in polynomial time", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Solution quality depends on problem structure and time allowed", size: 20 })],
    })
  );

  return paragraphs;
}

function createRecommendationsSection(route: Location[], metrics: Metrics, distances: number[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Route Optimization Insights:", bold: true, size: 22 })],
    })
  );

  // Longest leg analysis
  if (metrics.max_leg_distance > metrics.avg_leg_distance * 2) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• Longest Leg Alert: The longest leg (${formatDistance(metrics.max_leg_distance)}) is more than twice the average. Consider if an intermediate stop could reduce total distance.`,
          size: 20,
          color: COLORS.warning
        })],
      })
    );
  }

  // Improvement metric
  if (metrics.improvement_vs_naive > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• Optimization Success: Achieved ${formatPercent(metrics.improvement_vs_naive)} improvement over naive sequential ordering.`,
          size: 20,
          color: COLORS.success
        })],
      })
    );
  }

  // Distance variance
  const variance = metrics.max_leg_distance - metrics.min_leg_distance;
  if (variance > metrics.avg_leg_distance * 1.5) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• High Variance: Leg distances vary significantly (${formatDistance(variance)} difference). Some locations may be geographically isolated.`,
          size: 20
        })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Implementation Tips:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Account for real-world road conditions and traffic patterns", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Add buffer time for service at each location", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Consider time windows if locations have restricted hours", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Re-optimize if locations change or are cancelled", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• For many locations, consider splitting into multiple routes (VRP)", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Time Estimation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• At 30 units/hour average speed: ~${(distances.reduce((s, d) => s + d, 0) / 30).toFixed(1)} hours travel time`,
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• Add service time at each of ${route.length} locations for total trip duration`,
        size: 20 
      })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, algorithm, returnToStart } = body;

    const summary = results.summary;
    const routeResults = results.results;
    const route = routeResults.route;
    const distances = routeResults.distances;
    const metrics = routeResults.metrics;
    const keyInsights = results.key_insights;

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
                      text: "TSP Optimization Report",
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
                  text: "Traveling Salesman Problem",
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
                  text: "Optimization Report",
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
                  text: `This optimization found the shortest route visiting ${summary.num_locations} locations${returnToStart ? ' and returning to the start' : ''}. ` +
                    `The total optimized distance is ${formatDistance(summary.total_distance)} with an average leg distance of ${formatDistance(metrics.avg_leg_distance)}. ` +
                    `${metrics.improvement_vs_naive > 0 ? `This represents a ${formatPercent(metrics.improvement_vs_naive)} improvement over a naive sequential approach.` : ''}`,
                  size: 22,
                }),
              ],
            }),
            createSummaryTable(summary, metrics, algorithm, returnToStart),

            // ===== 2. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== 3. OPTIMAL ROUTE =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Optimal Route")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `Complete route sequence with ${route.length} stops and ${distances.length} legs.`,
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createRouteTable(route, distances),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. LEG ANALYSIS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Longest Legs Analysis")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Top 5 longest legs in the optimized route. Consider these for potential improvements.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createLegAnalysisTable(route, distances, metrics),

            // ===== 5. PERFORMANCE METRICS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Performance Metrics")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Key performance indicators for the optimized solution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createMetricsTable(metrics),

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
            ...createRecommendationsSection(route, metrics, distances),

            // ===== 8. ROUTE SEQUENCE =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("8. Route Sequence Summary")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Quick reference for the optimized visit order:",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: route.map((loc, idx) => `${idx + 1}. ${loc.name || loc.location_id}`).join(" → "),
                  size: 20,
                }),
              ],
            }),

            // ===== ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("9. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated using Google OR-Tools optimization engine. Results represent the best solution found within the configured time limit.",
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
                new TextRun({ text: "Total Locations: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.num_locations), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Route Type: ", bold: true, size: 20 }),
                new TextRun({ text: returnToStart ? "Round Trip (returns to start)" : "One Way", size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Distance: ", bold: true, size: 20 }),
                new TextRun({ text: formatDistance(summary.total_distance), size: 20 }),
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

return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=tsp_optimization_report_${new Date().toISOString().split("T")[0]}.docx`,
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