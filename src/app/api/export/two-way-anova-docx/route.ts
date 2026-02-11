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
    return p.toFixed(4).replace(/^0/, '');
};

const getEffectSizeLabel = (eta: number): string => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
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
        const { results, dependentVar, factorA, factorB, plot } = await request.json();

        const anovaTable = results.anova_table || [];
        const marginalMeans = results.marginal_means || {};
        const assumptions = results.assumptions || {};
        const posthocResults = results.posthoc_results || [];
        const simpleMainEffects = results.simple_main_effects || [];
        const interpretation = results.interpretation || '';
        
        // Find rows
        const interactionRow = anovaTable.find((row: any) => row.Source?.includes('*'));
        const residualsRow = anovaTable.find((row: any) => row.Source?.includes('Residual'));
        const factorARow = anovaTable.find((row: any) => !row.Source?.includes('*') && !row.Source?.includes('Residual'));
        const factorBRow = anovaTable.find((row: any) => !row.Source?.includes('*') && !row.Source?.includes('Residual') && row !== factorARow);
        
        const isInteractionSignificant = interactionRow && interactionRow['p-value'] <= 0.05;
        const isFactorASignificant = factorARow && factorARow['p-value'] <= 0.05;
        const isFactorBSignificant = factorBRow && factorBRow['p-value'] <= 0.05;
        
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
            children: [new TextRun({ text: 'Two-Way ANOVA', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Factorial Analysis of Variance', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `DV: ${dependentVar} | Factor A: ${factorA} | Factor B: ${factorB}`, size: 22, font: 'Arial', color: COLORS.gray })]
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

        // Interaction status
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: isInteractionSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isInteractionSignificant ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isInteractionSignificant 
                        ? 'Significant Interaction Effect Detected'
                        : 'No Significant Interaction Effect',
                    bold: true, size: 24, font: 'Arial',
                    color: isInteractionSignificant ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        if (interactionRow) {
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Interaction (${factorA} × ${factorB}): `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `F = ${interactionRow.F?.toFixed(2)}, p ${formatPValue(interactionRow['p-value'])}, η²p = ${interactionRow['η²p']?.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
                ]
            }));
        }

        if (factorARow) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Main Effect (${factorA}): `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `F = ${factorARow.F?.toFixed(2)}, p ${formatPValue(factorARow['p-value'])}`, bold: true, size: 22, font: 'Arial', color: isFactorASignificant ? COLORS.success : COLORS.danger }),
                    new TextRun({ text: isFactorASignificant ? ' (Significant)' : ' (Not Significant)', size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        if (factorBRow) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Main Effect (${factorB}): `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `F = ${factorBRow.F?.toFixed(2)}, p ${formatPValue(factorBRow['p-value'])}`, bold: true, size: 22, font: 'Arial', color: isFactorBSignificant ? COLORS.success : COLORS.danger }),
                    new TextRun({ text: isFactorBSignificant ? ' (Significant)' : ' (Not Significant)', size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A two-way analysis of variance was conducted to examine the effects of ${factorA} and ${factorB} on ${dependentVar}. `;
        
        if (interactionRow) {
            apaText += `The interaction effect between ${factorA} and ${factorB} was ${isInteractionSignificant ? '' : 'not '}statistically significant, `;
            apaText += `F(${interactionRow.df}, ${residualsRow?.df || '?'}) = ${interactionRow.F?.toFixed(2)}, p ${formatPValue(interactionRow['p-value'])}, η²p = ${interactionRow['η²p']?.toFixed(3)}. `;
        }
        
        if (factorARow) {
            apaText += `The main effect of ${factorA} was ${isFactorASignificant ? '' : 'not '}significant, `;
            apaText += `F(${factorARow.df}, ${residualsRow?.df || '?'}) = ${factorARow.F?.toFixed(2)}, p ${formatPValue(factorARow['p-value'])}. `;
        }
        
        if (factorBRow) {
            apaText += `The main effect of ${factorB} was ${isFactorBSignificant ? '' : 'not '}significant, `;
            apaText += `F(${factorBRow.df}, ${residualsRow?.df || '?'}) = ${factorBRow.F?.toFixed(2)}, p ${formatPValue(factorBRow['p-value'])}.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. ANOVA Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. ANOVA Table', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const anovaRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Source', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('SS', true, 1500),
                    createTableCell('df', true, 1000),
                    createTableCell('MS', true, 1500),
                    createTableCell('F', true, 1200),
                    createTableCell('p-value', true, 1300),
                    createTableCell('η²p', true, 1000)
                ]
            })
        ];

        anovaTable.forEach((row: any) => {
            const isResidual = row.Source?.includes('Residual');
            const pValue = row['p-value'];
            const stars = pValue !== null && pValue !== undefined ? getSignificanceStars(pValue) : '';
            
            anovaRows.push(new TableRow({
                children: [
                    createTableCell(row.Source || '', false, 2500, { align: AlignmentType.LEFT, bold: !isResidual }),
                    createTableCell(row.sum_sq?.toFixed(3) || '', false, 1500),
                    createTableCell(String(row.df || ''), false, 1000),
                    createTableCell(row.MS?.toFixed(3) || '', false, 1500),
                    createTableCell(row.F?.toFixed(3) || '', false, 1200),
                    createTableCell(pValue !== null && pValue !== undefined ? `${formatPValue(pValue)}${stars}` : '', false, 1300, { 
                        color: pValue <= 0.05 ? COLORS.success : undefined,
                        highlight: pValue <= 0.05
                    }),
                    createTableCell(row['η²p']?.toFixed(3) || '', false, 1000)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2500, 1500, 1000, 1500, 1200, 1300, 1000], rows: anovaRows }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [new TextRun({ 
                text: 'Note: *** p < .001, ** p < .01, * p < .05', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Effect size labels for each range
        const effectSizeRanges = [
            { range: 'η²p < 0.01', label: 'Negligible' },
            { range: '0.01 ≤ η²p < 0.06', label: 'Small' },
            { range: '0.06 ≤ η²p < 0.14', label: 'Medium' },
            { range: 'η²p ≥ 0.14', label: 'Large' }
        ];

        // Determine which row to highlight based on interaction effect size
        let highlightLabel = '';
        let highlightText = '';
        if (interactionRow) {
            const eta = interactionRow['η²p'] || 0;
            highlightLabel = getEffectSizeLabel(eta);
            highlightText = `Interaction: η²p = ${eta.toFixed(3)}`;
        }

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('η²p Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Results', true, 3000)
                ]
            })
        ];

        effectSizeRanges.forEach(({ range, label }) => {
            const isHighlighted = label === highlightLabel;
            effectRows.push(new TableRow({
                children: [
                    createTableCell(range, false, 3000),
                    createTableCell(label, false, 3000),
                    createTableCell(isHighlighted ? highlightText : '', false, 3000, { 
                        color: isHighlighted ? COLORS.primary : undefined, 
                        bold: isHighlighted 
                    })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // 4. Marginal Means
        if (marginalMeans.factor_a || marginalMeans.factor_b) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Marginal Means', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            // Factor A
            if (marginalMeans.factor_a && marginalMeans.factor_a.length > 0) {
                children.push(new Paragraph({
                    spacing: { before: 200, after: 150 },
                    children: [new TextRun({ text: `${factorA}`, bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
                }));

                const factorARows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Level', true, 2500, { align: AlignmentType.LEFT }),
                            createTableCell('Mean', true, 2000),
                            createTableCell('95% CI Lower', true, 2000),
                            createTableCell('95% CI Upper', true, 2000),
                            createTableCell('SE', true, 1500)
                        ]
                    })
                ];

                marginalMeans.factor_a.forEach((row: any) => {
                    factorARows.push(new TableRow({
                        children: [
                            createTableCell(String(row.group || ''), false, 2500, { align: AlignmentType.LEFT }),
                            createTableCell(row.mean?.toFixed(3) || '', false, 2000),
                            createTableCell(row.lower?.toFixed(3) || '', false, 2000),
                            createTableCell(row.upper?.toFixed(3) || '', false, 2000),
                            createTableCell(row.sem?.toFixed(3) || '', false, 1500)
                        ]
                    }));
                });

                children.push(new Table({ columnWidths: [2500, 2000, 2000, 2000, 1500], rows: factorARows }));
            }

            // Factor B
            if (marginalMeans.factor_b && marginalMeans.factor_b.length > 0) {
                children.push(new Paragraph({
                    spacing: { before: 300, after: 150 },
                    children: [new TextRun({ text: `${factorB}`, bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
                }));

                const factorBRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Level', true, 2500, { align: AlignmentType.LEFT }),
                            createTableCell('Mean', true, 2000),
                            createTableCell('95% CI Lower', true, 2000),
                            createTableCell('95% CI Upper', true, 2000),
                            createTableCell('SE', true, 1500)
                        ]
                    })
                ];

                marginalMeans.factor_b.forEach((row: any) => {
                    factorBRows.push(new TableRow({
                        children: [
                            createTableCell(String(row.group || ''), false, 2500, { align: AlignmentType.LEFT }),
                            createTableCell(row.mean?.toFixed(3) || '', false, 2000),
                            createTableCell(row.lower?.toFixed(3) || '', false, 2000),
                            createTableCell(row.upper?.toFixed(3) || '', false, 2000),
                            createTableCell(row.sem?.toFixed(3) || '', false, 1500)
                        ]
                    }));
                });

                children.push(new Table({ columnWidths: [2500, 2000, 2000, 2000, 1500], rows: factorBRows }));
            }
        }

        // 5. Simple Main Effects (if interaction is significant)
        if (simpleMainEffects && simpleMainEffects.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Simple Main Effects', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const smeRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Effect', true, 3500, { align: AlignmentType.LEFT }),
                        createTableCell('F', true, 1500),
                        createTableCell('p-value', true, 1500),
                        createTableCell('η²', true, 1500),
                        createTableCell('Significant', true, 1500)
                    ]
                })
            ];

            simpleMainEffects.forEach((effect: any) => {
                smeRows.push(new TableRow({
                    children: [
                        createTableCell(effect.effect || '', false, 3500, { align: AlignmentType.LEFT }),
                        createTableCell(effect.f_statistic?.toFixed(3) || '', false, 1500),
                        createTableCell(formatPValue(effect.p_value || 0), false, 1500, { 
                            color: effect.significant ? COLORS.success : undefined 
                        }),
                        createTableCell(effect.eta_squared?.toFixed(3) || '', false, 1500),
                        createTableCell(effect.significant ? 'Yes' : 'No', false, 1500, { 
                            color: effect.significant ? COLORS.success : COLORS.gray 
                        })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [3500, 1500, 1500, 1500, 1500], rows: smeRows }));
        }

        // 6. Assumption Tests
        const sectionNum = simpleMainEffects && simpleMainEffects.length > 0 ? 6 : 5;
        
        if (assumptions.normality || assumptions.homogeneity) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${sectionNum}. Assumption Tests`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            // Homogeneity
            if (assumptions.homogeneity) {
                children.push(new Paragraph({
                    spacing: { before: 200, after: 150 },
                    children: [new TextRun({ text: "Levene's Test for Homogeneity of Variance", bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
                }));

                const homogeneity = assumptions.homogeneity;
                const homogRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell('Test', true, 3000, { align: AlignmentType.LEFT }),
                            createTableCell('F', true, 2000),
                            createTableCell('p-value', true, 2000),
                            createTableCell('Assumption Met', true, 2000)
                        ]
                    }),
                    new TableRow({
                        children: [
                            createTableCell("Levene's Test", false, 3000, { align: AlignmentType.LEFT }),
                            createTableCell(homogeneity.f_statistic?.toFixed(4) || '', false, 2000),
                            createTableCell(formatPValue(homogeneity.p_value || 0), false, 2000),
                            createTableCell(homogeneity.assumption_met ? '✓ Yes' : '✗ No', false, 2000, { 
                                color: homogeneity.assumption_met ? COLORS.success : COLORS.danger 
                            })
                        ]
                    })
                ];

                children.push(new Table({ columnWidths: [3000, 2000, 2000, 2000], rows: homogRows }));

                children.push(new Paragraph({
                    spacing: { before: 100, after: 200 },
                    children: [new TextRun({ 
                        text: 'Note: p > .05 indicates equal variances assumption is met.', 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 7. Visualization
        if (plot) {
            const vizSectionNum = sectionNum + (assumptions.normality || assumptions.homogeneity ? 1 : 0);
            
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${vizSectionNum}. Visualization`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
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

        // 8. Recommendations
        const recSectionNum = (plot ? 1 : 0) + sectionNum + (assumptions.normality || assumptions.homogeneity ? 1 : 0);
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isInteractionSignificant
            ? [
                'Significant interaction effect detected — interpret main effects with caution.',
                'Focus on simple main effects to understand the nature of the interaction.',
                'The effect of one factor depends on the level of the other factor.',
                'Examine interaction plot to visualize the pattern.',
                'Report both interaction and simple main effects.'
            ]
            : [
                'No significant interaction — main effects can be interpreted independently.',
                isFactorASignificant ? `${factorA} has a significant main effect on ${dependentVar}.` : `${factorA} does not significantly affect ${dependentVar}.`,
                isFactorBSignificant ? `${factorB} has a significant main effect on ${dependentVar}.` : `${factorB} does not significantly affect ${dependentVar}.`,
                'Consider effect sizes when evaluating practical significance.',
                'Post-hoc tests can identify specific group differences.'
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

        // 9. About Two-Way ANOVA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Two-Way ANOVA`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Tests effects of two categorical factors on a continuous dependent variable.',
            'Examines main effects of each factor and their interaction.',
            'Interaction effect: whether the effect of one factor depends on the other.',
            'Assumes normality, homogeneity of variance, and independence.',
            'Partial eta-squared (η²p) measures effect size for each effect.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Two-Way ANOVA Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Two_Way_ANOVA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
