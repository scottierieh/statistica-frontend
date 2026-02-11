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
        const { results, groupCol, valueCol, sampleSize } = await request.json();

        const uStatistic = results.statistic || 0;
        const pValue = results.p_value || 1;
        const effectSize = results.effect_size || 0;
        const groupStats = results.group_stats || {};
        
        const isSignificant = pValue < 0.05;
        const effectLabel = getEffectSizeLabel(effectSize);
        const absR = Math.abs(effectSize);
        
        const groupNames = Object.keys(groupStats);
        const group1 = groupStats[groupNames[0]] || {};
        const group2 = groupStats[groupNames[1]] || {};
        
        const totalN = (group1.count || 0) + (group2.count || 0);
        
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
            children: [new TextRun({ text: 'Mann-Whitney U Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Group Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: groupCol, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` (${groupNames[0]} vs ${groupNames[1]})`, size: 24, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Value Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: valueCol, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${totalN} (${groupNames[0]}: n=${group1.count || '?'}, ${groupNames[1]}: n=${group2.count || '?'})`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                        ? 'Significant Difference Between Groups'
                        : 'No Significant Difference Between Groups',
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
                new TextRun({ text: `U Statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `U = ${uStatistic.toFixed(1)}`, bold: true, size: 22, font: 'Arial' })
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
                new TextRun({ text: `Effect Size: r = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${effectSize.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Medians: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${groupNames[0]} = ${group1.median?.toFixed(2) || 'N/A'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` vs `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${groupNames[1]} = ${group2.median?.toFixed(2) || 'N/A'}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A Mann-Whitney U test was conducted to compare ${valueCol} between the ${groupNames[0]} group (Mdn = ${group1.median?.toFixed(2) || 'N/A'}, n = ${group1.count || '?'}) and the ${groupNames[1]} group (Mdn = ${group2.median?.toFixed(2) || 'N/A'}, n = ${group2.count || '?'}). `;
        apaText += isSignificant
            ? `The test revealed a statistically significant difference, U = ${uStatistic.toFixed(1)}, p ${pFormatted}, r = ${effectSize.toFixed(2)}. `
            : `The test did not reveal a statistically significant difference, U = ${uStatistic.toFixed(1)}, p ${pFormatted}, r = ${effectSize.toFixed(2)}. `;
        apaText += `The effect size was ${effectLabel.toLowerCase()}, indicating that group membership ${absR >= 0.3 ? 'has a meaningful association with' : 'has limited practical impact on'} ${valueCol}.`;

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
                    createTableCell('Group', true, 2000, { align: AlignmentType.LEFT }),
                    createTableCell('N', true, 1200),
                    createTableCell('Mean', true, 1600),
                    createTableCell('Median', true, 1600),
                    createTableCell('Std. Dev', true, 1600),
                    createTableCell('Min', true, 1200),
                    createTableCell('Max', true, 1200)
                ]
            })
        ];

        Object.entries(groupStats).forEach(([group, stats]: [string, any]) => {
            descRows.push(new TableRow({
                children: [
                    createTableCell(group, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(stats.count || '—'), false, 1200),
                    createTableCell(stats.mean?.toFixed(3) || '—', false, 1600),
                    createTableCell(stats.median?.toFixed(3) || '—', false, 1600, { highlight: true }),
                    createTableCell(stats.std?.toFixed(3) || '—', false, 1600),
                    createTableCell(stats.min?.toFixed(3) || '—', false, 1200),
                    createTableCell(stats.max?.toFixed(3) || '—', false, 1200)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2000, 1200, 1600, 1600, 1600, 1200, 1200], rows: descRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Mann-Whitney U test compares medians (highlighted), not means.', 
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
                    createTableCell('Statistic', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Mann-Whitney U', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(uStatistic.toFixed(1), false, 2500, { highlight: true }),
                    createTableCell('Rank sum comparison', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p-value', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(formatPValue(pValue), false, 2500, { color: isSignificant ? COLORS.success : COLORS.danger }),
                    createTableCell(isSignificant ? 'Significant (p < .05)' : 'Not significant (p ≥ .05)', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Effect Size (r)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(effectSize.toFixed(3), false, 2500),
                    createTableCell(`${effectLabel} effect`, false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2500, 3000], rows: testRows }));

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
                'Significant difference confirmed with meaningful effect size.',
                `The ${groupNames[0]} and ${groupNames[1]} groups differ substantially on ${valueCol}.`,
                'Consider group-specific strategies or interventions.',
                'The non-parametric approach was appropriate for this analysis.',
                'Report both the U statistic and effect size for transparency.'
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
                    'No significant difference between groups was found.',
                    'The null hypothesis cannot be rejected at α = .05.',
                    'Consider increasing sample size for greater statistical power.',
                    'The groups appear similar on this measure.',
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
            children: [new TextRun({ text: '6. About Mann-Whitney U Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Non-parametric alternative to the independent samples t-test.',
            'Compares distributions of two independent groups using ranks.',
            'Does not assume normality — robust to outliers and skewed data.',
            'Tests whether one group tends to have higher values than the other.',
            'Effect size r provides a standardized measure of the difference.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Mann-Whitney U Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Mann_Whitney_U_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}