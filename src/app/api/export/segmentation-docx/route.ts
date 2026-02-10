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
interface SegmentData {
  count: number;
  percentage: number;
  avg_recency?: number;
  avg_frequency?: number;
  avg_monetary?: number;
  total_monetary?: number;
  revenue_share?: number;
  total_value?: number;
  avg_value?: number;
  avg_silhouette?: number;
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
      segment_distribution: Record<string, SegmentData>;
      customer_segments: Array<Record<string, any>>;
      metrics?: {
        total_customers: number;
        total_revenue: number;
        avg_recency?: number;
        avg_frequency?: number;
        avg_monetary?: number;
        avg_customer_value?: number;
      };
      silhouette_score?: number;
      n_segments?: number;
    };
    key_insights: KeyInsight[];
    summary: {
      analysis_type: string;
      total_customers: number;
      n_segments: number;
      total_transactions: number;
    };
  };
  analysisType: string;
  customerCol: string;
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
function getAnalysisLabel(type: string): string {
  const labels: Record<string, string> = {
    rfm: "RFM Analysis",
    kmeans: "K-Means Clustering",
    value_based: "Value-Based Segmentation",
  };
  return labels[type] || type;
}

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
  align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT  // ✅ 수정
  ): TableCell {
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

function createExecutiveSummaryTable(summary: RequestBody["results"]["summary"], metrics: RequestBody["results"]["results"]["metrics"]): Table {
  const colWidths = [3500, 2500, 3500, 2500];
  
  const rows = [
    ["Total Customers", formatNumber(summary.total_customers), "Total Transactions", formatNumber(summary.total_transactions)],
    ["Segments Identified", formatNumber(summary.n_segments), "Total Revenue", formatCurrency(metrics?.total_revenue)],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      ...rows.map((row, idx) =>
        new TableRow({
          children: [
            createDataCell(row[0], colWidths[0], idx % 2 === 1, AlignmentType.LEFT),
            createDataCell(row[1], colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(row[2], colWidths[2], idx % 2 === 1, AlignmentType.LEFT),
            createDataCell(row[3], colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createRFMSegmentTable(segmentDist: Record<string, SegmentData>): Table {
  const colWidths = [2000, 1200, 1100, 1200, 1200, 1200, 1200];
  const segments = Object.entries(segmentDist).sort((a, b) => (b[1].revenue_share || 0) - (a[1].revenue_share || 0));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Segment", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("%", colWidths[2]),
          createHeaderCell("Avg R", colWidths[3]),
          createHeaderCell("Avg F", colWidths[4]),
          createHeaderCell("Avg M", colWidths[5]),
          createHeaderCell("Rev %", colWidths[6]),
        ],
      }),
      ...segments.map(([name, data], idx) =>
        new TableRow({
          children: [
            createDataCell(name, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(data.count), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.percentage), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(data.avg_recency), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatNumber(data.avg_frequency, 1), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(data.avg_monetary), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.revenue_share), colWidths[6], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createKMeansSegmentTable(segmentDist: Record<string, SegmentData>): Table {
  const colWidths = [2000, 1400, 1400, 1600, 1600, 1400];
  const segments = Object.entries(segmentDist).sort((a, b) => (b[1].revenue_share || b[1].count) - (a[1].revenue_share || a[1].count));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Cluster", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("% of Total", colWidths[2]),
          createHeaderCell("Avg Value", colWidths[3]),
          createHeaderCell("Rev Share", colWidths[4]),
          createHeaderCell("Silhouette", colWidths[5]),
        ],
      }),
      ...segments.map(([name, data], idx) =>
        new TableRow({
          children: [
            createDataCell(name, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(data.count), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.percentage), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(data.avg_monetary || data.avg_value), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.revenue_share), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(data.avg_silhouette?.toFixed(3) || "-", colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
          ],
        })
      ),
    ],
  });
}

function createValueBasedSegmentTable(segmentDist: Record<string, SegmentData>): Table {
  const colWidths = [2000, 1400, 1400, 1800, 1400, 1400];
  const tierOrder = ["Platinum", "Gold", "Silver", "Bronze", "Standard"];
  const segments = Object.entries(segmentDist).sort((a, b) => {
    const aIdx = tierOrder.indexOf(a[0]);
    const bIdx = tierOrder.indexOf(b[0]);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    return (b[1].revenue_share || 0) - (a[1].revenue_share || 0);
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          createHeaderCell("Tier", colWidths[0]),
          createHeaderCell("Customers", colWidths[1]),
          createHeaderCell("%", colWidths[2]),
          createHeaderCell("Total Value", colWidths[3]),
          createHeaderCell("Avg Value", colWidths[4]),
          createHeaderCell("Rev %", colWidths[5]),
        ],
      }),
      ...segments.map(([name, data], idx) =>
        new TableRow({
          children: [
            createDataCell(name, colWidths[0], idx % 2 === 1),
            createDataCell(formatNumber(data.count), colWidths[1], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.percentage), colWidths[2], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(data.total_value || data.total_monetary), colWidths[3], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatCurrency(data.avg_value || data.avg_monetary), colWidths[4], idx % 2 === 1, AlignmentType.RIGHT),
            createDataCell(formatPercent(data.revenue_share), colWidths[5], idx % 2 === 1, AlignmentType.RIGHT),
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

function createSegmentRecommendations(
  segmentDist: Record<string, SegmentData>, 
  analysisType: string
): Paragraph[] {
  // RFM & Value-Based 세그먼트별 추천
  const recommendations: Record<string, { priority: string; action: string; tactics: string[] }> = {
    // RFM Segments
    Champions: { 
      priority: "Retain", 
      action: "Best customers with recent purchases, high frequency, and high spending. Core revenue drivers requiring special treatment.",
      tactics: ["VIP Program", "Referral Rewards", "Early Access"]
    },
    "Loyal Customers": { 
      priority: "Grow", 
      action: "Reliable customers with consistent purchase history. High potential to convert to Champions.",
      tactics: ["Cross-sell Campaigns", "Tier Benefits", "Personalized Recommendations"]
    },
    "Potential Loyalists": { 
      priority: "Convert", 
      action: "Promising customers with recent purchases and above-average frequency. Focus on accelerating conversion.",
      tactics: ["Welcome Series", "Onboarding Optimization", "Educational Content"]
    },
    "New Customers": { 
      priority: "Nurture", 
      action: "Recently acquired customers. Early experience determines long-term relationship.",
      tactics: ["Welcome Email", "First Purchase Incentive", "Usage Guide"]
    },
    "At Risk": { 
      priority: "Critical", 
      action: "Previously good customers who haven't purchased in a long time. Requires intensive recovery efforts.",
      tactics: ["Win-back Campaign", "1:1 Outreach", "Special Incentives"]
    },
    "Can't Lose Them": { 
      priority: "Emergency", 
      action: "Previously highest-value customers with recent activity decline. Churn would severely impact revenue.",
      tactics: ["Executive Outreach", "Custom Solutions", "Premium Support"]
    },
    Hibernating: { 
      priority: "Test", 
      action: "Long-term inactive customers. Test recovery potential with low-cost campaigns.",
      tactics: ["Reactivation Email", "Feedback Request", "Low-cost Campaign"]
    },
    Lost: { 
      priority: "Low", 
      action: "Confirmed churned customers. Identify churn reasons for future prevention.",
      tactics: ["Final Offer", "Churn Survey", "Database Cleanup"]
    },
    Promising: {
      priority: "Develop",
      action: "Recent customers with moderate activity. Focus on increasing engagement and purchase frequency.",
      tactics: ["Progressive Offers", "Engagement Programs", "Product Recommendations"]
    },
    "Need Attention": {
      priority: "Engage",
      action: "Above average customers showing signs of declining engagement. Re-engage before they become at-risk.",
      tactics: ["Personalized Outreach", "Exclusive Offers", "Feedback Request"]
    },
    "About to Sleep": {
      priority: "Reactivate",
      action: "Customers with below average recency and frequency. Immediate reactivation needed.",
      tactics: ["Wake-up Campaign", "Limited-time Offers", "Product Updates"]
    },
    // Value-Based Tiers
    Platinum: { 
      priority: "Retain", 
      action: "Top 10% high-value customers. Significant revenue contributors requiring maximum investment in retention.",
      tactics: ["Concierge Service", "Exclusive Events", "Premium Benefits"]
    },
    Gold: { 
      priority: "Grow", 
      action: "75-90th percentile customers. High potential for Platinum conversion.",
      tactics: ["Upgrade Incentives", "Tier Benefits", "Recognition Program"]
    },
    Silver: { 
      priority: "Develop", 
      action: "50-75th percentile customers. Can gradually increase purchase frequency and amount.",
      tactics: ["Value Education", "Progressive Offers", "Cross-sell"]
    },
    Bronze: { 
      priority: "Engage", 
      action: "25-50th percentile customers. Build engagement through targeted campaigns.",
      tactics: ["Entry-level Benefits", "Activation Campaigns", "Product Education"]
    },
    Standard: { 
      priority: "Monitor", 
      action: "Bottom 25% customers. Maintain efficient automated management with periodic activation.",
      tactics: ["Automated Campaigns", "Periodic Offers", "Basic Support"]
    },
  };

  const paragraphs: Paragraph[] = [];
  const segments = Object.entries(segmentDist);

  segments.forEach(([segment, data]) => {
    let rec = recommendations[segment];
    
    // K-Means: 동적 추천 생성
    if (!rec && analysisType === "kmeans") {
      const revShare = data.revenue_share || 0;
      const pct = data.percentage || 0;
      
      if (revShare >= 30) {
        rec = { 
          priority: "Retain", 
          action: "High-value cluster contributing significant revenue. Focus on retention programs, premium benefits, and personalized engagement to prevent churn.",
          tactics: ["VIP Treatment", "Personalized Offers", "Priority Support"]
        };
      } else if (revShare >= 20) {
        rec = { 
          priority: "Grow", 
          action: "Solid revenue contributor with growth potential. Implement cross-sell campaigns and loyalty programs to increase share of wallet.",
          tactics: ["Cross-sell Programs", "Loyalty Rewards", "Upsell Campaigns"]
        };
      } else if (pct >= 30) {
        rec = { 
          priority: "Develop", 
          action: "Large customer base with development potential. Focus on activation campaigns and value education to increase engagement and spending.",
          tactics: ["Activation Campaigns", "Product Education", "Engagement Programs"]
        };
      } else if (revShare < 10 && pct < 15) {
        rec = {
          priority: "Evaluate",
          action: "Small cluster with low revenue contribution. Analyze characteristics to determine if worth investing or better to deprioritize.",
          tactics: ["Behavior Analysis", "Test Campaigns", "Cost Optimization"]
        };
      } else {
        rec = { 
          priority: "Monitor", 
          action: "Monitor cluster behavior and test targeted campaigns. Analyze characteristics to identify growth opportunities and migration patterns.",
          tactics: ["Behavioral Tracking", "A/B Testing", "Segment Analysis"]
        };
      }
    }
    
    // Fallback
    if (!rec) {
      rec = { 
        priority: "Monitor", 
        action: "Continue standard engagement and monitor for changes in behavior patterns.",
        tactics: ["Standard Engagement", "Periodic Review"]
      };
    }
    
    const priorityColor = ["Critical", "Emergency"].includes(rec.priority) ? COLORS.danger : 
                          ["Retain", "Grow"].includes(rec.priority) ? COLORS.success : 
                          ["Develop", "Convert", "Nurture"].includes(rec.priority) ? COLORS.primary : COLORS.secondary;

    paragraphs.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: segment, bold: true, size: 22 }),
          new TextRun({ text: ` (${formatNumber(data.count)} customers, ${formatPercent(data.percentage)})`, size: 20, color: COLORS.secondary }),
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
        children: [new TextRun({ text: rec.action, size: 20, color: COLORS.secondary })],
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

function createMethodologySection(analysisType: string, silhouetteScore?: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (analysisType === "rfm") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ 
          text: "RFM (Recency, Frequency, Monetary) is a proven marketing framework that measures customer behavior across three key dimensions to identify distinct customer segments.", 
          size: 20 
        })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "RFM Metrics Explained:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Recency (R): Days since last purchase. Lower is better (more recent). Score 5 = most recent, Score 1 = least recent.", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Frequency (F): Total number of purchases. Higher is better. Score 5 = most frequent buyer.", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Monetary (M): Total spending amount. Higher is better. Score 5 = highest spender.", size: 20 })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Segment Assignment:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: "Each metric is scored 1-5 using quintile distribution. The combination of these scores determines the customer segment. For example, R=5, F=5, M=5 customers are Champions, while R=1, F=1 customers are Lost.", 
          size: 20 
        })],
      })
    );
  } else if (analysisType === "kmeans") {
    const interpretation = silhouetteScore 
      ? (silhouetteScore >= 0.7 ? "Excellent" : silhouetteScore >= 0.5 ? "Good" : silhouetteScore >= 0.25 ? "Moderate" : "Weak")
      : "N/A";
    
    paragraphs.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ 
          text: "K-Means is an unsupervised machine learning algorithm that automatically groups customers based on behavioral patterns without predefined segment definitions, allowing discovery of hidden customer patterns.", 
          size: 20 
        })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Algorithm Process:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "1. Initialize K centroids randomly in the feature space", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "2. Assign each customer to the nearest centroid based on distance", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "3. Recalculate centroids based on assigned customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "4. Repeat steps 2-3 until convergence (no changes)", size: 20 })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Clustering Quality:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `Silhouette Score: ${silhouetteScore?.toFixed(3) || "N/A"} (${interpretation})`, size: 20 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: "Silhouette score ranges from -1 to 1. Higher values indicate better-defined clusters. Above 0.5 is good, 0.25-0.5 is moderate, below 0.25 suggests overlapping clusters.", 
          size: 20, 
          color: COLORS.secondary 
        })],
      })
    );
  } else if (analysisType === "value_based") {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ 
          text: "Value-based segmentation stratifies customers by their total revenue contribution using percentile ranking, providing clear criteria for marketing budget allocation.", 
          size: 20 
        })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Tier Definitions:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Platinum: Top 10% (90th percentile and above) - VIP Customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Gold: 75th - 90th percentile - High-Value Customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Silver: 50th - 75th percentile - Medium-Value Customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Bronze: 25th - 50th percentile - Lower-Value Customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ text: "• Standard: Bottom 25% - Basic Customers", size: 20 })],
      }),
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: "Pareto Principle:", bold: true, size: 22 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ 
          text: "Typically, the top 20% of customers contribute about 80% of revenue. This analysis helps identify your exact concentration level and validate the Pareto principle for your business.", 
          size: 20 
        })],
      })
    );
  }

  return paragraphs;
}

