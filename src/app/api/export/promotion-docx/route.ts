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
interface ChannelAllocation {
  channel: string;
  current_budget: number;
  optimized_budget: number;
  change_pct: number;
  current_roi: number;
  expected_roi: number;
  current_revenue: number;
  expected_revenue: number;
  saturation_level: number;
}

interface PromoScenario {
  name: string;
  total_budget: number;
  expected_revenue: number;
  expected_roi: number;
  risk_level: string;
}

interface SensitivityItem {
  parameter: string;
  base_value: number;
  impact_on_revenue: number;
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
        total_budget: number;
        current_revenue: number;
        optimized_revenue: number;
        revenue_lift: number;
        revenue_lift_pct: number;
        current_roi: number;
        optimized_roi: number;
        roi_improvement: number;
      };
      channel_allocations: ChannelAllocation[];
      product_allocations: any[];
      scenarios: PromoScenario[];
      constraints_status: any[];
      sensitivity: SensitivityItem[];
    };
    key_insights: KeyInsight[];
    summary: {
      optimization_method: string;
      best_channel: string;
      biggest_change: string;
      solve_time_ms: number;
    };
  };
  objective: string;
  channelCol: string;
  budgetCol: string;
  revenueCol: string;
  totalBudget: number;
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
function getObjectiveLabel(objective: string): string {
  const labels: Record<string, string> = {
    max_revenue: "Maximize Revenue",
    max_roi: "Maximize ROI",
    max_profit: "Maximize Profit",
    balanced: "Balanced Optimization",
  };
  return labels[objective] || objective;
}

function formatNumber(num: number | undefined | null, decimals: number = 0): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(num: number | undefined | null, isDecimal: boolean = false): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  const value = isDecimal ? num * 100 : num;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatROI(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "-";
  return `${num.toFixed(2)}x`;
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
  align: AlignmentType = AlignmentType.LEFT,
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

function createExecutiveSummaryTable(summary: RequestBody["results"]["results"]["summary"]): Table {
  const colWidths = [3200, 2300, 3200, 2300];
  
  const rows = [
    ["Total Budget", formatCurrency(summary.total_budget), "Current Revenue", formatCurrency(summary.current_revenue)],
    ["Optimized Revenue", formatCurrency(summary.optimized_revenue), "Revenue Lift", formatCurrency(summary.revenue_lift)],
    ["Current ROI", formatROI(summary.current_roi), "Optimized ROI", formatROI(summary.optimized_roi)],
    ["Revenue Lift %", formatPercent(summary.revenue_lift_pct, true), "ROI Improvement", formatPercent(summary.roi_improvement, true)],
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

function createChannelAllocationTable(allocations: ChannelAllocation[]): Table {
  const colWidths = [2000, 1400, 1400, 1200, 1200, 1400, 1200];
  
  // Sort by expected revenue (descending)
  const sorted = [...allocations].sort((a, b) => b.expected_revenue - a.expected_revenue);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Channel", colWidths[0]),
          createHeaderCell("Current", colWidths[1]),
          createHeaderCell("Optimized", colWidths[2]),
          createHeaderCell("Change", colWidths[3]),
          createHeaderCell("Exp. ROI", colWidths[4]),
          createHeaderCell("Exp. Revenue", colWidths[5]),
          createHeaderCell("Saturation", colWidths[6]),
        ],
      }),
      ...sorted.map((ch, idx) => {
        const changeColor = ch.change_pct >= 0 ? COLORS.success : COLORS.danger;
        const satColor = ch.saturation_level > 0.8 ? COLORS.danger : ch.saturation_level > 0.6 ? COLORS.warning : COLORS.success;
        
        return new TableRow({
          children: [
            createDataCell(ch.channel, colWidths[0], idx % 2 === 1),
            createDataCell(formatCurrency(ch.current_budget), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(ch.optimized_budget), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(ch.change_pct, true), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT, changeColor),
            createDataCell(formatROI(ch.expected_roi), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(ch.expected_revenue), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(`${(ch.saturation_level * 100).toFixed(0)}%`, colWidths[6], idx % 2 === 1, AlignmentType.RIGHT, satColor),
          ],
        });
      }),
    ],
  });
}

function createScenarioComparisonTable(scenarios: PromoScenario[]): Table {
  const colWidths = [2200, 2200, 2200, 1800, 1600];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Scenario", colWidths[0]),
          createHeaderCell("Total Budget", colWidths[1]),
          createHeaderCell("Expected Revenue", colWidths[2]),
          createHeaderCell("Expected ROI", colWidths[3]),
          createHeaderCell("Risk Level", colWidths[4]),
        ],
      }),
      ...scenarios.map((scenario, idx) => {
        const riskColor = scenario.risk_level === 'High' ? COLORS.danger : 
                          scenario.risk_level === 'Medium' ? COLORS.warning : COLORS.success;
        
        return new TableRow({
          children: [
            createDataCell(scenario.name, colWidths[0], idx % 2 === 1),
            createDataCell(formatCurrency(scenario.total_budget), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(scenario.expected_revenue), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatROI(scenario.expected_roi), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(scenario.risk_level, colWidths[4], idx % 2 === 1, AlignmentType.CENTER, riskColor),
          ],
        });
      }),
    ],
  });
}

