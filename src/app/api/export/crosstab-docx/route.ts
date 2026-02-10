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

const getEffectSizeLabel = (v: number): string => {
    if (v >= 0.5) return 'Large';
    if (v >= 0.3) return 'Medium';
    if (v >= 0.1) return 'Small';
    return 'Negligible';
};

const getSignificanceStars = (p: number): string => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

export async function POST(request: NextRequest) {
    try {
        const { results, rowVar, colVar, sampleSize, plot } = await request.json();

        const chiSquared = results.chi_squared || {};
        const chiStat = chiSquared.statistic || 0;
        const pValue = chiSquared.p_value || 1;
        const df = chiSquared.degrees_of_freedom || 0;
        const cramersV = results.cramers_v || 0;
        const contingencyTable = results.contingency_table || {};
        const interpretation = results.interpretation || '';
        
        const isSignificant = pValue < 0.05;
        
        // Calculate totals
        const rowKeys = Object.keys(contingencyTable);
        const colKeys = rowKeys.length > 0 ? Object.keys(contingencyTable[rowKeys[0]]) : [];
        
        const rowTotals: { [key: string]: number } = {};
        rowKeys.forEach(rowKey => {
            rowTotals[rowKey] = Object.values(contingencyTable[rowKey] as { [key: string]: number }).reduce((sum: number, val: number) => sum + val, 0);
        });
        
        const colTotals: { [key: string]: number } = {};
        colKeys.forEach(colKey => {
            colTotals[colKey] = rowKeys.reduce((sum, rowKey) => sum + (contingencyTable[rowKey][colKey] || 0), 0);
        });
        
        const grandTotal = Object.values(rowTotals).reduce((sum, val) => sum + val, 0);
        
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
            children: [new TextRun({ text: 'Crosstabulation & Chi-Squared Test', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Test of Independence Between Categorical Variables', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Row: ${rowVar} | Column: ${colVar} | N = ${grandTotal || sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                        ? 'Significant Association Found'
                        : 'No Significant Association',
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
                new TextRun({ text: `Chi-Squared (χ²): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${chiStat.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (df = ${df})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `P-value: `, size: 22, font: 'Arial' }),
                new TextRun({ text: formatPValue(pValue), bold: true, size: 22, font: 'Arial', color: pValue < 0.05 ? COLORS.success : COLORS.danger }),
                new TextRun({ text: ` ${getSignificanceStars(pValue)}`, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Cramer's V: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${cramersV.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getEffectSizeLabel(cramersV)} effect)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Table Dimensions: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${rowKeys.length} × ${colKeys.length}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (N = ${grandTotal})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A chi-square test of independence was conducted to examine the relationship between ${rowVar} and ${colVar}. `;
        apaText += `The analysis included ${grandTotal} observations. `;
        
        if (isSignificant) {
            apaText += `The results revealed a statistically significant association between the two variables, `;
            apaText += `χ²(${df}, N = ${grandTotal}) = ${chiStat.toFixed(2)}, p ${formatPValue(pValue)}. `;
            apaText += `The effect size, as measured by Cramér's V, was ${cramersV.toFixed(3)}, indicating a ${getEffectSizeLabel(cramersV).toLowerCase()} association.`;
        } else {
            apaText += `The results indicated no statistically significant association between the two variables, `;
            apaText += `χ²(${df}, N = ${grandTotal}) = ${chiStat.toFixed(2)}, p = ${pValue.toFixed(3)}. `;
            apaText += `Cramér's V was ${cramersV.toFixed(3)}, suggesting a ${getEffectSizeLabel(cramersV).toLowerCase()} effect size.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const resultsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Chi-Squared (χ²)', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(chiStat.toFixed(4), false, 2500, { highlight: true, bold: true }),
                    createTableCell(`df = ${df}`, false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('P-value', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(`${formatPValue(pValue)} ${getSignificanceStars(pValue)}`, false, 2500, { bold: true, color: pValue < 0.05 ? COLORS.success : COLORS.danger }),
                    createTableCell(pValue < 0.05 ? 'Significant' : 'Not Significant', false, 3000, { color: pValue < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cramer's V", false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(cramersV.toFixed(4), false, 2500, { bold: true }),
                    createTableCell(getEffectSizeLabel(cramersV), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Sample Size (N)', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(String(grandTotal), false, 2500),
                    createTableCell('Total observations', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 3000], rows: resultsRows }));

        // 3. Contingency Table
        if (rowKeys.length > 0 && colKeys.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Contingency Table', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: `Observed frequencies: ${rowVar} (rows) × ${colVar} (columns)`, 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            // Calculate column widths dynamically
            const numCols = colKeys.length + 2; // +2 for row header and total
            const totalWidth = 9500;
            const colWidth = Math.floor(totalWidth / numCols);

            // Header row
            const tableRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell(`${rowVar} \\ ${colVar}`, true, colWidth, { align: AlignmentType.LEFT }),
                        ...colKeys.map(col => createTableCell(String(col), true, colWidth)),
                        createTableCell('Total', true, colWidth)
                    ]
                })
            ];

            // Data rows
            rowKeys.forEach(rowKey => {
                tableRows.push(new TableRow({
                    children: [
                        createTableCell(String(rowKey), false, colWidth, { align: AlignmentType.LEFT, bold: true }),
                        ...colKeys.map(colKey => createTableCell(String(contingencyTable[rowKey][colKey] || 0), false, colWidth)),
                        createTableCell(String(rowTotals[rowKey]), false, colWidth, { bold: true })
                    ]
                }));
            });

            // Total row
            tableRows.push(new TableRow({
                children: [
                    createTableCell('Total', false, colWidth, { align: AlignmentType.LEFT, bold: true }),
                    ...colKeys.map(colKey => createTableCell(String(colTotals[colKey]), false, colWidth, { bold: true })),
                    createTableCell(String(grandTotal), false, colWidth, { bold: true, highlight: true })
                ]
            }));

            children.push(new Table({ columnWidths: Array(numCols).fill(colWidth), rows: tableRows }));
        }

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
                    createTableCell("Cramer's V Range", true, 2500),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.10', false, 2500),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(cramersV < 0.10 ? '← Your result' : '', false, 3500, { color: COLORS.gray })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.29', false, 2500),
                    createTableCell('Small', false, 3000),
                    createTableCell(cramersV >= 0.10 && cramersV < 0.30 ? '← Your result' : '', false, 3500, { color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.30 - 0.49', false, 2500),
                    createTableCell('Medium', false, 3000),
                    createTableCell(cramersV >= 0.30 && cramersV < 0.50 ? '← Your result' : '', false, 3500, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.50', false, 2500),
                    createTableCell('Large', false, 3000),
                    createTableCell(cramersV >= 0.50 ? '← Your result' : '', false, 3500, { color: COLORS.success })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 3000, 3500], rows: effectRows }));

        // 5. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Distribution of categories showing the relationship between variables.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = plot.startsWith('data:') ? plot.split(',')[1] : plot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 500, height: 350 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 6. Recommendations
        const recSectionNum = plot ? 6 : 5;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && cramersV >= 0.3
            ? [
                `Strong association found between ${rowVar} and ${colVar}.`,
                'Use this relationship for segmentation and targeting.',
                `Consider ${rowVar} when predicting or explaining ${colVar}.`,
                'Investigate causal mechanisms behind the association.',
                'Report effect size alongside p-value for practical significance.'
            ]
            : isSignificant && cramersV >= 0.1
                ? [
                    `Moderate association found between ${rowVar} and ${colVar}.`,
                    'Pattern exists but should be used alongside other factors.',
                    'Consider larger sample size for more precise estimates.',
                    'Examine residuals to identify strongest cell deviations.',
                    'Effect may be useful for hypothesis generation.'
                ]
                : isSignificant
                    ? [
                        'Statistically significant but weak association.',
                        'Effect size too small for practical decision-making.',
                        'Consider whether the relationship has practical importance.',
                        'May need larger sample to detect meaningful effects.',
                        'Report both statistical and practical significance.'
                    ]
                    : [
                        `No significant association between ${rowVar} and ${colVar}.`,
                        'Variables appear to be independent of each other.',
                        'Treat these factors separately in analysis.',
                        'Consider whether sample size was adequate.',
                        'Check for confounding variables or subgroup effects.'
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

        // 7. About Chi-Squared Test
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About the Chi-Squared Test`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Tests whether two categorical variables are independent.',
            'Compares observed frequencies to expected frequencies under independence.',
            'Larger χ² values indicate greater deviation from independence.',
            "Cramer's V provides effect size (0 = no association, 1 = perfect).",
            "Assumes expected frequency ≥ 5 in each cell (use Fisher's exact test otherwise)."
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Chi-Squared Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ChiSquared_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
