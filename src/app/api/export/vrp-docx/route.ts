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
interface RouteData {
  vehicle_id: number;
  route_indices: number[];
  route_names: string[];
  total_distance: number;
  total_time: number;
  total_load: number;
  num_stops: number;
}

interface Metrics {
  avg_distance_per_vehicle: number;
  avg_time_per_vehicle: number;
  avg_stops_per_vehicle: number;
  max_distance: number;
  min_distance: number;
  utilization_rate: number;
  distance_balance: number;
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
      routes: RouteData[];
      total_distance: number;
      total_time: number;
      total_load: number;
      vehicles_used: number;
      unassigned: string[];
      metrics: Metrics;
    };
    key_insights: KeyInsight[];
    summary: {
      problem_type: string;
      num_locations: number;
      num_vehicles: number;
      depot: string;
      total_distance: number;
      solve_time_ms: number;
    };
  };
  problemType: string;
  numVehicles: number;
  vehicleCapacity: number;
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
function getProblemTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    vrp: "Basic VRP (Vehicle Routing Problem)",
    cvrp: "CVRP (Capacitated VRP)",
    vrptw: "VRPTW (VRP with Time Windows)",
  };
  return labels[type] || type.toUpperCase();
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDistance(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)} km`;
}

function formatTime(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return "-";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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

function createSummaryTable(summary: RequestBody["results"]["summary"], metrics: Metrics, vehiclesUsed: number): Table {
  const colWidths = [3200, 2300, 3200, 2300];

  const rows = [
    ["Problem Type", getProblemTypeLabel(summary.problem_type).split(" ")[0], "Total Locations", formatNumber(summary.num_locations)],
    ["Vehicles Available", formatNumber(summary.num_vehicles), "Vehicles Used", formatNumber(vehiclesUsed)],
    ["Total Distance", formatDistance(summary.total_distance), "Utilization Rate", formatPercent(metrics.utilization_rate)],
    ["Depot", summary.depot, "Solve Time", `${summary.solve_time_ms}ms`],
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

function createRouteSummaryTable(routes: RouteData[]): Table {
  const colWidths = [1400, 2400, 1600, 1400, 1400, 1400];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Vehicle", colWidths[0]),
          createHeaderCell("Route", colWidths[1]),
          createHeaderCell("Distance", colWidths[2]),
          createHeaderCell("Time", colWidths[3]),
          createHeaderCell("Stops", colWidths[4]),
          createHeaderCell("Load", colWidths[5]),
        ],
      }),
      ...routes.map((route, idx) => {
        const routeStr = route.route_names.length > 4
          ? `${route.route_names.slice(0, 2).join(" → ")} → ... → ${route.route_names.slice(-1)[0]}`
          : route.route_names.join(" → ");

        return new TableRow({
          children: [
            createDataCell(`V${route.vehicle_id}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(routeStr, colWidths[1], idx % 2 === 1),
            createDataCell(formatDistance(route.total_distance), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatTime(route.total_time), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(route.num_stops), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(route.total_load), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(metrics: Metrics): Table {
  const colWidths = [5000, 5000];

  const rows = [
    ["Average Distance per Vehicle", formatDistance(metrics.avg_distance_per_vehicle)],
    ["Average Time per Vehicle", formatTime(metrics.avg_time_per_vehicle)],
    ["Average Stops per Vehicle", formatNumber(metrics.avg_stops_per_vehicle, 1)],
    ["Maximum Route Distance", formatDistance(metrics.max_distance)],
    ["Minimum Route Distance", formatDistance(metrics.min_distance)],
    ["Distance Balance Score", metrics.distance_balance.toFixed(2)],
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

function createRouteDetailsParagraphs(routes: RouteData[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  routes.forEach((route) => {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `Vehicle ${route.vehicle_id}`, bold: true, size: 22 }),
          new TextRun({
            text: ` — ${formatDistance(route.total_distance)} | ${formatTime(route.total_time)} | ${route.num_stops} stops`,
            size: 20,
            color: COLORS.secondary
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Route: ", bold: true, size: 20 }),
          new TextRun({ text: route.route_names.join(" → "), size: 20, color: COLORS.secondary }),
        ],
      })
    );

    if (route.total_load > 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: "Load: ", bold: true, size: 20 }),
            new TextRun({ text: `${route.total_load} units`, size: 20, color: COLORS.secondary }),
          ],
        })
      );
    }
  });

  return paragraphs;
}

