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

const formatPValue = (p: number | null): string => {
    if (p === null) return 'N/A';
    if (p < 0.001) return '<.001';
    return p.toFixed(4);
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, independentVars } = await request.json();
        
        const metrics = results.metrics;
        const ljungBox = results.ljung_box || [];
        const breuschGodfrey = results.breusch_godfrey;
        const acfData = results.acf_data || [];
        const insights = results.insights || [];
        const modelSummary = results.model_summary;
        
        const dw = metrics.durbin_watson;
        const hasAutocorr = metrics.dw_interpretation?.conclusion !== 'no_autocorrelation';
        const rho = metrics.first_order_autocorr;
        const ljungBoxSig = ljungBox.filter((lb: any) => lb.significant);
        const isGood = !hasAutocorr && ljungBoxSig.length === 0;
        
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
            children: [new TextRun({ text: 'Autocorrelation Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
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
                new TextRun({ text: 'DW: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dw.toFixed(4), size: 24, font: 'Arial', color: COLORS.primary })
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
                        ? 'Independence Assumption MET - Residuals are uncorrelated'
                        : 'Autocorrelation Detected - Serial correlation in residuals',
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
                new TextRun({ text: `Durbin-Watson: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${dw.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (ideal ≈ 2.0)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `First-Order Autocorrelation (ρ₁): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${rho.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: Math.abs(rho) < 0.2 ? ' — Low (good)' : Math.abs(rho) < 0.4 ? ' — Moderate' : ' — High (concern)', size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Ljung-Box Test: `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: ljungBoxSig.length > 0 
                        ? `Significant at ${ljungBoxSig.length} lag(s)` 
                        : 'No significant autocorrelation', 
                    bold: true, size: 22, font: 'Arial',
                    color: ljungBoxSig.length > 0 ? COLORS.warning : COLORS.success
                })
            ]
        }));

        // Summary table
        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Durbin-Watson', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(dw.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(dw < 1.5 ? 'Positive autocorr' : dw > 2.5 ? 'Negative autocorr' : 'No autocorrelation', false, 2500, { 
                        color: (dw >= 1.5 && dw <= 2.5) ? COLORS.success : COLORS.warning 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('First-Order ρ₁', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(rho.toFixed(4), false, 2500),
                    createTableCell(Math.abs(rho) < 0.2 ? 'Low' : Math.abs(rho) < 0.4 ? 'Moderate' : 'High', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('R-squared', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.r_squared.toFixed(4), false, 2500),
                    createTableCell(`${(metrics.r_squared * 100).toFixed(1)}% explained`, false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 2500], rows: summaryRows }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Independence of residuals was assessed for the model ${dependentVar} ~ ${independentVars.join(' + ')} `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${metrics.n_observations}) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `using the Durbin-Watson test, DW = ${dw.toFixed(2)}. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `The first-order autocorrelation was ρ₁ = ${rho.toFixed(3)}. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: isGood ? 'No significant autocorrelation was detected, supporting the independence assumption.' : 'Evidence of autocorrelation was found, suggesting a violation of the independence assumption.', size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Durbin-Watson Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Durbin-Watson Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const dwInterp = metrics.dw_interpretation;
        if (dwInterp) {
            children.push(new Paragraph({
                spacing: { after: 150 },
                children: [
                    new TextRun({ text: 'Conclusion: ', bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: dwInterp.description || dwInterp.conclusion, size: 22, font: 'Arial' })
                ]
            }));

            if (dwInterp.dl && dwInterp.du) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: `Critical Values: dL = ${dwInterp.dl.toFixed(3)}, dU = ${dwInterp.du.toFixed(3)}`, size: 20, font: 'Arial', color: COLORS.gray })
                    ]
                }));
            }
        }

        // DW interpretation guide
        const dwGuideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('DW Range', true, 2500),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Implication', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0 - 1.5', false, 2500),
                    createTableCell('Positive Autocorrelation', false, 3000, { color: COLORS.warning }),
                    createTableCell('Errors tend to follow same direction', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('1.5 - 2.5', false, 2500, { highlight: dw >= 1.5 && dw <= 2.5 }),
                    createTableCell('No Autocorrelation', false, 3000, { color: COLORS.success }),
                    createTableCell('Errors are independent (ideal)', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('2.5 - 4.0', false, 2500),
                    createTableCell('Negative Autocorrelation', false, 3000, { color: COLORS.warning }),
                    createTableCell('Errors tend to alternate direction', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 3000, 3500], rows: dwGuideRows }));

        // 3. Ljung-Box Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Ljung-Box Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ 
                text: 'Tests for autocorrelation at multiple lags. P-value < 0.05 indicates significant autocorrelation.', 
                size: 22, font: 'Arial', color: COLORS.gray 
            })]
        }));

        const ljungHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Lag', true, 1500),
                createTableCell('Q-Statistic', true, 2500),
                createTableCell('P-Value', true, 2500),
                createTableCell('Significant?', true, 2500)
            ]
        });

        const ljungDataRows = ljungBox.slice(0, 10).map((lb: any) => {
            return new TableRow({
                children: [
                    createTableCell(String(lb.lag), false, 1500),
                    createTableCell(lb.q_statistic.toFixed(4), false, 2500),
                    createTableCell(formatPValue(lb.p_value), false, 2500, { 
                        highlight: lb.significant,
                        color: lb.significant ? COLORS.danger : undefined
                    }),
                    createTableCell(lb.significant ? 'Yes' : 'No', false, 2500, { 
                        bold: true, 
                        color: lb.significant ? COLORS.danger : COLORS.success 
                    })
                ]
            });
        });

        children.push(new Table({ columnWidths: [1500, 2500, 2500, 2500], rows: [ljungHeaderRow, ...ljungDataRows] }));

        // 4. Breusch-Godfrey Test (if available)
        if (breuschGodfrey && breuschGodfrey.lm_statistic !== null) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Breusch-Godfrey Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const bgRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Statistic', true, 4500, { align: AlignmentType.LEFT }),
                        createTableCell('Value', true, 4500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('LM Statistic', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(breuschGodfrey.lm_statistic.toFixed(4), false, 4500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('P-Value', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(formatPValue(breuschGodfrey.p_value), false, 4500, { 
                            highlight: breuschGodfrey.significant,
                            color: breuschGodfrey.significant ? COLORS.danger : COLORS.success
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Lag Order', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(String(breuschGodfrey.lag_order), false, 4500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Conclusion', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(breuschGodfrey.significant ? 'Significant autocorrelation' : 'No significant autocorrelation', false, 4500, {
                            bold: true,
                            color: breuschGodfrey.significant ? COLORS.danger : COLORS.success
                        })
                    ]
                })
            ];

            children.push(new Table({ columnWidths: [4500, 4500], rows: bgRows }));
        }

        // 5. ACF Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: breuschGodfrey?.lm_statistic ? '5. ACF Summary' : '4. ACF Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const sigAcfLags = acfData.filter((a: any) => a.lag > 0 && a.significant);
        
        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [
                new TextRun({ text: `Significant lags: `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: sigAcfLags.length > 0 
                        ? sigAcfLags.map((a: any) => `Lag ${a.lag} (ACF = ${a.acf.toFixed(3)})`).slice(0, 5).join(', ') 
                        : 'None', 
                    bold: true, size: 22, font: 'Arial',
                    color: sigAcfLags.length > 0 ? COLORS.warning : COLORS.success
                })
            ]
        }));

        // Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: breuschGodfrey?.lm_statistic ? '6. Recommendations' : '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const defaultRecommendations = isGood 
            ? [
                'Independence assumption is satisfied. Standard OLS inference is valid.',
                'Proceed with hypothesis tests and confidence intervals.',
                'Model predictions are reliable for sequential forecasting.',
                'Check other assumptions (normality, homoscedasticity) as well.'
            ]
            : [
                'Consider adding lagged dependent variable as predictor.',
                'Use Newey-West (HAC) standard errors for robust inference.',
                'Check for missing seasonal patterns or cyclical effects.',
                'Consider ARIMA or other time series models.',
                'Investigate if there are omitted variables with temporal patterns.'
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

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Autocorrelation Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Autocorrelation_Test_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