function createSensitivityTable(sensitivity: SensitivityItem[]): Table {
  const colWidths = [4000, 3000, 3000];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Parameter", colWidths[0]),
          createHeaderCell("Base Value", colWidths[1]),
          createHeaderCell("Revenue Impact (±10%)", colWidths[2]),
        ],
      }),
      ...sensitivity.map((s, idx) => {
        const impactColor = s.impact_on_revenue > 0 ? COLORS.success : COLORS.danger;
        
        return new TableRow({
          children: [
            createDataCell(s.parameter, colWidths[0], idx % 2 === 1),
            createDataCell(formatCurrency(s.base_value), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(
              `${s.impact_on_revenue >= 0 ? '+' : ''}${formatCurrency(s.impact_on_revenue)}`, 
              colWidths[2], 
              idx % 2 === 1, 
              AlignmentType.RIGHT,
              impactColor
            ),
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

function createChannelRecommendations(allocations: ChannelAllocation[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Sort by absolute change percentage
  const sorted = [...allocations].sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
  
  sorted.forEach((ch) => {
    const isIncrease = ch.change_pct >= 0;
    const priorityColor = isIncrease ? COLORS.success : COLORS.warning;
    const priority = Math.abs(ch.change_pct) > 0.3 ? "High" : 
                     Math.abs(ch.change_pct) > 0.15 ? "Medium" : "Low";
    
    let recommendation: string;
    let tactics: string[];
    
    if (ch.saturation_level > 0.8) {
      recommendation = "Channel approaching saturation. Diminishing returns expected. Consider reallocating budget to higher-growth channels.";
      tactics = ["Monitor ROI closely", "Test reduced spend", "Diversify to other channels"];
    } else if (isIncrease && ch.change_pct > 0.2) {
      recommendation = "High growth potential identified. Significant budget increase recommended to capture additional returns.";
      tactics = ["Scale campaigns gradually", "A/B test new creatives", "Expand targeting"];
    } else if (isIncrease) {
      recommendation = "Moderate increase recommended based on response curve analysis. Room for growth exists.";
      tactics = ["Incremental scaling", "Performance monitoring", "Creative refresh"];
    } else if (ch.change_pct < -0.2) {
      recommendation = "Significant budget reduction recommended. Current spend exceeds optimal efficiency point.";
      tactics = ["Reduce spend incrementally", "Focus on high-performing segments", "Reallocate to better channels"];
    } else {
      recommendation = "Minor adjustment recommended. Channel performing close to optimal allocation.";
      tactics = ["Maintain current strategy", "Continuous optimization", "Regular performance review"];
    }
    
    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: ch.channel, bold: true, size: 22 }),
          new TextRun({ 
            text: ` (${formatPercent(ch.change_pct, true)} change)`, 
            size: 20, 
            color: priorityColor 
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Priority: ", bold: true, size: 20 }),
          new TextRun({ text: priority, bold: true, color: priorityColor, size: 20 }),
          new TextRun({ text: ` | Expected ROI: ${formatROI(ch.expected_roi)} | Saturation: ${(ch.saturation_level * 100).toFixed(0)}%`, size: 20, color: COLORS.secondary }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        children: [new TextRun({ text: recommendation, size: 20, color: COLORS.secondary })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: "Tactics: ", bold: true, size: 20 }),
          new TextRun({ text: tactics.join(" • "), size: 20, color: COLORS.secondary }),
        ],
      })
    );
  });

  return paragraphs;
}

function createMethodologySection(objective: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ 
        text: "This optimization uses response curve modeling with diminishing returns to allocate budget across marketing channels for maximum efficiency.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Optimization Approach:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• Objective: ${getObjectiveLabel(objective)}`, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Algorithm: Sequential Least Squares Programming (SLSQP)", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Response Model: Hill function with diminishing returns", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Response Curve Model:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "Revenue = a × (Budget^b) / (k^b + Budget^b)", 
        size: 20,
        italics: true 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• a: Maximum response (saturation level)", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• b: Shape parameter (steepness of curve)", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• k: Half-saturation point (budget at 50% of max response)", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Saturation Level Interpretation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Below 60%: High growth potential, efficient spend zone", size: 20, color: COLORS.success })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• 60-80%: Moderate efficiency, approaching diminishing returns", size: 20, color: COLORS.warning })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Above 80%: Diminishing returns zone, consider reallocation", size: 20, color: COLORS.danger })],
    }),
  ];
}

