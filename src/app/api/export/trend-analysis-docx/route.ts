import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber, ImageRun
} from 'docx';

const COLORS = {
    primary: '3498DB',
    primaryDark: '2C3E50',
    secondary: '34495E',
    success: '27AE60',
    warning: 'E67E22',
    danger: 'E74C3C',
    gray: '7F8C8D',
    lightGray: 'BDC3C7',
    highlight: 'F0F8FF',
    tableHeader: 'D5E8F0',
    tableBorder: 'DDDDDD'
};

const createTableCell = (
    text: string, 
    isHeader = false, 
    width = 1500,
    options: { highlight?: boolean; bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; color?: string } = {}
): TableCell => {
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder }
    };

    let fillColor: string | undefined;
    if (isHeader) fillColor = COLORS.tableHeader;
    else if (options.highlight) fillColor = COLORS.highlight;

    return new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: fillColor ? { fill: fillColor, type: ShadingType.CLEAR } : undefined,
        children: [
            new Paragraph({
                alignment: options.align || AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text,
                        bold: isHeader || options.bold,
                        color: options.color || (isHeader ? COLORS.primaryDark : COLORS.secondary),
                        size: isHeader ? 22 : 20,
                        font: 'Arial'
                    })
                ]
            })
        ],
        borders
    });
};

const getTrendColor = (direction: string): string => {
    if (direction === 'increasing') return COLORS.success;
    if (direction === 'decreasing') return COLORS.danger;
    return COLORS.warning;
};

const getVolatilityLabel = (cv: number): string => {
    if (cv < 0.15) return 'Low';
    if (cv < 0.30) return 'Moderate';
    if (cv < 0.50) return 'High';
    return 'Very High';
};