function createStrategicFrameworkSection(analysisType: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Resource Allocation Framework:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Critical/Emergency Segments: 25-30% of marketing budget. Immediate 1:1 outreach within 24-48 hours.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Retain/Grow Segments: 30-35% of marketing budget. VIP programs and continuous relationship management.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Develop Segments: 20-25% of marketing budget. Onboarding optimization with 30-60-90 day milestones.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Monitor Segments: 10-15% of marketing budget. Automated efficient management with quarterly review.", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Measurement Framework:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Short-term (1-4 weeks): Email open/click rates, campaign response rates, site visit frequency", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Mid-term (1-3 months): Purchase conversion rate, average order value, repurchase rate", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Long-term (3-12 months): Segment migration rates, CLV changes, overall customer structure health", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: "Re-analysis Frequency:", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Retail/E-commerce: Monthly or quarterly", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• B2B/High-involvement products: Quarterly", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Subscription businesses: Monthly", 
        size: 20 
      })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 360 },
      children: [new TextRun({ 
        text: "• Seasonal businesses: Before and after peak seasons", 
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
    const { results, analysisType } = body;
    
    const summary = results.summary;
    const segmentDist = results.results.segment_distribution;
    const metrics = results.results.metrics;
    const keyInsights = results.key_insights;
    const silhouetteScore = results.results.silhouette_score;

    // Select appropriate segment table based on analysis type
    let segmentTable: Table;
    switch (analysisType) {
      case "rfm":
        segmentTable = createRFMSegmentTable(segmentDist);
        break;
      case "kmeans":
        segmentTable = createKMeansSegmentTable(segmentDist);
        break;
      case "value_based":
        segmentTable = createValueBasedSegmentTable(segmentDist);
        break;
      default:
        segmentTable = createRFMSegmentTable(segmentDist);
    }

    // Calculate top segment for summary
    const topSegment = Object.entries(segmentDist).sort((a, b) => 
      (b[1].revenue_share || b[1].count) - (a[1].revenue_share || a[1].count)
    )[0];

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
                      text: "Customer Segmentation Report",
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
                  text: "Customer Segmentation Report",
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
                  text: getAnalysisLabel(analysisType),
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
                  text: `This analysis segmented ${formatNumber(summary.total_customers)} customers into ${summary.n_segments} distinct groups using ${getAnalysisLabel(analysisType)} methodology. The analysis processed ${formatNumber(summary.total_transactions)} transactions${metrics?.total_revenue ? ` representing ${formatCurrency(metrics.total_revenue)} in total revenue` : ""}. The largest segment is ${topSegment[0]} with ${formatNumber(topSegment[1].count)} customers (${formatPercent(topSegment[1].percentage)}).`,
                  size: 22,
                }),
              ],
            }),
            createExecutiveSummaryTable(summary, metrics),

            // ===== 2. SEGMENT DISTRIBUTION =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("2. Segment Distribution")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "The following table presents the distribution of customers across identified segments, sorted by revenue contribution.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            segmentTable,

            // ===== 3. KEY INSIGHTS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("3. Key Insights")],
            }),
            ...createKeyInsightsParagraphs(keyInsights),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 4. STRATEGIC RECOMMENDATIONS =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("4. Strategic Recommendations")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "The following recommendations are tailored to each segment based on their characteristics and business value.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createSegmentRecommendations(segmentDist, analysisType),

            // ===== 5. METHODOLOGY =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("5. Methodology")],
            }),
            ...createMethodologySection(analysisType, silhouetteScore),

            // ===== PAGE BREAK =====
            new Paragraph({ children: [new PageBreak()] }),

            // ===== 6. STRATEGIC FRAMEWORK =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("6. Strategic Implementation Framework")],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: "Key principles and execution guidelines for segment-specific strategy development.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            ...createStrategicFrameworkSection(analysisType),

            // ===== 7. ABOUT THIS REPORT =====
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun("7. About This Report")],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "This report was automatically generated based on the customer segmentation analysis. The insights and recommendations provided are derived from statistical analysis of customer transaction data.",
                  size: 20,
                  color: COLORS.secondary,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 120 },
              children: [
                new TextRun({ text: "Analysis Type: ", bold: true, size: 20 }),
                new TextRun({ text: getAnalysisLabel(analysisType), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Customers Analyzed: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.total_customers), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Segments Identified: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.n_segments), size: 20 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Total Transactions: ", bold: true, size: 20 }),
                new TextRun({ text: formatNumber(summary.total_transactions), size: 20 }),
              ],
            }),
            ...(metrics?.total_revenue ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Total Revenue: ", bold: true, size: 20 }),
                  new TextRun({ text: formatCurrency(metrics.total_revenue), size: 20 }),
                ],
              }),
            ] : []),
            ...(silhouetteScore ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Clustering Quality (Silhouette Score): ", bold: true, size: 20 }),
                  new TextRun({ text: silhouetteScore.toFixed(3), size: 20 }),
                ],
              }),
            ] : []),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=segmentation_report_${new Date().toISOString().split("T")[0]}.docx`,
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