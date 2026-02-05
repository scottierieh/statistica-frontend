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

const getEffectSizeLabel = (eta: number): string => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, independentVar, dependentVar, numGroups, sampleSize } = await request.json();
        
        const anova = results.anova || {};
        const isSignificant = anova.p_value <= 0.05;
        const fStat = anova.f_statistic || 0;
        const pValue = anova.p_value || 1;
        const etaSquared = anova.eta_squared || 0;
        const dfBetween = anova.df_between || 0;
        const dfWithin = anova.df_within || 0;
        const dfTotal = anova.df_total || 0;
        const ssb = anova.ssb;
        const ssw = anova.ssw;
        const sst = anova.sst;
        const msb = anova.msb;
        const msw = anova.msw;
        
        const effectLabel = getEffectSizeLabel(etaSquared);
        const descriptives = results.descriptives || {};
        const postHoc = results.post_hoc_tukey || [];
        const assumptions = results.assumptions || {};
        
        const sigPairs = postHoc.filter((t: any) => t.reject === true || t.reject === 'True');
        
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
            children: [new TextRun({ text: 'One-Way ANOVA', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Independent Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: independentVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` (${numGroups} groups)`, size: 24, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Dependent Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dependentVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `    |    N = ${sampleSize}`, size: 24, font: 'Arial', color: COLORS.gray })
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

        // Conclusion
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
                        ? 'Significant Differences Found Between Groups'
                        : 'No Significant Differences Between Groups',
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
                new TextRun({ text: `F-statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `p-value: `, size: 22, font: 'Arial' }),
                new TextRun({ text: formatPValue(pValue), bold: true, size: 22, font: 'Arial', color: isSignificant ? COLORS.success : COLORS.danger }),
                new TextRun({ text: isSignificant ? ' (Significant at α = .05)' : ' (Not significant)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Effect Size: η² = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${etaSquared.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` — explains ${(etaSquared * 100).toFixed(1)}% of variance`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Post-hoc Tests: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${sigPairs.length} of ${postHoc.length} pairwise comparisons significant`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A one-way analysis of variance (ANOVA) was conducted to compare the effect of ${independentVar} on ${dependentVar}. `;
        apaText += `The analysis included ${numGroups} groups with a total sample size of N = ${sampleSize}. `;
        apaText += isSignificant
            ? `There was a statistically significant effect of ${independentVar} on ${dependentVar}, F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(2)}, p ${pFormatted}, η² = ${etaSquared.toFixed(3)}. `
            : `There was no statistically significant effect of ${independentVar} on ${dependentVar}, F(${dfBetween}, ${dfWithin}) = ${fStat.toFixed(2)}, p ${pFormatted}, η² = ${etaSquared.toFixed(3)}. `;
        apaText += `The effect size was ${effectLabel.toLowerCase()}, indicating that ${independentVar} explains ${(etaSquared * 100).toFixed(1)}% of the variance in ${dependentVar}.`;
        
        if (sigPairs.length > 0) {
            apaText += ` Post-hoc comparisons using Tukey's HSD revealed ${sigPairs.length} significant pairwise difference(s).`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Descriptive Statistics
        if (Object.keys(descriptives).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '2. Descriptive Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const descRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Group', true, 2000, { align: AlignmentType.LEFT }),
                        createTableCell('N', true, 1200),
                        createTableCell('Mean', true, 1600),
                        createTableCell('SD', true, 1600),
                        createTableCell('SE', true, 1400),
                        createTableCell('Min', true, 1400),
                        createTableCell('Max', true, 1400)
                    ]
                })
            ];

            Object.entries(descriptives).forEach(([group, stats]: [string, any]) => {
                descRows.push(new TableRow({
                    children: [
                        createTableCell(group, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(String(stats.n), false, 1200),
                        createTableCell(stats.mean.toFixed(3), false, 1600, { highlight: true }),
                        createTableCell(stats.std.toFixed(3), false, 1600),
                        createTableCell(stats.se.toFixed(3), false, 1400),
                        createTableCell(stats.min.toFixed(3), false, 1400),
                        createTableCell(stats.max.toFixed(3), false, 1400)
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2000, 1200, 1600, 1600, 1400, 1400, 1400], rows: descRows }));
        }

        // 3. ANOVA Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. ANOVA Table', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        if (ssb !== undefined && ssw !== undefined) {
            const anovaRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Source', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('SS', true, 1800),
                        createTableCell('df', true, 1200),
                        createTableCell('MS', true, 1800),
                        createTableCell('F', true, 1400),
                        createTableCell('p', true, 1400)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Between Groups', false, 2200, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(ssb.toFixed(3), false, 1800),
                        createTableCell(String(dfBetween), false, 1200),
                        createTableCell(msb.toFixed(3), false, 1800),
                        createTableCell(fStat.toFixed(3), false, 1400, { highlight: true }),
                        createTableCell(formatPValue(pValue), false, 1400, { color: isSignificant ? COLORS.success : COLORS.danger })
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Within Groups', false, 2200, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(ssw.toFixed(3), false, 1800),
                        createTableCell(String(dfWithin), false, 1200),
                        createTableCell(msw.toFixed(3), false, 1800),
                        createTableCell('—', false, 1400),
                        createTableCell('—', false, 1400)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Total', false, 2200, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(sst.toFixed(3), false, 1800),
                        createTableCell(String(dfTotal), false, 1200),
                        createTableCell('—', false, 1800),
                        createTableCell('—', false, 1400),
                        createTableCell('—', false, 1400)
                    ]
                })
            ];

            children.push(new Table({ columnWidths: [2200, 1800, 1200, 1800, 1400, 1400], rows: anovaRows }));
        } else {
            // Simple results table
            const simpleRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Statistic', true, 4000, { align: AlignmentType.LEFT }),
                        createTableCell('Value', true, 2500),
                        createTableCell('Interpretation', true, 2500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('F-statistic', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(fStat.toFixed(4), false, 2500, { highlight: true }),
                        createTableCell(`df = (${dfBetween}, ${dfWithin})`, false, 2500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('p-value', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(formatPValue(pValue), false, 2500, { color: isSignificant ? COLORS.success : COLORS.danger }),
                        createTableCell(isSignificant ? 'Significant' : 'Not significant', false, 2500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('η² (Eta Squared)', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(etaSquared.toFixed(4), false, 2500),
                        createTableCell(`${effectLabel} effect`, false, 2500)
                    ]
                })
            ];

            children.push(new Table({ columnWidths: [4000, 2500, 2500], rows: simpleRows }));
        }

        // 4. Post-Hoc Tests
        if (postHoc.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: "4. Post-Hoc Tests (Tukey's HSD)", bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const postHocRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Group 1', true, 2000, { align: AlignmentType.LEFT }),
                        createTableCell('Group 2', true, 2000, { align: AlignmentType.LEFT }),
                        createTableCell('Mean Diff', true, 1800),
                        createTableCell('p-adj', true, 1600),
                        createTableCell('Significant', true, 1600)
                    ]
                })
            ];

            postHoc.forEach((test: any) => {
                const sig = test.reject === true || test.reject === 'True';
                postHocRows.push(new TableRow({
                    children: [
                        createTableCell(test.group1, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(test.group2, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(parseFloat(test.meandiff).toFixed(3), false, 1800),
                        createTableCell(test.p_adj < 0.001 ? '<.001' : parseFloat(test.p_adj).toFixed(3), false, 1600, { 
                            color: sig ? COLORS.success : undefined 
                        }),
                        createTableCell(sig ? 'Yes' : 'No', false, 1600, { 
                            bold: true, 
                            color: sig ? COLORS.success : COLORS.gray 
                        })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2000, 2000, 1800, 1600, 1600], rows: postHocRows }));

            if (sigPairs.length > 0) {
                children.push(new Paragraph({
                    spacing: { before: 150 },
                    children: [new TextRun({ 
                        text: `Note: ${sigPairs.length} of ${postHoc.length} pairwise comparisons showed significant differences (p < .05).`, 
                        size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 5. Assumption Checks
        if (assumptions.normality || assumptions.homogeneity) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Assumption Checks', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            // Normality
            if (assumptions.normality) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: 'Normality (Shapiro-Wilk Test)', bold: true, size: 24, font: 'Arial' })]
                }));

                const normRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Group', true, 2500, { align: AlignmentType.LEFT }),
                            createTableCell('W', true, 2000),
                            createTableCell('p-value', true, 2000),
                            createTableCell('Status', true, 2500)
                        ]
                    })
                ];

                Object.entries(assumptions.normality).forEach(([group, test]: [string, any]) => {
                    normRows.push(new TableRow({
                        children: [
                            createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                            createTableCell(test.statistic?.toFixed(4) || 'N/A', false, 2000),
                            createTableCell(test.p_value < 0.001 ? '<.001' : test.p_value?.toFixed(4), false, 2000),
                            createTableCell(test.normal ? 'Normal' : 'Non-normal', false, 2500, { 
                                bold: true,
                                color: test.normal ? COLORS.success : COLORS.warning 
                            })
                        ]
                    }));
                });

                children.push(new Table({ columnWidths: [2500, 2000, 2000, 2500], rows: normRows }));

                children.push(new Paragraph({
                    spacing: { before: 50, after: 150 },
                    children: [new TextRun({ 
                        text: 'p > .05 indicates approximately normal distribution.', 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }

            // Homogeneity
            if (assumptions.homogeneity) {
                children.push(new Paragraph({
                    spacing: { before: 150, after: 100 },
                    children: [new TextRun({ text: "Homogeneity of Variance (Levene's Test)", bold: true, size: 24, font: 'Arial' })]
                }));

                const leveneRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Statistic', true, 3000),
                            createTableCell('p-value', true, 3000),
                            createTableCell('Status', true, 3000)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell(assumptions.homogeneity.levene_statistic?.toFixed(4) || 'N/A', false, 3000),
                            createTableCell(assumptions.homogeneity.levene_p_value < 0.001 ? '<.001' : assumptions.homogeneity.levene_p_value?.toFixed(4), false, 3000),
                            createTableCell(assumptions.homogeneity.equal_variances ? 'Equal Variances' : 'Unequal Variances', false, 3000, { 
                                bold: true,
                                color: assumptions.homogeneity.equal_variances ? COLORS.success : COLORS.warning 
                            })
                        ]
                    })
                ];

                children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: leveneRows }));

                children.push(new Paragraph({
                    spacing: { before: 50, after: 150 },
                    children: [new TextRun({ 
                        text: 'p > .05 indicates homogeneity of variances (assumption met).', 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 6. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: postHoc.length > 0 ? '6. Effect Size Interpretation' : '5. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('η² Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.01', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(etaSquared < 0.01 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 - 0.06', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(etaSquared >= 0.01 && etaSquared < 0.06 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.06 - 0.14', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(etaSquared >= 0.06 && etaSquared < 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.14', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(etaSquared >= 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // 7. Recommendations
        const recSection = postHoc.length > 0 ? '7' : '6';
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSection}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && etaSquared >= 0.06
            ? [
                'Significant group differences confirmed with meaningful effect size.',
                `${independentVar} has a ${effectLabel.toLowerCase()} impact on ${dependentVar}.`,
                'Examine post-hoc tests to identify which specific groups differ.',
                'Consider practical implications of group differences for decision-making.',
                'Replicate findings with independent samples if possible.'
            ]
            : isSignificant
                ? [
                    'Statistically significant but effect size is small.',
                    'The practical importance may be limited despite statistical significance.',
                    'Large sample sizes can detect trivially small effects.',
                    'Consider whether the difference is meaningful in your context.',
                    'Report effect sizes alongside p-values for transparency.'
                ]
                : [
                    'No significant differences between groups were found.',
                    'The null hypothesis cannot be rejected at α = .05.',
                    'Consider increasing sample size for greater statistical power.',
                    'If assumptions were violated, consider non-parametric alternatives (Kruskal-Wallis).',
                    'Examine effect size to assess practical significance.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'One-Way ANOVA Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ANOVA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


