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
interface SelectedItem {
  item_id: string;
  value: number;
  weight: number;
  efficiency: number;
  quantity?: number;
}

interface Metrics {
  avg_efficiency: number;
  value_density: number;
  weight_utilization: number;
  theoretical_max: number;
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
      selected_items: SelectedItem[];
      excluded_items: SelectedItem[];
      total_value: number;
      total_weight: number;
      capacity: number;
      utilization: number;
      num_selected: number;
      num_total: number;
      metrics: Metrics;
    };
    key_insights: KeyInsight[];
    summary: {
      problem_type: string;
      algorithm: string;
      capacity: number;
      total_value: number;
      solve_time_ms: number;
    };
  };
  problemType: string;
  capacity: number;
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
    "0_1": "0/1 Knapsack",
    bounded: "Bounded Knapsack",
    unbounded: "Unbounded Knapsack",
  };
  return labels[type] || type.replace(/_/g, " ");
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `$${num.toLocaleString()}`;
}

function formatWeight(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)}kg`;
}

function formatPercent(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)}%`;
}

function formatEfficiency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `$${num.toFixed(1)}/kg`;
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
    ["Problem Type", getProblemTypeLabel(problemType), "Items Selected", `${r.num_selected} / ${r.num_total}`],
    ["Capacity", formatWeight(r.capacity), "Weight Used", formatWeight(r.total_weight)],
    ["Total Value", formatCurrency(r.total_value), "Utilization", formatPercent(r.utilization)],
    ["Avg Efficiency", formatEfficiency(r.metrics.avg_efficiency), "Solve Time", `${summary.solve_time_ms}ms`],
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

function createSelectedItemsTable(items: SelectedItem[], metrics: Metrics): Table {
  const colWidths = [1000, 3000, 1800, 1800, 2000, 1400];

  const maxEfficiency = Math.max(...items.map(i => i.efficiency));
  const maxValue = Math.max(...items.map(i => i.value));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("#", colWidths[0]),
          createHeaderCell("Item ID", colWidths[1]),
          createHeaderCell("Value", colWidths[2]),
          createHeaderCell("Weight", colWidths[3]),
          createHeaderCell("Efficiency", colWidths[4]),
          createHeaderCell("Status", colWidths[5]),
        ],
      }),
      ...items.map((item, idx) => {
        const isMostEfficient = item.efficiency === maxEfficiency;
        const isMostValuable = item.value === maxValue;
        const status = isMostEfficient ? "Best Eff" : isMostValuable ? "Top Value" : "-";
        const statusColor = isMostEfficient ? COLORS.success : isMostValuable ? COLORS.primary : undefined;

        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(item.item_id, colWidths[1], idx % 2 === 1),
            createDataCell(formatCurrency(item.value), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatWeight(item.weight), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatEfficiency(item.efficiency), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(status, colWidths[5], idx % 2 === 1, AlignmentType.CENTER, statusColor),
          ],
        });
      }),
      // Total row
      new TableRow({
        children: [
          createDataCell("", colWidths[0], false, AlignmentType.CENTER),
          createDataCell("Total", colWidths[1], false, AlignmentType.LEFT, COLORS.primary),
          createDataCell(formatCurrency(items.reduce((sum, i) => sum + i.value, 0)), colWidths[2], false, AlignmentType.RIGHT, COLORS.primary),
          createDataCell(formatWeight(items.reduce((sum, i) => sum + i.weight, 0)), colWidths[3], false, AlignmentType.RIGHT, COLORS.primary),
          createDataCell("-", colWidths[4], false, AlignmentType.RIGHT),
          createDataCell("", colWidths[5], false, AlignmentType.CENTER),
        ],
      }),
    ],
  });
}

