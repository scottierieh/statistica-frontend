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

export async function POST(request: NextRequest) {
    try {
        const { results, selectedVars, totalRows, primaryTest } = await request.json();
        
        const entries = Object.entries(results).filter(([_, r]: [string, any]) => !r.error);
        const normalCount = entries.filter(([_, r]: [string, any]) => r.is_normal).length;
        const totalCount = entries.length;
        const normalVars = entries.filter(([_, r]: [string, any]) => r.is_normal).map(([v]) => v);
        const nonNormalVars = entries.filter(([_, r]: [string, any]) => !r.is_normal).map(([v]) => v);
        
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
            children: [new TextRun({ text: 'Normality Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variables: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${selectedVars.length}`, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Observations: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(totalRows), size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Primary Test: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: primaryTest, size: 24, font: 'Arial', color: COLORS.primary })
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
                new TextRun({ text: `Normality tests were conducted on `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalCount} variable(s)`, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` using `, size: 22, font: 'Arial' }),
                new TextRun({ text: primaryTest, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` as the primary test (α = 0.05).`, size: 22, font: 'Arial' })
            ]
        }));

        // Summary table
        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Category', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Count', true, 2000),
                    createTableCell('Variables', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Normal (p > 0.05)', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(normalCount), false, 2000, { highlight: true, color: COLORS.success }),
                    createTableCell(normalVars.length > 0 ? normalVars.slice(0, 3).join(', ') + (normalVars.length > 3 ? '...' : '') : 'None', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Non-Normal (p ≤ 0.05)', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(totalCount - normalCount), false, 2000, { color: totalCount - normalCount > 0 ? COLORS.danger : undefined }),
                    createTableCell(nonNormalVars.length > 0 ? nonNormalVars.slice(0, 3).join(', ') + (nonNormalVars.length > 3 ? '...' : '') : 'None', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2000, 3000], rows: summaryRows }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const nonNormalCount = totalCount - normalCount;
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Normality was assessed for ${totalCount} continuous variable(s) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${totalRows}) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `using the ${primaryTest === 'shapiro' ? 'Shapiro-Wilk' : primaryTest === 'ks' ? 'Kolmogorov-Smirnov' : 'Jarque-Bera'} test. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `Of these, ${normalCount} variable(s) showed approximately normal distributions (p > .05), while ${nonNormalCount} exhibited significant departures from normality.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // Conclusion box
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ 
                    text: normalCount === totalCount ? '✓ ' : '⚠ ', 
                    bold: true, size: 24, font: 'Arial', 
                    color: normalCount === totalCount ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: normalCount === totalCount 
                        ? 'All variables are normally distributed. Parametric tests are appropriate.'
                        : normalCount > 0 
                        ? 'Mixed results. Consider non-parametric alternatives for non-normal variables.'
                        : 'All variables show non-normal distribution. Use non-parametric tests.',
                    size: 22, font: 'Arial'
                })
            ]
        }));

        // 2. Detailed Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Detailed Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Results table
        const resultsHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Variable', true, 2000, { align: AlignmentType.LEFT }),
                createTableCell('N', true, 800),
                createTableCell('SW Stat', true, 1200),
                createTableCell('SW p', true, 1000),
                createTableCell('K-S Stat', true, 1200),
                createTableCell('K-S p', true, 1000),
                createTableCell('JB Stat', true, 1200),
                createTableCell('JB p', true, 1000),
                createTableCell('Result', true, 1100)
            ]
        });

        const resultsDataRows = entries.map(([variable, result]: [string, any]) => {
            const formatP = (p: number) => p < 0.001 ? '<.001' : p.toFixed(3);
            return new TableRow({
                children: [
                    createTableCell(variable, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(result.n), false, 800),
                    createTableCell(result.shapiro_wilk.statistic.toFixed(3), false, 1200),
                    createTableCell(formatP(result.shapiro_wilk.p_value), false, 1000, { 
                        highlight: result.primary_test === 'shapiro_wilk',
                        color: result.shapiro_wilk.p_value > 0.05 ? COLORS.success : COLORS.danger
                    }),
                    createTableCell(result.kolmogorov_smirnov.statistic.toFixed(3), false, 1200),
                    createTableCell(formatP(result.kolmogorov_smirnov.p_value), false, 1000, { 
                        highlight: result.primary_test === 'kolmogorov_smirnov',
                        color: result.kolmogorov_smirnov.p_value > 0.05 ? COLORS.success : COLORS.danger
                    }),
                    createTableCell(result.jarque_bera.statistic.toFixed(3), false, 1200),
                    createTableCell(formatP(result.jarque_bera.p_value), false, 1000, { 
                        highlight: result.primary_test === 'jarque_bera',
                        color: result.jarque_bera.p_value > 0.05 ? COLORS.success : COLORS.danger
                    }),
                    createTableCell(result.is_normal ? 'Normal' : 'Non-Normal', false, 1100, { 
                        bold: true, 
                        color: result.is_normal ? COLORS.success : COLORS.danger 
                    })
                ]
            });
        });

        children.push(new Table({
            columnWidths: [2000, 800, 1200, 1000, 1200, 1000, 1200, 1000, 1100],
            rows: [resultsHeaderRow, ...resultsDataRows]
        }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Highlighted p-values indicate the primary test used. SW = Shapiro-Wilk, K-S = Kolmogorov-Smirnov, JB = Jarque-Bera.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Variable-by-Variable Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Variable-by-Variable Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        entries.forEach(([variable, result]: [string, any], idx: number) => {
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({ 
                        text: `3.${idx + 1} ${variable}`, 
                        bold: true, size: 26, font: 'Arial', color: COLORS.secondary 
                    }),
                    new TextRun({ text: '  ', size: 26, font: 'Arial' }),
                    new TextRun({ 
                        text: result.is_normal ? '✓ Normal' : '✗ Non-Normal', 
                        bold: true, size: 22, font: 'Arial', 
                        color: result.is_normal ? COLORS.success : COLORS.danger 
                    })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: 'Primary Test: ', bold: true, size: 20, font: 'Arial', color: COLORS.gray }),
                    new TextRun({ text: result.primary_test_name, size: 20, font: 'Arial' }),
                    new TextRun({ text: ' | Sample Size: ', bold: true, size: 20, font: 'Arial', color: COLORS.gray }),
                    new TextRun({ text: String(result.n), size: 20, font: 'Arial' })
                ]
            }));

            if (result.interpretation) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: result.interpretation, size: 20, font: 'Arial', color: COLORS.secondary })]
                }));
            }
        });

        // 4. Test Selection Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Test Selection Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Sample Size', true, 2500),
                    createTableCell('Recommended Test', true, 3000),
                    createTableCell('Reason', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('n < 50', false, 2500, { highlight: totalRows < 50 }),
                    createTableCell('Shapiro-Wilk', false, 3000, { bold: totalRows < 50 }),
                    createTableCell('Most powerful for small samples', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('50 ≤ n < 300', false, 2500, { highlight: totalRows >= 50 && totalRows < 300 }),
                    createTableCell('Kolmogorov-Smirnov', false, 3000, { bold: totalRows >= 50 && totalRows < 300 }),
                    createTableCell('Better for medium samples', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('n ≥ 300', false, 2500, { highlight: totalRows >= 300 }),
                    createTableCell('Jarque-Bera', false, 3000, { bold: totalRows >= 300 }),
                    createTableCell('Tests skewness and kurtosis for large samples', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 3000, 3500], rows: guideRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = normalCount === totalCount 
            ? [
                'All variables meet the normality assumption.',
                'Parametric tests (t-test, ANOVA, Pearson correlation, linear regression) are appropriate.',
                'Consider visual inspection of Q-Q plots for confirmation.',
                'Large sample sizes may cause minor deviations to appear significant.'
            ]
            : [
                `${normalVars.length > 0 ? `For ${normalVars.join(', ')}: Use parametric tests.` : 'No variables are normally distributed.'}`,
                `${nonNormalVars.length > 0 ? `For ${nonNormalVars.join(', ')}: Consider non-parametric alternatives.` : ''}`,
                'Non-parametric alternatives: Mann-Whitney U, Kruskal-Wallis, Spearman correlation.',
                'Data transformations (log, sqrt, Box-Cox) may help achieve normality.'
            ].filter(r => r);

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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Normality Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Normality_Test_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}