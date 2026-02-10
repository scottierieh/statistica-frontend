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
        const { results, variable, testValue, alternative } = await request.json();
        
        const isSignificant = results.significant;
        const tStat = results.t_statistic;
        const pValue = results.p_value;
        const cohensD = results.cohens_d;
        const sampleMean = results.sample_mean || 0;
        const df = results.degrees_of_freedom;
        const ci = results.confidence_interval;
        const n = results.n || 0;
        const descriptives = results.descriptives || {};
        const sd = descriptives[variable]?.std_dev || 0;
        const se = results.se_diff || 0;
        
        const effectLabel = getEffectSizeLabel(cohensD);
        const meanDiff = sampleMean - testValue;
        
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
            children: [new TextRun({ text: 'One-Sample T-Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: variable, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Test Value: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(testValue), size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'N: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(n), size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Alternative: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: alternative, size: 24, font: 'Arial', color: COLORS.primary })
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
                        ? 'Statistically Significant Difference Detected'
                        : 'No Statistically Significant Difference',
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
                new TextRun({ text: `Sample Mean: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${sampleMean.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` vs Test Value: ${testValue}`, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Mean Difference: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${meanDiff >= 0 ? '+' : ''}${meanDiff.toFixed(4)}`, bold: true, size: 22, font: 'Arial', color: meanDiff >= 0 ? COLORS.success : COLORS.danger }),
                new TextRun({ text: testValue !== 0 ? ` (${((meanDiff / Math.abs(testValue)) * 100).toFixed(1)}%)` : '', size: 22, font: 'Arial', color: COLORS.gray })
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
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `A one-sample t-test was conducted to determine whether the mean of ${variable} significantly differed from the test value of ${testValue}. `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: isSignificant 
                    ? `Results indicated that the sample mean (M = ${sampleMean.toFixed(2)}, SD = ${sd.toFixed(2)}) was significantly different from the test value, t(${df}) = ${tStat.toFixed(2)}, p ${pFormatted}, d = ${cohensD.toFixed(2)}. `
                    : `Results indicated that the sample mean (M = ${sampleMean.toFixed(2)}, SD = ${sd.toFixed(2)}) was not significantly different from the test value, t(${df}) = ${tStat.toFixed(2)}, p ${pFormatted}, d = ${cohensD.toFixed(2)}. `, 
                    size: 22, font: 'Arial', italics: true 
                }),
                new TextRun({ text: `The effect size was ${effectLabel.toLowerCase()}.`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Statistical Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const testResultsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('t-statistic', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(tStat.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(`${Math.abs(tStat).toFixed(2)} SEs from test value`, false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Degrees of Freedom', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(df), false, 2500),
                    createTableCell(`n - 1 = ${n} - 1`, false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p-value', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(formatPValue(pValue), false, 2500, { 
                        highlight: true, 
                        color: isSignificant ? COLORS.success : COLORS.danger 
                    }),
                    createTableCell(isSignificant ? 'Significant (p ≤ .05)' : 'Not significant (p > .05)', false, 3500, { 
                        align: AlignmentType.LEFT,
                        color: isSignificant ? COLORS.success : COLORS.danger
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cohen's d", false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(cohensD.toFixed(4), false, 2500),
                    createTableCell(`${effectLabel} effect`, false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('95% Confidence Interval', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(ci ? `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]` : 'N/A', false, 2500),
                    createTableCell(ci ? (ci[0] <= testValue && testValue <= ci[1] ? 'Contains test value' : 'Excludes test value') : '', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: testResultsRows }));

        // 3. Descriptive Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Descriptive Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const descRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Sample Size (N)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(n), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Sample Mean (M)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(sampleMean.toFixed(4), false, 3000, { highlight: true })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Deviation (SD)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(sd.toFixed(4), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Error (SE)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(se.toFixed(4), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Test Value (μ₀)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(testValue), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Mean Difference', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${meanDiff >= 0 ? '+' : ''}${meanDiff.toFixed(4)}`, false, 3000, { 
                        color: meanDiff >= 0 ? COLORS.success : COLORS.danger 
                    })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000], rows: descRows }));

        // 4. Assumption Check (Normality)
        if (results.normality_test) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Assumption Check: Normality', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const normTest = Object.values(results.normality_test)[0] as any;
            if (normTest) {
                const normRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Test', true, 3000, { align: AlignmentType.LEFT }),
                            createTableCell('Statistic', true, 2000),
                            createTableCell('p-value', true, 2000),
                            createTableCell('Status', true, 2000)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell('Shapiro-Wilk', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                            createTableCell(`W = ${normTest.statistic.toFixed(4)}`, false, 2000),
                            createTableCell(formatPValue(normTest.p_value), false, 2000),
                            createTableCell(normTest.assumption_met ? 'Met' : 'Violated', false, 2000, { 
                                bold: true,
                                color: normTest.assumption_met ? COLORS.success : COLORS.warning 
                            })
                        ]
                    })
                ];

                children.push(new Table({ columnWidths: [3000, 2000, 2000, 2000], rows: normRows }));

                children.push(new Paragraph({
                    spacing: { before: 100 },
                    children: [new TextRun({ 
                        text: normTest.assumption_met 
                            ? 'The normality assumption is satisfied (p > .05). T-test results are reliable.'
                            : 'The normality assumption may be violated (p ≤ .05). Consider non-parametric alternatives for small samples.',
                        size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 5. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: results.normality_test ? '5. Effect Size Interpretation' : '4. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
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
            children: [new TextRun({ text: results.normality_test ? '6. Recommendations' : '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && Math.abs(cohensD) >= 0.2
            ? [
                'The result shows both statistical and practical significance.',
                'Investigate the root cause of the difference from the target.',
                'Consider implementing corrective actions if the direction is unfavorable.',
                'Replicate the finding with additional samples to confirm.'
            ]
            : isSignificant
                ? [
                    'The result is statistically significant but the effect size is small.',
                    'The practical importance may be limited.',
                    'Continue monitoring but avoid overreacting to small differences.',
                    'Consider whether the cost of intervention is justified.'
                ]
                : [
                    'The null hypothesis cannot be rejected at α = .05.',
                    'The sample mean is not significantly different from the test value.',
                    'Consider increasing sample size for greater statistical power.',
                    'Current performance appears consistent with the target.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'One-Sample T-Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="OneSample_TTest_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
