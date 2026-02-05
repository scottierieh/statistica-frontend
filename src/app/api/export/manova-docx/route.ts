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

const formatPValue = (p: number): string => p < 0.001 ? '<.001' : p.toFixed(4);

const getEffectSizeLabel = (pillai: number): string => {
    if (pillai >= 0.5) return 'Large';
    if (pillai >= 0.3) return 'Medium';
    if (pillai >= 0.1) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVars, factorVar, sampleSize, numGroups } = await request.json();

        const testStats = results.test_statistics || {};
        const univariateResults = results.univariate_results || {};
        
        const pillai = testStats.pillai || {};
        const wilks = testStats.wilks || {};
        const hotelling = testStats.hotelling || {};
        const roy = testStats.roy || {};
        
        const isSignificant = pillai.p_value < 0.05;
        const pillaiValue = pillai.statistic || 0;
        const effectLabel = getEffectSizeLabel(pillaiValue);
        
        const significantDVs = Object.entries(univariateResults).filter(([_, r]: [string, any]) => r.significant);
        const totalDVs = Object.keys(univariateResults).length;
        
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
            children: [new TextRun({ text: 'MANOVA', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Dependent Variables: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dependentVars.join(', '), size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Factor: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: factorVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` (${numGroups} groups)`, size: 24, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize}`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                    text: isSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isSignificant ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isSignificant 
                        ? 'Significant Multivariate Group Differences Found'
                        : 'No Significant Multivariate Group Differences',
                    bold: true, size: 24, font: 'Arial',
                    color: isSignificant ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Pillai's Trace: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `V = ${pillaiValue.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${effectLabel} effect)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `F-statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `F(${pillai.df1}, ${pillai.df2}) = ${pillai.F?.toFixed(3) || 'N/A'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: `, p ${formatPValue(pillai.p_value || 1)}`, size: 22, font: 'Arial', color: isSignificant ? COLORS.success : COLORS.danger })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Univariate follow-ups: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${significantDVs.length} of ${totalDVs} DVs significant`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pillai.p_value < 0.001 ? '< .001' : `= ${pillai.p_value?.toFixed(3) || 'N/A'}`;
        
        let apaText = `A one-way multivariate analysis of variance (MANOVA) was conducted to examine the effect of ${factorVar} on ${totalDVs} dependent variables: ${dependentVars.join(', ')}. `;
        apaText += `The sample consisted of N = ${sampleSize} observations across ${numGroups} groups. `;
        apaText += isSignificant
            ? `The multivariate effect of ${factorVar} was statistically significant, Pillai's Trace = ${pillaiValue.toFixed(3)}, F(${pillai.df1}, ${pillai.df2}) = ${pillai.F?.toFixed(2)}, p ${pFormatted}. `
            : `The multivariate effect of ${factorVar} was not statistically significant, Pillai's Trace = ${pillaiValue.toFixed(3)}, F(${pillai.df1}, ${pillai.df2}) = ${pillai.F?.toFixed(2)}, p ${pFormatted}. `;
        
        if (significantDVs.length > 0) {
            apaText += `Follow-up univariate ANOVAs revealed significant effects for ${significantDVs.map(([dv]) => dv).join(', ')}.`;
        } else {
            apaText += `No individual dependent variables showed significant group differences.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Multivariate Test Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Multivariate Test Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const multiRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Test', true, 2400, { align: AlignmentType.LEFT }),
                    createTableCell('Statistic', true, 1600),
                    createTableCell('F', true, 1400),
                    createTableCell('df1', true, 1000),
                    createTableCell('df2', true, 1000),
                    createTableCell('p', true, 1400)
                ]
            })
        ];

        const tests = [
            { name: "Pillai's Trace", stat: pillai },
            { name: "Wilks' Lambda", stat: wilks },
            { name: "Hotelling's Trace", stat: hotelling },
            { name: "Roy's Largest Root", stat: roy }
        ];

        tests.forEach(({ name, stat }) => {
            const sig = stat.p_value < 0.05;
            multiRows.push(new TableRow({
                children: [
                    createTableCell(name, false, 2400, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(stat.statistic?.toFixed(4) || 'N/A', false, 1600, { highlight: name === "Pillai's Trace" }),
                    createTableCell(stat.F?.toFixed(4) || 'N/A', false, 1400),
                    createTableCell(String(stat.df1 || '—'), false, 1000),
                    createTableCell(String(stat.df2 || '—'), false, 1000),
                    createTableCell(formatPValue(stat.p_value || 1), false, 1400, { color: sig ? COLORS.success : undefined })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2400, 1600, 1400, 1000, 1000, 1400], rows: multiRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: "Note: Pillai's Trace is generally recommended for robustness to violations of assumptions.", 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Univariate Follow-up Tests
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Univariate Follow-up Tests (ANOVA)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const univRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Dependent Variable', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('F', true, 1800),
                    createTableCell('p', true, 1800),
                    createTableCell('η²', true, 1600),
                    createTableCell('Significant', true, 1600)
                ]
            })
        ];

        Object.entries(univariateResults).forEach(([dv, res]: [string, any]) => {
            const sig = res.significant;
            univRows.push(new TableRow({
                children: [
                    createTableCell(dv, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(res.f_statistic?.toFixed(4) || 'N/A', false, 1800),
                    createTableCell(formatPValue(res.p_value || 1), false, 1800, { color: sig ? COLORS.success : undefined }),
                    createTableCell(res.eta_squared?.toFixed(4) || 'N/A', false, 1600),
                    createTableCell(sig ? 'Yes' : 'No', false, 1600, { bold: true, color: sig ? COLORS.success : COLORS.gray })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3000, 1800, 1800, 1600, 1600], rows: univRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: η² (eta-squared) represents the proportion of variance explained by group membership.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: "4. Effect Size Interpretation (Pillai's Trace)", bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell("Pillai's V Range", true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.10', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(pillaiValue < 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.30', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(pillaiValue >= 0.10 && pillaiValue < 0.30 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.30 - 0.50', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(pillaiValue >= 0.30 && pillaiValue < 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.50', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(pillaiValue >= 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // 5. Univariate Effect Sizes
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Univariate Effect Sizes (η²)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const etaRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('η² Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Standard', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.01', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell("Cohen's (1988)", false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 - 0.06', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell("Cohen's (1988)", false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.06 - 0.14', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell("Cohen's (1988)", false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.14', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell("Cohen's (1988)", false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: etaRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && pillaiValue >= 0.1
            ? [
                'Significant multivariate effect confirmed with meaningful effect size.',
                `Groups differ across the combination of ${totalDVs} dependent variables.`,
                'Examine univariate follow-ups to identify which specific DVs contribute to the effect.',
                `${significantDVs.length} of ${totalDVs} DVs showed significant individual effects.`,
                'Consider discriminant function analysis for deeper understanding of group separation.'
            ]
            : isSignificant
                ? [
                    'Statistically significant multivariate effect but effect size is small.',
                    'Practical significance may be limited despite statistical significance.',
                    'Large sample sizes can detect trivially small effects.',
                    'Consider whether the difference is meaningful in your context.',
                    'Report effect sizes alongside p-values for transparency.'
                ]
                : [
                    'No significant multivariate effect was found.',
                    'Groups do not differ across the combination of dependent variables.',
                    'Univariate follow-ups should be interpreted with caution.',
                    'Consider increasing sample size for greater statistical power.',
                    'Check assumptions (multivariate normality, homogeneity of covariance).'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'MANOVA Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="MANOVA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}