function createImplementationSection(): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Implementation Roadmap:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Week 1-2: Review recommendations and align with stakeholders", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Week 3-4: Implement changes incrementally (20-30% of recommended shift)", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Week 5-8: Monitor performance and adjust based on actual results", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Monthly: Re-run optimization with updated data", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Key Performance Indicators:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Weekly: Channel-level ROI, spend pacing, revenue tracking", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Bi-weekly: Saturation level changes, marginal ROI trends", size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ text: "• Monthly: Overall portfolio ROI, budget efficiency, scenario comparison", size: 20 })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Risk Mitigation:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Set guardrails: Don't shift more than 30% of any channel budget at once", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• A/B test: Run controlled experiments before full rollout", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Hold reserve: Keep 10-15% budget flexible for opportunities", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Monitor seasonality: Adjust for market conditions and competitive actions", 
        size: 20 
      })],
    }),
  ];
}

// ============ Main Export Handler ============
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { results, objective, totalBudget } = body;
    
    const summaryData = results.results.summary;
    const channelAllocations = results.results.channel_allocations;
    const scenarios = results.results.scenarios;
    const sensitivity = results.results.sensitivity;
    const keyInsights = results.key_insights;
    const metaSummary = results.summary;

    // Find best and worst performing channels
    const bestChannel = [...channelAllocations].sort((a, b) => b.expected_roi - a.expected_roi)[0];
    const worstChannel = [...channelAllocations].sort((a, b) => a.expected_roi - b.expected_roi)[0];
    const biggestIncrease = [...channelAllocations].sort((a, b) => b.change_pct - a.change_pct)[0];
    const biggestDecrease = [...channelAllocations].sort((a, b) => a.change_pct - b.change_pct)[0];

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
                      text: "Promotion Budget Optimization Report",
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
                  text: "Promotion Budget Optimization Report",
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
                  text: getObjectiveLabel(objective),
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
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `This optimization analysis recommends reallocating ${formatCurrency(totalBudget)} across ${channelAllocations.length} marketing channels to maximize ${objective === 'max_roi' ? 'ROI' : objective === 'max_profit' ? 'profit' : 'revenue'}. ` +
                        `The optimized allocation is expected to generate ${formatCurrency(summaryData.optimized_revenue)} in revenue (${formatPercent(summaryData.revenue_lift_pct, true)} improvement) ` +
                        `with an ROI of ${formatROI(summaryData.optimized_roi)} (${formatPercent(summaryData.roi_improvement, true)} improvement over current). ` +
                        `Best performing channel: ${metaSummary.best_channel}. Biggest recommended change: ${metaSummary.biggest_change}.`,
                  size: 22,
                }),
              ],
            }),
            createExecutiveSummaryTable(summaryData),

            // ===== 2. CHANNEL ALLOCATION =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Channel Budget Allocation")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "The following table shows the recommended budget allocation for each channel, sorted by expected revenue contribution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createChannelAllocationTable(channelAllocations),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({
                  text: "Note: Saturation level indicates diminishing returns. Channels above 80% saturation should be monitored closely.",
                  size: 18,
                  italics: true,
                  color: COLORS.secondary,
                }),
              ],
            }),

            // ===== 3. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. CHANNEL RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Channel-Specific Recommendations")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Detailed recommendations for each channel based on response curve analysis and saturation levels.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createChannelRecommendations(channelAllocations),

            // ===== 5. SCENARIO COMPARISON =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Scenario Comparison")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Compare different budget scenarios to find the right balance between revenue maximization and risk management.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createScenarioComparisonTable(scenarios),

            // ===== 6. SENSITIVITY ANALYSIS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("6. Sensitivity Analysis")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Impact of ±10% budget change on expected revenue for key channels.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            createSensitivityTable(sensitivity),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 7. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("7. Methodology")],
            }),
            ...createMethodologySection(objective),

            // ===== 8. IMPLEMENTATION GUIDE =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("8. Implementation Guide")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Recommended approach for implementing the optimized budget allocation.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createImplementationSection(),

            // ===== 9. ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("9. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated based on historical promotion performance data. Recommendations are derived from response curve modeling and optimization algorithms.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({ text: "Optimization Objective: ", bold: true, size: 20 }),
                new TextRun({ text: getObjectiveLabel(objective), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Budget: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(totalBudget), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Channels Analyzed: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(channelAllocations.length), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Expected Revenue: ", bold: true, size: 20 }),
                new TextRun({ text: formatCurrency(summaryData.optimized_revenue), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Expected ROI: ", bold: true, size: 20 }),
                new TextRun({ text: formatROI(summaryData.optimized_roi), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Best Channel: ", bold: true, size: 20 }),
                new TextRun({ text: `${bestChannel.channel} (${formatROI(bestChannel.expected_roi)} ROI)`, size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Optimization Method: ", bold: true, size: 20 }),
                new TextRun({ text: metaSummary.optimization_method, size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Solve Time: ", bold: true, size: 20 }),
                new TextRun({ text: `${metaSummary.solve_time_ms}ms`, size: 20 }),
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
        "Content-Disposition": `attachment; filename=promotion_optimization_report_${new Date().toISOString().split("T")[0]}.docx`,
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