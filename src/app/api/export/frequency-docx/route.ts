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
        const { results, selectedVars, totalRows } = await request.json();
        
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
            children: [new TextRun({ text: 'Frequency Analysis', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variables: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${selectedVars.length} analyzed`, size: 24, font: 'Arial', color: COLORS.primary }),
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

        // ============================================
        // 1. Executive Summary
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '1. Executive Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Calculate totals
        let totalCategories = 0;
        const modes: string[] = [];
        selectedVars.forEach((varName: string) => {
            const result = results[varName];
            if (result && !result.error) {
                totalCategories += result.summary.unique_categories;
                modes.push(`${varName}: ${result.summary.mode}`);
            }
        });

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `This report analyzes the frequency distribution of `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${selectedVars.length} categorical variable(s)`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
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
                    createTableCell('Variable', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Categories', true, 1800),
                    createTableCell('Mode', true, 2500),
                    createTableCell('Entropy', true, 1800)
                ]
            })
        ];

        selectedVars.forEach((varName: string) => {
            const result = results[varName];
            if (result && !result.error) {
                summaryRows.push(new TableRow({
                    children: [
                        createTableCell(varName, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(String(result.summary.unique_categories), false, 1800, { highlight: true }),
                        createTableCell(String(result.summary.mode), false, 2500),
                        createTableCell(
                            result.summary.normalized_entropy !== undefined 
                                ? result.summary.normalized_entropy.toFixed(3) 
                                : 'N/A', 
                            false, 1800
                        )
                    ]
                }));
            }
        });

        children.push(new Table({ columnWidths: [3000, 1800, 2500, 1800], rows: summaryRows }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Frequency distributions were examined for ${selectedVars.length} categorical variable(s) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${totalRows})`, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `. Frequencies (f), percentages (%), and cumulative percentages were computed for each category. A total of ${totalCategories} unique categories were identified across all variables.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // ============================================
        // 2. Frequency Tables
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Frequency Tables', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        let varIndex = 1;
        for (const varName of selectedVars) {
            const result = results[varName];
            if (!result || result.error) continue;

            // Variable header
            children.push(new Paragraph({
                spacing: { before: 300, after: 100 },
                children: [new TextRun({ 
                    text: `2.${varIndex} ${varName}`, 
                    bold: true, size: 26, font: 'Arial', color: COLORS.secondary 
                })]
            }));

            // Summary info
            children.push(new Paragraph({
                spacing: { after: 150 },
                children: [
                    new TextRun({ text: `Mode: `, size: 20, font: 'Arial', color: COLORS.gray }),
                    new TextRun({ text: String(result.summary.mode), bold: true, size: 20, font: 'Arial' }),
                    new TextRun({ text: ` | Categories: `, size: 20, font: 'Arial', color: COLORS.gray }),
                    new TextRun({ text: String(result.summary.unique_categories), bold: true, size: 20, font: 'Arial' }),
                    new TextRun({ text: ` | n = `, size: 20, font: 'Arial', color: COLORS.gray }),
                    new TextRun({ text: String(result.summary.total_count), bold: true, size: 20, font: 'Arial' })
                ]
            }));

            // Frequency table
            const freqHeaderRow = new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Value', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Frequency', true, 1800),
                    createTableCell('Percentage', true, 1800),
                    createTableCell('Cumulative %', true, 2000)
                ]
            });

            const freqDataRows = result.table.slice(0, 15).map((item: any) => {
                return new TableRow({
                    children: [
                        createTableCell(String(item.Value), false, 3500, { align: AlignmentType.LEFT }),
                        createTableCell(String(item.Frequency), false, 1800),
                        createTableCell(`${item.Percentage.toFixed(1)}%`, false, 1800, { highlight: true }),
                        createTableCell(`${item['Cumulative Percentage'].toFixed(1)}%`, false, 2000)
                    ]
                });
            });

            children.push(new Table({
                columnWidths: [3500, 1800, 1800, 2000],
                rows: [freqHeaderRow, ...freqDataRows]
            }));

            if (result.table.length > 15) {
                children.push(new Paragraph({
                    spacing: { before: 50 },
                    children: [new TextRun({ 
                        text: `... and ${result.table.length - 15} more values`, 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }

            varIndex++;
        }

        // ============================================
        // 3. Insights & Recommendations
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Insights & Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        let insightIndex = 1;
        for (const varName of selectedVars) {
            const result = results[varName];
            if (!result || result.error) continue;

            if (result.insights && result.insights.length > 0) {
                children.push(new Paragraph({
                    spacing: { before: 200, after: 100 },
                    children: [new TextRun({ 
                        text: `${varName}`, 
                        bold: true, size: 24, font: 'Arial', color: COLORS.secondary 
                    })]
                }));

                result.insights.forEach((insight: any) => {
                    const isWarning = insight.type === 'warning';
                    children.push(new Paragraph({
                        spacing: { after: 80 },
                        children: [
                            new TextRun({ 
                                text: isWarning ? '⚠ ' : '• ', 
                                bold: true, size: 22, font: 'Arial', 
                                color: isWarning ? COLORS.warning : COLORS.primary 
                            }),
                            new TextRun({ text: `${insight.title}: `, bold: true, size: 22, font: 'Arial' }),
                            new TextRun({ text: insight.description, size: 22, font: 'Arial' })
                        ]
                    }));
                });
            }

            if (result.recommendations && result.recommendations.length > 0) {
                result.recommendations.forEach((rec: string) => {
                    children.push(new Paragraph({
                        spacing: { after: 80 },
                        children: [
                            new TextRun({ text: '→ ', bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                            new TextRun({ text: rec, size: 22, font: 'Arial' })
                        ]
                    }));
                });
            }

            insightIndex++;
        }

        // If no insights found, add generic summary
        const hasAnyInsights = selectedVars.some((v: string) => results[v]?.insights?.length > 0);
        if (!hasAnyInsights) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `All ${selectedVars.length} variables analyzed successfully.`, size: 22, font: 'Arial' })
                ]
            }));
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Total of ${totalCategories} unique categories identified across all variables.`, size: 22, font: 'Arial' })
                ]
            }));
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
                            children: [new TextRun({ text: 'Frequency Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })]
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

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Frequency_Analysis_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}