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

const getStabilityLabel = (breakCount: number): string => {
    if (breakCount === 0) return 'Stable';
    if (breakCount <= 2) return 'Minor Changes';
    if (breakCount <= 4) return 'Moderate Changes';
    return 'Complex';
};

const getStabilityColor = (breakCount: number): string => {
    if (breakCount === 0) return COLORS.success;
    if (breakCount <= 2) return COLORS.warning;
    return COLORS.danger;
};

export async function POST(request: NextRequest) {
    try {
        const { analysisResult, variable, sampleSize, maxBreaks, minSegmentPct, cusumThreshold } = await request.json();

        // analysisResult is the direct API response (not nested)
        const tests = analysisResult.tests || {};
        const cusum = tests.cusum || {};
        const pettitt = tests.pettitt || {};
        const baiPerron = tests.bai_perron || {};
        const variance = tests.variance || {};
        const segments = analysisResult.segments || [];
        const allBreaks = analysisResult.all_breaks || [];
        const insights = analysisResult.insights || [];
        const recommendations = analysisResult.recommendations || [];
        const summaryPlot = analysisResult.plots?.summary;
        
        const breakCount = allBreaks.length;
        const isStable = breakCount === 0;
        const hasMinorChanges = breakCount <= 2;
        
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
            children: [new TextRun({ text: 'Structural Break Detection', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Identifying Regime Changes and Structural Shifts', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${variable} | ${breakCount} Break(s) | ${segments.length} Segment(s) | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isStable ? '✓ ' : hasMinorChanges ? '△ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: getStabilityColor(breakCount) 
                }),
                new TextRun({ 
                    text: isStable 
                        ? 'No Structural Breaks Detected'
                        : hasMinorChanges
                            ? 'Minor Regime Changes Detected'
                            : 'Multiple Structural Breaks Detected',
                    bold: true, size: 24, font: 'Arial',
                    color: getStabilityColor(breakCount)
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Total Breaks: ', size: 22, font: 'Arial' }),
                new TextRun({ text: String(breakCount), bold: true, size: 22, font: 'Arial', color: getStabilityColor(breakCount) }),
                new TextRun({ text: ` (${getStabilityLabel(breakCount)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'CUSUM Test: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: cusum.significant ? 'Significant' : 'Not Significant', 
                    bold: true, size: 22, font: 'Arial', 
                    color: cusum.significant ? COLORS.danger : COLORS.success 
                }),
                new TextRun({ text: ` (statistic = ${cusum.statistic?.toFixed(4) || 'N/A'})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Pettitt Test: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: pettitt.significant ? 'Significant' : 'Not Significant', 
                    bold: true, size: 22, font: 'Arial', 
                    color: pettitt.significant ? COLORS.danger : COLORS.success 
                }),
                new TextRun({ 
                    text: pettitt.significant 
                        ? ` (change point at index ${pettitt.change_point}, p = ${pettitt.p_value?.toFixed(4) || 'N/A'})`
                        : ` (p = ${pettitt.p_value?.toFixed(4) || 'N/A'})`, 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Bai-Perron: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${baiPerron.n_breaks || 0} break(s)`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` detected (max ${maxBreaks} allowed)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `Structural break detection was conducted on ${variable} across N = ${sampleSize} observations using multiple complementary tests. `;
        apaText += `Analysis parameters included a maximum of ${maxBreaks} breaks, minimum segment size of ${minSegmentPct}%, and CUSUM threshold of ${cusumThreshold.toFixed(2)}. `;
        
        apaText += `The CUSUM test ${cusum.significant ? 'detected significant departure from the mean' : 'did not detect significant mean shifts'} (statistic = ${cusum.statistic?.toFixed(4) || 'N/A'}, threshold = ${cusum.threshold?.toFixed(4) || 'N/A'}). `;
        apaText += `The Pettitt test ${pettitt.significant ? `identified a significant change point at index ${pettitt.change_point}` : 'found no significant single change point'} (p = ${pettitt.p_value?.toFixed(4) || 'N/A'}). `;
        apaText += `Bai-Perron sequential break detection identified ${baiPerron.n_breaks || 0} structural break(s), partitioning the series into ${segments.length} distinct segments.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Test Results
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
                    createTableCell('Test', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Result', true, 2000),
                    createTableCell('Statistic', true, 2000),
                    createTableCell('Threshold/p-value', true, 2000),
                    createTableCell('Details', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('CUSUM', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(cusum.significant ? 'Significant' : 'Not Sig.', false, 2000, { 
                        color: cusum.significant ? COLORS.danger : COLORS.success, bold: true 
                    }),
                    createTableCell(cusum.statistic?.toFixed(4) || 'N/A', false, 2000),
                    createTableCell(cusum.threshold?.toFixed(4) || 'N/A', false, 2000),
                    createTableCell(`${cusum.n_breaks || 0} break(s)`, false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Pettitt', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(pettitt.significant ? 'Significant' : 'Not Sig.', false, 2000, { 
                        color: pettitt.significant ? COLORS.danger : COLORS.success, bold: true 
                    }),
                    createTableCell(pettitt.statistic?.toFixed(4) || 'N/A', false, 2000),
                    createTableCell(`p = ${pettitt.p_value?.toFixed(4) || 'N/A'}`, false, 2000),
                    createTableCell(pettitt.change_point ? `CP: ${pettitt.change_point}` : 'No CP', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Bai-Perron', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(`${baiPerron.n_breaks || 0} breaks`, false, 2000, { bold: true }),
                    createTableCell('-', false, 2000),
                    createTableCell('-', false, 2000),
                    createTableCell(`Max: ${maxBreaks}`, false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Variance', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(`${variance.n_breaks || 0} change(s)`, false, 2000),
                    createTableCell('-', false, 2000),
                    createTableCell('-', false, 2000),
                    createTableCell('Volatility shifts', false, 2000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2000, 2000, 2000, 2000], rows: testRows }));

        // 3. Segment Statistics (if available)
        if (segments.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Segment Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Statistics for each detected regime/segment in the time series.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            const segmentRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Segment', true, 1500),
                        createTableCell('Start', true, 1500),
                        createTableCell('End', true, 1500),
                        createTableCell('Length', true, 1500),
                        createTableCell('Mean', true, 2000),
                        createTableCell('Std Dev', true, 2000)
                    ]
                })
            ];

            // Find max and min means for highlighting
            const means = segments.map((s: any) => s.mean);
            const maxMean = Math.max(...means);
            const minMean = Math.min(...means);

            segments.forEach((seg: any) => {
                const isMax = seg.mean === maxMean && segments.length > 1;
                const isMin = seg.mean === minMean && segments.length > 1;
                
                segmentRows.push(new TableRow({
                    children: [
                        createTableCell(`Segment ${seg.segment}`, false, 1500, { bold: true }),
                        createTableCell(String(seg.start), false, 1500),
                        createTableCell(String(seg.end), false, 1500),
                        createTableCell(String(seg.length), false, 1500),
                        createTableCell(seg.mean.toFixed(4), false, 2000, { 
                            bold: true,
                            highlight: isMax || isMin,
                            color: isMax ? COLORS.success : isMin ? COLORS.danger : undefined
                        }),
                        createTableCell(seg.std.toFixed(4), false, 2000)
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [1500, 1500, 1500, 1500, 2000, 2000], rows: segmentRows }));

            // Segment comparison
            if (segments.length > 1) {
                const meanChange = ((maxMean - minMean) / Math.abs(minMean) * 100);
                children.push(new Paragraph({
                    spacing: { before: 150, after: 100 },
                    children: [new TextRun({ 
                        text: `Note: Segment means range from ${minMean.toFixed(2)} to ${maxMean.toFixed(2)}, representing a ${meanChange.toFixed(1)}% difference.`, 
                        size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 4. Visualization (if available)
        const vizSectionNum = segments.length > 0 ? 4 : 3;
        
        if (summaryPlot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${vizSectionNum}. Break Detection Visualization`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Time series with detected break points and segment boundaries.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = summaryPlot.startsWith('data:') ? summaryPlot.split(',')[1] : summaryPlot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 350 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 5. Analysis Parameters
        const paramSectionNum = summaryPlot ? vizSectionNum + 1 : vizSectionNum;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${paramSectionNum}. Analysis Parameters`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const paramRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 5000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Variable', false, 5000, { align: AlignmentType.LEFT }),
                    createTableCell(variable, false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Observations', false, 5000, { align: AlignmentType.LEFT }),
                    createTableCell(String(sampleSize), false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Max Breaks (Bai-Perron)', false, 5000, { align: AlignmentType.LEFT }),
                    createTableCell(String(maxBreaks), false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Min Segment Size', false, 5000, { align: AlignmentType.LEFT }),
                    createTableCell(`${minSegmentPct}%`, false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('CUSUM Threshold', false, 5000, { align: AlignmentType.LEFT }),
                    createTableCell(cusumThreshold.toFixed(2), false, 5000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [5000, 5000], rows: paramRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${paramSectionNum + 1}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = recommendations.length > 0 ? recommendations : (
            isStable
                ? [
                    'Time series is stable with no structural breaks.',
                    'Standard time series models (ARIMA, ETS) are appropriate.',
                    'No need for regime-switching or segmented analysis.',
                    'Monitor for future regime changes with regular testing.',
                    'Forecasting can use the entire historical period.'
                ]
                : hasMinorChanges
                    ? [
                        'Minor structural changes detected in the series.',
                        'Consider analyzing segments separately for better accuracy.',
                        'Regime-switching models may improve forecasts.',
                        'Identify potential causes of the break point(s).',
                        'Use recent segment for short-term forecasting.'
                    ]
                    : [
                        'Multiple structural breaks indicate complex dynamics.',
                        'Segment the analysis by regime for accurate modeling.',
                        'Use regime-switching or Markov models.',
                        'Investigate external factors causing regime changes.',
                        'Recent segment may be most relevant for forecasting.'
                    ]
        );

        recs.forEach((rec: string, idx: number) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: getStabilityColor(breakCount) }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 7. About Structural Break Tests
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${paramSectionNum + 2}. About Structural Break Tests`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'CUSUM (Cumulative Sum) detects mean shifts by tracking cumulative deviations from the mean.',
            'Pettitt test is a non-parametric test for a single change point based on Mann-Whitney U statistic.',
            'Bai-Perron test sequentially detects multiple structural breaks with minimum segment constraints.',
            'Variance break test identifies changes in volatility or dispersion patterns.',
            'Combining multiple tests provides robust detection of different types of structural changes.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Structural Break Detection Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Structural_Break_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

