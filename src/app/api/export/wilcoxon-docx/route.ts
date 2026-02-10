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

const getEffectSizeLabel = (r: number): string => {
    const absR = Math.abs(r);
    if (absR >= 0.5) return 'Large';
    if (absR >= 0.3) return 'Medium';
    if (absR >= 0.1) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, var1, var2, sampleSize } = await request.json();

        const wStatistic = results.statistic || 0;
        const pValue = results.p_value || 1;
        const effectSize = results.effect_size || 0;
        const zScore = results.z_score;
        const wPlus = results.W_plus;
        const wMinus = results.W_minus;
        const descriptiveStats = results.descriptive_stats || {};
        const nValid = results.n || results.n_valid || sampleSize;
        
        const isSignificant = pValue < 0.05;
        const effectLabel = getEffectSizeLabel(effectSize);
        const absR = Math.abs(effectSize);
        
        const stat1 = descriptiveStats[var1] || {};
        const stat2 = descriptiveStats[var2] || {};
        
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
            children: [new TextRun({ text: 'Wilcoxon Signed-Rank Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Comparison: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${var1} vs ${var2}`, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${nValid} paired observations`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                        ? 'Significant Change Between Measurements'
                        : 'No Significant Change Between Measurements',
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
                new TextRun({ text: `W Statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `W = ${wStatistic.toFixed(1)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        if (zScore != null) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Z Score: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `Z = ${zScore.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
                ]
            }));
        }

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
                new TextRun({ text: `Effect Size: r = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${effectSize.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        if (stat1.median != null && stat2.median != null) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Medians: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `${var1} = ${stat1.median.toFixed(2)}`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` → `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `${var2} = ${stat2.median.toFixed(2)}`, bold: true, size: 22, font: 'Arial' })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A Wilcoxon Signed-Rank test was conducted to compare ${var1} (Mdn = ${stat1.median?.toFixed(2) || 'N/A'}) and ${var2} (Mdn = ${stat2.median?.toFixed(2) || 'N/A'}) in N = ${nValid} paired observations. `;
        apaText += isSignificant
            ? `The test revealed a statistically significant change, W = ${wStatistic.toFixed(1)}${zScore != null ? `, Z = ${zScore.toFixed(2)}` : ''}, p ${pFormatted}, r = ${effectSize.toFixed(2)}. `
            : `The test did not reveal a statistically significant change, W = ${wStatistic.toFixed(1)}${zScore != null ? `, Z = ${zScore.toFixed(2)}` : ''}, p ${pFormatted}, r = ${effectSize.toFixed(2)}. `;
        apaText += `The effect size was ${effectLabel.toLowerCase()}, indicating that the change between measurements ${absR >= 0.3 ? 'is practically meaningful' : 'has limited practical impact'}.`;

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
                    createTableCell('Median', true, 2000),
                    createTableCell('Std. Dev', true, 2000)
                ]
            })
        ];

        Object.entries(descriptiveStats).forEach(([variable, stats]: [string, any]) => {
            descRows.push(new TableRow({
                children: [
                    createTableCell(variable, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(stats.n || nValid || '—'), false, 1500),
                    createTableCell(stats.mean?.toFixed(3) || '—', false, 2000),
                    createTableCell(stats.median?.toFixed(3) || '—', false, 2000, { highlight: true }),
                    createTableCell(stats.std?.toFixed(3) || '—', false, 2000)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3000, 1500, 2000, 2000, 2000], rows: descRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Wilcoxon test compares medians (highlighted), not means.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

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
                    createTableCell('W Statistic', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(wStatistic.toFixed(1), false, 2500, { highlight: true }),
                    createTableCell('Sum of signed ranks', false, 3500)
                ]
            })
        ];

        if (zScore != null) {
            testRows.push(new TableRow({
                children: [
                    createTableCell('Z Score', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(zScore.toFixed(3), false, 2500),
                    createTableCell('Standardized test statistic', false, 3500)
                ]
            }));
        }

        testRows.push(new TableRow({
            children: [
                createTableCell('p-value', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                createTableCell(formatPValue(pValue), false, 2500, { color: isSignificant ? COLORS.success : COLORS.danger }),
                createTableCell(isSignificant ? 'Significant (p < .05)' : 'Not significant (p ≥ .05)', false, 3500)
            ]
        }));

        testRows.push(new TableRow({
            children: [
                createTableCell('Effect Size (r)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                createTableCell(effectSize.toFixed(3), false, 2500),
                createTableCell(`${effectLabel} effect`, false, 3500)
            ]
        }));

        if (wPlus != null && wMinus != null) {
            testRows.push(new TableRow({
                children: [
                    createTableCell('W+ (Positive Ranks)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(wPlus.toFixed(1), false, 2500),
                    createTableCell('Sum of ranks for positive differences', false, 3500)
                ]
            }));
            testRows.push(new TableRow({
                children: [
                    createTableCell('W- (Negative Ranks)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(wMinus.toFixed(1), false, 2500),
                    createTableCell('Sum of ranks for negative differences', false, 3500)
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
                    createTableCell('|r| Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.10', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(absR < 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.30', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(absR >= 0.10 && absR < 0.30 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.30 - 0.50', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(absR >= 0.30 && absR < 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.50', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(absR >= 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Effect size r = Z / √N (Cohen, 1988).', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && absR >= 0.3
            ? [
                'Significant change confirmed with meaningful effect size.',
                `There is a substantial change from ${var1} to ${var2}.`,
                'The intervention or treatment was effective.',
                'The non-parametric approach was appropriate for this analysis.',
                'Consider replicating to confirm the effect.'
            ]
            : isSignificant
                ? [
                    'Statistically significant but effect size is small.',
                    'The practical importance may be limited despite statistical significance.',
                    'Large sample sizes can detect trivially small effects.',
                    'Consider whether the change is meaningful in your context.',
                    'Report effect sizes alongside p-values for transparency.'
                ]
                : [
                    'No significant change between measurements was found.',
                    'The null hypothesis cannot be rejected at α = .05.',
                    'Consider increasing sample size for greater statistical power.',
                    'The measurements appear similar — no meaningful change detected.',
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

        // 6. About the Test
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Wilcoxon Signed-Rank Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Non-parametric alternative to the paired samples t-test.',
            'Compares two related measurements using ranks of differences.',
            'Does not assume normality — robust to outliers and skewed data.',
            'Tests whether the median difference is significantly different from zero.',
            'Effect size r provides a standardized measure of the change magnitude.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Wilcoxon Signed-Rank Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Wilcoxon_Test_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}