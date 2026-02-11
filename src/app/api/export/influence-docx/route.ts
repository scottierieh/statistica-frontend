import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber
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

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, independentVars } = await request.json();
        
        const metrics = results.metrics;
        const thresholds = results.thresholds;
        const insights = results.insights || [];
        const topInfluential = results.top_influential || [];
        const modelSummary = results.model_summary;
        
        const hasIssues = metrics.n_highly_influential > 0;
        const isGood = !hasIssues;
        
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Statistical Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Influence Diagnostics', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Model: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${dependentVar} ~ ${independentVars.join(' + ')}`, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'N: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(metrics.n_observations), size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Predictors: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(metrics.n_predictors), size: 24, font: 'Arial', color: COLORS.primary })
            ]
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

        // Conclusion box
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: isGood ? '✓ ' : '⚠ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGood ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isGood 
                        ? 'Data Quality is Good - No highly influential observations'
                        : `${metrics.n_highly_influential} Highly Influential Observation(s) Detected`,
                    bold: true, size: 24, font: 'Arial',
                    color: isGood ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Max Cook's Distance: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${metrics.max_cooks_d.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (threshold: ${thresholds.cooks_d.moderate.toFixed(3)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `High Cook's D observations: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${metrics.n_high_cooks}`, bold: true, size: 22, font: 'Arial', color: metrics.n_high_cooks > 0 ? COLORS.warning : COLORS.success })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `High leverage observations: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${metrics.n_high_leverage}`, bold: true, size: 22, font: 'Arial', color: metrics.n_high_leverage > 0 ? COLORS.warning : COLORS.success })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Outliers (|Studentized Resid| > 2): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${metrics.n_outliers}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // Summary table
        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2000),
                    createTableCell('Threshold', true, 2000),
                    createTableCell('Status', true, 1500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Max Cook's D", false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.max_cooks_d.toFixed(4), false, 2000, { highlight: metrics.max_cooks_d > thresholds.cooks_d.moderate }),
                    createTableCell(thresholds.cooks_d.moderate.toFixed(3), false, 2000),
                    createTableCell(metrics.max_cooks_d > thresholds.cooks_d.moderate ? 'High' : 'OK', false, 1500, { 
                        bold: true, color: metrics.max_cooks_d > thresholds.cooks_d.moderate ? COLORS.warning : COLORS.success 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Max Leverage', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.max_leverage.toFixed(4), false, 2000),
                    createTableCell(thresholds.leverage.moderate.toFixed(3), false, 2000),
                    createTableCell(metrics.max_leverage > thresholds.leverage.moderate ? 'High' : 'OK', false, 1500, { 
                        bold: true, color: metrics.max_leverage > thresholds.leverage.moderate ? COLORS.warning : COLORS.success 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Highly Influential', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(metrics.n_highly_influential), false, 2000, { highlight: metrics.n_highly_influential > 0 }),
                    createTableCell('0', false, 2000),
                    createTableCell(metrics.n_highly_influential > 0 ? 'Review' : 'OK', false, 1500, { 
                        bold: true, color: metrics.n_highly_influential > 0 ? COLORS.warning : COLORS.success 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('R-squared', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.r_squared.toFixed(4), false, 2000),
                    createTableCell('-', false, 2000),
                    createTableCell(`${(metrics.r_squared * 100).toFixed(1)}%`, false, 1500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2000, 2000, 1500], rows: summaryRows }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Influence diagnostics were conducted for the model ${dependentVar} ~ ${independentVars.join(' + ')} `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${metrics.n_observations}). `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `Cook's Distance ranged from 0 to ${metrics.max_cooks_d.toFixed(3)} (threshold = ${thresholds.cooks_d.moderate.toFixed(3)}). `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `${metrics.n_high_cooks} observation(s) exceeded the Cook's D threshold, and ${metrics.n_high_leverage} observation(s) showed high leverage. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: isGood ? 'No highly influential observations were identified.' : `A total of ${metrics.n_highly_influential} observation(s) were flagged as highly influential.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Insights
        if (insights.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '2. Key Insights', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            insights.forEach((insight: any, idx: number) => {
                const isWarning = insight.type === 'warning';
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: isWarning ? '⚠ ' : '✓ ', bold: true, size: 22, font: 'Arial', color: isWarning ? COLORS.warning : COLORS.success }),
                        new TextRun({ text: `${insight.title}: `, bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: insight.description, size: 22, font: 'Arial' })
                    ]
                }));
            });
        }

        // 3. Top Influential Observations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '3. Top Influential Observations' : '2. Top Influential Observations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ 
                text: 'Top 10 observations ranked by Cook\'s Distance. Rows with multiple flags warrant investigation.', 
                size: 22, font: 'Arial', color: COLORS.gray 
            })]
        }));

        const infHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Index', true, 1200),
                createTableCell("Cook's D", true, 1800),
                createTableCell('Leverage', true, 1800),
                createTableCell('Std Resid', true, 1800),
                createTableCell('DFFITS', true, 1800),
                createTableCell('Status', true, 1500)
            ]
        });

        const infDataRows = topInfluential.slice(0, 10).map((row: any) => {
            const isInfluential = row.influential;
            const cooksDHigh = row.cooks_d > thresholds.cooks_d.moderate;
            return new TableRow({
                children: [
                    createTableCell(String(row.index), false, 1200, { bold: true }),
                    createTableCell(row.cooks_d.toFixed(4), false, 1800, { 
                        highlight: cooksDHigh, 
                        color: cooksDHigh ? COLORS.danger : undefined 
                    }),
                    createTableCell(row.leverage.toFixed(4), false, 1800),
                    createTableCell(row.studentized_residual.toFixed(4), false, 1800, {
                        color: Math.abs(row.studentized_residual) > 2 ? COLORS.warning : undefined
                    }),
                    createTableCell(row.dffits.toFixed(4), false, 1800),
                    createTableCell(isInfluential ? 'Influential' : 'Normal', false, 1500, { 
                        bold: true, 
                        color: isInfluential ? COLORS.danger : COLORS.success 
                    })
                ]
            });
        });

        children.push(new Table({
            columnWidths: [1200, 1800, 1800, 1800, 1800, 1500],
            rows: [infHeaderRow, ...infDataRows]
        }));

        // 4. Threshold Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '4. Threshold Interpretation' : '3. Threshold Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const threshRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Measure', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Threshold', true, 2000),
                    createTableCell('Rule', true, 4500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cook's Distance", false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(thresholds.cooks_d.moderate.toFixed(3), false, 2000),
                    createTableCell(thresholds.cooks_d.rule || '4/n', false, 4500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Leverage', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(thresholds.leverage.moderate.toFixed(3), false, 2000),
                    createTableCell(thresholds.leverage.rule || '2(p+1)/n', false, 4500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('DFFITS', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(thresholds.dffits.moderate.toFixed(3), false, 2000),
                    createTableCell(thresholds.dffits.rule || '2√((p+1)/n)', false, 4500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Studentized Residual', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('±2.0', false, 2000),
                    createTableCell(thresholds.studentized_residual.rule || '|t| > 2 indicates outlier', false, 4500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2000, 4500], rows: threshRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '5. Recommendations' : '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const defaultRecommendations = isGood 
            ? [
                'No highly influential observations detected. Model results are robust.',
                'Your regression coefficients are not unduly affected by individual data points.',
                'Predictions are reliable and not driven by outliers.',
                'Proceed with confidence in your model conclusions.'
            ]
            : [
                `Investigate the ${metrics.n_highly_influential} flagged observation(s) at indices: ${metrics.highly_influential_indices?.join(', ') || 'N/A'}.`,
                'Determine if influential points are data errors or legitimate edge cases.',
                'Run sensitivity analysis: compare results with and without flagged points.',
                'Consider robust regression methods if influence cannot be resolved.',
                'Document any decisions to include/exclude influential observations.'
            ];

        const allRecommendations = results.recommendations?.length > 0 ? results.recommendations : defaultRecommendations;

        allRecommendations.forEach((rec: string, idx: number) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // Influence interpretation guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '6. Understanding Influence' : '5. Understanding Influence', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Type', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Description', true, 6500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Outlier', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Unusual Y value given X. Large residual but may not affect coefficients if low leverage.', false, 6500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('High Leverage', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Unusual X values. Pulls regression line toward itself. Dangerous if also an outlier.', false, 6500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Influential', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('High leverage + large residual. Significantly affects model coefficients. Warrants investigation.', false, 6500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 6500], rows: guideRows }));

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Influence Diagnostics Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Influence_Diagnostics_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
