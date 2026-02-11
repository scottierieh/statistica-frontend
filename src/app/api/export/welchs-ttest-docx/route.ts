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

const getEffectSizeLabel = (d: number): string => {
    const absD = Math.abs(d);
    if (absD >= 0.8) return 'Large';
    if (absD >= 0.5) return 'Medium';
    if (absD >= 0.2) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, groupVar, valueVar, alternative } = await request.json();
        
        const isSignificant = results.significant;
        const tStat = results.t_statistic;
        const pValue = results.p_value;
        const cohensD = results.cohens_d;
        const df = results.degrees_of_freedom;
        const meanDiff = results.mean_diff || 0;
        const groups = results.groups || ['Group 1', 'Group 2'];
        const descriptives = results.descriptives || {};
        
        const desc1 = descriptives[groups[0]] || {};
        const desc2 = descriptives[groups[1]] || {};
        const mean1 = desc1.mean || results.mean1 || 0;
        const mean2 = desc2.mean || results.mean2 || 0;
        const sd1 = desc1.std_dev || 0;
        const sd2 = desc2.std_dev || 0;
        const n1 = desc1.n || results.n1 || 0;
        const n2 = desc2.n || results.n2 || 0;
        const totalN = n1 + n2;
        
        const effectLabel = getEffectSizeLabel(cohensD);
        const useWelch = results.levene_test && !results.levene_test.assumption_met;
        const testName = useWelch ? "Welch's" : "Student's";
        const reportedTest = useWelch ? results.welch_t : results.student_t;
        const ci = reportedTest?.ci;
        
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
            children: [new TextRun({ text: 'Independent Samples T-Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Group Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: groupVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Dependent: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: valueVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Groups: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${groups[0]} (n=${n1}) vs ${groups[1]} (n=${n2})`, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `    |    Total N = ${totalN}`, size: 24, font: 'Arial', color: COLORS.gray })
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
                    text: isSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isSignificant ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isSignificant 
                        ? 'Statistically Significant Difference Between Groups'
                        : 'No Statistically Significant Difference Between Groups',
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
                new TextRun({ text: `${groups[0]} Mean: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${mean1.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (SD = ${sd1.toFixed(4)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `${groups[1]} Mean: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${mean2.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (SD = ${sd2.toFixed(4)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Mean Difference: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${meanDiff >= 0 ? '+' : ''}${meanDiff.toFixed(4)}`, bold: true, size: 22, font: 'Arial', color: meanDiff >= 0 ? COLORS.success : COLORS.danger }),
                new TextRun({ text: ` (${groups[0]} ${meanDiff >= 0 ? '>' : '<'} ${groups[1]})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Effect Size: Cohen's d = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${cohensD.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        const dfFormatted = df % 1 === 0 ? df.toFixed(0) : df.toFixed(2);
        
        let apaText = `An independent-samples t-test was conducted to compare ${valueVar} between ${groups[0]} and ${groups[1]} groups. `;
        
        if (results.levene_test) {
            const leveneP = results.levene_test.p_value;
            const levenePFormatted = leveneP < 0.001 ? '< .001' : `= ${leveneP.toFixed(3)}`;
            apaText += results.levene_test.assumption_met
                ? `Levene's test indicated equal variances (F = ${results.levene_test.statistic.toFixed(2)}, p ${levenePFormatted}), so ${testName} t-test was used. `
                : `Levene's test indicated unequal variances (F = ${results.levene_test.statistic.toFixed(2)}, p ${levenePFormatted}), so Welch's t-test was used. `;
        }
        
        apaText += isSignificant
            ? `There was a significant difference in scores for ${groups[0]} (M = ${mean1.toFixed(2)}, SD = ${sd1.toFixed(2)}) and ${groups[1]} (M = ${mean2.toFixed(2)}, SD = ${sd2.toFixed(2)}); t(${dfFormatted}) = ${tStat.toFixed(2)}, p ${pFormatted}, d = ${cohensD.toFixed(2)}. The effect size was ${effectLabel.toLowerCase()}.`
            : `There was no significant difference in scores for ${groups[0]} (M = ${mean1.toFixed(2)}, SD = ${sd1.toFixed(2)}) and ${groups[1]} (M = ${mean2.toFixed(2)}, SD = ${sd2.toFixed(2)}); t(${dfFormatted}) = ${tStat.toFixed(2)}, p ${pFormatted}, d = ${cohensD.toFixed(2)}.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Descriptive Statistics
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
                    createTableCell('Group', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('N', true, 1500),
                    createTableCell('Mean', true, 2000),
                    createTableCell('SD', true, 2000),
                    createTableCell('SE', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(groups[0], false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(n1), false, 1500),
                    createTableCell(mean1.toFixed(4), false, 2000, { highlight: true }),
                    createTableCell(sd1.toFixed(4), false, 2000),
                    createTableCell(desc1.se_mean?.toFixed(4) || (sd1 / Math.sqrt(n1)).toFixed(4), false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(groups[1], false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(n2), false, 1500),
                    createTableCell(mean2.toFixed(4), false, 2000, { highlight: true }),
                    createTableCell(sd2.toFixed(4), false, 2000),
                    createTableCell(desc2.se_mean?.toFixed(4) || (sd2 / Math.sqrt(n2)).toFixed(4), false, 2000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 1500, 2000, 2000, 2000], rows: descRows }));

        // 3. T-Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. T-Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Both Student's and Welch's if available
        if (results.student_t && results.welch_t) {
            const testRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Test Type', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('Mean Diff', true, 1600),
                        createTableCell('SE', true, 1400),
                        createTableCell('t', true, 1400),
                        createTableCell('df', true, 1400),
                        createTableCell('p', true, 1400),
                        createTableCell('95% CI', true, 2200)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell("Student's t", false, 2200, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(results.student_t.mean_diff.toFixed(3), false, 1600),
                        createTableCell(results.student_t.se_diff.toFixed(3), false, 1400),
                        createTableCell(results.student_t.t_statistic.toFixed(3), false, 1400),
                        createTableCell(results.student_t.df.toFixed(0), false, 1400),
                        createTableCell(formatPValue(results.student_t.p_value), false, 1400, { 
                            color: results.student_t.p_value <= 0.05 ? COLORS.success : COLORS.danger 
                        }),
                        createTableCell(`[${results.student_t.ci[0].toFixed(2)}, ${results.student_t.ci[1].toFixed(2)}]`, false, 2200)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell("Welch's t", false, 2200, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(results.welch_t.mean_diff.toFixed(3), false, 1600),
                        createTableCell(results.welch_t.se_diff.toFixed(3), false, 1400),
                        createTableCell(results.welch_t.t_statistic.toFixed(3), false, 1400),
                        createTableCell(results.welch_t.df.toFixed(2), false, 1400),
                        createTableCell(formatPValue(results.welch_t.p_value), false, 1400, { 
                            color: results.welch_t.p_value <= 0.05 ? COLORS.success : COLORS.danger 
                        }),
                        createTableCell(`[${results.welch_t.ci[0].toFixed(2)}, ${results.welch_t.ci[1].toFixed(2)}]`, false, 2200)
                    ]
                })
            ];

            children.push(new Table({ columnWidths: [2200, 1600, 1400, 1400, 1400, 1400, 2200], rows: testRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: useWelch 
                        ? "* Welch's t-test recommended due to unequal variances (Levene's test significant)."
                        : "* Student's t-test appropriate (equal variances assumed).",
                    size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        } else {
            // Single test result
            const testRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Statistic', true, 3500, { align: AlignmentType.LEFT }),
                        createTableCell('Value', true, 2500),
                        createTableCell('Interpretation', true, 3000)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('t-statistic', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(tStat.toFixed(4), false, 2500, { highlight: true }),
                        createTableCell('Test statistic', false, 3000)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Degrees of Freedom', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(dfFormatted, false, 2500),
                        createTableCell(useWelch ? "Welch's correction" : 'n₁ + n₂ - 2', false, 3000)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('p-value', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(formatPValue(pValue), false, 2500, { 
                            highlight: true, 
                            color: isSignificant ? COLORS.success : COLORS.danger 
                        }),
                        createTableCell(isSignificant ? 'Significant (p ≤ .05)' : 'Not significant', false, 3000)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell("Cohen's d", false, 3500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(cohensD.toFixed(4), false, 2500),
                        createTableCell(`${effectLabel} effect`, false, 3000)
                    ]
                })
            ];

            if (ci) {
                testRows.push(new TableRow({
                    children: [
                        createTableCell('95% Confidence Interval', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(`[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`, false, 2500),
                        createTableCell(ci[0] <= 0 && 0 <= ci[1] ? 'Contains zero' : 'Excludes zero', false, 3000)
                    ]
                }));
            }

            children.push(new Table({ columnWidths: [3500, 2500, 3000], rows: testRows }));
        }

        // 4. Assumption Checks
        if (results.levene_test || results.normality_test) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Assumption Checks', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            // Levene's Test
            if (results.levene_test) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: "Homogeneity of Variance (Levene's Test)", bold: true, size: 24, font: 'Arial' })]
                }));

                const leveneRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('F-statistic', true, 3000),
                            createTableCell('p-value', true, 3000),
                            createTableCell('Status', true, 3000)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell(results.levene_test.statistic.toFixed(4), false, 3000),
                            createTableCell(formatPValue(results.levene_test.p_value), false, 3000),
                            createTableCell(results.levene_test.assumption_met ? 'Equal Variances' : 'Unequal Variances', false, 3000, { 
                                bold: true,
                                color: results.levene_test.assumption_met ? COLORS.success : COLORS.warning 
                            })
                        ]
                    })
                ];

                children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: leveneRows }));

                children.push(new Paragraph({
                    spacing: { before: 50, after: 150 },
                    children: [new TextRun({ 
                        text: 'p > .05 indicates equal variances (assumption met).', 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }

            // Normality Tests
            if (results.normality_test) {
                children.push(new Paragraph({
                    spacing: { before: 150, after: 100 },
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

                Object.entries(results.normality_test).forEach(([group, test]: [string, any]) => {
                    normRows.push(new TableRow({
                        children: [
                            createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                            createTableCell(test.statistic.toFixed(4), false, 2000),
                            createTableCell(formatPValue(test.p_value), false, 2000),
                            createTableCell(test.assumption_met ? 'Normal' : 'Non-normal', false, 2500, { 
                                bold: true,
                                color: test.assumption_met ? COLORS.success : COLORS.warning 
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
        }

        // 5. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: (results.levene_test || results.normality_test) ? '5. Effect Size Interpretation' : '4. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell("Cohen's d Range", true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('|d| < 0.2', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(Math.abs(cohensD) < 0.2 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.2 ≤ |d| < 0.5', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.2 && Math.abs(cohensD) < 0.5 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.5 ≤ |d| < 0.8', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.5 && Math.abs(cohensD) < 0.8 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('|d| ≥ 0.8', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.8 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: (results.levene_test || results.normality_test) ? '6. Recommendations' : '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && Math.abs(cohensD) >= 0.2
            ? [
                'The result shows both statistical and practical significance.',
                `${groups[0]} and ${groups[1]} show meaningful differences in ${valueVar}.`,
                'Investigate potential causes of the group difference.',
                'Consider replication to confirm the finding.'
            ]
            : isSignificant
                ? [
                    'The result is statistically significant but the effect size is small.',
                    'The practical importance of this difference may be limited.',
                    'Consider whether the difference is meaningful in your context.',
                    'Larger sample sizes can detect trivially small effects.'
                ]
                : [
                    'The null hypothesis cannot be rejected at α = .05.',
                    'The groups do not show a statistically significant difference.',
                    'Consider increasing sample size for greater statistical power.',
                    'The observed difference may be due to random variation.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Independent Samples T-Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Independent_Samples_TTest_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


