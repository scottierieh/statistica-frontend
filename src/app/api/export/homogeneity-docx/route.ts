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
        const { results, valueVar, groupVar, totalRows } = await request.json();
        
        const isHomogeneous = results.assumption_met;
        const levenePValue = results.levene_test.p_value;
        const bartlettPValue = results.bartlett_test.p_value;
        const descriptives = results.descriptives;
        const numGroups = Object.keys(descriptives).length;
        const variances = Object.values(descriptives).map((g: any) => g.variance);
        const maxVar = Math.max(...variances);
        const minVar = Math.min(...variances);
        const varianceRatio = maxVar / minVar;
        
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
            children: [new TextRun({ text: 'Homogeneity of Variances Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Value Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: valueVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Grouping Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: groupVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Groups: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(numGroups), size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Total N: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
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
                    text: isHomogeneous ? '✓ ' : '⚠ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isHomogeneous ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isHomogeneous 
                        ? 'Variances are equal across groups (Homogeneity assumption MET)'
                        : 'Variances differ across groups (Homogeneity assumption VIOLATED)',
                    bold: true, size: 24, font: 'Arial',
                    color: isHomogeneous ? COLORS.success : COLORS.warning
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ 
                text: results.interpretation, 
                size: 22, font: 'Arial' 
            })]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `The ${numGroups} groups show `, size: 22, font: 'Arial' }),
                new TextRun({ text: isHomogeneous ? 'similar' : 'different', bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` levels of variability in ${valueVar}.`, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Variance ratio (largest/smallest): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${varianceRatio.toFixed(2)}x`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Recommendation: `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: isHomogeneous 
                        ? 'Standard ANOVA or t-test can be used safely.'
                        : "Use Welch's ANOVA or non-parametric alternatives.",
                    size: 22, font: 'Arial'
                })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const formatPAPA = (p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`;
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Homogeneity of variances was assessed for ${valueVar} across ${numGroups} ${groupVar} groups `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${totalRows}) `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `using Levene's test, F(${results.levene_test.df_between}, ${results.levene_test.df_within}) = ${results.levene_test.statistic.toFixed(2)}, p ${formatPAPA(levenePValue)}. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: isHomogeneous ? 'The assumption of equal variances was met.' : 'The assumption of equal variances was violated.', size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Statistical Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Tests table
        const testsHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Test', true, 2500, { align: AlignmentType.LEFT }),
                createTableCell('Statistic', true, 2000),
                createTableCell('df', true, 1500),
                createTableCell('p-value', true, 1800),
                createTableCell('Conclusion', true, 2200)
            ]
        });

        const formatP = (p: number) => p < 0.001 ? '<.001' : p.toFixed(4);
        const leveneSignificant = levenePValue <= 0.05;
        const bartlettSignificant = bartlettPValue <= 0.05;

        const testsDataRows = [
            new TableRow({
                children: [
                    createTableCell("Levene's Test", false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`F = ${results.levene_test.statistic.toFixed(4)}`, false, 2000),
                    createTableCell(`(${results.levene_test.df_between}, ${results.levene_test.df_within})`, false, 1500),
                    createTableCell(formatP(levenePValue), false, 1800, { 
                        highlight: true, 
                        color: leveneSignificant ? COLORS.danger : COLORS.success 
                    }),
                    createTableCell(leveneSignificant ? 'Unequal' : 'Equal', false, 2200, { 
                        bold: true,
                        color: leveneSignificant ? COLORS.danger : COLORS.success 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Bartlett's Test", false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`χ² = ${results.bartlett_test.statistic.toFixed(4)}`, false, 2000),
                    createTableCell(String(results.bartlett_test.df), false, 1500),
                    createTableCell(formatP(bartlettPValue), false, 1800, { 
                        highlight: true,
                        color: bartlettSignificant ? COLORS.danger : COLORS.success 
                    }),
                    createTableCell(bartlettSignificant ? 'Unequal' : 'Equal', false, 2200, { 
                        bold: true,
                        color: bartlettSignificant ? COLORS.danger : COLORS.success 
                    })
                ]
            })
        ];

        children.push(new Table({
            columnWidths: [2500, 2000, 1500, 1800, 2200],
            rows: [testsHeaderRow, ...testsDataRows]
        }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: "Note: Levene's test is robust to non-normality. Bartlett's test is more powerful but assumes normality.", 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Descriptive Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Descriptive Statistics by Group', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const descHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Group', true, 2500, { align: AlignmentType.LEFT }),
                createTableCell('N', true, 1200),
                createTableCell('Mean', true, 1800),
                createTableCell('Variance', true, 1800),
                createTableCell('Std. Dev.', true, 1800)
            ]
        });

        const descDataRows = Object.entries(descriptives).map(([group, stats]: [string, any]) => {
            return new TableRow({
                children: [
                    createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(stats.n), false, 1200),
                    createTableCell(stats.mean.toFixed(3), false, 1800),
                    createTableCell(stats.variance.toFixed(3), false, 1800, { highlight: true }),
                    createTableCell(stats.std_dev.toFixed(3), false, 1800)
                ]
            });
        });

        children.push(new Table({
            columnWidths: [2500, 1200, 1800, 1800, 1800],
            rows: [descHeaderRow, ...descDataRows]
        }));

        // 4. Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('p-value', true, 2500),
                    createTableCell('Conclusion', true, 3000),
                    createTableCell('Recommended Action', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p > 0.05', false, 2500, { highlight: isHomogeneous }),
                    createTableCell('Variances are Equal', false, 3000, { color: COLORS.success }),
                    createTableCell('Use standard ANOVA, t-test, or F-test', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≤ 0.05', false, 2500, { highlight: !isHomogeneous }),
                    createTableCell('Variances are Unequal', false, 3000, { color: COLORS.danger }),
                    createTableCell("Use Welch's ANOVA, Games-Howell, or Kruskal-Wallis", false, 3500, { align: AlignmentType.LEFT })
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

        const recommendations = isHomogeneous 
            ? [
                'The assumption of homogeneity of variances is satisfied.',
                'Standard ANOVA or independent samples t-test can be used for group comparisons.',
                'Parametric post-hoc tests (Tukey HSD, Bonferroni) are appropriate if ANOVA is significant.',
                'The variance ratio is acceptable for robust analysis.'
            ]
            : [
                'The assumption of homogeneity of variances is violated.',
                "Use Welch's ANOVA instead of standard ANOVA for comparing means.",
                'For post-hoc tests, use Games-Howell procedure which does not assume equal variances.',
                'Alternatively, consider non-parametric tests like Kruskal-Wallis.',
                'Investigate why certain groups have higher variability - this may be substantively meaningful.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Homogeneity of Variances Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Homogeneity_Test_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}