function createExcludedItemsTable(items: SelectedItem[]): Table {
  const colWidths = [1000, 3500, 2000, 2000, 2500];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("#", colWidths[0]),
          createHeaderCell("Item ID", colWidths[1]),
          createHeaderCell("Value", colWidths[2]),
          createHeaderCell("Weight", colWidths[3]),
          createHeaderCell("Efficiency", colWidths[4]),
        ],
      }),
      ...items.slice(0, 15).map((item, idx) => {
        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(item.item_id, colWidths[1], idx % 2 === 1),
            createDataCell(formatCurrency(item.value), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatWeight(item.weight), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatEfficiency(item.efficiency), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(metrics: Metrics, r: RequestBody["results"]["results"]): Table {
  const colWidths = [5000, 5000];

  const rows = [
    ["Items Selected", `${r.num_selected} of ${r.num_total}`],
    ["Total Value", formatCurrency(r.total_value)],
    ["Total Weight", formatWeight(r.total_weight)],
    ["Capacity", formatWeight(r.capacity)],
    ["Remaining Capacity", formatWeight(r.capacity - r.total_weight)],
    ["Capacity Utilization", formatPercent(r.utilization)],
    ["Average Efficiency", formatEfficiency(metrics.avg_efficiency)],
    ["Value Density", formatEfficiency(metrics.value_density)],
    ["Theoretical Maximum", formatCurrency(metrics.theoretical_max)],
    ["Solution Quality", formatPercent((r.total_value / metrics.theoretical_max) * 100)],
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

function createItemDetailsParagraphs(items: SelectedItem[], totalValue: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const maxEfficiency = Math.max(...items.map(i => i.efficiency));
  const maxValue = Math.max(...items.map(i => i.value));

  items.forEach((item, idx) => {
    const isMostEfficient = item.efficiency === maxEfficiency;
    const isMostValuable = item.value === maxValue;
    const valueColor = isMostEfficient ? COLORS.success : isMostValuable ? COLORS.primary : undefined;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `Item ${idx + 1}: `, bold: true, size: 22 }),
          new TextRun({ text: item.item_id, size: 22 }),
          new TextRun({ text: ` — `, size: 22, color: COLORS.secondary }),
          new TextRun({ text: formatCurrency(item.value), size: 22, bold: true, color: valueColor }),
          new TextRun({ text: ` (${formatWeight(item.weight)}, ${formatEfficiency(item.efficiency)})`, size: 20, color: COLORS.secondary }),
          ...(isMostEfficient ? [new TextRun({ text: " ★ Most Efficient", size: 20, color: COLORS.success })] : []),
          ...(isMostValuable && !isMostEfficient ? [new TextRun({ text: " ★ Highest Value", size: 20, color: COLORS.primary })] : []),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: `Contributes ${((item.value / totalValue) * 100).toFixed(1)}% of total value`, 
          size: 20, 
          color: COLORS.secondary 
        })],
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
        text: "The Knapsack Problem finds the optimal combination of items to maximize total value while respecting capacity constraints.",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Problem Type:", bold: true, size: 22 })],
    })
  );

  if (problemType === "0_1") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "0/1 Knapsack: Each item can be selected at most once. Binary decision for each item.",
          size: 20
        })],
      })
    );
  } else if (problemType === "bounded") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Bounded Knapsack: Each item has a limited quantity available. Can select multiple copies up to the limit.",
          size: 20
        })],
      })
    );
  } else if (problemType === "unbounded") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Unbounded Knapsack: Unlimited quantity of each item available. Can select any number of copies.",
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
      children: [new TextRun({ text: "• Dynamic Programming: O(n × capacity) complexity", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Guarantees globally optimal solution", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Implemented via Google OR-Tools knapsack solver", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Capacity Utilization Interpretation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 95%+ : Excellent - near-optimal packing achieved", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 80-95%: Good - reasonable capacity usage", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Below 80%: Consider adding smaller high-value items", size: 20, color: COLORS.danger })],
    })
  );

  return paragraphs;
}

