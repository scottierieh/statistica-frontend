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

export async function POST(request: NextRequest) {
    try {
        const { results, xVar, mVar, yVar, sampleSize } = await request.json();

        const bk = results.baron_kenny || {};
        const boot = results.bootstrap;
        const mediationType = results.mediation_type || 'Unknown';
        
        const pathA = bk.path_a || {};
        const pathB = bk.path_b || {};
        const pathC = bk.path_c || {};
        const pathCPrime = bk.path_c_prime || {};
        const indirectEffect = bk.indirect_effect || 0;
        const sobelTest = bk.sobel_test || {};
        
        const isFull = mediationType === "Full Mediation";
        const isPartial = mediationType === "Partial Mediation";
        const hasMediation = isFull || isPartial;
        
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
            children: [new TextRun({ text: 'Mediation Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${xVar} → ${mVar} → ${yVar}`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} | Baron & Kenny with Bootstrap`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: hasMediation ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: hasMediation ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: mediationType,
                    bold: true, size: 24, font: 'Arial',
                    color: hasMediation ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Indirect Effect (a × b): `, size: 22, font: 'Arial' }),
                new TextRun({ text: indirectEffect.toFixed(4), bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Direct Effect (c'): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${pathCPrime.coef?.toFixed(4) || '—'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (p ${pathCPrime.p_value < 0.001 ? '< .001' : `= ${pathCPrime.p_value?.toFixed(3)}`})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Total Effect (c): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${pathC.coef?.toFixed(4) || '—'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (p ${pathC.p_value < 0.001 ? '< .001' : `= ${pathC.p_value?.toFixed(3)}`})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (boot) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Bootstrap 95% CI: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `[${boot.ci_lower.toFixed(4)}, ${boot.ci_upper.toFixed(4)}]`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ 
                        text: boot.significant ? ' — Does not include zero' : ' — Includes zero', 
                        size: 22, font: 'Arial', 
                        color: boot.significant ? COLORS.success : COLORS.danger 
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

        let apaText = `A mediation analysis was conducted to examine whether ${mVar} mediates the relationship between ${xVar} and ${yVar} (N = ${sampleSize}). `;
        apaText += `Using Baron and Kenny's (1986) approach with bootstrap confidence intervals (1,000 resamples), `;
        
        if (isFull) {
            apaText += `results indicated full mediation. `;
        } else if (isPartial) {
            apaText += `results indicated partial mediation. `;
        } else {
            apaText += `results did not support mediation. `;
        }
        
        apaText += `The path from ${xVar} to ${mVar} (path a) was ${pathA.p_value < 0.05 ? 'significant' : 'not significant'}, `;
        apaText += `β = ${pathA.coef?.toFixed(3)}, p ${pathA.p_value < 0.001 ? '< .001' : `= ${pathA.p_value?.toFixed(3)}`}. `;
        apaText += `The path from ${mVar} to ${yVar} controlling for ${xVar} (path b) was ${pathB.p_value < 0.05 ? 'significant' : 'not significant'}, `;
        apaText += `β = ${pathB.coef?.toFixed(3)}, p ${pathB.p_value < 0.001 ? '< .001' : `= ${pathB.p_value?.toFixed(3)}`}. `;
        apaText += `The indirect effect (a × b = ${indirectEffect.toFixed(3)}) was ${boot?.significant ? 'significant' : 'not significant'}`;
        
        if (boot) {
            apaText += `, 95% CI [${boot.ci_lower.toFixed(3)}, ${boot.ci_upper.toFixed(3)}].`;
        } else {
            apaText += ` (Sobel z = ${sobelTest.z_stat?.toFixed(2)}, p = ${sobelTest.p_value?.toFixed(3)}).`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Path Coefficients
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Path Coefficients', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const pathRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Path', true, 1500),
                    createTableCell('Description', true, 2500),
                    createTableCell('β', true, 1500),
                    createTableCell('SE', true, 1200),
                    createTableCell('t', true, 1200),
                    createTableCell('p-value', true, 1500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('a', false, 1500, { bold: true }),
                    createTableCell(`${xVar} → ${mVar}`, false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(pathA.coef?.toFixed(4) || '—', false, 1500),
                    createTableCell(pathA.se?.toFixed(4) || '—', false, 1200),
                    createTableCell(pathA.t_stat?.toFixed(2) || '—', false, 1200),
                    createTableCell(pathA.p_value < 0.001 ? '< .001' : pathA.p_value?.toFixed(3) || '—', false, 1500, { color: pathA.p_value < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('b', false, 1500, { bold: true }),
                    createTableCell(`${mVar} → ${yVar}`, false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(pathB.coef?.toFixed(4) || '—', false, 1500),
                    createTableCell(pathB.se?.toFixed(4) || '—', false, 1200),
                    createTableCell(pathB.t_stat?.toFixed(2) || '—', false, 1200),
                    createTableCell(pathB.p_value < 0.001 ? '< .001' : pathB.p_value?.toFixed(3) || '—', false, 1500, { color: pathB.p_value < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("c'", false, 1500, { bold: true }),
                    createTableCell(`${xVar} → ${yVar} (direct)`, false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(pathCPrime.coef?.toFixed(4) || '—', false, 1500),
                    createTableCell(pathCPrime.se?.toFixed(4) || '—', false, 1200),
                    createTableCell(pathCPrime.t_stat?.toFixed(2) || '—', false, 1200),
                    createTableCell(pathCPrime.p_value < 0.001 ? '< .001' : pathCPrime.p_value?.toFixed(3) || '—', false, 1500, { color: pathCPrime.p_value < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('c', false, 1500, { bold: true }),
                    createTableCell(`${xVar} → ${yVar} (total)`, false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(pathC.coef?.toFixed(4) || '—', false, 1500),
                    createTableCell(pathC.se?.toFixed(4) || '—', false, 1200),
                    createTableCell(pathC.t_stat?.toFixed(2) || '—', false, 1200),
                    createTableCell(pathC.p_value < 0.001 ? '< .001' : pathC.p_value?.toFixed(3) || '—', false, 1500, { color: pathC.p_value < 0.05 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('a × b', false, 1500, { bold: true, highlight: true }),
                    createTableCell('Indirect effect', false, 2500, { align: AlignmentType.LEFT, highlight: true }),
                    createTableCell(indirectEffect.toFixed(4), false, 1500, { highlight: true }),
                    createTableCell(boot?.se?.toFixed(4) || sobelTest.se?.toFixed(4) || '—', false, 1200, { highlight: true }),
                    createTableCell(boot ? '—' : (sobelTest.z_stat?.toFixed(2) || '—'), false, 1200, { highlight: true }),
                    createTableCell(boot ? 'Bootstrap' : (sobelTest.p_value < 0.001 ? '< .001' : sobelTest.p_value?.toFixed(3) || '—'), false, 1500, { highlight: true, color: (boot?.significant || sobelTest.p_value < 0.05) ? COLORS.success : COLORS.danger })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [1500, 2500, 1500, 1200, 1200, 1500], rows: pathRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Green p-values indicate significance at α = .05. Standardized coefficients reported.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Bootstrap Results
        if (boot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Bootstrap Confidence Interval', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const bootRows: TableRow[] = [
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
                        createTableCell('Mean Indirect Effect', false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(boot.mean_effect.toFixed(4), false, 2500, { highlight: true }),
                        createTableCell('Average across bootstrap samples', false, 3500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Standard Error', false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(boot.se.toFixed(4), false, 2500),
                        createTableCell('Bootstrap SE', false, 3500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('95% CI Lower', false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(boot.ci_lower.toFixed(4), false, 2500),
                        createTableCell('', false, 3500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('95% CI Upper', false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(boot.ci_upper.toFixed(4), false, 2500),
                        createTableCell('', false, 3500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Significance', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(boot.significant ? 'Yes' : 'No', false, 2500, { bold: true, color: boot.significant ? COLORS.success : COLORS.danger }),
                        createTableCell(boot.significant ? 'CI does not include zero' : 'CI includes zero', false, 3500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Bootstrap Samples', false, 3000, { align: AlignmentType.LEFT }),
                        createTableCell(String(boot.n_bootstrap), false, 2500),
                        createTableCell('Number of resamples', false, 3500)
                    ]
                })
            ];

            children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: bootRows }));
        }

        // 4. Mediation Type Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: boot ? '4. Mediation Interpretation' : '3. Mediation Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const interpretRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Mediation Type', true, 2500),
                    createTableCell('Criteria', true, 4000),
                    createTableCell('Your Result', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Full Mediation', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell("Indirect sig., direct (c') not sig.", false, 4000),
                    createTableCell(isFull ? '← Your result' : '', false, 2500, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Partial Mediation', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell("Both indirect and direct (c') sig.", false, 4000),
                    createTableCell(isPartial ? '← Your result' : '', false, 2500, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('No Mediation', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Indirect effect not significant', false, 4000),
                    createTableCell(!hasMediation ? '← Your result' : '', false, 2500, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 4000, 2500], rows: interpretRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: boot ? '5. Recommendations' : '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isFull
            ? [
                `Full mediation confirmed: ${mVar} fully explains the ${xVar} → ${yVar} relationship.`,
                `Interventions targeting ${mVar} may be most effective.`,
                'Consider testing alternative mediators to confirm theoretical model.',
                'Replicate findings in independent sample.',
                'Report both Baron & Kenny and bootstrap results.'
            ]
            : isPartial
            ? [
                `Partial mediation: ${mVar} partially explains the ${xVar} → ${yVar} relationship.`,
                'Other mechanisms may also be operating — consider additional mediators.',
                `Both direct and indirect effects should be reported.`,
                'Calculate proportion of effect mediated for practical interpretation.',
                'Consider moderated mediation if effects vary across groups.'
            ]
            : [
                `No significant mediation through ${mVar} was found.`,
                'Reconsider the theoretical model.',
                'Test alternative mediators.',
                'Consider moderation instead of mediation.',
                'Check for suppression effects or inconsistent mediation.'
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

        // 6. About Mediation Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: boot ? '6. About Mediation Analysis' : '5. About Mediation Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Mediation tests whether variable M explains how X affects Y.',
            'Path a: X → M; Path b: M → Y; Path c: Total effect; Path c\': Direct effect.',
            'Indirect effect = a × b; represents the mediated pathway.',
            'Bootstrap CI is preferred over Sobel test (no normality assumption).',
            'If 95% CI does not include zero, indirect effect is significant.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Mediation Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Mediation_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

