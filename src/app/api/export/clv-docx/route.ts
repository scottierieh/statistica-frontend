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
interface CustomerSegment {
  segment: string;
  customer_count: number;
  pct_of_customers: number;
  total_revenue: number;
  avg_clv: number;
  avg_orders: number;
  avg_aov: number;
  retention_rate: number;
}

interface CohortCLV {
  cohort: string;
  customers: number;
  month_0: number;
  month_3: number;
  month_6: number;
  month_12: number;
  projected_clv: number;
}

interface CLVDistribution {
  bucket: string;
  count: number;
  pct: number;
  cumulative_revenue_pct: number;
}

interface RFMSegment {
  segment: string;
  description: string;
  count: number;
  avg_clv: number;
  action: string;
}

interface TopCustomer {
  customer_id: string;
  clv: number;
  orders: number;
  first_purchase: string;
  last_purchase: string;
  segment: string;
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
      summary: {
        total_customers: number;
        total_revenue: number;
        avg_clv: number;
        median_clv: number;
        avg_orders_per_customer: number;
        avg_order_value: number;
        avg_customer_lifespan: number;
        retention_rate: number;
        top_20_pct_revenue: number;
      };
      customer_segments: CustomerSegment[];
      cohort_clv: CohortCLV[];
      clv_distribution: CLVDistribution[];
      rfm_segments: RFMSegment[];
      top_customers: TopCustomer[];
    };
    key_insights: KeyInsight[];
    summary: {
      analysis_date: string;
      time_period: string;
      solve_time_ms: number;
    };
  };
  clvModel: string;
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
function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(1)}%`;
}

function getModelLabel(model: string): string {
  const labels: Record<string, string> = {
    historical: "Historical CLV",
    simple: "Simple CLV",
    cohort: "Cohort-based CLV",
  };
  return labels[model] || model;
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

function createDataCell(text: string, width: number, isAlt: boolean = false, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
    return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: isAlt ? { fill: COLORS.altRowBg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
  });
}

function createSummaryMetricsTable(summary: RequestBody["results"]["results"]["summary"]): Table {
  const colWidths = [3200, 2200, 3200, 2200];
  
  const rows = [
    ["Total Customers", formatNumber(summary.total_customers), "Total Revenue", formatCurrency(summary.total_revenue)],
    ["Average CLV", formatCurrency(summary.avg_clv), "Median CLV", formatCurrency(summary.median_clv)],
    ["Avg Orders/Customer", formatNumber(summary.avg_orders_per_customer, 1), "Avg Order Value", formatCurrency(summary.avg_order_value)],
    ["Retention Rate", formatPercent(summary.retention_rate), "Top 20% Revenue", formatPercent(summary.top_20_pct_revenue)],
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

function createCLVDistributionTable(distribution: CLVDistribution[]): Table {
  const colWidths = [2400, 2000, 2000, 2400];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("CLV Range", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("% of Total", colWidths[2]),
          createHeaderCell("Cumulative Rev %", colWidths[3]),
        ],
      }),
      ...distribution.map((row, idx) =>
        new TableRow({
          children: [
            createDataCell(row.bucket, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(row.count), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(row.pct), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(row.cumulative_revenue_pct), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createSegmentTable(segments: CustomerSegment[]): Table {
  const colWidths = [1400, 1200, 1000, 1400, 1200, 1100, 1100, 1200];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Segment", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("%", colWidths[2]),
          createHeaderCell("Total Rev", colWidths[3]),
          createHeaderCell("Avg CLV", colWidths[4]),
          createHeaderCell("Avg Orders", colWidths[5]),
          createHeaderCell("AOV", colWidths[6]),
          createHeaderCell("Retention", colWidths[7]),
        ],
      }),
      ...segments.map((seg, idx) =>
        new TableRow({
          children: [
            createDataCell(seg.segment, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(seg.customer_count), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(seg.pct_of_customers), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(seg.total_revenue), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(seg.avg_clv), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(seg.avg_orders, 1), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(seg.avg_aov), colWidths[6], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(seg.retention_rate), colWidths[7], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createCohortTable(cohorts: CohortCLV[]): Table {
  const colWidths = [1400, 1200, 1200, 1200, 1200, 1400, 1600];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Cohort", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("Month 0", colWidths[2]),
          createHeaderCell("Month 3", colWidths[3]),
          createHeaderCell("Month 6", colWidths[4]),
          createHeaderCell("Month 12", colWidths[5]),
          createHeaderCell("Projected CLV", colWidths[6]),
        ],
      }),
      ...cohorts.slice(0, 8).map((cohort, idx) =>
        new TableRow({
          children: [
            createDataCell(cohort.cohort, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(cohort.customers), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(cohort.month_0), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(cohort.month_3), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(cohort.month_6), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(cohort.month_12), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(cohort.projected_clv), colWidths[6], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createTopCustomersTable(customers: TopCustomer[]): Table {
  const colWidths = [1800, 1400, 1200, 1600, 1600, 1400];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Customer ID", colWidths[0]),
          createHeaderCell("CLV", colWidths[1]),
          createHeaderCell("Orders", colWidths[2]),
          createHeaderCell("First Purchase", colWidths[3]),
          createHeaderCell("Last Purchase", colWidths[4]),
          createHeaderCell("Segment", colWidths[5]),
        ],
      }),
      ...customers.slice(0, 10).map((cust, idx) =>
        new TableRow({
          children: [
            createDataCell(cust.customer_id, colWidths[0], idx % 2 === 1),
            createDataCell(formatCurrency(cust.clv), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(cust.orders), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(cust.first_purchase, colWidths[3], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(cust.last_purchase, colWidths[4], idx % 2 === 1, AlignmentType.CENTER),
            createDataCell(cust.segment, colWidths[5], idx % 2 === 1, AlignmentType.CENTER),
          ],
        })
      ),
    ],
  });
}

// ============ Content Builders ============
function createKeyInsightsParagraphs(insights: KeyInsight[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  insights.forEach((insight) => {
    const statusIcon = insight.status === "positive" ? "✓" : insight.status === "warning" ? "⚠" : "•";
    const statusColor = insight.status === "positive" ? COLORS.success : insight.status === "warning" ? COLORS.warning : COLORS.secondary;
    
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

function createSegmentRecommendations(segments: RFMSegment[]): Paragraph[] {
  const recommendations: Record<string, { priority: string; tactics: string[] }> = {
    Champions: { 
      priority: "Retain", 
      tactics: ["VIP Program", "Exclusive Offers", "Referral Rewards", "Early Access"]
    },
    Loyal: { 
      priority: "Grow", 
      tactics: ["Upsell Campaigns", "Loyalty Rewards", "Product Recommendations", "Tier Upgrades"]
    },
    Potential: { 
      priority: "Convert", 
      tactics: ["Personalized Offers", "Engagement Programs", "Product Education", "Milestone Rewards"]
    },
    New: { 
      priority: "Nurture", 
      tactics: ["Welcome Series", "Onboarding Guide", "First Purchase Discount", "Product Tours"]
    },
    "At Risk": { 
      priority: "Critical", 
      tactics: ["Win-back Campaign", "Personal Outreach", "Special Incentives", "Feedback Request"]
    },
    Hibernating: { 
      priority: "Reactivate", 
      tactics: ["Deep Discounts", "Reactivation Email", "Product Updates", "Limited Offers"]
    },
  };

  const paragraphs: Paragraph[] = [];

  segments.forEach((seg) => {
    const rec = recommendations[seg.segment] || { priority: "Monitor", tactics: ["Standard Engagement"] };
    const priorityColor = ["Critical", "Reactivate"].includes(rec.priority) ? COLORS.danger : 
                          ["Retain", "Grow"].includes(rec.priority) ? COLORS.success : COLORS.primary;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: seg.segment, bold: true, size: 22 }),
          new TextRun({ text: ` (${formatNumber(seg.count)} customers, Avg CLV: ${formatCurrency(seg.avg_clv)})`, size: 20, color: COLORS.secondary }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Priority: ", bold: true, size: 20 }),
          new TextRun({ text: rec.priority, bold: true, color: priorityColor, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [new TextRun({ text: seg.description, size: 20, color: COLORS.secondary })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Action: ", bold: true, size: 20 }),
          new TextRun({ text: seg.action, size: 20 })
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Tactics: ", bold: true, size: 20 }),
          new TextRun({ text: rec.tactics.join(" • "), size: 20, color: COLORS.secondary }),
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
        text: "Customer Lifetime Value (CLV) measures the total revenue a business can expect from a single customer account throughout their relationship. This analysis combines CLV calculation with RFM segmentation for actionable insights.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "CLV Calculation Methods:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Historical CLV: Sum of all past transactions per customer. Simple but backward-looking.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Simple CLV: AOV × Purchase Frequency × Customer Lifespan. Projects future value.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Cohort-based CLV: Analyzes customer behavior by acquisition cohort to project lifetime value.", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "RFM Segmentation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Recency (R): Days since last purchase. Lower is better (more recent).", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Frequency (F): Total number of purchases. Higher indicates loyalty.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Monetary (M): Total spending amount. Higher indicates customer value.", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Key Metrics Explained:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Retention Rate: Percentage of customers with more than one purchase.", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Top 20% Revenue: Revenue contribution from top 20% of customers (Pareto principle).", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Customer Lifespan: Days between first and last purchase.", size: 20 })],
    }),
  ];
}

function createStrategicFrameworkSection(summary: RequestBody["results"]["results"]["summary"]): Paragraph[] {
  const paretoStrength = summary.top_20_pct_revenue > 70 ? "strong" : summary.top_20_pct_revenue > 50 ? "moderate" : "weak";
  const retentionHealth = summary.retention_rate > 40 ? "healthy" : summary.retention_rate > 25 ? "moderate" : "needs improvement";

  return [
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Business Health Indicators:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• Pareto Distribution: ${paretoStrength.charAt(0).toUpperCase() + paretoStrength.slice(1)} (Top 20% = ${formatPercent(summary.top_20_pct_revenue)} revenue). ${paretoStrength === "strong" ? "Focus retention efforts on top customers." : "Opportunity to develop mid-tier customers."}`, 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• Retention: ${retentionHealth.charAt(0).toUpperCase() + retentionHealth.slice(1)} (${formatPercent(summary.retention_rate)}). ${retentionHealth === "healthy" ? "Maintain current engagement strategies." : "Prioritize repeat purchase incentives."}`, 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: `• Average CLV: ${formatCurrency(summary.avg_clv)} with ${formatNumber(summary.avg_orders_per_customer, 1)} orders per customer. ${summary.avg_orders_per_customer > 3 ? "Good repeat purchase behavior." : "Focus on second purchase conversion."}`, 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Resource Allocation by Segment:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Champions & Loyal (30-40% budget): VIP treatment, exclusive access, referral programs", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Potential & New (25-30% budget): Onboarding, education, progressive engagement", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• At Risk (20-25% budget): Immediate win-back campaigns, personal outreach", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Hibernating (10-15% budget): Low-cost reactivation tests, eventual cleanup", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "CLV Improvement Strategies:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Increase AOV: Bundle offers, upselling, minimum order incentives", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Increase Frequency: Subscription programs, replenishment reminders, loyalty points", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Extend Lifespan: Engagement programs, product education, community building", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Reduce Churn: Proactive outreach, win-back campaigns, exit surveys", size: 20 })],
    }),
  ];
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, clvModel } = body;
    
    const summary = results.results.summary;
    const segments = results.results.customer_segments;
    const rfmSegments = results.results.rfm_segments;
    const distribution = results.results.clv_distribution;
    const cohorts = results.results.cohort_clv;
    const topCustomers = results.results.top_customers;
    const keyInsights = results.key_insights;
    const meta = results.summary;

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
            paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 26, bold: true, color: COLORS.primary },
            paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
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
                      text: "Customer Lifetime Value Report",
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
                  text: "Customer Lifetime Value Report",
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
                  text: getModelLabel(clvModel),
                  size: 28,
                  italics: true,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: `${meta.time_period} | Report Generated: ${meta.analysis_date}`,
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
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `This analysis covers ${formatNumber(summary.total_customers)} customers with total revenue of ${formatCurrency(summary.total_revenue)}. The average Customer Lifetime Value is ${formatCurrency(summary.avg_clv)}, with a retention rate of ${formatPercent(summary.retention_rate)}. The top 20% of customers contribute ${formatPercent(summary.top_20_pct_revenue)} of total revenue, indicating a ${summary.top_20_pct_revenue > 70 ? "strong" : "moderate"} Pareto distribution.`,
                  size: 22,
                }),
              ],
            }),
            createSummaryMetricsTable(summary),

            // ===== 2. CLV DISTRIBUTION =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. CLV Distribution")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Distribution of customers across CLV ranges, showing customer concentration and cumulative revenue contribution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createCLVDistributionTable(distribution),

            // ===== 3. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. CUSTOMER SEGMENTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Customer Segments")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "RFM-based customer segments with key metrics. Segments are sorted by average CLV.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createSegmentTable(segments),

            // ===== 5. SEGMENT RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Segment Recommendations")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Tailored strategies and tactics for each customer segment based on their characteristics and value.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createSegmentRecommendations(rfmSegments),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 6. COHORT ANALYSIS =====
            ...(cohorts.length > 0 ? [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun("6. Cohort Analysis")],
              }),
              new Paragraph({
                spacing: { after: 160 },
                children: [
                  new TextRun({
                    text: "CLV progression by customer acquisition cohort. Shows cumulative value at different time periods and projected lifetime value.",
                    size: 20,
                    color: COLORS.secondary,
                  }),
                ],
              }),
              createCohortTable(cohorts),
            ] : []),

            // ===== 7. TOP CUSTOMERS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(`${cohorts.length > 0 ? "7" : "6"}. Top Customers`)],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Highest value customers ranked by total CLV. These customers represent your most valuable relationships.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createTopCustomersTable(topCustomers),

            // ===== 8. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(`${cohorts.length > 0 ? "8" : "7"}. Methodology`)],
            }),
            ...createMethodologySection(),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 9. STRATEGIC FRAMEWORK =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(`${cohorts.length > 0 ? "9" : "8"}. Strategic Framework`)],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Business health assessment and recommended strategies based on analysis results.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createStrategicFrameworkSection(summary),

            // ===== 10. ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun(`${cohorts.length > 0 ? "10" : "9"}. About This Report`)],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated based on customer transaction data analysis.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({ text: "Analysis Model: ", bold: true, size: 20 }),
                new TextRun({ text: getModelLabel(clvModel), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time Period: ", bold: true, size: 20 }),
                new TextRun({ text: meta.time_period, size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Customers: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.total_customers), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Revenue: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(summary.total_revenue), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Average CLV: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(summary.avg_clv), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Analysis Date: ", bold: true, size: 20 }),
                new TextRun({ text: meta.analysis_date, size: 20 }),
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
        "Content-Disposition": `attachment; filename=clv_report_${new Date().toISOString().split("T")[0]}.docx`,
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
