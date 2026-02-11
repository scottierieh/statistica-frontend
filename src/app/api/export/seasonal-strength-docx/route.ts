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

const getStrengthLabel = (value: number): string => {
    if (value >= 0.7) return 'Strong';
    if (value >= 0.4) return 'Moderate';
    return 'Weak';
};

const getStrengthColor = (value: number): string => {
    if (value >= 0.7) return COLORS.success;
    if (value >= 0.4) return COLORS.warning;
    return COLORS.danger;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Handle both naming conventions: analysisResult or results
        const analysisResult = body.analysisResult || body.results || body;
        const variable = body.variable || analysisResult.variable || '';
        const period = body.period || analysisResult.period || 12;
        const sampleSize = body.sampleSize || analysisResult.n_observations || 0;
        const autoDetect = body.autoDetect ?? true;

        // Extract from analysisResult
        const ssi = analysisResult.seasonal_strength_index || 0;
        const tsi = analysisResult.trend_strength_index;
        const dominantPeriod = analysisResult.dominant_period_detected;
        const seasonalIndices = analysisResult.seasonal_indices || [];
        const periodComparison = analysisResult.period_comparison || [];
        const interpretation = analysisResult.interpretation || {};
        const recommendations = analysisResult.recommendations || [];
        const nObservations = analysisResult.n_observations || sampleSize;
        
        // Get plots - check body first, then analysisResult.plots
        const gaugePlot = body.gaugePlot || analysisResult.plots?.gauge;
        const decompositionPlot = body.decompositionPlot || analysisResult.plots?.decomposition;
        
        const isStrong = ssi >= 0.7;
        const isModerate = ssi >= 0.4;
        const cycles = Math.floor(nObservations / period);
        
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
            children: [new TextRun({ text: 'Seasonal Strength Index', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Measuring Seasonal Pattern Strength in Time Series', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${variable} | Period: ${period} | Cycles: ${cycles} | N = ${nObservations}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isStrong ? '✓ ' : isModerate ? '△ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: getStrengthColor(ssi) 
                }),
                new TextRun({ 
                    text: isStrong 
                        ? 'Strong Seasonal Pattern Detected'
                        : isModerate 
                            ? 'Moderate Seasonality'
                            : 'Weak Seasonality',
                    bold: true, size: 24, font: 'Arial',
                    color: getStrengthColor(ssi)
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Seasonal Strength Index (SSI): ', size: 22, font: 'Arial' }),
                new TextRun({ text: ssi.toFixed(3), bold: true, size: 22, font: 'Arial', color: getStrengthColor(ssi) }),
                new TextRun({ text: ` (${getStrengthLabel(ssi)} seasonality)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (tsi !== null && tsi !== undefined) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Trend Strength Index (TSI): ', size: 22, font: 'Arial' }),
                    new TextRun({ text: tsi.toFixed(3), bold: true, size: 22, font: 'Arial', color: getStrengthColor(tsi) }),
                    new TextRun({ text: ` (${getStrengthLabel(tsi)} trend)`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Period: ', size: 22, font: 'Arial' }),
                new TextRun({ text: String(dominantPeriod || period), bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: dominantPeriod ? ' (auto-detected)' : ' (user specified)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Complete Cycles: ', size: 22, font: 'Arial' }),
                new TextRun({ text: String(cycles), bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` in ${nObservations} observations`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A seasonal strength analysis was conducted on ${variable} across N = ${nObservations} observations with a seasonal period of ${period}. `;
        apaText += `The Seasonal Strength Index (SSI) was ${ssi.toFixed(4)}, indicating ${getStrengthLabel(ssi).toLowerCase()} seasonality. `;
        if (tsi !== null && tsi !== undefined) {
            apaText += `The Trend Strength Index (TSI) was ${tsi.toFixed(4)}, suggesting ${getStrengthLabel(tsi).toLowerCase()} trend component. `;
        }
        if (dominantPeriod) {
            apaText += `Spectral analysis identified a dominant period of ${dominantPeriod}. `;
        }
        apaText += `The data contains approximately ${cycles} complete seasonal cycles.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Strength Indices
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Strength Indices', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const indexRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Index', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2000),
                    createTableCell('Strength', true, 2000),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('SSI (Seasonal)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(ssi.toFixed(4), false, 2000, { bold: true, highlight: true, color: getStrengthColor(ssi) }),
                    createTableCell(getStrengthLabel(ssi), false, 2000),
                    createTableCell(interpretation.seasonality || '', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('TSI (Trend)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(tsi !== null && tsi !== undefined ? tsi.toFixed(4) : 'N/A', false, 2000, { bold: true, color: tsi ? getStrengthColor(tsi) : undefined }),
                    createTableCell(tsi !== null && tsi !== undefined ? getStrengthLabel(tsi) : 'N/A', false, 2000),
                    createTableCell(interpretation.trend || '', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2000, 2000, 3500], rows: indexRows }));

        // 3. SSI Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. SSI Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('SSI Range', true, 2500),
                    createTableCell('Strength', true, 2500),
                    createTableCell('Your Result', true, 2500),
                    createTableCell('Recommendation', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.70', false, 2500),
                    createTableCell('Strong', false, 2500, { color: COLORS.success }),
                    createTableCell(ssi >= 0.7 ? `← ${ssi.toFixed(3)}` : '', false, 2500, { color: COLORS.success }),
                    createTableCell('Use SARIMA/Prophet', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.40 - 0.70', false, 2500),
                    createTableCell('Moderate', false, 2500, { color: COLORS.warning }),
                    createTableCell(ssi >= 0.4 && ssi < 0.7 ? `← ${ssi.toFixed(3)}` : '', false, 2500, { color: COLORS.warning }),
                    createTableCell('Consider seasonal terms', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.40', false, 2500),
                    createTableCell('Weak', false, 2500, { color: COLORS.danger }),
                    createTableCell(ssi < 0.4 ? `← ${ssi.toFixed(3)}` : '', false, 2500, { color: COLORS.danger }),
                    createTableCell('Non-seasonal may suffice', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2500, 2500, 3000], rows: guideRows }));

        // 4. Seasonal Indices (if available)
        if (seasonalIndices.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Seasonal Indices by Position', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Values > 1 indicate above-average periods; < 1 indicate below-average.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            const indicesRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Position', true, 2000),
                        createTableCell('Index', true, 2500),
                        createTableCell('Std Dev', true, 2000),
                        createTableCell('Deviation', true, 3000)
                    ]
                })
            ];

            seasonalIndices.slice(0, 15).forEach((s: any) => {
                const deviation = ((s.index - 1) * 100);
                const isHigh = s.index > 1.1;
                const isLow = s.index < 0.9;
                
                indicesRows.push(new TableRow({
                    children: [
                        createTableCell(String(s.position), false, 2000),
                        createTableCell(s.index.toFixed(4), false, 2500, { 
                            bold: true, 
                            color: isHigh ? COLORS.success : isLow ? COLORS.danger : undefined 
                        }),
                        createTableCell(s.std.toFixed(4), false, 2000),
                        createTableCell(`${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}%`, false, 3000, {
                            color: isHigh ? COLORS.success : isLow ? COLORS.danger : COLORS.gray
                        })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2000, 2500, 2000, 3000], rows: indicesRows }));
        }

        // 5. Period Comparison (if available)
        const periodSectionNum = seasonalIndices.length > 0 ? 5 : 4;
        
        if (periodComparison.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${periodSectionNum}. Period Comparison`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const bestPeriod = periodComparison.reduce((max: any, p: any) => 
                p.seasonal_strength > max.seasonal_strength ? p : max, periodComparison[0]);

            const periodRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Period', true, 2500),
                        createTableCell('SSI', true, 2500),
                        createTableCell('TSI', true, 2500),
                        createTableCell('Combined', true, 2500)
                    ]
                })
            ];

            periodComparison.forEach((p: any) => {
                const isBest = p.period === bestPeriod.period;
                
                periodRows.push(new TableRow({
                    children: [
                        createTableCell(isBest ? `${p.period} (Best)` : String(p.period), false, 2500, { 
                            bold: isBest, 
                            highlight: isBest 
                        }),
                        createTableCell(p.seasonal_strength.toFixed(4), false, 2500, { 
                            color: getStrengthColor(p.seasonal_strength) 
                        }),
                        createTableCell(p.trend_strength?.toFixed(4) || 'N/A', false, 2500),
                        createTableCell(p.combined_strength.toFixed(4), false, 2500)
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2500, 2500, 2500, 2500], rows: periodRows }));
        }

        // 6. Gauge Visualization (if available)
        const vizSectionNum = periodComparison.length > 0 ? periodSectionNum + 1 : periodSectionNum;
        
        if (gaugePlot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${vizSectionNum}. Strength Visualization`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            try {
                const imageData = gaugePlot.startsWith('data:') ? gaugePlot.split(',')[1] : gaugePlot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 450, height: 300 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Gauge image error:', e);
            }
        }

        // 7. Decomposition Plot (if available)
        if (decompositionPlot) {
            const decompSectionNum = gaugePlot ? vizSectionNum + 1 : vizSectionNum;
            
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${decompSectionNum}. Decomposition Plot`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Time series separated into trend, seasonal, and residual components.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = decompositionPlot.startsWith('data:') ? decompositionPlot.split(',')[1] : decompositionPlot;
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
                console.error('Decomposition image error:', e);
            }
        }

        // Recommendations
        const recSectionNum = decompositionPlot ? (gaugePlot ? vizSectionNum + 2 : vizSectionNum + 1) : (gaugePlot ? vizSectionNum + 1 : vizSectionNum);
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = recommendations.length > 0 ? recommendations : (
            isStrong
                ? [
                    'Use seasonal models (SARIMA, Prophet) for forecasting.',
                    'Incorporate seasonal adjustment for trend analysis.',
                    `Plan around the ${period}-period cycle for operations.`,
                    'Monitor for changes in seasonal patterns over time.',
                    'Document peak and trough periods for planning.'
                ]
                : isModerate
                    ? [
                        'Consider including seasonal components in models.',
                        'Compare seasonal vs. non-seasonal forecast accuracy.',
                        'Seasonality may vary - use recent data for calibration.',
                        'Test different period lengths for optimal fit.',
                        'Combine with other predictors for better forecasts.'
                    ]
                    : [
                        'Non-seasonal models may be sufficient.',
                        'Focus on trend and other predictors.',
                        'Re-evaluate if data collection period changes.',
                        'Consider external factors driving variation.',
                        'Simple exponential smoothing may work well.'
                    ]
        );

        recs.forEach((rec: string, idx: number) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: getStrengthColor(ssi) }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // About SSI
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Seasonal Strength Index`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'SSI measures how much variation is attributable to seasonal patterns.',
            'Formula: SSI = 1 - Var(Residual) / Var(Detrended Series).',
            'Values range from 0 to 1, with 1 indicating perfect seasonality.',
            'TSI similarly measures the strength of the trend component.',
            'Both indices help decide appropriate forecasting model complexity.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Seasonal Strength Index Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Seasonal_Strength_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
