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

const getCVInterpretation = (cv: number): string => {
    if (cv < 10) return 'Very Low';
    if (cv < 20) return 'Low';
    if (cv < 30) return 'Moderate';
    if (cv < 50) return 'High';
    return 'Very High';
};

export async function POST(request: NextRequest) {
    try {
        const { results, interpretation, selectedVars, totalRows } = await request.json();
        
        const avgCV = results.reduce((sum: number, r: any) => sum + r.cv, 0) / results.length;
        const minCV = Math.min(...results.map((r: any) => r.cv));
        const maxCV = Math.max(...results.map((r: any) => r.cv));
        const mostConsistent = results.find((r: any) => r.cv === minCV);
        const leastConsistent = results.find((r: any) => r.cv === maxCV);
        const sortedByCV = [...results].sort((a: any, b: any) => a.cv - b.cv);
        
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
            children: [new TextRun({ text: 'Variability Analysis', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
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

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Variability analysis was conducted on `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${results.length} numeric variables`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` across `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalRows} observations`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `.`, size: 22, font: 'Arial' })
            ]
        }));

        // Summary metrics table
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
                    createTableCell('Average CV', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${avgCV.toFixed(1)}%`, false, 2500, { highlight: true }),
                    createTableCell(getCVInterpretation(avgCV), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('CV Range', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${minCV.toFixed(1)}% - ${maxCV.toFixed(1)}%`, false, 2500, { highlight: true }),
                    createTableCell('Min to Max', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Most Consistent Variable', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(mostConsistent?.variable || 'N/A', false, 2500, { highlight: true }),
                    createTableCell(`CV = ${minCV.toFixed(1)}%`, false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Least Consistent Variable', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(leastConsistent?.variable || 'N/A', false, 2500),
                    createTableCell(`CV = ${maxCV.toFixed(1)}%`, false, 2500)
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
                new TextRun({ text: `Variability was assessed for ${results.length} continuous variables `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${totalRows})`, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `. The coefficient of variation (CV) ranged from ${minCV.toFixed(1)}% to ${maxCV.toFixed(1)}% `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(M = ${avgCV.toFixed(1)}%), indicating ${avgCV < 15 ? 'low' : avgCV < 30 ? 'moderate' : 'high'} overall variability.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Variability Metrics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Variability Metrics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ 
                text: 'Detailed variability measures for each variable. Lower CV indicates more consistency.', 
                size: 22, font: 'Arial', color: COLORS.gray 
            })]
        }));

        // Full metrics table
        const metricsHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Variable', true, 2500, { align: AlignmentType.LEFT }),
                createTableCell('Range', true, 1800),
                createTableCell('IQR', true, 1800),
                createTableCell('CV (%)', true, 1600),
                createTableCell('Interpretation', true, 1800)
            ]
        });

        const metricsDataRows = sortedByCV.map((r: any) => {
            return new TableRow({
                children: [
                    createTableCell(r.variable, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(r.range.toFixed(2), false, 1800),
                    createTableCell(r.iqr.toFixed(2), false, 1800),
                    createTableCell(r.cv.toFixed(1), false, 1600, { highlight: r.cv === minCV }),
                    createTableCell(getCVInterpretation(r.cv), false, 1800)
                ]
            });
        });

        children.push(new Table({
            columnWidths: [2500, 1800, 1800, 1600, 1800],
            rows: [metricsHeaderRow, ...metricsDataRows]
        }));

        // 3. Variable Ranking
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Variable Ranking (by Consistency)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        sortedByCV.forEach((r: any, idx: number) => {
            const color = idx === 0 ? COLORS.success : idx === sortedByCV.length - 1 ? COLORS.warning : COLORS.secondary;
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color }),
                    new TextRun({ text: r.variable, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` — CV = ${r.cv.toFixed(1)}% (${getCVInterpretation(r.cv)})`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        });

        // 4. Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        if (interpretation) {
            // Parse interpretation and add as paragraphs
            const lines = interpretation.split('\n').filter((l: string) => l.trim());
            lines.forEach((line: string) => {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: line.replace(/\*\*/g, ''), size: 22, font: 'Arial' })]
                }));
            });
        } else {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• Overall Consistency: ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Average CV of ${avgCV.toFixed(1)}% indicates ${getCVInterpretation(avgCV).toLowerCase()} variability across variables.`, size: 22, font: 'Arial' })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• Most Reliable: ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `${mostConsistent?.variable} shows the highest consistency with CV of ${minCV.toFixed(1)}%.`, size: 22, font: 'Arial' })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• Needs Attention: ', bold: true, size: 22, font: 'Arial', color: COLORS.warning }),
                    new TextRun({ text: `${leastConsistent?.variable} has the highest variability (CV = ${maxCV.toFixed(1)}%).`, size: 22, font: 'Arial' })
                ]
            }));
        }

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = [
            avgCV < 20 ? 'Overall good consistency. Variables are suitable for statistical modeling.' : 'Some variables show high variability. Consider data transformation or outlier treatment.',
            `Focus on ${mostConsistent?.variable} for most stable estimates.`,
            maxCV > 40 ? `Investigate ${leastConsistent?.variable} for sources of high variability.` : 'All variables within acceptable variability range.',
            'Consider IQR over Range when outliers are present in the data.'
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

        // CV Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. CV Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('CV Range', true, 2500),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Meaning', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 10%', false, 2500),
                    createTableCell('Very Low', false, 3000),
                    createTableCell('Highly consistent, very reliable', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('10% - 20%', false, 2500),
                    createTableCell('Low', false, 3000),
                    createTableCell('Good consistency, reliable', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('20% - 30%', false, 2500),
                    createTableCell('Moderate', false, 3000),
                    createTableCell('Acceptable variability', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('30% - 50%', false, 2500),
                    createTableCell('High', false, 3000),
                    createTableCell('Considerable variability, investigate', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('> 50%', false, 2500),
                    createTableCell('Very High', false, 3000),
                    createTableCell('High inconsistency, needs attention', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 3000, 3500], rows: guideRows }));

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Variability Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Variability_Analysis_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

