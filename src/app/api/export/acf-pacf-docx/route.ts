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
        const lags = body.lags || results.lags || 40;
        const sampleSize = body.sampleSize || 0;

        // Extract results
        const arOrder = results.ar_order_suggestion || 0;
        const maOrder = results.ma_order_suggestion || 0;
        const sigAcfLags = results.significant_acf_lags || [];
        const sigPacfLags = results.significant_pacf_lags || [];
        const modelRec = results.model_recommendation || `ARIMA(${arOrder}, d, ${maOrder})`;
        const interpretations = results.interpretations || {};

        // Calculate confidence interval
        const confInterval = sampleSize > 0 ? (1.96 / Math.sqrt(sampleSize)).toFixed(4) : 'N/A';

        // Determine pattern type
        const isWhiteNoise = arOrder === 0 && maOrder === 0;
        const isPureAR = arOrder > 0 && maOrder === 0;
        const isPureMA = arOrder === 0 && maOrder > 0;
        const isARMA = arOrder > 0 && maOrder > 0;
        const isHighOrder = arOrder > 3 || maOrder > 3;

        const getPatternType = () => {
            if (isWhiteNoise) return 'White Noise';
            if (isPureAR) return `AR(${arOrder})`;
            if (isPureMA) return `MA(${maOrder})`;
            return `ARMA(${arOrder},${maOrder})`;
        };

        const patternType = getPatternType();
        const isGoodPattern = !isWhiteNoise && !isHighOrder;
        
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
            children: [new TextRun({ text: 'ACF & PACF Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Autocorrelation Analysis for ARIMA Model Selection', size: 24, font: 'Arial', color: COLORS.secondary })]
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
                    text: isGoodPattern ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGoodPattern ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: `${patternType} Process Identified`,
                    bold: true, size: 24, font: 'Arial',
                    color: isGoodPattern ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key metrics
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'AR Order (p): ', size: 22, font: 'Arial' }),
                new TextRun({ text: String(arOrder), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: ' — determined from PACF cutoff', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'MA Order (q): ', size: 22, font: 'Arial' }),
                new TextRun({ text: String(maOrder), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: ' — determined from ACF cutoff', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Recommended Model: ', size: 22, font: 'Arial' }),
                new TextRun({ text: modelRec, bold: true, size: 22, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Significant Lags: ACF = ${sigAcfLags.length}, PACF = ${sigPacfLags.length}`, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `Autocorrelation analysis was conducted on ${valueCol} across N = ${sampleSize} observations with ${lags} lags examined. `;
        apaText += `The 95% confidence interval was ±${confInterval}. `;
        apaText += `The Autocorrelation Function (ACF) revealed ${sigAcfLags.length} significant lag(s)`;
        if (sigAcfLags.length > 0) {
            apaText += ` at positions ${sigAcfLags.slice(0, 5).join(', ')}${sigAcfLags.length > 5 ? '...' : ''}`;
        }
        apaText += `. The Partial Autocorrelation Function (PACF) identified ${sigPacfLags.length} significant lag(s)`;
        if (sigPacfLags.length > 0) {
            apaText += ` at positions ${sigPacfLags.slice(0, 5).join(', ')}${sigPacfLags.length > 5 ? '...' : ''}`;
        }
        apaText += `. `;
        
        if (isWhiteNoise) {
            apaText += 'The absence of significant correlations indicates white noise; no ARIMA modeling is required. ';
        } else if (isPureAR) {
            apaText += `The correlation structure is consistent with a pure AR(${arOrder}) process. PACF cuts off at lag ${arOrder} while ACF decays gradually. `;
        } else if (isPureMA) {
            apaText += `The correlation structure is consistent with a pure MA(${maOrder}) process. ACF cuts off at lag ${maOrder} while PACF decays gradually. `;
        } else {
            apaText += `The correlation structure suggests a mixed ARMA(${arOrder},${maOrder}) process with both ACF and PACF showing gradual decay. `;
        }
        
        apaText += `The recommended model is ${modelRec}, where d represents the differencing order for stationarity.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Correlation Summary Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Correlation Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('AR Order (p)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(String(arOrder), false, 2500, { bold: true }),
                    createTableCell(arOrder === 0 ? 'No AR component' : `PACF cuts off at lag ${arOrder}`, false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MA Order (q)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(String(maOrder), false, 2500, { bold: true }),
                    createTableCell(maOrder === 0 ? 'No MA component' : `ACF cuts off at lag ${maOrder}`, false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Significant ACF Lags', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(String(sigAcfLags.length), false, 2500),
                    createTableCell(sigAcfLags.length > 0 ? `Lags: ${sigAcfLags.slice(0, 8).join(', ')}${sigAcfLags.length > 8 ? '...' : ''}` : 'None significant', false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Significant PACF Lags', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(String(sigPacfLags.length), false, 2500),
                    createTableCell(sigPacfLags.length > 0 ? `Lags: ${sigPacfLags.slice(0, 8).join(', ')}${sigPacfLags.length > 8 ? '...' : ''}` : 'None significant', false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Pattern Type', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(patternType, false, 2500, { bold: true, color: COLORS.primary }),
                    createTableCell(
                        isPureAR ? 'ACF decays, PACF cuts off' : 
                        isPureMA ? 'ACF cuts off, PACF decays' : 
                        isARMA ? 'Both decay gradually' : 'No significant pattern',
                        false, 4500
                    )
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Confidence Interval', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(`±${confInterval}`, false, 2500),
                    createTableCell('95% CI = ±1.96/√n', false, 4500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2500, 4500], rows: summaryRows }));

        // 3. Model Selection Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Model Selection Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('ACF Pattern', true, 2500),
                    createTableCell('PACF Pattern', true, 2500),
                    createTableCell('Model', true, 2500),
                    createTableCell('Your Result', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Cuts off at q', false, 2500),
                    createTableCell('Decays gradually', false, 2500),
                    createTableCell('MA(q)', false, 2500),
                    createTableCell(isPureMA ? '✓ Match' : '—', false, 2500, { color: isPureMA ? COLORS.success : COLORS.gray })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Decays gradually', false, 2500),
                    createTableCell('Cuts off at p', false, 2500),
                    createTableCell('AR(p)', false, 2500),
                    createTableCell(isPureAR ? '✓ Match' : '—', false, 2500, { color: isPureAR ? COLORS.success : COLORS.gray })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Decays gradually', false, 2500),
                    createTableCell('Decays gradually', false, 2500),
                    createTableCell('ARMA(p,q)', false, 2500),
                    createTableCell(isARMA ? '✓ Match' : '—', false, 2500, { color: isARMA ? COLORS.success : COLORS.gray })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('All within CI', false, 2500),
                    createTableCell('All within CI', false, 2500),
                    createTableCell('White Noise', false, 2500),
                    createTableCell(isWhiteNoise ? '✓ Match' : '—', false, 2500, { color: isWhiteNoise ? COLORS.warning : COLORS.gray })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2500, 2500, 2500], rows: guideRows }));

        // 4. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. ACF & PACF Plots', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Autocorrelation and Partial Autocorrelation functions with 95% confidence bands (blue shaded region).', 
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

        // 5. Recommendations
        const recSectionNum = plot ? 5 : 4;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = isWhiteNoise
            ? [
                'Series appears to be white noise — no ARIMA modeling needed.',
                'Verify stationarity testing was applied correctly.',
                'Check if excessive differencing was applied.',
                'Series may already be at optimal stationarity.',
                'Consider if this is residuals from another model.'
            ]
            : isHighOrder
                ? [
                    `High-order ARIMA(${arOrder},d,${maOrder}) suggested — risk of overfitting.`,
                    'Consider simpler models with lower orders.',
                    'Check for seasonal patterns requiring SARIMA.',
                    'Use AIC/BIC for model comparison.',
                    'Apply cross-validation to assess generalization.'
                ]
                : [
                    `Apply ARIMA(${arOrder}, d, ${maOrder}) model.`,
                    'd (differencing order) should be determined via stationarity tests.',
                    'Use AIC/BIC to validate model selection.',
                    'Check residuals for remaining autocorrelation.',
                    'Consider seasonal components if data has periodicity.'
                ];

        recs.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isGoodPattern ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 6. About ACF/PACF
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About ACF & PACF`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'ACF (Autocorrelation Function): Measures correlation between series and its lagged values. Determines MA order (q).',
            'PACF (Partial ACF): Measures direct correlation after removing intermediate lag effects. Determines AR order (p).',
            'Confidence Interval: Lags outside ±1.96/√n are statistically significant at 95% level.',
            'Cutoff Pattern: Sharp drop to within CI indicates the order. Gradual decay indicates the other component.',
            'Box-Jenkins Methodology: Use ACF/PACF to identify ARIMA(p,d,q) parameters, then estimate and validate.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'ACF & PACF Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ACF_PACF_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}