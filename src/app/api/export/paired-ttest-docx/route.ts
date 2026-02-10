import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber, ImageRun
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

const formatPValue = (p: number): string => {
    if (p < 0.001) return '< .001';
    return p.toFixed(3).replace(/^0/, '');
};

const getEffectSizeLabel = (d: number): string => {
    const absD = Math.abs(d);
    if (absD >= 0.8) return 'Large';
    if (absD >= 0.5) return 'Medium';
    if (absD >= 0.2) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, plot, variable1, variable2, alternative, sampleSize } = await request.json();

        const tStatistic = results.t_statistic || 0;
        const pValue = results.p_value || 0;
        const df = results.degrees_of_freedom || 0;
        const cohensD = results.cohens_d || 0;
        const meanDiff = results.mean_diff || 0;
        const seDiff = results.se_diff || 0;
        const ci = results.confidence_interval || null;
        const isSignificant = results.significant || pValue < 0.05;
        const descriptives = results.descriptives || {};
        const normalityTest = results.normality_test || {};
        
        const var1 = variable1 || results.variable1 || 'Variable 1';
        const var2 = variable2 || results.variable2 || 'Variable 2';
        const n = results.n || (df + 1) || sampleSize;
        
        const desc1 = descriptives[var1] || {};
        const desc2 = descriptives[var2] || {};
        const descDiff = descriptives['differences'] || {};
        
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
            children: [new TextRun({ text: 'Paired Samples T-Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Comparing Two Related Measurements', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${var1} vs ${var2} | N = ${n} pairs | α = .05`, size: 22, font: 'Arial', color: COLORS.gray })]
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

        const isGood = isSignificant && Math.abs(cohensD) >= 0.2;
        
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
                        ? `Significant Difference Detected (${getEffectSizeLabel(cohensD)} Effect)`
                        : 'No Significant Difference Found',
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
                new TextRun({ text: `Mean Difference: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${meanDiff.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${var1} - ${var2})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `P-value: `, size: 22, font: 'Arial' }),
                new TextRun({ text: formatPValue(pValue), bold: true, size: 22, font: 'Arial', color: pValue < 0.05 ? COLORS.success : COLORS.danger }),
                new TextRun({ text: pValue < 0.05 ? ' (Significant)' : ' (Not Significant)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Effect Size (Cohen's d): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${cohensD.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getEffectSizeLabel(cohensD)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (ci) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `95% CI: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `[${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]`, bold: true, size: 22, font: 'Arial' })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const mean1 = desc1.mean || 0;
        const mean2 = desc2.mean || 0;
        const sd1 = desc1.std_dev || 0;
        const sd2 = desc2.std_dev || 0;

        let apaText = `A paired-samples t-test was conducted to compare ${var1} and ${var2}. `;
        
        if (isSignificant) {
            apaText += `There was a significant difference in the scores for ${var1} (M = ${mean1.toFixed(2)}, SD = ${sd1.toFixed(2)}) `;
            apaText += `and ${var2} (M = ${mean2.toFixed(2)}, SD = ${sd2.toFixed(2)}); `;
            apaText += `t(${df}) = ${tStatistic.toFixed(2)}, p ${formatPValue(pValue)}, d = ${cohensD.toFixed(2)}. `;
            apaText += `The mean difference was ${meanDiff.toFixed(2)}${ci ? `, 95% CI [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]` : ''}, `;
            apaText += `indicating a ${getEffectSizeLabel(cohensD).toLowerCase()} effect.`;
        } else {
            apaText += `There was no significant difference in the scores for ${var1} (M = ${mean1.toFixed(2)}, SD = ${sd1.toFixed(2)}) `;
            apaText += `and ${var2} (M = ${mean2.toFixed(2)}, SD = ${sd2.toFixed(2)}); `;
            apaText += `t(${df}) = ${tStatistic.toFixed(2)}, p = ${formatPValue(pValue)}, d = ${cohensD.toFixed(2)}. `;
            apaText += `The null hypothesis of no difference between conditions cannot be rejected.`;
        }

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
                    createTableCell('Variable', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('N', true, 1500),
                    createTableCell('Mean', true, 2000),
                    createTableCell('SD', true, 2000),
                    createTableCell('SE', true, 1500)
                ]
            })
        ];

        if (desc1.n) {
            descRows.push(new TableRow({
                children: [
                    createTableCell(var1, false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(desc1.n), false, 1500),
                    createTableCell(desc1.mean?.toFixed(3) || '—', false, 2000),
                    createTableCell(desc1.std_dev?.toFixed(3) || '—', false, 2000),
                    createTableCell(desc1.se_mean?.toFixed(3) || '—', false, 1500)
                ]
            }));
        }

        if (desc2.n) {
            descRows.push(new TableRow({
                children: [
                    createTableCell(var2, false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(desc2.n), false, 1500),
                    createTableCell(desc2.mean?.toFixed(3) || '—', false, 2000),
                    createTableCell(desc2.std_dev?.toFixed(3) || '—', false, 2000),
                    createTableCell(desc2.se_mean?.toFixed(3) || '—', false, 1500)
                ]
            }));
        }

        if (descDiff.n) {
            descRows.push(new TableRow({
                children: [
                    createTableCell('Differences', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(descDiff.n), false, 1500),
                    createTableCell(descDiff.mean?.toFixed(3) || meanDiff.toFixed(3), false, 2000, { highlight: true }),
                    createTableCell(descDiff.std_dev?.toFixed(3) || '—', false, 2000),
                    createTableCell(descDiff.se_mean?.toFixed(3) || seDiff.toFixed(3), false, 1500)
                ]
            }));
        }

        children.push(new Table({ columnWidths: [3000, 1500, 2000, 2000, 1500], rows: descRows }));

        // 3. Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const testRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('t-statistic', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(tStatistic.toFixed(4), false, 2500, { bold: true }),
                    createTableCell(`t(${df})`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Degrees of Freedom', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(df), false, 2500),
                    createTableCell('n - 1', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('P-value', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(formatPValue(pValue), false, 2500, { highlight: true, bold: true, color: pValue < 0.05 ? COLORS.success : COLORS.danger }),
                    createTableCell(pValue < 0.05 ? 'Significant at α = .05' : 'Not Significant', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cohen's d", false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(cohensD.toFixed(4), false, 2500),
                    createTableCell(getEffectSizeLabel(cohensD) + ' effect', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Mean Difference', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(meanDiff.toFixed(4), false, 2500),
                    createTableCell(`${var1} - ${var2}`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Error', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(seDiff.toFixed(4), false, 2500),
                    createTableCell('SE of difference', false, 3500)
                ]
            })
        ];

        if (ci) {
            testRows.push(new TableRow({
                children: [
                    createTableCell('95% Confidence Interval', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(`[${ci[0].toFixed(4)}, ${ci[1].toFixed(4)}]`, false, 2500),
                    createTableCell(ci[0] <= 0 && ci[1] >= 0 ? 'Includes zero' : 'Excludes zero', false, 3500)
                ]
            }));
        }

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: testRows }));

        // 4. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
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
                    createTableCell(Math.abs(cohensD) < 0.2 ? '← Your result' : '', false, 3000, { color: COLORS.gray })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.2 ≤ |d| < 0.5', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.2 && Math.abs(cohensD) < 0.5 ? '← Your result' : '', false, 3000, { color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.5 ≤ |d| < 0.8', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.5 && Math.abs(cohensD) < 0.8 ? '← Your result' : '', false, 3000, { color: COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('|d| ≥ 0.8', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(Math.abs(cohensD) >= 0.8 ? '← Your result' : '', false, 3000, { color: COLORS.success })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // 5. Normality Test (if available)
        if (normalityTest && Object.keys(normalityTest).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Assumption Check: Normality', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const normRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Variable', true, 3000, { align: AlignmentType.LEFT }),
                        createTableCell('W (Shapiro-Wilk)', true, 2500),
                        createTableCell('P-value', true, 2000),
                        createTableCell('Status', true, 1500)
                    ]
                })
            ];

            Object.entries(normalityTest).forEach(([variable, test]: [string, any]) => {
                normRows.push(new TableRow({
                    children: [
                        createTableCell(variable, false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(test.statistic?.toFixed(4) || '—', false, 2500),
                        createTableCell(formatPValue(test.p_value || 0), false, 2000),
                        createTableCell(test.assumption_met ? '✓ Met' : '✗ Violated', false, 1500, { 
                            color: test.assumption_met ? COLORS.success : COLORS.danger 
                        })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [3000, 2500, 2000, 1500], rows: normRows }));

            children.push(new Paragraph({
                spacing: { before: 100, after: 200 },
                children: [new TextRun({ 
                    text: 'Note: p > .05 indicates normality assumption is met.', 
                    size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 6. Visualization
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: normalityTest && Object.keys(normalityTest).length > 0 ? '6. Visualization' : '5. Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            try {
                const imageData = plot.startsWith('data:') ? plot.split(',')[1] : plot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 400 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 7. Recommendations
        const recSectionNum = (normalityTest && Object.keys(normalityTest).length > 0 ? 6 : 5) + (plot ? 1 : 0);
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant
            ? Math.abs(cohensD) >= 0.5
                ? [
                    'Significant and meaningful difference detected.',
                    'The intervention or treatment appears to have a real effect.',
                    'Consider replication to confirm the finding.',
                    'Evaluate practical implications of this change.',
                    'Report effect size alongside p-value for complete picture.'
                ]
                : [
                    'Statistically significant but small effect.',
                    'Consider whether this change is practically meaningful.',
                    'May need larger sample for more precise estimates.',
                    'Evaluate cost-benefit of the intervention.'
                ]
            : [
                'No significant difference detected.',
                'Cannot conclude the two conditions differ.',
                'Consider increasing sample size for more power.',
                'Review measurement reliability.',
                'Effect may exist but be too small to detect.'
            ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isSignificant ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 8. About Paired Samples T-Test
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Paired Samples T-Test`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Compares two related measurements from the same subjects.',
            'Controls for individual differences (within-subjects design).',
            'More powerful than independent samples t-test for same n.',
            'Assumes normally distributed differences (robust with n > 30).',
            'Common uses: before/after studies, matched pairs, repeated measures.'
        ];

        aboutPoints.forEach((point, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: point, size: 22, font: 'Arial' })
                ]
            }));
        });

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Paired Samples T-Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Paired_TTest_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


