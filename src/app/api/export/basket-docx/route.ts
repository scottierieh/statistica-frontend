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
interface AssociationRule {
  antecedents: string[];
  consequents: string[];
  support: number;
  confidence: number;
  lift: number;
  conviction: number;
  leverage: number;
  antecedent_support: number;
  consequent_support: number;
}

interface FrequentItemset {
  itemsets: string[];
  support: number;
  length: number;
}

interface Metrics {
  total_transactions: number;
  unique_items: number;
  avg_basket_size: number;
  total_rules: number;
  max_lift: number;
  avg_confidence: number;
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
      association_rules: AssociationRule[];
      frequent_itemsets: FrequentItemset[];
      item_frequencies: { [key: string]: number };
      metrics: Metrics;
    };
    key_insights: KeyInsight[];
    summary: {
      algorithm: string;
      total_transactions: number;
      total_rules: number;
      min_support: number;
      min_confidence: number;
    };
  };
  algorithm: string;
  minSupport: number;
  minConfidence: number;
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
    apriori: "Apriori Algorithm",
    fpgrowth: "FP-Growth Algorithm",
    fpmax: "FP-Max Algorithm",
  };
  return labels[algo] || algo;
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(num: number | undefined | null, decimals: number = 1): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${(num * 100).toFixed(decimals)}%`;
}

function formatLift(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toFixed(2);
}

function formatConviction(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  if (!isFinite(num)) return "∞";
  return num.toFixed(2);
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
  metrics: Metrics
): Table {
  const colWidths = [3200, 2300, 3200, 2300];

  const rows = [
    ["Algorithm", getAlgorithmLabel(summary.algorithm), "Total Transactions", formatNumber(summary.total_transactions)],
    ["Unique Items", formatNumber(metrics.unique_items), "Avg Basket Size", metrics.avg_basket_size.toFixed(1)],
    ["Min Support", formatPercent(summary.min_support), "Min Confidence", formatPercent(summary.min_confidence)],
    ["Rules Discovered", formatNumber(summary.total_rules), "Max Lift", formatLift(metrics.max_lift)],
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

function createRulesTable(rules: AssociationRule[]): Table {
  const colWidths = [800, 2800, 600, 2800, 1200, 1200, 1200];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("#", colWidths[0]),
          createHeaderCell("Antecedent (If)", colWidths[1]),
          createHeaderCell("→", colWidths[2]),
          createHeaderCell("Consequent (Then)", colWidths[3]),
          createHeaderCell("Support", colWidths[4]),
          createHeaderCell("Confidence", colWidths[5]),
          createHeaderCell("Lift", colWidths[6]),
        ],
      }),
      ...rules.slice(0, 25).map((rule, idx) => {
        const liftColor = rule.lift >= 3 ? COLORS.success : rule.lift >= 2 ? COLORS.primary : undefined;
        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(rule.antecedents.join(" + "), colWidths[1], idx % 2 === 1),
            createDataCell("→", colWidths[2], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(rule.consequents.join(" + "), colWidths[3], idx % 2 === 1),
            createDataCell(formatPercent(rule.support, 2), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(rule.confidence, 1), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatLift(rule.lift), colWidths[6], idx % 2 === 1, AlignmentType.RIGHT, liftColor),
          ],
        });
      }),
    ],
  });
}

function createItemFrequencyTable(itemFrequencies: { [key: string]: number }, totalTransactions: number): Table {
  const colWidths = [1000, 4000, 2500, 2500];
  
  const sortedItems = Object.entries(itemFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("#", colWidths[0]),
          createHeaderCell("Item", colWidths[1]),
          createHeaderCell("Frequency", colWidths[2]),
          createHeaderCell("Support", colWidths[3]),
        ],
      }),
      ...sortedItems.map(([item, count], idx) => {
        return new TableRow({
          children: [
            createDataCell(`${idx + 1}`, colWidths[0], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(item, colWidths[1], idx % 2 === 1),
            createDataCell(formatNumber(count), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(count / totalTransactions, 1), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        });
      }),
    ],
  });
}

function createMetricsTable(metrics: Metrics, summary: RequestBody["results"]["summary"]): Table {
  const colWidths = [5000, 5000];

  const highLiftRules = summary.total_rules; // Would need full rules array to calculate
  const rows = [
    ["Total Transactions", formatNumber(metrics.total_transactions)],
    ["Unique Items", formatNumber(metrics.unique_items)],
    ["Average Basket Size", metrics.avg_basket_size.toFixed(2) + " items"],
    ["Total Rules Discovered", formatNumber(metrics.total_rules)],
    ["Maximum Lift", formatLift(metrics.max_lift)],
    ["Average Confidence", formatPercent(metrics.avg_confidence)],
    ["Minimum Support Threshold", formatPercent(summary.min_support)],
    ["Minimum Confidence Threshold", formatPercent(summary.min_confidence)],
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

function createTopRulesAnalysis(rules: AssociationRule[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const topRules = [...rules].sort((a, b) => b.lift - a.lift).slice(0, 10);

  topRules.forEach((rule, idx) => {
    const isStrong = rule.lift >= 2 && rule.confidence >= 0.5;
    const liftColor = rule.lift >= 3 ? COLORS.success : rule.lift >= 2 ? COLORS.primary : undefined;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `Rule #${idx + 1}: `, bold: true, size: 22 }),
          new TextRun({ text: rule.antecedents.join(" + "), size: 22 }),
          new TextRun({ text: " → ", size: 22, color: COLORS.secondary }),
          new TextRun({ text: rule.consequents.join(" + "), size: 22, color: COLORS.primary }),
          ...(isStrong ? [new TextRun({ text: " ★ Recommended", size: 20, color: COLORS.success })] : []),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `Lift: `, size: 20 }),
          new TextRun({ text: formatLift(rule.lift), size: 20, bold: true, color: liftColor }),
          new TextRun({ text: ` | Confidence: `, size: 20 }),
          new TextRun({ text: formatPercent(rule.confidence), size: 20, bold: true }),
          new TextRun({ text: ` | Support: `, size: 20 }),
          new TextRun({ text: formatPercent(rule.support, 2), size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        indent: { left: 360 },
        children: [
          new TextRun({
            text: `Customers who buy ${rule.antecedents.join(" and ")} are ${rule.lift.toFixed(1)}x more likely to also buy ${rule.consequents.join(" and ")}.`,
            size: 20,
            color: COLORS.secondary,
            italics: true,
          }),
        ],
      })
    );
  });

  return paragraphs;
}