function createMethodologySection(problemType: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({
        text: "This optimization uses Google OR-Tools to find optimal vehicle routes that minimize total travel distance while respecting all constraints.",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Problem Type:", bold: true, size: 22 })],
    })
  );

  if (problemType === "vrp") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Basic VRP: Minimize total distance traveled by all vehicles. Each location must be visited exactly once.",
          size: 20
        })],
      })
    );
  } else if (problemType === "cvrp") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "CVRP (Capacitated): Each vehicle has a maximum capacity. The sum of demands on each route cannot exceed vehicle capacity.",
          size: 20
        })],
      })
    );
  } else if (problemType === "vrptw") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "VRPTW (Time Windows): Each location has a time window during which it must be visited. Vehicles must arrive within the specified time range.",
          size: 20
        })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Algorithm:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Initial Solution: Path Cheapest Arc heuristic", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Local Search: Guided Local Search metaheuristic", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Distance Calculation: Haversine formula for geographic coordinates", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Balance Score Interpretation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Below 0.2: Excellent balance - routes are evenly distributed", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 0.2 - 0.4: Good balance - minor differences between routes", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Above 0.4: Unbalanced - consider redistributing stops", size: 20, color: COLORS.danger })],
    })
  );

  return paragraphs;
}

function createRecommendationsSection(routes: RouteData[], metrics: Metrics, unassigned: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Operational Recommendations:", bold: true, size: 22 })],
    })
  );

  // Fleet efficiency
  if (metrics.utilization_rate < 100) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• Fleet Optimization: Only ${routes.length} of available vehicles needed. Consider reducing fleet size to save costs.`,
          size: 20
        })],
      })
    );
  }

  // Balance
  if (metrics.distance_balance > 0.3) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "• Route Balancing: Routes show significant imbalance. Consider manual adjustments to distribute workload more evenly.",
          size: 20
        })],
      })
    );
  }

  // Unassigned
  if (unassigned.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• Unserved Locations: ${unassigned.length} locations could not be assigned. Consider adding vehicles or relaxing constraints.`,
          size: 20,
          color: COLORS.danger
        })],
      })
    );
  }

  // General recommendations
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Implementation Tips:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Verify routes against real-world road conditions before dispatching", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Account for traffic patterns during peak hours", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Build in buffer time for unexpected delays", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Re-optimize periodically as demand patterns change", size: 20 })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, problemType, numVehicles, vehicleCapacity } = body;

    const summary = results.summary;
    const routeResults = results.results;
    const routes = routeResults.routes;
    const metrics = routeResults.metrics;
    const keyInsights = results.key_insights;
    const unassigned = routeResults.unassigned || [];

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
                      text: "Vehicle Routing Optimization Report",
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
                  text: "Vehicle Routing Optimization Report",
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
                  text: getProblemTypeLabel(problemType),
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
                  text: `This optimization solved a ${getProblemTypeLabel(problemType)} for ${summary.num_locations} locations using ${routeResults.vehicles_used} of ${summary.num_vehicles} available vehicles. ` +
                    `The total optimized distance is ${formatDistance(summary.total_distance)} with an average of ${formatDistance(metrics.avg_distance_per_vehicle)} per vehicle. ` +
                    `${unassigned.length > 0 ? `${unassigned.length} locations could not be assigned.` : 'All locations were successfully assigned.'}`,
                  size: 22,
                }),
              ],
            }),
            createSummaryTable(summary, metrics, routeResults.vehicles_used),

            // ===== 2. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== 3. ROUTE SUMMARY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Route Summary")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Overview of all optimized vehicle routes.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createRouteSummaryTable(routes),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. ROUTE DETAILS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Route Details")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Detailed breakdown of each vehicle route with stop sequences.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createRouteDetailsParagraphs(routes),

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
            ...createMethodologySection(problemType),

            // ===== 7. RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("7. Recommendations")],
            }),
            ...createRecommendationsSection(routes, metrics, unassigned),

            // ===== 8. UNASSIGNED LOCATIONS =====
            ...(unassigned.length > 0 ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun("8. Unassigned Locations")],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `The following ${unassigned.length} location(s) could not be assigned to any route:`,
                    size: 20,
                    color: COLORS.danger,
                  }),
                ],
              }),
              ...unassigned.map(loc => new Paragraph({
                spacing: { after: 60 },
                indent: { left: 360 },
                children: [new TextRun({ text: `• ${loc}`, size: 20 })],
              })),
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({
                    text: "Consider adding more vehicles or relaxing capacity/time window constraints.",
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
              children: [new TextRun(unassigned.length > 0 ? "9. About This Report" : "8. About This Report")],
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
                new TextRun({ text: "Problem Type: ", bold: true, size: 20 }),
                new TextRun({ text: getProblemTypeLabel(problemType), size: 20 }),
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
                new TextRun({ text: "Vehicles Used: ", bold: true, size: 20 }),
                new TextRun({ text: `${routeResults.vehicles_used} of ${summary.num_vehicles}`, size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Distance: ", bold: true, size: 20 }),
                new TextRun({ text: formatDistance(summary.total_distance), size: 20 }),
              ],
            }),
            ...(vehicleCapacity > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Vehicle Capacity: ", bold: true, size: 20 }),
                  new TextRun({ text: `${vehicleCapacity} units`, size: 20 }),
                ],
              }),
            ] : []),
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
        "Content-Disposition": `attachment; filename=vrp_optimization_report_${new Date().toISOString().split("T")[0]}.docx`,
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
