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
        
        // Handle: body.results (frontend sends analysisResult as results)
        const analysisResult = body.results || body.analysisResult || body;
        const valueCol = body.valueCol || '';
        const timeCol = body.timeCol || '';
        const period = body.period || 12;
        const sampleSize = body.sampleSize || 0;

        // Extract test results
        const original = analysisResult.original?.test_results || {};
        const firstDiff = analysisResult.first_difference?.test_results;
        const seasonalDiff = analysisResult.seasonal_difference?.test_results;
        const interpretations = analysisResult.interpretations || {};
        
        // Get plots
        const originalPlot = analysisResult.original?.plot;
        const firstDiffPlot = analysisResult.first_difference?.plot;
        const seasonalDiffPlot = analysisResult.seasonal_difference?.plot;

        // Calculate stationarity status
        const origAdfStat = (original.adf_p_value || 1) <= 0.05;
        const origKpssStat = (original.kpss_p_value || 0) > 0.05;
        const isStationary = origAdfStat && origKpssStat;
        const firstDiffStationary = firstDiff ? (firstDiff.adf_p_value || 1) <= 0.05 : false;
        const seasonalDiffStationary = seasonalDiff ? (seasonalDiff.adf_p_value || 1) <= 0.05 : false;

        const getStatus = () => {
            if (origAdfStat && origKpssStat) return 'Stationary';
            if (!origAdfStat && !origKpssStat) return 'Non-Stationary';
            if (origAdfStat && !origKpssStat) return 'Trend-Stationary';
            return 'Unit Root';
        };

        const status = getStatus();
        const diffOrder = isStationary ? 0 : firstDiffStationary ? 1 : seasonalDiffStationary ? 1 : 2;
        
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
            children: [new TextRun({ text: 'Stationarity Tests', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'ADF and KPSS Unit Root Testing', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${valueCol} | Period: ${period} | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isStationary ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isStationary ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: `Series is ${status}`,
                    bold: true, size: 24, font: 'Arial',
                    color: isStationary ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'ADF Test: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: origAdfStat ? 'Stationary' : 'Non-Stationary', 
                    bold: true, size: 22, font: 'Arial', 
                    color: origAdfStat ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ text: ` (p = ${original.adf_p_value?.toFixed(4) || 'N/A'})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'KPSS Test: ', size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: origKpssStat ? 'Stationary' : 'Non-Stationary', 
                    bold: true, size: 22, font: 'Arial', 
                    color: origKpssStat ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ text: ` (p = ${original.kpss_p_value?.toFixed(4) || 'N/A'})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Recommended Differencing: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `d = ${diffOrder}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: diffOrder === 0 ? ' (no differencing needed)' : diffOrder === 1 ? ' (first difference)' : ' (second difference or transformation)', 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `Stationarity testing was conducted on ${valueCol} across N = ${sampleSize} observations using Augmented Dickey-Fuller (ADF) and Kwiatkowski-Phillips-Schmidt-Shin (KPSS) tests. `;
        apaText += `The ADF test yielded a statistic of ${original.adf_statistic?.toFixed(4) || 'N/A'} (p = ${original.adf_p_value?.toFixed(4) || 'N/A'}), ${origAdfStat ? 'rejecting' : 'failing to reject'} the null hypothesis of a unit root. `;
        apaText += `The KPSS test produced a statistic of ${original.kpss_statistic?.toFixed(4) || 'N/A'} (p = ${original.kpss_p_value?.toFixed(4) || 'N/A'}), ${origKpssStat ? 'failing to reject' : 'rejecting'} the null hypothesis of stationarity. `;
        apaText += `Combined interpretation indicates the series is ${status.toLowerCase()}. `;
        
        if (firstDiff) {
            apaText += `First differencing ${firstDiffStationary ? 'achieved' : 'did not achieve'} stationarity (ADF p = ${firstDiff.adf_p_value?.toFixed(4)}). `;
        }
        
        apaText += `Recommended ARIMA differencing order is d = ${diffOrder}.`;

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
                    createTableCell('Series', true, 2000, { align: AlignmentType.LEFT }),
                    createTableCell('ADF Stat', true, 1500),
                    createTableCell('ADF p', true, 1500),
                    createTableCell('ADF Result', true, 2000),
                    createTableCell('KPSS Stat', true, 1500),
                    createTableCell('KPSS p', true, 1500),
                    createTableCell('KPSS Result', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Original', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(original.adf_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(original.adf_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(origAdfStat ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: origAdfStat ? COLORS.success : COLORS.danger, bold: true 
                    }),
                    createTableCell(original.kpss_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(original.kpss_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(origKpssStat ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: origKpssStat ? COLORS.success : COLORS.danger, bold: true 
                    })
                ]
            })
        ];

        if (firstDiff) {
            const fdKpssStat = (firstDiff.kpss_p_value || 0) > 0.05;
            testRows.push(new TableRow({
                children: [
                    createTableCell('First Diff', false, 2000, { align: AlignmentType.LEFT }),
                    createTableCell(firstDiff.adf_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(firstDiff.adf_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(firstDiffStationary ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: firstDiffStationary ? COLORS.success : COLORS.danger, bold: true 
                    }),
                    createTableCell(firstDiff.kpss_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(firstDiff.kpss_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(fdKpssStat ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: fdKpssStat ? COLORS.success : COLORS.danger, bold: true 
                    })
                ]
            }));
        }

        if (seasonalDiff) {
            const sdKpssStat = (seasonalDiff.kpss_p_value || 0) > 0.05;
            testRows.push(new TableRow({
                children: [
                    createTableCell('Seasonal Diff', false, 2000, { align: AlignmentType.LEFT }),
                    createTableCell(seasonalDiff.adf_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(seasonalDiff.adf_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(seasonalDiffStationary ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: seasonalDiffStationary ? COLORS.success : COLORS.danger, bold: true 
                    }),
                    createTableCell(seasonalDiff.kpss_statistic?.toFixed(3) || 'N/A', false, 1500),
                    createTableCell(seasonalDiff.kpss_p_value?.toFixed(4) || 'N/A', false, 1500),
                    createTableCell(sdKpssStat ? 'Stationary' : 'Non-Stat', false, 2000, { 
                        color: sdKpssStat ? COLORS.success : COLORS.danger, bold: true 
                    })
                ]
            }));
        }

        children.push(new Table({ columnWidths: [2000, 1500, 1500, 2000, 1500, 1500, 2000], rows: testRows }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [new TextRun({ 
                text: 'Note: ADF p < 0.05 = stationary (reject unit root) | KPSS p > 0.05 = stationary (fail to reject stationarity)', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Test Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const interpretRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('ADF Result', true, 2500),
                    createTableCell('KPSS Result', true, 2500),
                    createTableCell('Interpretation', true, 2500),
                    createTableCell('Action', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p < 0.05 ✓', false, 2500, { color: COLORS.success }),
                    createTableCell('p > 0.05 ✓', false, 2500, { color: COLORS.success }),
                    createTableCell('Stationary', false, 2500, { bold: true, color: COLORS.success }),
                    createTableCell('Use ARMA(p,q), d=0', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≥ 0.05 ✗', false, 2500, { color: COLORS.danger }),
                    createTableCell('p ≤ 0.05 ✗', false, 2500, { color: COLORS.danger }),
                    createTableCell('Non-Stationary', false, 2500, { bold: true, color: COLORS.danger }),
                    createTableCell('Use ARIMA(p,d,q), d≥1', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p < 0.05 ✓', false, 2500, { color: COLORS.success }),
                    createTableCell('p ≤ 0.05 ✗', false, 2500, { color: COLORS.danger }),
                    createTableCell('Trend-Stationary', false, 2500, { bold: true, color: COLORS.warning }),
                    createTableCell('Detrend or difference', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≥ 0.05 ✗', false, 2500, { color: COLORS.danger }),
                    createTableCell('p > 0.05 ✓', false, 2500, { color: COLORS.success }),
                    createTableCell('Unit Root', false, 2500, { bold: true, color: COLORS.warning }),
                    createTableCell('Differencing required', false, 3000)
                ]
            })
        ];

        // Highlight current status
        children.push(new Table({ columnWidths: [2500, 2500, 2500, 3000], rows: interpretRows }));

        // 4. Visualization (if available)
        if (originalPlot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Time Series Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ text: 'Original Series', bold: true, size: 24, font: 'Arial' })]
            }));

            try {
                const imageData = originalPlot.startsWith('data:') ? originalPlot.split(',')[1] : originalPlot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 300 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Original plot error:', e);
            }

            if (firstDiffPlot) {
                children.push(new Paragraph({
                    spacing: { before: 200, after: 100 },
                    children: [new TextRun({ text: 'First Difference', bold: true, size: 24, font: 'Arial' })]
                }));

                try {
                    const imageData = firstDiffPlot.startsWith('data:') ? firstDiffPlot.split(',')[1] : firstDiffPlot;
                    children.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new ImageRun({
                                data: Buffer.from(imageData, 'base64'),
                                transformation: { width: 550, height: 300 },
                                type: 'png'
                            })
                        ]
                    }));
                } catch (e) {
                    console.error('First diff plot error:', e);
                }
            }
        }

        // 5. Recommendations
        const recSectionNum = originalPlot ? 5 : 4;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = isStationary
            ? [
                'Series is stationary - no differencing required.',
                'Proceed with ARMA(p,q) model selection.',
                'Use ACF/PACF plots to determine p and q orders.',
                'Verify model residuals are white noise.',
                'Consider seasonal components if applicable.'
            ]
            : firstDiffStationary
                ? [
                    'First differencing achieves stationarity.',
                    'Use ARIMA(p,1,q) for modeling.',
                    'Check ACF/PACF of differenced series.',
                    'Consider SARIMA if seasonal patterns exist.',
                    'Validate with out-of-sample forecasting.'
                ]
                : [
                    'Additional transformation may be needed.',
                    'Consider d=2 (second differencing).',
                    'Try log transformation for variance stabilization.',
                    'Seasonal differencing may help if pattern exists.',
                    'Consult Box-Cox transformation for optimal λ.'
                ];

        recs.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isStationary ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 6. About Stationarity Tests
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Stationarity Tests`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'ADF (Augmented Dickey-Fuller) tests for unit root: H₀ = unit root exists (non-stationary).',
            'KPSS tests for stationarity directly: H₀ = series is stationary.',
            'Using both tests provides more robust conclusions than either alone.',
            'Stationarity means constant mean, variance, and autocovariance over time.',
            'Non-stationary series lead to spurious regression and unreliable forecasts.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Stationarity Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Stationarity_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
