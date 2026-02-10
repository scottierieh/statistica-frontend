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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Handle different naming conventions
        const analysisResponse = body.analysisResult || body;
        const results = analysisResponse.results || analysisResponse;
        const plot = body.plot || analysisResponse.plot;
        
        const valueCol = body.valueCol || body.variable || '';
        const lags = body.lags || results.lags || 10;
        const sampleSize = body.sampleSize || results.n_observations || 0;

        // Extract results
        const lmStatistic = results.lm_statistic || 0;
        const pValue = results.p_value || 1;
        const fStatistic = results.f_statistic || 0;
        const fPValue = results.f_p_value || 1;
        const isSignificant = results.is_significant || pValue < 0.05;

        // Determine stability level
        const getStabilityLevel = () => {
            if (!isSignificant) {
                return pValue > 0.2 ? 'Very Stable' : 'Stable';
            }
            return pValue > 0.01 ? 'Unstable' : 'Very Unstable';
        };

        const stabilityLevel = getStabilityLevel();
        const isStable = !isSignificant;
        
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
            children: [new TextRun({ text: 'ARCH-LM Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Testing for Autoregressive Conditional Heteroscedasticity', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${valueCol} | Lags: ${lags} | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: isStable ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isStable ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isStable ? 'No ARCH Effects Detected (Homoscedastic)' : 'ARCH Effects Detected (Heteroscedastic)',
                    bold: true, size: 24, font: 'Arial',
                    color: isStable ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key metrics
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'LM Statistic: ', size: 22, font: 'Arial' }),
                new TextRun({ text: lmStatistic.toFixed(4), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: ` (χ² with ${lags} df)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'P-Value: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: pValue < 0.001 ? '< 0.001' : pValue.toFixed(4), 
                    bold: true, size: 22, font: 'Arial', 
                    color: pValue < 0.05 ? COLORS.danger : COLORS.success 
                }),
                new TextRun({ 
                    text: pValue < 0.05 ? ' — Significant ARCH effects' : ' — No significant ARCH effects', 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Volatility Status: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: stabilityLevel, 
                    bold: true, size: 22, font: 'Arial', 
                    color: isStable ? COLORS.success : COLORS.warning 
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'F-Statistic: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${fStatistic.toFixed(4)} (p = ${fPValue < 0.001 ? '< 0.001' : fPValue.toFixed(4)})`, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `An ARCH-LM test was conducted to examine heteroscedasticity in ${valueCol} (N = ${sampleSize}) with ${lags} lags. `;
        apaText += `The Lagrange Multiplier test yielded a statistic of ${lmStatistic.toFixed(2)} with ${lags} degrees of freedom `;
        apaText += `(p ${pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`}). `;
        
        if (isSignificant) {
            apaText += `The results indicate significant ARCH effects, suggesting that the variance of the series is not constant over time. `;
            apaText += `Volatility clustering is present, where periods of high volatility tend to follow high volatility, and periods of low volatility follow low volatility. `;
            apaText += `GARCH-type models are recommended for modeling and forecasting this series.`;
        } else {
            apaText += `The results indicate no significant ARCH effects, suggesting homoscedasticity (constant variance) in the series. `;
            apaText += `The variance appears stable over time, and standard time series models assuming constant variance are appropriate.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Test Results Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const testRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('LM Statistic', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(lmStatistic.toFixed(4), false, 2500, { bold: true }),
                    createTableCell(`Chi-squared with ${lags} degrees of freedom`, false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('P-Value (LM)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(pValue < 0.001 ? '< 0.001' : pValue.toFixed(4), false, 2500, { 
                        bold: true, color: pValue < 0.05 ? COLORS.danger : COLORS.success 
                    }),
                    createTableCell(pValue < 0.05 ? 'Significant — ARCH effects present' : 'Not significant — No ARCH effects', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('F-Statistic', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(fStatistic.toFixed(4), false, 2500),
                    createTableCell('Alternative test statistic', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('P-Value (F)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(fPValue < 0.001 ? '< 0.001' : fPValue.toFixed(4), false, 2500, { 
                        color: fPValue < 0.05 ? COLORS.danger : COLORS.success 
                    }),
                    createTableCell(fPValue < 0.05 ? 'Confirms ARCH effects' : 'Confirms homoscedasticity', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Lags Tested', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(lags), false, 2500),
                    createTableCell('Number of lagged squared residuals', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Sample Size', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(sampleSize), false, 2500),
                    createTableCell('Number of observations', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Conclusion', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(isSignificant ? 'ARCH Present' : 'No ARCH', false, 2500, { 
                        bold: true, color: isSignificant ? COLORS.danger : COLORS.success 
                    }),
                    createTableCell(isSignificant ? 'Volatility clustering detected' : 'Constant variance confirmed', false, 5000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 5000], rows: testRows }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [new TextRun({ 
                text: 'Note: Significance level α = 0.05. P-value < 0.05 indicates significant ARCH effects.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('P-Value Range', true, 2500),
                    createTableCell('Result', true, 2500),
                    createTableCell('Volatility', true, 2500),
                    createTableCell('Recommended Action', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p > 0.20', false, 2500),
                    createTableCell('Very Stable', false, 2500, { color: COLORS.success, bold: true }),
                    createTableCell('Constant', false, 2500),
                    createTableCell('Use standard models', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.05 < p ≤ 0.20', false, 2500),
                    createTableCell('Stable', false, 2500, { color: COLORS.success }),
                    createTableCell('Mostly constant', false, 2500),
                    createTableCell('Standard models OK', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 < p ≤ 0.05', false, 2500),
                    createTableCell('Unstable', false, 2500, { color: COLORS.warning, bold: true }),
                    createTableCell('Time-varying', false, 2500),
                    createTableCell('Consider GARCH', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≤ 0.01', false, 2500),
                    createTableCell('Very Unstable', false, 2500, { color: COLORS.danger, bold: true }),
                    createTableCell('Highly clustered', false, 2500),
                    createTableCell('Use GARCH models', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2500, 2500, 3000], rows: guideRows }));

        // Current result indicator
        children.push(new Paragraph({
            spacing: { before: 150, after: 200 },
            children: [
                new TextRun({ text: '→ Your Result: ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ 
                    text: `p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)} — ${stabilityLevel}`, 
                    bold: true, size: 22, font: 'Arial', 
                    color: isStable ? COLORS.success : COLORS.danger 
                })
            ]
        }));

        // 4. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = isStable
            ? [
                'Variance is constant — standard time series models are appropriate.',
                'ARIMA, exponential smoothing, and regression models can be applied.',
                'Fixed confidence intervals are reliable for forecasting.',
                'No need for volatility modeling (GARCH family).',
                'Regular residual diagnostics are still recommended.'
            ]
            : [
                'Volatility clustering detected — consider GARCH-type models.',
                'Standard errors may be biased without heteroscedasticity correction.',
                'Use robust standard errors (HAC) for inference.',
                'For forecasting, implement GARCH(1,1) or EGARCH models.',
                'Consider time-varying confidence intervals for predictions.'
            ];

        recs.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isStable ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 5. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Volatility Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Original series and squared values (volatility proxy) with ARCH-LM test results.', 
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
                console.error('Plot image error:', e);
            }
        }

        // 6. About ARCH-LM Test
        const aboutSectionNum = plot ? 6 : 5;
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${aboutSectionNum}. About ARCH-LM Test`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'ARCH (Autoregressive Conditional Heteroscedasticity) models time-varying variance.',
            'The LM (Lagrange Multiplier) test regresses squared residuals on their lags.',
            'H₀: No ARCH effects (homoscedasticity). H₁: ARCH effects present (heteroscedasticity).',
            'Volatility clustering means large changes tend to follow large changes.',
            'Common in financial data: stock returns, exchange rates, commodity prices.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'ARCH-LM Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ARCH_LM_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}