function createMethodologySection(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({
        text: "Association rule mining discovers relationships between items in transactional data. Rules follow the format {Antecedent} → {Consequent}, indicating that customers who purchase antecedent items are likely to also purchase consequent items.",
        size: 20
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Key Metrics:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Support: Frequency of itemset in all transactions. Higher = more common pattern.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Confidence: P(B|A) - probability of consequent given antecedent. Higher = more reliable rule.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Lift: How much more likely B is given A vs. random. Lift > 1 = positive association.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Conviction: Measures rule dependency. Higher = stronger implication.", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Lift Interpretation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• ≥ 3.0: Very strong association → Priority action", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 2.0-3.0: Strong association → Good candidates", size: 20, color: COLORS.primary })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 1.5-2.0: Moderate association → Worth testing", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• < 1.5: Weak association → Low priority", size: 20, color: COLORS.secondary })],
    }),
  ];
}

function createRecommendationsSection(rules: AssociationRule[], metrics: Metrics): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  const highLiftRules = rules.filter(r => r.lift >= 2);
  const strongRules = rules.filter(r => r.confidence >= 0.5);
  const topByLift = [...rules].sort((a, b) => b.lift - a.lift).slice(0, 5);

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Cross-Selling Strategy:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• ${highLiftRules.length} rules with lift ≥ 2 are ideal for "Frequently Bought Together" recommendations`, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• ${strongRules.length} rules with confidence ≥ 50% are reliable for promotional bundles`, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Place high-lift rule items in adjacent aisles or shelves for in-store optimization", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Top Recommendations:", bold: true, size: 22 })],
    })
  );

  topByLift.forEach((rule, idx) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({
          text: `${idx + 1}. ${rule.antecedents.join(" + ")} → ${rule.consequents.join(" + ")} (Lift: ${rule.lift.toFixed(2)}, Conf: ${formatPercent(rule.confidence)})`,
          size: 20
        })],
      })
    );
  });

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Promotional Campaigns:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: '• "Buy A, Get X% off B" promotions using high-lift rules', size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• BOGO offers on strongly associated items", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Email campaigns targeting customers who purchased antecedent items", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Inventory Management:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Ensure co-availability of strongly associated items", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Synchronized restocking schedules for associated products", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Joint demand forecasting based on association patterns", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Re-Analysis Triggers:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Monthly: Review top rules and adjust promotions", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Quarterly: Full re-analysis to discover new patterns", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Seasonally: Analyze seasonal variations in associations", size: 20 })],
    })
  );

  return paragraphs;
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, algorithm, minSupport, minConfidence } = body;

    const summary = results.summary;
    const r = results.results;
    const keyInsights = results.key_insights;
    const rules = r.association_rules;
    const metrics = r.metrics;

    const highLiftRules = rules.filter(rule => rule.lift >= 2).length;
    const strongRules = rules.filter(rule => rule.confidence >= 0.5).length;

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
                      text: "Market Basket Analysis Report",
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
                  text: "Market Basket Analysis",
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
                  text: "Association Rule Mining Report",
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
                  text: getAlgorithmLabel(algorithm || summary.algorithm),
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
                  text: `This analysis discovered ${formatNumber(summary.total_rules)} association rules from ${formatNumber(summary.total_transactions)} transactions containing ${formatNumber(metrics.unique_items)} unique items. ` +
                    `${highLiftRules} rules have lift ≥ 2 (strong associations), and ${strongRules} rules have confidence ≥ 50% (reliable predictions). ` +
                    `The maximum lift value of ${formatLift(metrics.max_lift)} indicates meaningful purchase patterns exist in the data.`,
                  size: 22,
                }),
              ],
            }),
            createSummaryTable(summary, metrics),

            // ===== 2. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== 3. TOP ASSOCIATION RULES =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Top Association Rules")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: `Top ${Math.min(25, rules.length)} rules sorted by lift value.`,
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createRulesTable([...rules].sort((a, b) => b.lift - a.lift)),
            ...(rules.length > 25 ? [
              new Paragraph({
                spacing: { before: 80 },
                children: [
                  new TextRun({
                    text: `... and ${rules.length - 25} more rules`,
                    size: 18,
                    color: COLORS.secondary,
                    italics: true,
                  }),
                ],
              }),
            ] : []),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. RULE ANALYSIS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Detailed Rule Analysis")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "In-depth analysis of top 10 rules with business implications.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createTopRulesAnalysis(rules),

            // ===== 5. ITEM FREQUENCY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Most Frequent Items")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Top 15 items by transaction frequency.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createItemFrequencyTable(r.item_frequencies, metrics.total_transactions),

            // ===== 6. METRICS SUMMARY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("6. Analysis Metrics")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "Key performance indicators for the market basket analysis.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createMetricsTable(metrics, summary),

            // ===== 7. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("7. Methodology")],
            }),
            ...createMethodologySection(),

            // ===== 8. RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("8. Strategic Recommendations")],
            }),
            ...createRecommendationsSection(rules, metrics),

            // ===== ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("9. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated using association rule mining algorithms. The discovered rules represent statistically significant purchase patterns in the transaction data.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({ text: "Algorithm: ", bold: true, size: 20 }),
                new TextRun({ text: getAlgorithmLabel(summary.algorithm), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Transactions: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.total_transactions), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Unique Items: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(metrics.unique_items), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Rules Discovered: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.total_rules), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Minimum Support: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(summary.min_support), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Minimum Confidence: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(summary.min_confidence), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Maximum Lift: ", bold: true, size: 20 }),
                new TextRun({ text: formatLift(metrics.max_lift), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Average Confidence: ", bold: true, size: 20 }),
                new TextRun({ text: formatPercent(metrics.avg_confidence), size: 20 }),
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
        "Content-Disposition": `attachment; filename=basket_analysis_report_${new Date().toISOString().split("T")[0]}.docx`,
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
