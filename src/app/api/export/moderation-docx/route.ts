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

const getEffectSizeLabel = (deltaR2: number): string => {
    if (deltaR2 >= 0.1) return 'Large';
    if (deltaR2 >= 0.05) return 'Medium';
    if (deltaR2 >= 0.02) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, xVar, mVar, yVar, sampleSize } = await request.json();

        const rSquaredChange = results.r_squared_change || {};
        const simpleSlopes = results.simple_slopes || [];
        
        const deltaR2 = rSquaredChange.delta_r2 || 0;
        const fChange = rSquaredChange.f_change || 0;
        const pChange = rSquaredChange.p_change || 1;
        
        const isSignificant = pChange < 0.05;
        const sigSlopes = simpleSlopes.filter((s: any) => s.p_value < 0.05).length;
        
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
            children: [new TextRun({ text: 'Moderation Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${xVar} × ${mVar} → ${yVar}`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} | Hierarchical Regression with Interaction`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isSignificant ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isSignificant ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isSignificant ? 'Significant Moderation Effect' : 'No Significant Moderation',
                    bold: true, size: 24, font: 'Arial',
                    color: isSignificant ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Interaction Effect: `, size: 22, font: 'Arial' }),
                new TextRun({ text: isSignificant ? 'Significant' : 'Not Significant', bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (p ${pChange < 0.001 ? '< .001' : `= ${pChange.toFixed(3)}`})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `R² Change (ΔR²): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(deltaR2 * 100).toFixed(2)}%`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getEffectSizeLabel(deltaR2)} effect)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `F-Change: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${fChange.toFixed(2)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Significant Simple Slopes: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${sigSlopes}/${simpleSlopes.length}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ' at different moderator levels', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A moderation analysis was conducted to examine whether ${mVar} moderates the relationship between ${xVar} and ${yVar} (N = ${sampleSize}). `;
        apaText += `Hierarchical multiple regression was used, with ${xVar} and ${mVar} entered in Step 1 (main effects) and the ${xVar} × ${mVar} interaction term entered in Step 2. `;
        apaText += `The interaction effect was ${isSignificant ? 'statistically significant' : 'not statistically significant'}, `;
        apaText += `ΔR² = ${deltaR2.toFixed(3)}, F(1, ${sampleSize - 4}) = ${fChange.toFixed(2)}, p ${pChange < 0.001 ? '< .001' : `= ${pChange.toFixed(3)}`}. `;
        
        if (isSignificant) {
            apaText += `This indicates that the relationship between ${xVar} and ${yVar} varies depending on the level of ${mVar}. `;
            apaText += `Simple slopes analysis revealed `;
            
            if (sigSlopes === simpleSlopes.length) {
                apaText += `significant effects at all levels of the moderator.`;
            } else if (sigSlopes === 0) {
                apaText += `no significant simple slopes despite the significant interaction.`;
            } else {
                apaText += `significant effects at ${sigSlopes} of ${simpleSlopes.length} moderator levels.`;
            }
        } else {
            apaText += `This indicates that ${mVar} does not significantly moderate the ${xVar}-${yVar} relationship.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Model Comparison
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Model Comparison', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const modelRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Model', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('ΔR²', true, 2000),
                    createTableCell('F-Change', true, 2000),
                    createTableCell('p-value', true, 1500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Step 1: Main Effects (X + M)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('—', false, 2000),
                    createTableCell('—', false, 2000),
                    createTableCell('—', false, 1500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Step 2: + Interaction (X × M)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(deltaR2.toFixed(4), false, 2000, { highlight: true }),
                    createTableCell(fChange.toFixed(3), false, 2000),
                    createTableCell(pChange < 0.001 ? '< .001' : pChange.toFixed(4), false, 1500, { color: isSignificant ? COLORS.success : COLORS.danger })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2000, 2000, 1500], rows: modelRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: ΔR² represents the additional variance explained by adding the interaction term.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Simple Slopes Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Simple Slopes Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const slopeRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Moderator Level', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Slope', true, 2000),
                    createTableCell('p-value', true, 2000),
                    createTableCell('Significant', true, 1500)
                ]
            })
        ];

        simpleSlopes.forEach((slope: any) => {
            const isSig = slope.p_value < 0.05;
            slopeRows.push(new TableRow({
                children: [
                    createTableCell(slope.label, false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(slope.slope.toFixed(4), false, 2000),
                    createTableCell(slope.p_value < 0.001 ? '< .001' : slope.p_value.toFixed(4), false, 2000),
                    createTableCell(isSig ? '✓ Yes' : '✗ No', false, 1500, { bold: true, color: isSig ? COLORS.success : COLORS.danger })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3500, 2000, 2000, 1500], rows: slopeRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Simple slopes show the effect of X on Y at different levels of the moderator (typically -1SD, Mean, +1SD).', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Effect Size Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Effect Size Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectGuideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('ΔR²', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 10%', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(deltaR2 >= 0.1 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('5% - 9%', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(deltaR2 >= 0.05 && deltaR2 < 0.1 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('2% - 4%', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(deltaR2 >= 0.02 && deltaR2 < 0.05 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 2%', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(deltaR2 < 0.02 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectGuideRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant
            ? [
                `Significant moderation: The ${xVar}→${yVar} relationship depends on ${mVar}.`,
                'Report both the interaction effect and simple slopes analysis.',
                'Include the interaction plot in publications and presentations.',
                'Consider the practical implications of different slopes at different moderator levels.',
                'Test for higher-order interactions if theoretically justified.'
            ]
            : [
                `No significant moderation: The ${xVar}→${yVar} relationship is consistent across ${mVar} levels.`,
                'Focus on reporting the main effects instead.',
                `Check statistical power — N = ${sampleSize} may be insufficient for detecting small effects.`,
                'Consider alternative moderators suggested by theory.',
                'Report the null finding to inform future research.'
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

        // 6. About Moderation Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Moderation Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Moderation tests whether the X→Y relationship depends on a third variable (M).',
            'Hierarchical regression compares models with and without the interaction term.',
            'A significant interaction means the slope of X on Y varies at different M levels.',
            'Simple slopes decompose the interaction by showing effects at specific M values.',
            'Variables are typically mean-centered before creating the interaction term.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Moderation Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Moderation_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}