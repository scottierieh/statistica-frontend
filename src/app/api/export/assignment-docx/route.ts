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
interface Assignment {
  worker: string;
  task: string;
  cost: number;
  rank?: number;
}

interface Metrics {
  avg_cost: number;
  min_cost: number;
  max_cost: number;
  cost_variance: number;
  efficiency_score: number;
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
      assignments: Assignment[];
      total_cost: number;
      num_assigned: number;
      num_workers: number;
      num_tasks: number;
      unassigned_workers: string[];
      unassigned_tasks: string[];
      metrics: Metrics;
    };
    key_insights: KeyInsight[];
    summary: {
      problem_type: string;
      num_workers: number;
      num_tasks: number;
      total_cost: number;
      solve_time_ms: number;
    };
  };
  problemType: string;
  allowPartial: boolean;
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
    min_cost: "Minimize Cost",
    max_profit: "Maximize Profit",
    balanced: "Balanced Assignment",
  };
  return labels[type] || type.replace(/_/g, " ");
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `$${num.toFixed(2)}`;
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
  r: RequestBody["results"]["results"],
  problemType: string
): Table {
  const colWidths = [3200, 2300, 3200, 2300];

  const rows = [
    ["Problem Type", getProblemTypeLabel(problemType), "Total Assignments", formatNumber(r.num_assigned)],
    ["Workers", formatNumber(r.num_workers), "Tasks", formatNumber(r.num_tasks)],
    ["Total Cost", formatCurrency(r.total_cost), "Average Cost", formatCurrency(r.metrics.avg_cost)],
    ["Efficiency Score", formatPercent(r.metrics.efficiency_score), "Solve Time", `${summary.solve_time_ms}ms`],
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

function createAssignmentTable(assignments: Assignment[], metrics: Metrics): Table {
  const colWidths = [1200, 3000, 3000, 1800, 1000];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("#", colWidths[0]),
          createHeaderCell("Worker", colWidths[1]),
          createHeaderCell("Task", colWidths[2]),
          createHeaderCell("Cost", colWidths[3]),
          createHeaderCell("Status", colWidths[4]),
        ],
      }),
      ...assignments.map((assignment, idx) => {
        const isBest = assignment.cost === metrics.min_cost;
        const isWorst = assignment.cost === metrics.max_cost;
        const status = isBest ? "Best" : isWorst ? "High" : "-";
        const statusColor = isBest ? COLORS.success : isWorst ? COLORS.warning : undefined;

        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(assignment.worker, colWidths[1], idx % 2 === 1),
            createDataCell(assignment.task, colWidths[2], idx % 2 === 1),
            createDataCell(formatCurrency(assignment.cost), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(status, colWidths[4], idx % 2 === 1, AlignmentType.CENTER, statusColor),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(metrics: Metrics, r: RequestBody["results"]["results"]): Table {
  const colWidths = [5000, 5000];

  const rows = [
    ["Total Assignments", formatNumber(r.num_assigned)],
    ["Total Cost", formatCurrency(r.total_cost)],
    ["Average Cost per Assignment", formatCurrency(metrics.avg_cost)],
    ["Minimum Assignment Cost", formatCurrency(metrics.min_cost)],
    ["Maximum Assignment Cost", formatCurrency(metrics.max_cost)],
    ["Cost Variance", formatNumber(metrics.cost_variance, 2)],
    ["Efficiency Score", formatPercent(metrics.efficiency_score)],
    ["Unassigned Workers", formatNumber(r.unassigned_workers.length)],
    ["Unassigned Tasks", formatNumber(r.unassigned_tasks.length)],
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

function createAssignmentDetailsParagraphs(assignments: Assignment[], metrics: Metrics): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  assignments.forEach((assignment, idx) => {
    const isBest = assignment.cost === metrics.min_cost;
    const isWorst = assignment.cost === metrics.max_cost;
    const costColor = isBest ? COLORS.success : isWorst ? COLORS.warning : undefined;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `Assignment ${idx + 1}: `, bold: true, size: 22 }),
          new TextRun({ text: `${assignment.worker} → ${assignment.task}`, size: 22 }),
          new TextRun({ text: ` — `, size: 22, color: COLORS.secondary }),
          new TextRun({ text: formatCurrency(assignment.cost), size: 22, bold: true, color: costColor }),
          ...(isBest ? [new TextRun({ text: " (Best Value)", size: 20, color: COLORS.success })] : []),
          ...(isWorst ? [new TextRun({ text: " (Highest Cost)", size: 20, color: COLORS.warning })] : []),
        ],
      })
    );
  });

  return paragraphs;
}

function createMethodologySection(problemType: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({
        text: "The Assignment Problem finds the optimal one-to-one matching between workers and tasks to minimize total cost (or maximize profit).",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Problem Type:", bold: true, size: 22 })],
    })
  );

  if (problemType === "min_cost") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Minimize Cost: Find assignments that result in the lowest total cost across all worker-task pairs.",
          size: 20
        })],
      })
    );
  } else if (problemType === "max_profit") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Maximize Profit: Find assignments that result in the highest total profit/value across all worker-task pairs.",
          size: 20
        })],
      })
    );
  } else if (problemType === "balanced") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Balanced Assignment: Find assignments that balance workload while minimizing cost variance across workers.",
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
      children: [new TextRun({ text: "• Hungarian Algorithm (Kuhn-Munkres): O(n³) complexity", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Guarantees globally optimal solution for the objective", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Implemented via Google OR-Tools linear sum assignment solver", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Efficiency Score Interpretation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 80%+ : Excellent - highly optimized assignments", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 60-80%: Good - reasonable optimization achieved", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Below 60%: Review constraints and data quality", size: 20, color: COLORS.danger })],
    })
  );

  return paragraphs;
}

