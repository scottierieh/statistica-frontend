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

const getStrengthLabel = (s: number): string => {
    if (s >= 0.7) return 'Strong';
    if (s >= 0.5) return 'Moderate';
    if (s >= 0.3) return 'Weak';
    return 'Very Weak';
};

const getStrengthColor = (s: number): string => {
    if (s >= 0.6) return COLORS.success;
    if (s >= 0.4) return COLORS.warning;
    return COLORS.danger;
};

const getNoiseLabel = (v: number): string => {
    if (v < 20) return 'Low';
    if (v < 40) return 'Moderate';
    return 'High';
};

export async function POST(request: NextRequest) {
    try {
        const { results, timeCol, valueCol, model, period, sampleSize, trendStrength, seasonalStrength, residualVariance, plot } = await request.json();

        const seasonalPattern = results.seasonal_pattern || [];
        const statistics = results.statistics || {};
        const interpretations = results.interpretations || {};
        
        const cycles = Math.floor(sampleSize / period);
        const patternQuality = 100 - residualVariance;
        const isGood = (trendStrength >= 0.5 || seasonalStrength >= 0.5) && residualVariance < 40;
        
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
            children: [new TextRun({ text: 'Seasonal Decomposition', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Separating Trend, Seasonal, and Residual Components', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${model.charAt(0).toUpperCase() + model.slice(1)} Model | Period: ${period} | ${cycles} Cycles | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGood ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGood ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isGood 
                        ? 'Clear Patterns Detected'
                        : 'Weak Pattern Structure',
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
                new TextRun({ text: 'Trend Strength: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${(trendStrength * 100).toFixed(0)}%`, bold: true, size: 22, font: 'Arial', color: getStrengthColor(trendStrength) }),
                new TextRun({ text: ` (${getStrengthLabel(trendStrength)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Seasonal Strength: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${(seasonalStrength * 100).toFixed(0)}%`, bold: true, size: 22, font: 'Arial', color: getStrengthColor(seasonalStrength) }),
                new TextRun({ text: ` (${getStrengthLabel(seasonalStrength)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Residual Noise: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${residualVariance.toFixed(1)}%`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getNoiseLabel(residualVariance)} noise level)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Pattern Quality: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${patternQuality.toFixed(0)}%`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ' variance explained by trend + seasonality', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A seasonal decomposition analysis was conducted on ${valueCol} across N = ${sampleSize} observations using an ${model} model with a seasonal period of ${period}. `;
        apaText += `The time index was derived from ${timeCol}, representing approximately ${cycles} complete seasonal cycles. `;
        apaText += `Trend component exhibited a strength of ${(trendStrength * 100).toFixed(1)}%, indicating ${getStrengthLabel(trendStrength).toLowerCase()} long-term directional movement. `;
        apaText += `Seasonal component showed a strength of ${(seasonalStrength * 100).toFixed(1)}%, suggesting ${getStrengthLabel(seasonalStrength).toLowerCase()} recurring patterns. `;
        apaText += `Residual analysis revealed that ${residualVariance.toFixed(1)}% of total variance remained unexplained by trend and seasonal components.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Component Strength Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Component Strength Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const componentRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Component', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Strength', true, 2000),
                    createTableCell('Level', true, 2000),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Trend', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`${(trendStrength * 100).toFixed(1)}%`, false, 2000, { bold: true, color: getStrengthColor(trendStrength) }),
                    createTableCell(getStrengthLabel(trendStrength), false, 2000),
                    createTableCell(trendStrength >= 0.5 ? 'Clear long-term direction' : 'Relatively stable over time', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Seasonal', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`${(seasonalStrength * 100).toFixed(1)}%`, false, 2000, { bold: true, color: getStrengthColor(seasonalStrength) }),
                    createTableCell(getStrengthLabel(seasonalStrength), false, 2000),
                    createTableCell(seasonalStrength >= 0.5 ? `Clear pattern every ${period} periods` : 'Weak recurring patterns', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Residual (Noise)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`${residualVariance.toFixed(1)}%`, false, 2000, { bold: true }),
                    createTableCell(getNoiseLabel(residualVariance), false, 2000),
                    createTableCell(residualVariance < 30 ? 'Good signal-to-noise ratio' : 'Significant random variation', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Pattern Quality', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${patternQuality.toFixed(1)}%`, false, 2000, { bold: true, highlight: true }),
                    createTableCell(patternQuality >= 70 ? 'Excellent' : patternQuality >= 50 ? 'Good' : 'Fair', false, 2000),
                    createTableCell('Variance explained by structured components', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2000, 2000, 3500], rows: componentRows }));

        // 3. Seasonal Pattern (if available)
        if (seasonalPattern.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Seasonal Pattern Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Seasonal indices show relative activity for each period. Index > 1 = above average; < 1 = below average.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            const seasonalRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Period', true, 2500),
                        createTableCell('Seasonal Index', true, 2500),
                        createTableCell('% Deviation', true, 2500),
                        createTableCell('Interpretation', true, 3000)
                    ]
                })
            ];

            seasonalPattern.slice(0, 12).forEach((item: any) => {
                const deviation = item.deviation || ((item.seasonal_index - 1) * 100);
                const isHigh = deviation > 5;
                const isLow = deviation < -5;
                
                let interpretation = 'Near average';
                if (deviation > 10) interpretation = 'Peak period';
                else if (deviation > 5) interpretation = 'Above average';
                else if (deviation < -10) interpretation = 'Trough period';
                else if (deviation < -5) interpretation = 'Below average';

                seasonalRows.push(new TableRow({
                    children: [
                        createTableCell(String(item.month || item.period), false, 2500),
                        createTableCell(item.seasonal_index.toFixed(3), false, 2500, { bold: true }),
                        createTableCell(`${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}%`, false, 2500, {
                            color: isHigh ? COLORS.success : isLow ? COLORS.danger : COLORS.gray
                        }),
                        createTableCell(interpretation, false, 3000)
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2500, 2500, 2500, 3000], rows: seasonalRows }));
        }

        // 4. Visualization (if available)
        const vizSectionNum = seasonalPattern.length > 0 ? 4 : 3;
        
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${vizSectionNum}. Decomposition Visualization`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Original series decomposed into trend, seasonal, and residual components.', 
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

        // 5. Model Information
        const modelSectionNum = plot ? vizSectionNum + 1 : vizSectionNum;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${modelSectionNum}. Model Configuration`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const modelRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 4500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Model Type', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(`${model.charAt(0).toUpperCase() + model.slice(1)} (Y = T ${model === 'additive' ? '+' : '×'} S ${model === 'additive' ? '+' : '×'} R)`, false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Seasonal Period', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(period), false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Time Column', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(timeCol, false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Value Column', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(valueCol, false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Observations', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(sampleSize), false, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Complete Cycles', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(cycles), false, 4500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4500, 4500], rows: modelRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${modelSectionNum + 1}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        let recommendations: string[];
        if (trendStrength >= 0.5 && seasonalStrength >= 0.5) {
            recommendations = [
                'Use SARIMA or Prophet for forecasting - both trend and seasonality are significant.',
                'Apply seasonal adjustment when analyzing underlying trends.',
                `Plan operations around the ${period}-period seasonal cycle.`,
                'Monitor for changes in seasonal patterns over time.',
                'Consider external factors that might influence both components.'
            ];
        } else if (trendStrength >= 0.5) {
            recommendations = [
                'Focus on trend-based forecasting methods.',
                'Identify factors driving the long-term direction.',
                'Simple exponential smoothing may work well.',
                'Monitor for emergence of seasonal patterns.',
                'Consider regression analysis with time as predictor.'
            ];
        } else if (seasonalStrength >= 0.5) {
            recommendations = [
                'Implement seasonal forecasting models.',
                `Align operations with the ${period}-period cycle.`,
                'Identify peak and trough periods for planning.',
                'Consider seasonal differencing for stationarity.',
                'Monitor for trend emergence over longer periods.'
            ];
        } else {
            recommendations = [
                'Time series appears relatively stationary.',
                'Simple moving averages or basic exponential smoothing may suffice.',
                'Consider different periodicities or model types.',
                'External factors may drive more variation than time patterns.',
                'Re-evaluate with more data or different time granularity.'
            ];
        }

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isGood ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 7. About Seasonal Decomposition
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${modelSectionNum + 2}. About Seasonal Decomposition`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Seasonal decomposition separates time series into trend, seasonal, and residual components.',
            'Additive model (Y = T + S + R): Use when seasonal variation is constant in magnitude.',
            'Multiplicative model (Y = T × S × R): Use when seasonal variation is proportional to level.',
            'Component strength indicates how much of total variation each component explains.',
            'Lower residual variance indicates better fit of trend and seasonal components.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Seasonal Decomposition Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Seasonal_Decomposition_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}