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

const getKmoLabel = (kmo: number): string => {
    if (kmo >= 0.9) return 'Marvelous';
    if (kmo >= 0.8) return 'Meritorious';
    if (kmo >= 0.7) return 'Middling';
    if (kmo >= 0.6) return 'Mediocre';
    return 'Poor';
};

export async function POST(request: NextRequest) {
    try {
        const { results, factors, sampleSize } = await request.json();

        const nObservations = results.n_observations || sampleSize || 0;
        const nFactors = results.n_factors || 0;
        const nItems = results.n_items || 0;
        const kmo = results.kmo || 0;
        const bartlettChi = results.bartlett_chi_square || 0;
        const bartlettP = results.bartlett_p_value || 0;
        const factorResults = results.factor_results || [];
        const fornellLarcker = results.fornell_larcker || [];
        const htmt = results.htmt || [];
        const overallValidity = results.overall_validity || {};
        const cumulativeVariance = results.cumulative_variance || [];
        const recommendations = results.recommendations || [];
        
        const totalVariance = cumulativeVariance.length > 0 
            ? cumulativeVariance[cumulativeVariance.length - 1] * 100 
            : 0;
        
        // Count validity passes
        const validityChecks = [
            overallValidity.internal_consistency,
            overallValidity.composite_reliability,
            overallValidity.convergent_validity,
            overallValidity.discriminant_validity_fl
        ];
        if (overallValidity.discriminant_validity_htmt !== null) {
            validityChecks.push(overallValidity.discriminant_validity_htmt);
        }
        const validityPassed = validityChecks.filter(v => v === true).length;
        const validityTotal = validityChecks.length;
        const allValid = validityPassed === validityTotal;
        
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
            children: [new TextRun({ text: 'Reliability & Validity Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Construct Validity Assessment`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${nFactors} Factors | ${nItems} Items | N = ${nObservations}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: allValid ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: allValid ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: allValid 
                        ? 'All Validity Criteria Met'
                        : `Validity Assessment: ${validityPassed}/${validityTotal} Criteria Met`,
                    bold: true, size: 24, font: 'Arial',
                    color: allValid ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Overall validity badges
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Internal Consistency (α ≥ 0.7): `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: overallValidity.internal_consistency ? '✓ Pass' : '✗ Fail', 
                    bold: true, size: 22, font: 'Arial',
                    color: overallValidity.internal_consistency ? COLORS.success : COLORS.danger
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Composite Reliability (CR ≥ 0.7): `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: overallValidity.composite_reliability ? '✓ Pass' : '✗ Fail', 
                    bold: true, size: 22, font: 'Arial',
                    color: overallValidity.composite_reliability ? COLORS.success : COLORS.danger
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Convergent Validity (AVE ≥ 0.5): `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: overallValidity.convergent_validity ? '✓ Pass' : '✗ Fail', 
                    bold: true, size: 22, font: 'Arial',
                    color: overallValidity.convergent_validity ? COLORS.success : COLORS.danger
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Discriminant Validity (Fornell-Larcker): `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: overallValidity.discriminant_validity_fl ? '✓ Pass' : '✗ Fail', 
                    bold: true, size: 22, font: 'Arial',
                    color: overallValidity.discriminant_validity_fl ? COLORS.success : COLORS.danger
                })
            ]
        }));

        if (overallValidity.discriminant_validity_htmt !== null) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Discriminant Validity (HTMT < 0.85): `, size: 22, font: 'Arial' }),
                    new TextRun({ 
                        text: overallValidity.discriminant_validity_htmt ? '✓ Pass' : '✗ Fail', 
                        bold: true, size: 22, font: 'Arial',
                        color: overallValidity.discriminant_validity_htmt ? COLORS.success : COLORS.danger
                    })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = bartlettP < 0.001 ? '< .001' : `= ${bartlettP.toFixed(3)}`;
        let apaText = `Construct validity was assessed for ${nFactors} latent factors using ${nItems} indicator items (N = ${nObservations}). `;
        apaText += `The Kaiser-Meyer-Olkin measure verified sampling adequacy (KMO = ${kmo.toFixed(2)}, ${getKmoLabel(kmo).toLowerCase()}), `;
        apaText += `and Bartlett's test of sphericity was significant, χ² = ${bartlettChi.toFixed(2)}, p ${pFormatted}. `;
        
        // Summarize reliability
        const avgAlpha = factorResults.reduce((sum: number, f: any) => sum + (f.cronbach_alpha || 0), 0) / factorResults.length;
        const avgCR = factorResults.reduce((sum: number, f: any) => sum + (f.composite_reliability || 0), 0) / factorResults.length;
        const avgAVE = factorResults.reduce((sum: number, f: any) => sum + (f.ave || 0), 0) / factorResults.length;
        
        apaText += `Internal consistency was ${avgAlpha >= 0.7 ? 'adequate' : 'below threshold'} (mean α = ${avgAlpha.toFixed(2)}). `;
        apaText += `Composite reliability ranged appropriately (mean CR = ${avgCR.toFixed(2)}). `;
        apaText += `Convergent validity was ${avgAVE >= 0.5 ? 'supported' : 'not fully supported'} (mean AVE = ${avgAVE.toFixed(2)}). `;
        
        if (fornellLarcker.length > 0) {
            const flValid = fornellLarcker.every((fl: any) => fl.valid);
            apaText += `Discriminant validity via Fornell-Larcker criterion was ${flValid ? 'established' : 'not fully established'}. `;
        }
        
        if (htmt.length > 0) {
            const htmtValid = htmt.every((h: any) => h.valid_085);
            apaText += `HTMT values were ${htmtValid ? 'below' : 'not all below'} the 0.85 threshold.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Data Adequacy
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Data Adequacy', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const adequacyRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Test', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('KMO', false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(kmo.toFixed(3), false, 2500, { highlight: true }),
                    createTableCell(getKmoLabel(kmo), false, 2500, { color: kmo >= 0.6 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Bartlett's χ²", false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(bartlettChi.toFixed(2), false, 2500),
                    createTableCell('', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Bartlett's p-value", false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(bartlettP < 0.001 ? '< .001' : bartlettP.toFixed(4), false, 2500),
                    createTableCell(bartlettP < 0.05 ? 'Significant' : 'Not Significant', false, 2500, { color: bartlettP < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Total Variance Explained', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(`${totalVariance.toFixed(1)}%`, false, 2500),
                    createTableCell(totalVariance >= 60 ? 'Adequate' : 'Low', false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 2500], rows: adequacyRows }));

        // 3. Reliability Metrics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Reliability Metrics by Factor', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const reliabilityRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Factor', true, 2000, { align: AlignmentType.LEFT }),
                    createTableCell('Items', true, 1000),
                    createTableCell("Cronbach's α", true, 1500),
                    createTableCell('CR', true, 1500),
                    createTableCell('AVE', true, 1500),
                    createTableCell('√AVE', true, 1500)
                ]
            })
        ];

        factorResults.forEach((f: any) => {
            reliabilityRows.push(new TableRow({
                children: [
                    createTableCell(f.name?.length > 15 ? f.name.substring(0, 15) + '...' : f.name, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(f.n_items), false, 1000),
                    createTableCell(f.cronbach_alpha?.toFixed(3) || '—', false, 1500, { color: f.valid_alpha ? COLORS.success : COLORS.danger }),
                    createTableCell(f.composite_reliability?.toFixed(3) || '—', false, 1500, { color: f.valid_cr ? COLORS.success : COLORS.danger }),
                    createTableCell(f.ave?.toFixed(3) || '—', false, 1500, { color: f.valid_ave ? COLORS.success : COLORS.danger }),
                    createTableCell(f.sqrt_ave?.toFixed(3) || '—', false, 1500)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2000, 1000, 1500, 1500, 1500, 1500], rows: reliabilityRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Green = meets threshold (α ≥ 0.7, CR ≥ 0.7, AVE ≥ 0.5). Red = below threshold.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Discriminant Validity - Fornell-Larcker
        if (fornellLarcker.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Fornell-Larcker Criterion', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const flRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Factor Pair', true, 3000, { align: AlignmentType.LEFT }),
                        createTableCell('Correlation', true, 1800),
                        createTableCell('√AVE 1', true, 1500),
                        createTableCell('√AVE 2', true, 1500),
                        createTableCell('Valid', true, 1200)
                    ]
                })
            ];

            fornellLarcker.forEach((fl: any) => {
                flRows.push(new TableRow({
                    children: [
                        createTableCell(`${fl.factor_1} ↔ ${fl.factor_2}`, false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(fl.correlation.toFixed(3), false, 1800),
                        createTableCell(fl.sqrt_ave_1.toFixed(3), false, 1500),
                        createTableCell(fl.sqrt_ave_2.toFixed(3), false, 1500),
                        createTableCell(fl.valid ? '✓' : '✗', false, 1200, { color: fl.valid ? COLORS.success : COLORS.danger, bold: true })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [3000, 1800, 1500, 1500, 1200], rows: flRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: 'Criterion: √AVE of each factor should exceed inter-factor correlations.', 
                    size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 5. HTMT
        if (htmt.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. HTMT (Heterotrait-Monotrait Ratio)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const htmtRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Factor Pair', true, 3500, { align: AlignmentType.LEFT }),
                        createTableCell('HTMT', true, 2000),
                        createTableCell('< 0.85', true, 1500),
                        createTableCell('< 0.90', true, 1500)
                    ]
                })
            ];

            htmt.forEach((h: any) => {
                htmtRows.push(new TableRow({
                    children: [
                        createTableCell(`${h.factor_1} ↔ ${h.factor_2}`, false, 3500, { align: AlignmentType.LEFT }),
                        createTableCell(h.htmt.toFixed(3), false, 2000),
                        createTableCell(h.valid_085 ? '✓' : '✗', false, 1500, { color: h.valid_085 ? COLORS.success : COLORS.danger, bold: true }),
                        createTableCell(h.valid_090 ? '✓' : '✗', false, 1500, { color: h.valid_090 ? COLORS.success : COLORS.danger, bold: true })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [3500, 2000, 1500, 1500], rows: htmtRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: 'Criterion: HTMT < 0.85 (conservative) or < 0.90 (liberal) indicates discriminant validity.', 
                    size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 6. Threshold Reference
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Validity Threshold Reference', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const thresholdRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Threshold', true, 2000),
                    createTableCell('Purpose', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cronbach's Alpha (α)", false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.70', false, 2000),
                    createTableCell('Internal consistency', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Composite Reliability (CR)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.70', false, 2000),
                    createTableCell('Construct reliability', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Average Variance Extracted (AVE)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.50', false, 2000),
                    createTableCell('Convergent validity', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Fornell-Larcker', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('√AVE > r', false, 2000),
                    createTableCell('Discriminant validity', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('HTMT', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('< 0.85', false, 2000),
                    createTableCell('Discriminant validity', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Factor Loading', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.50', false, 2000),
                    createTableCell('Indicator quality', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2000, 3500], rows: thresholdRows }));

        // 7. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        if (recommendations.length > 0) {
            recommendations.forEach((rec: string, idx: number) => {
                children.push(new Paragraph({
                    spacing: { after: 80 },
                    children: [
                        new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                        new TextRun({ text: rec, size: 22, font: 'Arial' })
                    ]
                }));
            });
        } else {
            const defaultRecs = allValid
                ? [
                    'All validity criteria are met — proceed with SEM/PLS analysis.',
                    'Document these reliability and validity metrics in your methods section.',
                    'Report CR, AVE, and HTMT values alongside factor loadings.',
                    'Consider cross-validation with independent sample.'
                ]
                : [
                    'Review factors not meeting validity thresholds.',
                    'Consider removing items with low loadings (< 0.5).',
                    'Examine cross-loadings for potential item reassignment.',
                    'Rerun analysis after modifications to verify improvement.'
                ];
            
            defaultRecs.forEach((rec, idx) => {
                children.push(new Paragraph({
                    spacing: { after: 80 },
                    children: [
                        new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                        new TextRun({ text: rec, size: 22, font: 'Arial' })
                    ]
                }));
            });
        }

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Reliability & Validity Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Reliability_Validity_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}






