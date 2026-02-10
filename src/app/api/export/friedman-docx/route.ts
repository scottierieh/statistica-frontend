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

const getConcordanceLabel = (w: number): string => {
    if (w >= 0.7) return 'Very Strong';
    if (w >= 0.5) return 'Strong';
    if (w >= 0.3) return 'Moderate';
    if (w >= 0.1) return 'Weak';
    return 'Very Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedVars, sampleSize } = await request.json();

        const chiSquared = results.statistic || 0;
        const pValue = results.p_value || 1;
        const kendallW = results.effect_size || 0;
        const df = results.df || (selectedVars.length - 1);
        const conditionStats = results.condition_stats || {};
        
        const isSignificant = pValue < 0.05;
        const concordanceLabel = getConcordanceLabel(kendallW);
        
        const numConditions = selectedVars.length;
        const conditionStatsArray = Object.entries(conditionStats);
        
        // Find highest and lowest means
        let highestCondition = '', lowestCondition = '', highestMean = -Infinity, lowestMean = Infinity;
        conditionStatsArray.forEach(([name, stats]: [string, any]) => {
            if (stats.mean > highestMean) { highestMean = stats.mean; highestCondition = name; }
            if (stats.mean < lowestMean) { lowestMean = stats.mean; lowestCondition = name; }
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
            children: [new TextRun({ text: 'Friedman Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Conditions: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: selectedVars.join(', '), size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} subjects across ${numConditions} conditions`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                        ? 'Significant Differences Among Conditions'
                        : 'No Significant Differences Among Conditions',
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
                new TextRun({ text: `χ² Statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `χ²(${df}) = ${chiSquared.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
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
                new TextRun({ text: `Kendall's W: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `W = ${kendallW.toFixed(3)} (${concordanceLabel} concordance)`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Mean Range: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${lowestCondition} (${lowestMean.toFixed(2)})`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` to `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${highestCondition} (${highestMean.toFixed(2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A Friedman test was conducted to compare responses across ${numConditions} related conditions (${selectedVars.join(', ')}). `;
        apaText += `The sample consisted of N = ${sampleSize} subjects. `;
        apaText += isSignificant
            ? `The test revealed statistically significant differences among the conditions, χ²(${df}) = ${chiSquared.toFixed(2)}, p ${pFormatted}, W = ${kendallW.toFixed(3)}. `
            : `The test did not reveal statistically significant differences among the conditions, χ²(${df}) = ${chiSquared.toFixed(2)}, p ${pFormatted}, W = ${kendallW.toFixed(3)}. `;
        apaText += `Kendall's coefficient of concordance indicates ${concordanceLabel.toLowerCase()} agreement among subjects in their ranking of conditions.`;

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
                    createTableCell('Condition', true, 2400, { align: AlignmentType.LEFT }),
                    createTableCell('N', true, 1000),
                    createTableCell('Mean', true, 1600),
                    createTableCell('Median', true, 1600),
                    createTableCell('Std. Dev', true, 1600),
                    createTableCell('Min', true, 1200),
                    createTableCell('Max', true, 1200)
                ]
            })
        ];

        Object.entries(conditionStats).forEach(([condition, stats]: [string, any]) => {
            const isHighest = condition === highestCondition;
            const isLowest = condition === lowestCondition;
            descRows.push(new TableRow({
                children: [
                    createTableCell(condition, false, 2400, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(stats.count || '—'), false, 1000),
                    createTableCell(stats.mean?.toFixed(3) || '—', false, 1600, { 
                        highlight: isHighest || isLowest,
                        color: isHighest ? COLORS.success : isLowest ? COLORS.warning : undefined
                    }),
                    createTableCell(stats.median?.toFixed(3) || '—', false, 1600),
                    createTableCell(stats.std?.toFixed(3) || '—', false, 1600),
                    createTableCell(stats.min?.toFixed(3) || '—', false, 1200),
                    createTableCell(stats.max?.toFixed(3) || '—', false, 1200)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2400, 1000, 1600, 1600, 1600, 1200, 1200], rows: descRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Highest mean highlighted in green, lowest in orange.', 
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
                    createTableCell('χ² Statistic', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(chiSquared.toFixed(3), false, 2500, { highlight: true }),
                    createTableCell('Chi-squared test statistic', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Degrees of Freedom (df)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(df), false, 2500),
                    createTableCell(`Number of conditions - 1 (${numConditions} - 1)`, false, 3500)
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
                    createTableCell("Kendall's W", false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(kendallW.toFixed(3), false, 2500),
                    createTableCell(`${concordanceLabel} concordance`, false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: testRows }));

        // 4. Kendall's W Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: "4. Kendall's W Interpretation", bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const wRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('W Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.10', false, 3000),
                    createTableCell('Very Weak Agreement', false, 3000),
                    createTableCell(kendallW < 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.30', false, 3000),
                    createTableCell('Weak Agreement', false, 3000),
                    createTableCell(kendallW >= 0.10 && kendallW < 0.30 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.30 - 0.50', false, 3000),
                    createTableCell('Moderate Agreement', false, 3000),
                    createTableCell(kendallW >= 0.30 && kendallW < 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.50 - 0.70', false, 3000),
                    createTableCell('Strong Agreement', false, 3000),
                    createTableCell(kendallW >= 0.50 && kendallW < 0.70 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.70', false, 3000),
                    createTableCell('Very Strong Agreement', false, 3000),
                    createTableCell(kendallW >= 0.70 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: wRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: "Note: Kendall's W measures the extent to which subjects agree on their ranking of conditions (0 = no agreement, 1 = complete agreement).", 
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

        const recommendations = isSignificant && kendallW >= 0.3
            ? [
                'Significant differences confirmed with meaningful concordance.',
                'Subjects show consistent patterns in their ranking of conditions.',
                "Conduct post-hoc pairwise comparisons (e.g., Nemenyi test) to identify which conditions differ.",
                'The non-parametric approach was appropriate for this repeated measures design.',
                'Consider the practical implications of the condition differences.'
            ]
            : isSignificant
                ? [
                    'Statistically significant but concordance is weak.',
                    'High individual variation in condition preferences exists.',
                    'Post-hoc tests may help identify specific differences.',
                    'Results should be interpreted cautiously due to low agreement.',
                    'Consider whether there are subgroups with different patterns.'
                ]
                : [
                    'No significant differences among conditions were found.',
                    'Subjects responded similarly across all conditions.',
                    'Consider increasing sample size for greater statistical power.',
                    'Check if conditions were sufficiently distinct.',
                    'The null hypothesis cannot be rejected at α = .05.'
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
            children: [new TextRun({ text: '6. About Friedman Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Non-parametric alternative to repeated measures ANOVA.',
            'Compares 3+ related measurements from the same subjects.',
            'Ranks observations within each subject across conditions.',
            'Does not assume normality — robust to outliers and skewed data.',
            "Kendall's W measures overall agreement in subject rankings."
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Friedman Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Friedman_Test_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}