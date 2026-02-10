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

const getR2Label = (r2: number): string => {
    if (r2 >= 75) return 'Excellent';
    if (r2 >= 50) return 'Good';
    if (r2 >= 25) return 'Moderate';
    return 'Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, independentVars, sampleSize } = await request.json();

        const importanceResults = results || [];
        const ivList = Array.isArray(independentVars) ? independentVars : [];
        
        const totalVariance = importanceResults.reduce((sum: number, r: any) => sum + (r.relative_weight_pct || 0), 0);
        const topPredictor = importanceResults[0];
        const hasGoodFit = totalVariance >= 50;
        
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
            children: [new TextRun({ text: 'Relative Importance Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Dependent Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dependentVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${ivList.length} Predictors | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: hasGoodFit ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: hasGoodFit ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: hasGoodFit 
                        ? 'Strong Model with Clear Predictor Hierarchy'
                        : 'Moderate Model — Consider Additional Predictors',
                    bold: true, size: 24, font: 'Arial',
                    color: hasGoodFit ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Top Predictor: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${topPredictor?.predictor} (${topPredictor?.relative_weight_pct?.toFixed(1)}%)`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Total R² Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalVariance.toFixed(1)}% (${getR2Label(totalVariance)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Number of Predictors: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${importanceResults.length}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        const avgImportance = totalVariance / importanceResults.length;
        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Average Importance: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${avgImportance.toFixed(1)}% per predictor`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A relative importance analysis was conducted to determine the unique contribution of ${importanceResults.length} predictors to the variance in ${dependentVar}. `;
        apaText += `The sample included N = ${sampleSize} observations. `;
        apaText += `Using relative weight analysis (Johnson, 2000), the full model explained R² = ${(totalVariance / 100).toFixed(3)} (${totalVariance.toFixed(1)}%) of the variance in ${dependentVar}. `;
        apaText += `The most important predictor was ${topPredictor?.predictor}, accounting for ${topPredictor?.relative_weight_pct?.toFixed(1)}% of the explained variance `;
        apaText += `(relative weight = ${((topPredictor?.relative_weight_pct || 0) / 100).toFixed(4)}, standardized β = ${topPredictor?.standardized_beta?.toFixed(3) || 'N/A'}). `;
        
        if (importanceResults.length > 1) {
            const second = importanceResults[1];
            apaText += `The second most important predictor was ${second?.predictor} (${second?.relative_weight_pct?.toFixed(1)}%).`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Importance Rankings
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Importance Rankings', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const rankRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Rank', true, 1000),
                    createTableCell('Predictor', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Relative Weight', true, 2000),
                    createTableCell('Std. Beta', true, 1500),
                    createTableCell('Semi-Partial R²', true, 2000)
                ]
            })
        ];

        importanceResults.forEach((r: any, idx: number) => {
            rankRows.push(new TableRow({
                children: [
                    createTableCell(`#${idx + 1}`, false, 1000, { bold: idx === 0, color: idx === 0 ? COLORS.primary : undefined }),
                    createTableCell(r.predictor?.length > 20 ? r.predictor.substring(0, 20) + '...' : r.predictor, false, 2500, { align: AlignmentType.LEFT, bold: idx === 0 }),
                    createTableCell(`${r.relative_weight_pct?.toFixed(1)}%`, false, 2000, { bold: true, highlight: idx === 0 }),
                    createTableCell(r.standardized_beta?.toFixed(3) || '—', false, 1500),
                    createTableCell(r.semi_partial_r2?.toFixed(4) || '—', false, 2000)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [1000, 2500, 2000, 1500, 2000], rows: rankRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Relative weights sum to total R² and provide unbiased importance estimates even with multicollinearity.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. R² Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. R² Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const r2Rows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('R² Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 25%', false, 3000),
                    createTableCell('Weak', false, 3000),
                    createTableCell(totalVariance < 25 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('25% - 49%', false, 3000),
                    createTableCell('Moderate', false, 3000),
                    createTableCell(totalVariance >= 25 && totalVariance < 50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('50% - 74%', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(totalVariance >= 50 && totalVariance < 75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 75%', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(totalVariance >= 75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: r2Rows }));

        // 4. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = hasGoodFit
            ? [
                `Focus on ${topPredictor?.predictor} for maximum impact on ${dependentVar}.`,
                'The relative weights provide a clear hierarchy for resource allocation.',
                'Consider the practical significance of each predictor, not just statistical importance.',
                'Use these rankings to prioritize interventions or further research.',
                'The model explains substantial variance — findings are likely actionable.'
            ]
            : [
                `${topPredictor?.predictor} is the most important predictor but overall R² is limited.`,
                'Consider adding more predictors to capture additional variance.',
                'The unexplained variance suggests other factors influence the outcome.',
                'Focus on top-ranked predictors while exploring additional variables.',
                'Validate findings with domain expertise before major decisions.'
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

        // 5. About Relative Importance
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. About Relative Importance Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Decomposes total R² into additive contributions from each predictor.',
            'Unlike standardized betas, relative weights handle multicollinearity appropriately.',
            'Based on Johnson\'s (2000) relative weight method.',
            'Weights always sum exactly to the total model R².',
            'Provides unbiased importance rankings regardless of predictor correlations.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Relative Importance Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Relative_Importance_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