export async function POST(request: NextRequest) {
    try {
        const { computedStats, timeCol, valueCol, model, period, sampleSize, plot } = await request.json();

        const stats = computedStats.statistics || {};
        const trendDirection = computedStats.trend_direction || 'stable';
        const trendStrength = computedStats.trend_strength || 0;
        const seasonalPattern = computedStats.seasonal_pattern || false;
        const seasonalStrength = computedStats.seasonal_strength || 0;
        
        const mean = stats.mean || 0;
        const std = stats.std || 0;
        const cv = stats.cv || 0;
        const min = stats.min || 0;
        const max = stats.max || 0;
        const range = stats.range || (max - min);
        
        const isGoodTrend = trendDirection === 'increasing' || (trendDirection === 'stable' && cv < 0.3);
        const isStrongTrend = trendStrength >= 0.5;
        const isLowVolatility = cv < 0.3;
        
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Time Series Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Trend Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Time Series Decomposition & Pattern Detection', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${model} Model | Period: ${period} | Time: ${timeCol} | Value: ${valueCol} | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ 
                text: `Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 
                size: 20, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 1. Executive Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '1. Executive Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const trendSymbol = trendDirection === 'increasing' ? '↑ ' : trendDirection === 'decreasing' ? '↓ ' : '→ ';
        const trendLabel = trendDirection === 'increasing' ? 'Upward Trend' : trendDirection === 'decreasing' ? 'Downward Trend' : 'Stable Pattern';

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: trendSymbol, 
                    bold: true, size: 28, font: 'Arial', 
                    color: getTrendColor(trendDirection) 
                }),
                new TextRun({ 
                    text: trendLabel,
                    bold: true, size: 24, font: 'Arial',
                    color: getTrendColor(trendDirection)
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Trend Direction: ', size: 22, font: 'Arial' }),
                new TextRun({ text: trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1), bold: true, size: 22, font: 'Arial', color: getTrendColor(trendDirection) }),
                new TextRun({ text: ` (strength: ${(trendStrength * 100).toFixed(0)}%)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Volatility: ', size: 22, font: 'Arial' }),
                new TextRun({ text: getVolatilityLabel(cv), bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (CV: ${(cv * 100).toFixed(1)}%)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Seasonality: ', size: 22, font: 'Arial' }),
                new TextRun({ text: seasonalPattern ? 'Detected' : 'Not Detected', bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: seasonalPattern ? ` (period: ${period}, strength: ${(seasonalStrength * 100).toFixed(0)}%)` : '', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Value Range: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${min.toFixed(2)} - ${max.toFixed(2)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (range: ${range.toFixed(2)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A time series decomposition was performed on ${valueCol} over ${sampleSize} time points using the ${model} model with period = ${period}. `;
        apaText += `The analysis revealed a ${trendDirection} trend (strength = ${(trendStrength * 100).toFixed(1)}%). `;
        apaText += seasonalPattern 
            ? `Seasonal patterns were detected with strength = ${(seasonalStrength * 100).toFixed(1)}%. ` 
            : 'No significant seasonal patterns were detected. ';
        apaText += `Descriptive statistics: M = ${mean.toFixed(2)}, SD = ${std.toFixed(2)}, CV = ${(cv * 100).toFixed(1)}%, range = ${min.toFixed(2)} to ${max.toFixed(2)}.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Decomposition Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Decomposition Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const decompRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Component', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Finding', true, 3000),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Trend', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`${trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} (${(trendStrength * 100).toFixed(0)}%)`, false, 3000, { bold: true, color: getTrendColor(trendDirection) }),
                    createTableCell(trendDirection === 'increasing' ? 'Values rising over time' : trendDirection === 'decreasing' ? 'Values falling over time' : 'No directional change', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Seasonality', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(seasonalPattern ? `Yes (period ${period})` : 'Not detected', false, 3000, { bold: true }),
                    createTableCell(seasonalPattern ? 'Recurring pattern found' : 'No repeating cycles', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Residuals', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`CV: ${(cv * 100).toFixed(1)}%`, false, 3000),
                    createTableCell(isLowVolatility ? 'Low noise, predictable' : 'Higher noise, less predictable', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3500], rows: decompRows }));

        // 3. Descriptive Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Descriptive Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const statsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Description', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Mean', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(mean.toFixed(4), false, 2500, { bold: true, highlight: true }),
                    createTableCell('Average value', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Deviation', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(std.toFixed(4), false, 2500, { bold: true }),
                    createTableCell('Variability measure', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Coefficient of Variation', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(`${(cv * 100).toFixed(2)}%`, false, 2500),
                    createTableCell('Relative variability', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Minimum', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(min.toFixed(4), false, 2500),
                    createTableCell('Lowest value', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Maximum', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(max.toFixed(4), false, 2500),
                    createTableCell('Highest value', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Range', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(range.toFixed(4), false, 2500),
                    createTableCell('Max - Min', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 3000], rows: statsRows }));

        // 4. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Decomposition Plot', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Time series decomposed into original data, trend, seasonal, and residual components.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = plot.startsWith('data:') ? plot.split(',')[1] : plot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 400 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 5. Recommendations
        const recSectionNum = plot ? 5 : 4;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = trendDirection === 'increasing'
            ? [
                'Positive momentum detected - continue current strategies.',
                'Document success factors for replication.',
                seasonalPattern ? `Plan for seasonal peaks every ${period} periods.` : 'Monitor for emerging patterns.',
                'Consider capacity planning for continued growth.',
                'Set benchmarks based on current trend trajectory.'
            ]
            : trendDirection === 'decreasing'
                ? [
                    'Declining trend requires investigation.',
                    'Identify when the decline started and potential causes.',
                    'Consider interventions to reverse the trend.',
                    seasonalPattern ? 'Leverage seasonal peaks for recovery.' : 'Focus on consistent improvement.',
                    'Set realistic targets accounting for current trajectory.'
                ]
                : [
                    'Stable pattern is good for planning and budgeting.',
                    'If growth is desired, now is the time for new initiatives.',
                    seasonalPattern ? `Optimize operations around ${period}-period cycles.` : 'Monitor for emerging trends.',
                    'Use current stability as a baseline for experiments.',
                    'Document processes that maintain this stability.'
                ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isGoodTrend ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 6. About Trend Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Trend Analysis`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Trend analysis decomposes time series into trend, seasonal, and residual components.',
            'Additive model: Y = Trend + Seasonal + Residual (constant seasonal amplitude).',
            'Multiplicative model: Y = Trend x Seasonal x Residual (proportional seasonal variation).',
            'Trend strength indicates how much of variation is explained by directional movement.',
            'Coefficient of Variation (CV) measures relative variability independent of scale.'
        ];

        aboutPoints.forEach((point, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: point, size: 22, font: 'Arial' })
                ]
            }));
        });

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Trend Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Trend_Analysis_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}