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

const getEffectSizeLabel = (eps: number): string => {
    if (eps >= 0.14) return 'Large';
    if (eps >= 0.06) return 'Medium';
    if (eps >= 0.01) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, groupCol, valueCol, sampleSize, numGroups } = await request.json();

        const hStatistic = results.statistic || 0;
        const pValue = results.p_value || 1;
        const effectSize = results.effect_size || 0;
        const df = results.df || (numGroups - 1);
        const groupStats = results.group_stats || {};
        
        const isSignificant = pValue < 0.05;
        const effectLabel = getEffectSizeLabel(effectSize);
        
        const groupNames = Object.keys(groupStats);
        const groupStatsArray = Object.entries(groupStats);
        
        // Find highest and lowest medians
        let highestGroup = '', lowestGroup = '', highestMedian = -Infinity, lowestMedian = Infinity;
        groupStatsArray.forEach(([name, stats]: [string, any]) => {
            if (stats.median > highestMedian) { highestMedian = stats.median; highestGroup = name; }
            if (stats.median < lowestMedian) { lowestMedian = stats.median; lowestGroup = name; }
        });
        
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
            children: [new TextRun({ text: 'Kruskal-Wallis Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Group Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: groupCol, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` (${numGroups} groups)`, size: 24, font: 'Arial', color: COLORS.gray })
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
                        ? 'Significant Differences Among Groups'
                        : 'No Significant Differences Among Groups',
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
                new TextRun({ text: `H Statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `H(${df}) = ${hStatistic.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
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
                new TextRun({ text: `Effect Size: ε² = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${effectSize.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Median Range: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${lowestGroup} (${lowestMedian.toFixed(2)})`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` to `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${highestGroup} (${highestMedian.toFixed(2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A Kruskal-Wallis test was conducted to compare ${valueCol} across ${numGroups} groups defined by ${groupCol}. `;
        apaText += `The sample consisted of N = ${sampleSize} observations. `;
        apaText += isSignificant
            ? `The test revealed statistically significant differences among the groups, H(${df}) = ${hStatistic.toFixed(2)}, p ${pFormatted}, ε² = ${effectSize.toFixed(3)}. `
            : `The test did not reveal statistically significant differences among the groups, H(${df}) = ${hStatistic.toFixed(2)}, p ${pFormatted}, ε² = ${effectSize.toFixed(3)}. `;
        apaText += `The effect size was ${effectLabel.toLowerCase()}, indicating that group membership ${effectSize >= 0.06 ? 'has a meaningful association with' : 'has limited practical impact on'} ${valueCol}.`;

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
                    createTableCell('N', true, 1200),
                    createTableCell('Mean', true, 1800),
                    createTableCell('Median', true, 1800),
                    createTableCell('Std. Dev', true, 1800)
                ]
            })
        ];

        Object.entries(groupStats).forEach(([group, stats]: [string, any]) => {
            const isHighest = group === highestGroup;
            const isLowest = group === lowestGroup;
            descRows.push(new TableRow({
                children: [
                    createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(stats.count || stats.n || '—'), false, 1200),
                    createTableCell(stats.mean?.toFixed(3) || '—', false, 1800),
                    createTableCell(stats.median?.toFixed(3) || '—', false, 1800, { 
                        highlight: isHighest || isLowest,
                        color: isHighest ? COLORS.success : isLowest ? COLORS.warning : undefined
                    }),
                    createTableCell(stats.std?.toFixed(3) || '—', false, 1800)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2500, 1200, 1800, 1800, 1800], rows: descRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Kruskal-Wallis test compares medians (highlighted: highest in green, lowest in orange).', 
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
                    createTableCell('H Statistic', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(hStatistic.toFixed(3), false, 2500, { highlight: true }),
                    createTableCell('Chi-squared distributed', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Degrees of Freedom (df)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(df), false, 2500),
                    createTableCell(`Number of groups - 1 (${numGroups} - 1)`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p-value', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(formatPValue(pValue), false, 2500, { color: isSignificant ? COLORS.success : COLORS.danger }),
                    createTableCell(isSignificant ? 'Significant (p < .05)' : 'Not significant (p ≥ .05)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Effect Size (ε²)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(effectSize.toFixed(3), false, 2500),
                    createTableCell(`${effectLabel} effect`, false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: testRows }));

        // 4. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Effect Size Interpretation (ε²)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('ε² Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.01', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(effectSize < 0.01 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 - 0.06', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(effectSize >= 0.01 && effectSize < 0.06 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.06 - 0.14', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(effectSize >= 0.06 && effectSize < 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.14', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(effectSize >= 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: ε² = (H - k + 1) / (n - k), where H is the test statistic, k is the number of groups, n is the sample size.', 
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

        const recommendations = isSignificant && effectSize >= 0.06
            ? [
                'Significant differences confirmed with meaningful effect size.',
                `Groups differ substantially on ${valueCol}.`,
                "Conduct post-hoc pairwise comparisons (e.g., Dunn's test) to identify which groups differ.",
                'Consider practical implications for different groups.',
                'The non-parametric approach was appropriate for this analysis.'
            ]
            : isSignificant
                ? [
                    'Statistically significant but effect size is small.',
                    'The practical importance may be limited despite statistical significance.',
                    "Conduct post-hoc tests to identify specific group differences.",
                    'Large sample sizes can detect trivially small effects.',
                    'Consider whether the differences are meaningful in context.'
                ]
                : [
                    'No significant differences among groups were found.',
                    'The null hypothesis cannot be rejected at α = .05.',
                    'All groups appear similar on this measure.',
                    'Consider increasing sample size for greater statistical power.',
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
            children: [new TextRun({ text: '6. About Kruskal-Wallis Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Non-parametric alternative to one-way ANOVA.',
            'Compares distributions of 3 or more independent groups using ranks.',
            'Does not assume normality — robust to outliers and skewed data.',
            'Tests whether at least one group distribution differs from the others.',
            "If significant, follow up with Dunn's test for pairwise comparisons."
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Kruskal-Wallis Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Kruskal_Wallis_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

