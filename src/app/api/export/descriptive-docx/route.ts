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
    options: { highlight?: boolean; bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}
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
                        color: isHeader ? COLORS.primaryDark : COLORS.secondary,
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
        const { results, selectedVars, groupByVar, numericHeaders, categoricalHeaders, totalRows } = await request.json();
        
        const numericVars = selectedVars.filter((v: string) => numericHeaders.includes(v) && results[v]?.type === 'numeric');
        const categoricalVars = selectedVars.filter((v: string) => categoricalHeaders.includes(v) && results[v]?.type === 'categorical');
        
        const children: (Paragraph | Table)[] = [];

        // ============================================
        // Title
        // ============================================
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Statistical Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Descriptive Statistics Analysis', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variables: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${selectedVars.length} selected`, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Observations: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(totalRows), size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        if (groupByVar) {
            children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: 'Grouped by: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                    new TextRun({ text: groupByVar, size: 24, font: 'Arial', color: COLORS.primary })
                ]
            }));
        }

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ 
                text: `Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 
                size: 20, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // ============================================
        // 1. Executive Summary
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '1. Executive Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `This report provides descriptive statistics for `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${selectedVars.length} variables`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` across `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalRows} observations`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `.`, size: 22, font: 'Arial' })
            ]
        }));

        // Summary table
        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Category', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Count', true, 2000),
                    createTableCell('Details', true, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Numeric Variables', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(numericVars.length), false, 2000, { highlight: true }),
                    createTableCell(numericVars.length > 0 ? numericVars.slice(0, 3).join(', ') + (numericVars.length > 3 ? '...' : '') : 'None', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Categorical Variables', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(categoricalVars.length), false, 2000, { highlight: true }),
                    createTableCell(categoricalVars.length > 0 ? categoricalVars.slice(0, 3).join(', ') + (categoricalVars.length > 3 ? '...' : '') : 'None', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Total Observations', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(totalRows), false, 2000, { highlight: true }),
                    createTableCell('Rows in dataset', false, 4000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2000, 4000], rows: summaryRows }));

        // ============================================
        // 2. Numeric Variables Summary
        // ============================================
        if (numericVars.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '2. Numeric Variables Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 150 },
                children: [new TextRun({ 
                    text: 'Central tendency and dispersion measures for all numeric variables.', 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })]
            }));

            // Create header row
            const numericHeaderRow = new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 1800, { align: AlignmentType.LEFT }),
                    ...numericVars.map((v: string) => createTableCell(v, true, Math.floor(7200 / numericVars.length)))
                ]
            });

            const metrics = [
                { key: 'count', label: 'Count' },
                { key: 'mean', label: 'Mean' },
                { key: 'stdDev', label: 'Std. Dev.' },
                { key: 'min', label: 'Min' },
                { key: 'q1', label: '25th %' },
                { key: 'median', label: 'Median' },
                { key: 'q3', label: '75th %' },
                { key: 'max', label: 'Max' },
                { key: 'skewness', label: 'Skewness' },
                { key: 'kurtosis', label: 'Kurtosis' }
            ];

            const numericDataRows = metrics.map(metric => {
                return new TableRow({
                    children: [
                        createTableCell(metric.label, false, 1800, { align: AlignmentType.LEFT, bold: true }),
                        ...numericVars.map((v: string) => {
                            const stats = results[v]?.stats;
                            const value = stats?.[metric.key];
                            const displayValue = typeof value === 'number' 
                                ? (metric.key === 'count' ? String(value) : value.toFixed(3))
                                : 'N/A';
                            return createTableCell(displayValue, false, Math.floor(7200 / numericVars.length), {
                                highlight: metric.key === 'mean' || metric.key === 'median'
                            });
                        })
                    ]
                });
            });

            children.push(new Table({
                columnWidths: [1800, ...numericVars.map(() => Math.floor(7200 / numericVars.length))],
                rows: [numericHeaderRow, ...numericDataRows]
            }));
        }

        // ============================================
        // 3. Categorical Variables Summary
        // ============================================
        if (categoricalVars.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Categorical Variables Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 150 },
                children: [new TextRun({ 
                    text: 'Frequency distribution and mode for all categorical variables.', 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })]
            }));

            // Summary table for categorical
            const catHeaderRow = new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Variable', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Count', true, 1500),
                    createTableCell('Unique', true, 1500),
                    createTableCell('Mode', true, 2000),
                    createTableCell('Missing', true, 1500)
                ]
            });

            const catDataRows = categoricalVars.map((v: string) => {
                const summary = results[v]?.summary;
                return new TableRow({
                    children: [
                        createTableCell(v, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(String(summary?.count || 'N/A'), false, 1500),
                        createTableCell(String(summary?.unique || 'N/A'), false, 1500, { highlight: true }),
                        createTableCell(String(summary?.mode || 'N/A'), false, 2000, { highlight: true }),
                        createTableCell(String(summary?.missing || 0), false, 1500)
                    ]
                });
            });

            children.push(new Table({
                columnWidths: [2500, 1500, 1500, 2000, 1500],
                rows: [catHeaderRow, ...catDataRows]
            }));

            // Frequency tables for each categorical variable
            for (const varName of categoricalVars) {
                const table = results[varName]?.table;
                if (table && table.length > 0) {
                    children.push(new Paragraph({
                        spacing: { before: 300, after: 100 },
                        children: [new TextRun({ 
                            text: `3.${categoricalVars.indexOf(varName) + 1} Frequency Table: ${varName}`, 
                            bold: true, size: 26, font: 'Arial', color: COLORS.secondary 
                        })]
                    }));

                    const freqHeaderRow = new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Value', true, 4000, { align: AlignmentType.LEFT }),
                            createTableCell('Frequency', true, 2500),
                            createTableCell('Percentage', true, 2500)
                        ]
                    });

                    const freqDataRows = table.slice(0, 10).map((item: any) => {
                        return new TableRow({
                            children: [
                                createTableCell(String(item.Value), false, 4000, { align: AlignmentType.LEFT }),
                                createTableCell(String(item.Frequency), false, 2500),
                                createTableCell(`${item.Percentage.toFixed(1)}%`, false, 2500, { highlight: true })
                            ]
                        });
                    });

                    children.push(new Table({
                        columnWidths: [4000, 2500, 2500],
                        rows: [freqHeaderRow, ...freqDataRows]
                    }));

                    if (table.length > 10) {
                        children.push(new Paragraph({
                            spacing: { before: 50 },
                            children: [new TextRun({ 
                                text: `... and ${table.length - 10} more values`, 
                                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                            })]
                        }));
                    }
                }
            }
        }

        // ============================================
        // 4. Grouped Statistics (if applicable)
        // ============================================
        if (groupByVar && numericVars.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `4. Statistics Grouped by ${groupByVar}`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            for (const varName of numericVars) {
                const groupedStats = results[varName]?.groupedStats;
                if (groupedStats && Object.keys(groupedStats).length > 0) {
                    children.push(new Paragraph({
                        spacing: { before: 200, after: 100 },
                        children: [new TextRun({ 
                            text: `${varName}`, 
                            bold: true, size: 26, font: 'Arial', color: COLORS.secondary 
                        })]
                    }));

                    const groupHeaderRow = new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell(groupByVar, true, 2500, { align: AlignmentType.LEFT }),
                            createTableCell('Count', true, 1500),
                            createTableCell('Mean', true, 1800),
                            createTableCell('Std. Dev.', true, 1800),
                            createTableCell('Min', true, 1400),
                            createTableCell('Max', true, 1400)
                        ]
                    });

                    const groupDataRows = Object.entries(groupedStats).map(([group, stats]: [string, any]) => {
                        return new TableRow({
                            children: [
                                createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                                createTableCell(String(stats.count), false, 1500),
                                createTableCell(stats.mean?.toFixed(3) || 'N/A', false, 1800, { highlight: true }),
                                createTableCell(stats.stdDev?.toFixed(3) || 'N/A', false, 1800),
                                createTableCell(stats.min?.toFixed(3) || 'N/A', false, 1400),
                                createTableCell(stats.max?.toFixed(3) || 'N/A', false, 1400)
                            ]
                        });
                    });

                    children.push(new Table({
                        columnWidths: [2500, 1500, 1800, 1800, 1400, 1400],
                        rows: [groupHeaderRow, ...groupDataRows]
                    }));
                }
            }
        }

        // ============================================
        // 5. Key Insights
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${groupByVar ? '5' : '4'}. Key Insights`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Collect insights from results
        const allInsights: string[] = [];
        for (const varName of selectedVars) {
            const insights = results[varName]?.insights;
            if (insights && insights.length > 0) {
                insights.forEach((insight: string) => {
                    allInsights.push(`${varName}: ${insight}`);
                });
            }
        }

        if (allInsights.length > 0) {
            allInsights.slice(0, 10).forEach((insight, idx) => {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                        new TextRun({ text: insight, size: 22, font: 'Arial' })
                    ]
                }));
            });
        } else {
            // Generate basic insights
            if (numericVars.length > 0) {
                const firstNumeric = numericVars[0];
                const stats = results[firstNumeric]?.stats;
                if (stats) {
                    children.push(new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                            new TextRun({ text: `${firstNumeric} has a mean of ${stats.mean?.toFixed(2)} with standard deviation ${stats.stdDev?.toFixed(2)}.`, size: 22, font: 'Arial' })
                        ]
                    }));

                    if (Math.abs(stats.skewness) > 1) {
                        children.push(new Paragraph({
                            spacing: { after: 100 },
                            children: [
                                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.warning }),
                                new TextRun({ text: `${firstNumeric} shows ${stats.skewness > 0 ? 'positive' : 'negative'} skewness (${stats.skewness.toFixed(2)}), indicating an asymmetric distribution.`, size: 22, font: 'Arial' })
                            ]
                        }));
                    }
                }
            }

            if (categoricalVars.length > 0) {
                const firstCat = categoricalVars[0];
                const summary = results[firstCat]?.summary;
                if (summary) {
                    children.push(new Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                            new TextRun({ text: `${firstCat} has ${summary.unique} unique values with "${summary.mode}" as the most frequent.`, size: 22, font: 'Arial' })
                        ]
                    }));
                }
            }
        }

        // ============================================
        // Create Document
        // ============================================
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: 'Arial', size: 22 }
                    }
                }
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                    }
                },
                headers: {
                    default: new Header({
                        children: [new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: 'Descriptive Statistics Report', size: 18, color: COLORS.gray, font: 'Arial' })]
                        })]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }),
                                new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })
                            ]
                        })]
                    })
                },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Descriptive_Statistics_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}