function createRecommendationsSection(r: RequestBody["results"]["results"], problemType: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Implementation Priority:", bold: true, size: 22 })],
    })
  );

  // List top assignments
  r.assignments.slice(0, 5).forEach((assignment, idx) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: `${idx + 1}. ${assignment.worker} → ${assignment.task} (${formatCurrency(assignment.cost)})`, 
          size: 20 
        })],
      })
    );
  });

  // Cost analysis
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Cost Analysis:", bold: true, size: 22 })],
    })
  );

  if (r.metrics.cost_variance > 100) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `• High cost variance detected (${r.metrics.cost_variance.toFixed(2)}). Consider training workers on expensive tasks.`,
          size: 20,
          color: COLORS.warning
        })],
      })
    );
  } else {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "• Costs are well-balanced across assignments.",
          size: 20,
          color: COLORS.success
        })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({
        text: `• Cost range: ${formatCurrency(r.metrics.min_cost)} - ${formatCurrency(r.metrics.max_cost)}`,
        size: 20
      })],
    })
  );

  // Unassigned resources
  if (r.unassigned_workers.length > 0 || r.unassigned_tasks.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Unassigned Resources:", bold: true, size: 22 })],
      })
    );

    if (r.unassigned_workers.length > 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [new TextRun({
            text: `• Unassigned Workers (${r.unassigned_workers.length}): ${r.unassigned_workers.join(", ")}`,
            size: 20
          })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 720 },
          children: [new TextRun({
            text: "Consider: Secondary tasks, cross-training, or workload rebalancing",
            size: 20,
            color: COLORS.secondary,
            italics: true
          })],
        })
      );
    }

    if (r.unassigned_tasks.length > 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [new TextRun({
            text: `• Unassigned Tasks (${r.unassigned_tasks.length}): ${r.unassigned_tasks.join(", ")}`,
            size: 20
          })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 720 },
          children: [new TextRun({
            text: "Consider: Hiring additional workers, redistributing, or prioritizing critical tasks",
            size: 20,
            color: COLORS.secondary,
            italics: true
          })],
        })
      );
    }
  }

  // Performance tracking
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Performance Tracking:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Monitor actual vs. estimated completion time", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Track quality of work per assignment", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Measure worker satisfaction scores", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Review task completion rates regularly", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Re-optimization Triggers:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• New workers join or leave the team", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Task requirements or priorities change", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Cost structures are updated", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Seasonal or cyclical demand shifts", size: 20 })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, problemType, allowPartial } = body;

    const summary = results.summary;
    const r = results.results;
    const keyInsights = results.key_insights;
    const assignments = r.assignments;
    const metrics = r.metrics;

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
                      text: "Assignment Optimization Report",
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
                  text: "Assignment Problem",
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
                  text: `This optimization successfully assigned ${r.num_assigned} workers to tasks with a total ${problemType === 'max_profit' ? 'profit' : 'cost'} of ${formatCurrency(r.total_cost)}. ` +
                    `Average ${problemType === 'max_profit' ? 'profit' : 'cost'} per assignment: ${formatCurrency(metrics.avg_cost)}. ` +
                    `Efficiency score: ${formatPercent(metrics.efficiency_score)}.`,
                  size: 22,
                }),
              ],
            }),
            createSummaryTable(summary, r, problemType),

            // ===== 2. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== 3. ASSIGNMENT SUMMARY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Assignment Summary")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `Complete list of ${r.num_assigned} optimal assignments.`,
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createAssignmentTable(assignments, metrics),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. ASSIGNMENT DETAILS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Assignment Details")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Detailed breakdown of each worker-task assignment.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createAssignmentDetailsParagraphs(assignments, metrics),

            // ===== 5. PERFORMANCE METRICS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Performance Metrics")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Key performance indicators for the assignment solution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createMetricsTable(metrics, r),

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
            ...createRecommendationsSection(r, problemType),

            // ===== 8. UNASSIGNED RESOURCES =====
            ...((r.unassigned_workers.length > 0 || r.unassigned_tasks.length > 0) ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun("8. Unassigned Resources")],
              }),
              ...(r.unassigned_workers.length > 0 ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: `Unassigned Workers (${r.unassigned_workers.length}):`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                ...r.unassigned_workers.map(worker => new Paragraph({
                  spacing: { after: 60 },
                  indent: { left: 360 },
                  children: [new TextRun({ text: `• ${worker}`, size: 20 })],
                })),
              ] : []),
              ...(r.unassigned_tasks.length > 0 ? [
                new Paragraph({
                  spacing: { before: 120, after: 80 },
                  children: [
                    new TextRun({
                      text: `Unassigned Tasks (${r.unassigned_tasks.length}):`,
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
                ...r.unassigned_tasks.map(task => new Paragraph({
                  spacing: { after: 60 },
                  indent: { left: 360 },
                  children: [new TextRun({ text: `• ${task}`, size: 20 })],
                })),
              ] : []),
            ] : []),

            // ===== ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun((r.unassigned_workers.length > 0 || r.unassigned_tasks.length > 0) ? "9. About This Report" : "8. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated using the Hungarian Algorithm (Kuhn-Munkres) via Google OR-Tools. The solution is globally optimal for the given objective.",
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
                new TextRun({ text: "Workers: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.num_workers), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Tasks: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.num_tasks), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Assignments Made: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.num_assigned), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Cost: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(r.total_cost), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Efficiency Score: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(metrics.efficiency_score), size: 20 }),
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

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=assignment_report_${new Date().toISOString().split("T")[0]}.docx`,
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