function createRecommendationsSection(r: RequestBody["results"]["results"], problemType: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Top selected items
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Top Selected Items by Efficiency:", bold: true, size: 22 })],
    })
  );

  const topByEfficiency = [...r.selected_items].sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);
  topByEfficiency.forEach((item, idx) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: `${idx + 1}. ${item.item_id}: ${formatEfficiency(item.efficiency)} (${formatCurrency(item.value)}, ${formatWeight(item.weight)})`, 
          size: 20 
        })],
      })
    );
  });

  // Utilization analysis
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Capacity Analysis:", bold: true, size: 22 })],
    })
  );

  if (r.utilization >= 95) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `✓ Excellent capacity utilization (${formatPercent(r.utilization)}). Near-optimal packing achieved.`,
          size: 20,
          color: COLORS.success
        })],
      })
    );
  } else if (r.utilization >= 80) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `△ Good capacity utilization (${formatPercent(r.utilization)}). ${formatWeight(r.capacity - r.total_weight)} remaining capacity.`,
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
          text: `⚠ Low capacity utilization (${formatPercent(r.utilization)}). Consider:`,
          size: 20,
          color: COLORS.danger
        })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 720 },
        children: [new TextRun({ text: "• Adding smaller high-value items", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 720 },
        children: [new TextRun({ text: "• Reviewing item weights and capacity constraints", size: 20 })],
      })
    );
  }

  // Excluded items analysis
  if (r.excluded_items.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Excluded Items Analysis:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `${r.excluded_items.length} items were excluded. Top excluded by value:`,
          size: 20
        })],
      })
    );

    const topExcluded = [...r.excluded_items].sort((a, b) => b.value - a.value).slice(0, 3);
    topExcluded.forEach((item, idx) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 720 },
          children: [new TextRun({ 
            text: `${idx + 1}. ${item.item_id}: ${formatCurrency(item.value)} (${formatWeight(item.weight)}, ${formatEfficiency(item.efficiency)})`, 
            size: 20,
            color: COLORS.secondary
          })],
        })
      );
    });

    paragraphs.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: "Items were excluded due to weight constraints or lower efficiency compared to selected items.",
          size: 20,
          color: COLORS.secondary,
          italics: true
        })],
      })
    );
  }

  // Sensitivity analysis
  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Sensitivity Analysis:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• If capacity increases by 10% (${formatWeight(r.capacity * 1.1)}): May include additional items`, 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• If capacity decreases by 10% (${formatWeight(r.capacity * 0.9)}): Would need to remove ~${Math.ceil(r.selected_items.length * 0.1)} items`, 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Re-optimization Triggers:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Item values or weights change significantly", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Capacity constraints are updated", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• New items become available", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Budget or resource priorities shift", size: 20 })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, problemType, capacity } = body;

    const summary = results.summary;
    const r = results.results;
    const keyInsights = results.key_insights;
    const selectedItems = r.selected_items;
    const excludedItems = r.excluded_items;
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
                      text: "Knapsack Optimization Report",
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
                  text: "Knapsack Problem",
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
                  text: `This optimization selected ${r.num_selected} of ${r.num_total} items achieving a total value of ${formatCurrency(r.total_value)}. ` +
                    `Used ${formatWeight(r.total_weight)} of ${formatWeight(r.capacity)} capacity (${formatPercent(r.utilization)} utilization). ` +
                    `Average efficiency: ${formatEfficiency(metrics.avg_efficiency)}.`,
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

            // ===== 3. SELECTED ITEMS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Selected Items")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `${r.num_selected} items selected for optimal value within capacity constraints.`,
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createSelectedItemsTable(selectedItems, metrics),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. ITEM DETAILS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Item Details")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Detailed breakdown of each selected item's contribution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createItemDetailsParagraphs(selectedItems, r.total_value),

            // ===== 5. EXCLUDED ITEMS =====
            ...(excludedItems.length > 0 ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun("5. Excluded Items")],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `${excludedItems.length} items excluded due to capacity constraints.`,
                    size: 20,
                    color: COLORS.secondary,
                  }),
                ],
              }),
              createExcludedItemsTable(excludedItems),
              ...(excludedItems.length > 15 ? [
                new Paragraph({
                  spacing: { before: 80 },
                  children: [
                    new TextRun({
                      text: `... and ${excludedItems.length - 15} more excluded items`,
                      size: 18,
                      color: COLORS.secondary,
                      italics: true,
                    }),
                  ],
                }),
              ] : []),
            ] : []),

            // ===== 6. PERFORMANCE METRICS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(excludedItems.length > 0 ? "6. Performance Metrics" : "5. Performance Metrics")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Key performance indicators for the knapsack solution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createMetricsTable(metrics, r),

            // ===== 7. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(excludedItems.length > 0 ? "7. Methodology" : "6. Methodology")],
            }),
            ...createMethodologySection(problemType),

            // ===== 8. RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(excludedItems.length > 0 ? "8. Recommendations" : "7. Recommendations")],
            }),
            ...createRecommendationsSection(r, problemType),

            // ===== ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(excludedItems.length > 0 ? "9. About This Report" : "8. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated using Dynamic Programming via Google OR-Tools. The solution is globally optimal for the given constraints.",
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
                new TextRun({ text: "Total Items: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.num_total), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Items Selected: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(r.num_selected), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Capacity: ", bold: true, size: 20 }),
                new TextRun({ text: formatWeight(r.capacity), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Value: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(r.total_value), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Weight: ", bold: true, size: 20 }),
                new TextRun({ text: formatWeight(r.total_weight), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Utilization: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(r.utilization), size: 20 }),
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
        "Content-Disposition": `attachment; filename=knapsack_report_${new Date().toISOString().split("T")[0]}.docx`,
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