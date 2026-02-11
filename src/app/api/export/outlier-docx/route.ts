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

interface OutlierResult {
    z_score_outliers: { index: number; value: number; z_score: number }[];
    iqr_outliers: { index: number; value: number }[];
    summary: { total_count: number; z_score_count: number; iqr_count: number; };
    plot: string;
}

export async function POST(request: NextRequest) {
    try {
        const { results, selectedVars, totalRows } = await request.json();
        
        const validResults = Object.entries(results).filter(([_, r]: [string, any]) => !r.error) as [string, OutlierResult][];
        const totalZScore = validResults.reduce((sum, [_, r]) => sum + r.summary.z_score_count, 0);
        const totalIQR = validResults.reduce((sum, [_, r]) => sum + r.summary.iqr_count, 0);
        const totalObs = validResults.reduce((sum, [_, r]) => sum + r.summary.total_count, 0);
        const hasOutliers = totalZScore > 0 || totalIQR > 0;
        const varsWithOutliers = validResults.filter(([_, r]) => r.summary.z_score_count > 0 || r.summary.iqr_count > 0);
        
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
            children: [new TextRun({ text: 'Outlier Detection Analysis', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variables: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${selectedVars.length}`, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Observations: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(totalRows), size: 24, font: 'Arial', color: COLORS.primary })
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
                    text: !hasOutliers ? '✓ ' : '⚠ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: !hasOutliers ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: !hasOutliers 
                        ? 'No significant outliers detected - Data appears clean'
                        : `Outliers detected in ${varsWithOutliers.length} of ${validResults.length} variables`,
                    bold: true, size: 24, font: 'Arial',
                    color: !hasOutliers ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Found `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalZScore}`, bold: true, size: 22, font: 'Arial', color: totalZScore > 0 ? COLORS.warning : COLORS.success }),
                new TextRun({ text: ` Z-Score outliers (|Z| > 3)`, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Found `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalIQR}`, bold: true, size: 22, font: 'Arial', color: totalIQR > 0 ? COLORS.warning : COLORS.success }),
                new TextRun({ text: ` IQR outliers (beyond 1.5×IQR)`, size: 22, font: 'Arial' })
            ]
        }));

        const outlierRate = ((totalZScore + totalIQR) / (totalObs * 2) * 100).toFixed(2);
        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Overall outlier rate: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${outlierRate}%`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // Summary table
        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Z-Score', true, 2500),
                    createTableCell('IQR', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Total Outliers Found', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(totalZScore), false, 2500, { highlight: totalZScore > 0, color: totalZScore > 0 ? COLORS.warning : undefined }),
                    createTableCell(String(totalIQR), false, 2500, { highlight: totalIQR > 0, color: totalIQR > 0 ? COLORS.warning : undefined })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Variables with Outliers', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(validResults.filter(([_, r]) => r.summary.z_score_count > 0).length), false, 2500),
                    createTableCell(String(validResults.filter(([_, r]) => r.summary.iqr_count > 0).length), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Detection Threshold', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('|Z| > 3', false, 2500),
                    createTableCell('1.5 × IQR', false, 2500)
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
                new TextRun({ text: `Outlier detection was performed on ${selectedVars.length} continuous variable(s) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${totalRows}) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `using two methods: Z-score (|Z| > 3) and IQR (values beyond 1.5×IQR from quartiles). `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `A total of ${totalZScore} Z-score outliers and ${totalIQR} IQR outliers were identified across all variables.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Variable-by-Variable Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Variable-by-Variable Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Results table
        const varHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Variable', true, 2500, { align: AlignmentType.LEFT }),
                createTableCell('Total N', true, 1500),
                createTableCell('Z-Score Outliers', true, 2000),
                createTableCell('IQR Outliers', true, 2000),
                createTableCell('Status', true, 1500)
            ]
        });

        const varDataRows = validResults.map(([variable, result]) => {
            const hasAny = result.summary.z_score_count > 0 || result.summary.iqr_count > 0;
            return new TableRow({
                children: [
                    createTableCell(variable, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(result.summary.total_count), false, 1500),
                    createTableCell(String(result.summary.z_score_count), false, 2000, { 
                        color: result.summary.z_score_count > 0 ? COLORS.warning : COLORS.success,
                        highlight: result.summary.z_score_count > 0
                    }),
                    createTableCell(String(result.summary.iqr_count), false, 2000, { 
                        color: result.summary.iqr_count > 0 ? COLORS.warning : COLORS.success,
                        highlight: result.summary.iqr_count > 0
                    }),
                    createTableCell(hasAny ? 'Review' : 'Clean', false, 1500, { 
                        bold: true,
                        color: hasAny ? COLORS.warning : COLORS.success 
                    })
                ]
            });
        });

        children.push(new Table({
            columnWidths: [2500, 1500, 2000, 2000, 1500],
            rows: [varHeaderRow, ...varDataRows]
        }));

        // 3. Detailed Outlier List
        if (hasOutliers) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Detailed Outlier List', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            for (const [variable, result] of varsWithOutliers) {
                children.push(new Paragraph({
                    spacing: { before: 200, after: 100 },
                    children: [new TextRun({ 
                        text: `${variable}`, 
                        bold: true, size: 26, font: 'Arial', color: COLORS.secondary 
                    })]
                }));

                // Z-Score outliers
                if (result.z_score_outliers.length > 0) {
                    children.push(new Paragraph({
                        spacing: { after: 80 },
                        children: [new TextRun({ 
                            text: `Z-Score Outliers (${result.z_score_outliers.length}):`, 
                            bold: true, size: 20, font: 'Arial', color: COLORS.gray 
                        })]
                    }));

                    const zHeaderRow = new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Row Index', true, 2000),
                            createTableCell('Value', true, 3000),
                            createTableCell('Z-Score', true, 3000)
                        ]
                    });

                    const zDataRows = result.z_score_outliers.slice(0, 10).map(o => {
                        return new TableRow({
                            children: [
                                createTableCell(String(o.index), false, 2000),
                                createTableCell(o.value.toFixed(3), false, 3000),
                                createTableCell(o.z_score.toFixed(3), false, 3000, { 
                                    color: Math.abs(o.z_score) > 4 ? COLORS.danger : COLORS.warning 
                                })
                            ]
                        });
                    });

                    children.push(new Table({ columnWidths: [2000, 3000, 3000], rows: [zHeaderRow, ...zDataRows] }));

                    if (result.z_score_outliers.length > 10) {
                        children.push(new Paragraph({
                            spacing: { before: 50 },
                            children: [new TextRun({ 
                                text: `... and ${result.z_score_outliers.length - 10} more Z-score outliers`, 
                                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                            })]
                        }));
                    }
                }

                // IQR outliers
                if (result.iqr_outliers.length > 0) {
                    children.push(new Paragraph({
                        spacing: { before: 100, after: 80 },
                        children: [new TextRun({ 
                            text: `IQR Outliers (${result.iqr_outliers.length}):`, 
                            bold: true, size: 20, font: 'Arial', color: COLORS.gray 
                        })]
                    }));

                    const iqrHeaderRow = new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Row Index', true, 4000),
                            createTableCell('Value', true, 4000)
                        ]
                    });

                    const iqrDataRows = result.iqr_outliers.slice(0, 10).map(o => {
                        return new TableRow({
                            children: [
                                createTableCell(String(o.index), false, 4000),
                                createTableCell(o.value.toFixed(3), false, 4000)
                            ]
                        });
                    });

                    children.push(new Table({ columnWidths: [4000, 4000], rows: [iqrHeaderRow, ...iqrDataRows] }));

                    if (result.iqr_outliers.length > 10) {
                        children.push(new Paragraph({
                            spacing: { before: 50 },
                            children: [new TextRun({ 
                                text: `... and ${result.iqr_outliers.length - 10} more IQR outliers`, 
                                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                            })]
                        }));
                    }
                }
            }
        }

        // 4. Method Explanation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: hasOutliers ? '4. Method Explanation' : '3. Method Explanation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const methodRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Method', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Formula', true, 3000),
                    createTableCell('Best For', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Z-Score', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('|Z| = |x - μ| / σ > 3', false, 3000),
                    createTableCell('Normally distributed data', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('IQR', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('x < Q1-1.5×IQR or x > Q3+1.5×IQR', false, 3000),
                    createTableCell('Any distribution, robust to skewness', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 3000, 3500], rows: methodRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: hasOutliers ? '5. Recommendations' : '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = hasOutliers 
            ? [
                'Investigate outliers before removing: Are they data entry errors or genuine extreme values?',
                'Consider winsorizing (capping) extreme values instead of removing them.',
                'Use robust statistical methods (median, trimmed mean) that are less sensitive to outliers.',
                'Document any outlier treatment for reproducibility.',
                'Re-run analyses with and without outliers to assess their impact.'
            ]
            : [
                'No outliers detected - your data appears clean.',
                'Proceed with standard statistical analyses.',
                'Consider re-checking if results seem unusual, as outliers may appear with different thresholds.',
                'Monitor for outliers when adding new data to the dataset.'
            ];

        recommendations.forEach((rec, idx) => {
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Outlier Detection Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Outlier_Detection_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}