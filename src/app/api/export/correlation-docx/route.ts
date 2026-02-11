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

const getCorrelationLabel = (r: number): string => {
    const absR = Math.abs(r);
    if (absR >= 0.7) return 'Strong';
    if (absR >= 0.4) return 'Moderate';
    if (absR >= 0.2) return 'Weak';
    return 'Negligible';
};

const getMethodLabel = (method: string): string => {
    const labels: { [key: string]: string } = {
        'pearson': 'Pearson',
        'spearman': 'Spearman',
        'kendall': "Kendall's Tau"
    };
    return labels[method] || method;
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedHeaders, correlationMethod, sampleSize, groupVar } = await request.json();

        const corrMatrix = results.correlation_matrix || {};
        const pValueMatrix = results.p_value_matrix || {};
        const summaryStats = results.summary_statistics || {};
        const strongestCorrs = results.strongest_correlations || [];
        const interpretation = results.interpretation || {};
        const heatmapPlot = results.heatmap_plot;
        const pairsPlot = results.pairs_plot;
        
        const numVars = selectedHeaders?.length || Object.keys(corrMatrix).length;
        const totalPairs = summaryStats.total_pairs || (numVars * (numVars - 1)) / 2;
        const significantPairs = summaryStats.significant_correlations || 0;
        const meanCorr = summaryStats.mean_correlation || 0;
        const hasSignificant = significantPairs > 0;
        const strongestPair = strongestCorrs[0];
        
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
            children: [new TextRun({ text: 'Correlation Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${getMethodLabel(correlationMethod)} Correlation Coefficients`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${numVars} Variables | ${totalPairs} Pairs | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: hasSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: hasSignificant ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: hasSignificant 
                        ? `${significantPairs} Significant Correlation${significantPairs !== 1 ? 's' : ''} Found`
                        : 'No Significant Correlations Found',
                    bold: true, size: 24, font: 'Arial',
                    color: hasSignificant ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Variables Analyzed: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${numVars}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Significant Pairs: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${significantPairs} of ${totalPairs}`, bold: true, size: 22, font: 'Arial', color: hasSignificant ? COLORS.success : COLORS.danger }),
                new TextRun({ text: ` (${((significantPairs / totalPairs) * 100).toFixed(1)}%)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Mean |r|: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${Math.abs(meanCorr).toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getCorrelationLabel(meanCorr)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (strongestPair) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Strongest: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `${strongestPair.variable_1} × ${strongestPair.variable_2}`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` (r = ${strongestPair.correlation.toFixed(3)})`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `${getMethodLabel(correlationMethod)} correlation coefficients were computed to assess the relationships among ${numVars} variables (N = ${sampleSize}). `;
        
        if (hasSignificant) {
            apaText += `Of the ${totalPairs} possible pairings, ${significantPairs} (${((significantPairs / totalPairs) * 100).toFixed(1)}%) reached statistical significance at the p < .05 level. `;
        } else {
            apaText += `None of the ${totalPairs} correlations reached statistical significance at the p < .05 level. `;
        }
        
        if (strongestPair) {
            apaText += `The strongest correlation was observed between ${strongestPair.variable_1} and ${strongestPair.variable_2}, `;
            apaText += `r(${sampleSize - 2}) = ${strongestPair.correlation.toFixed(3)}, p ${formatPValue(strongestPair.p_value)}. `;
            apaText += `This represents a ${getCorrelationLabel(strongestPair.correlation).toLowerCase()} ${strongestPair.correlation > 0 ? 'positive' : 'negative'} relationship, `;
            apaText += `accounting for approximately ${(Math.pow(strongestPair.correlation, 2) * 100).toFixed(1)}% of the variance (r² = ${Math.pow(strongestPair.correlation, 2).toFixed(3)}).`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Summary Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Summary Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 4500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Mean Correlation |r|', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(Math.abs(meanCorr).toFixed(4), false, 2500, { highlight: true, bold: true }),
                    createTableCell(getCorrelationLabel(meanCorr), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Median Correlation', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell((summaryStats.median_correlation || 0).toFixed(4), false, 2500),
                    createTableCell('—', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Deviation', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell((summaryStats.std_dev || 0).toFixed(4), false, 2500),
                    createTableCell('Variability', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Range (Min, Max)', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(`[${(summaryStats.range?.[0] || 0).toFixed(3)}, ${(summaryStats.range?.[1] || 0).toFixed(3)}]`, false, 2500),
                    createTableCell('—', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Significant Correlations', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(`${significantPairs}/${totalPairs}`, false, 2500, { bold: true, color: hasSignificant ? COLORS.success : COLORS.danger }),
                    createTableCell(`${((significantPairs / totalPairs) * 100).toFixed(1)}%`, false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4500, 2500, 2500], rows: summaryRows }));

        // 3. Strongest Correlations
        if (strongestCorrs.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Correlation Pairs', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const pairsRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Variable 1', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('Variable 2', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('r', true, 1500),
                        createTableCell('p-value', true, 1500),
                        createTableCell('Strength', true, 1500),
                        createTableCell('Sig.', true, 1000)
                    ]
                })
            ];

            strongestCorrs.slice(0, 20).forEach((pair: any) => {
                pairsRows.push(new TableRow({
                    children: [
                        createTableCell(pair.variable_1, false, 2200, { align: AlignmentType.LEFT }),
                        createTableCell(pair.variable_2, false, 2200, { align: AlignmentType.LEFT }),
                        createTableCell(pair.correlation.toFixed(3), false, 1500, { bold: true }),
                        createTableCell(formatPValue(pair.p_value), false, 1500, { color: pair.significant ? COLORS.success : undefined }),
                        createTableCell(getCorrelationLabel(pair.correlation), false, 1500),
                        createTableCell(pair.significant ? '✓' : '—', false, 1000, { color: pair.significant ? COLORS.success : COLORS.gray })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2200, 2200, 1500, 1500, 1500, 1000], rows: pairsRows }));

            if (strongestCorrs.length > 20) {
                children.push(new Paragraph({
                    spacing: { before: 100, after: 200 },
                    children: [new TextRun({ 
                        text: `Showing top 20 of ${strongestCorrs.length} pairs.`, 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 4. Correlation Strength Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Correlation Strength Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('|r| Range', true, 2500),
                    createTableCell('Interpretation', true, 2500),
                    createTableCell('Practical Meaning', true, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.00 - 0.19', false, 2500),
                    createTableCell('Negligible', false, 2500),
                    createTableCell('Variables are essentially unrelated', false, 4000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.20 - 0.39', false, 2500),
                    createTableCell('Weak', false, 2500),
                    createTableCell('Small association, limited predictive value', false, 4000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.40 - 0.69', false, 2500),
                    createTableCell('Moderate', false, 2500),
                    createTableCell('Meaningful relationship, useful for prediction', false, 4000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.70 - 1.00', false, 2500),
                    createTableCell('Strong', false, 2500),
                    createTableCell('Powerful association, high predictive value', false, 4000, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2500, 4000], rows: guideRows }));

        // 5. Visualization (if available)
        if (heatmapPlot || pairsPlot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            if (heatmapPlot) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: 'Correlation Heatmap', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
                }));

                try {
                    const imageData = heatmapPlot.startsWith('data:') ? heatmapPlot.split(',')[1] : heatmapPlot;
                    children.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                        children: [
                            new ImageRun({
                                data: Buffer.from(imageData, 'base64'),
                                transformation: { width: 500, height: 400 },
                                type: 'png'
                            })
                        ]
                    }));
                } catch (e) {
                    console.error('Heatmap image processing error:', e);
                }
            }

            if (pairsPlot) {
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: 'Pairs Plot', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
                }));

                try {
                    const imageData = pairsPlot.startsWith('data:') ? pairsPlot.split(',')[1] : pairsPlot;
                    children.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new ImageRun({
                                data: Buffer.from(imageData, 'base64'),
                                transformation: { width: 500, height: 400 },
                                type: 'png'
                            })
                        ]
                    }));
                } catch (e) {
                    console.error('Pairs plot image processing error:', e);
                }
            }
        }

        // 6. Recommendations
        const recSectionNum = (heatmapPlot || pairsPlot) ? 6 : 5;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = hasSignificant && strongestPair && Math.abs(strongestPair.correlation) >= 0.5
            ? [
                'Strong correlations found — consider using these relationships for prediction.',
                'Investigate causal mechanisms behind the strongest correlations.',
                'Be cautious of multicollinearity if using these variables together in regression.',
                'Consider further analysis: partial correlations controlling for confounders.',
                'Remember: correlation does not imply causation.'
            ]
            : hasSignificant
                ? [
                    'Some significant correlations found, but strengths are moderate to weak.',
                    'These relationships may be useful in combination with other predictors.',
                    'Consider increasing sample size for more precise estimates.',
                    'Explore non-linear relationships if linear correlations are weak.',
                    'Report confidence intervals alongside point estimates.'
                ]
                : [
                    'No significant correlations found — variables appear independent.',
                    'Consider whether the sample size is adequate to detect effects.',
                    'Explore non-linear relationships (Spearman or polynomial).',
                    'Check for outliers that may mask true relationships.',
                    'These variables may measure distinct constructs.'
                ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: hasSignificant ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 7. About Correlation Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Correlation Analysis`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            `${getMethodLabel(correlationMethod)} correlation measures the ${correlationMethod === 'pearson' ? 'linear' : correlationMethod === 'spearman' ? 'monotonic' : 'ordinal'} association between two variables.`,
            'Correlation coefficient (r) ranges from -1 (perfect negative) to +1 (perfect positive).',
            'r² (coefficient of determination) represents the proportion of shared variance.',
            'Statistical significance indicates whether r differs from zero in the population.',
            'Correlation does not imply causation — third variables may explain relationships.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Correlation Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Correlation_Analysis_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
