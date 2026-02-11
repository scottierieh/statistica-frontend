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
    if (r2 >= 0.75) return 'Excellent';
    if (r2 >= 0.50) return 'Good';
    if (r2 >= 0.25) return 'Moderate';
    return 'Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, xCol, yCol, mNorm, sampleSize } = await request.json();

        const olsResults = results.ols || {};
        const rlmResults = results.rlm || {};
        
        const olsParams = olsResults.params || [0, 0];
        const olsBse = olsResults.bse || [0, 0];
        const olsR2 = olsResults.r_squared || 0;
        
        const rlmParams = rlmResults.params || [0, 0];
        const rlmBse = rlmResults.bse || [0, 0];
        const rlmPseudoR2 = rlmResults.pseudo_r_squared || 0;
        
        const interceptDiff = Math.abs(olsParams[0] - rlmParams[0]);
        const slopeDiff = Math.abs(olsParams[1] - rlmParams[1]);
        const hasOutlierImpact = slopeDiff > 0.1;
        
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
            children: [new TextRun({ text: 'Robust Regression Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Model: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${yCol} ~ ${xCol}`, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `M-estimator: ${mNorm} | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: hasOutlierImpact ? '△ ' : '✓ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: hasOutlierImpact ? COLORS.warning : COLORS.success 
                }),
                new TextRun({ 
                    text: hasOutlierImpact 
                        ? 'Outliers Detected: OLS and Robust Results Differ'
                        : 'Minimal Outlier Impact: OLS and Robust Results Are Similar',
                    bold: true, size: 24, font: 'Arial',
                    color: hasOutlierImpact ? COLORS.warning : COLORS.success
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `OLS R²: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${olsR2.toFixed(4)} (${getR2Label(olsR2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Robust Pseudo R²: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${rlmPseudoR2.toFixed(4)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Slope Coefficient Difference: `, size: 22, font: 'Arial' }),
                new TextRun({ text: slopeDiff.toFixed(4), bold: true, size: 22, font: 'Arial', color: hasOutlierImpact ? COLORS.warning : COLORS.success }),
                new TextRun({ text: hasOutlierImpact ? ' (significant difference)' : ' (minimal difference)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Robust Method: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${mNorm} M-estimator`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A robust regression analysis was conducted to examine the relationship between ${xCol} and ${yCol}, comparing Ordinary Least Squares (OLS) with Robust Linear Model (RLM) using the ${mNorm} M-estimator. `;
        apaText += `The sample consisted of N = ${sampleSize} observations. `;
        apaText += `OLS regression yielded b = ${olsParams[1].toFixed(3)}, SE = ${olsBse[1].toFixed(3)}, R² = ${olsR2.toFixed(3)}. `;
        apaText += `Robust regression yielded b = ${rlmParams[1].toFixed(3)}, SE = ${rlmBse[1].toFixed(3)}, pseudo-R² = ${rlmPseudoR2.toFixed(3)}. `;
        apaText += hasOutlierImpact 
            ? `The coefficient difference of ${slopeDiff.toFixed(3)} suggests that outliers or influential observations substantially affect the OLS estimates; the robust estimates should be preferred.`
            : `The coefficient difference of ${slopeDiff.toFixed(3)} indicates minimal impact from outliers; OLS estimates are likely reliable.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Coefficient Comparison
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Coefficient Comparison', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const compRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('OLS', true, 2000),
                    createTableCell('RLM', true, 2000),
                    createTableCell('Difference', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Intercept', false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(olsParams[0].toFixed(4), false, 2000),
                    createTableCell(rlmParams[0].toFixed(4), false, 2000),
                    createTableCell(interceptDiff.toFixed(4), false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(`${xCol} (Slope)`, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(olsParams[1].toFixed(4), false, 2000),
                    createTableCell(rlmParams[1].toFixed(4), false, 2000),
                    createTableCell(slopeDiff.toFixed(4), false, 2000, { color: hasOutlierImpact ? COLORS.warning : COLORS.success, bold: true })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2000, 2000, 2000], rows: compRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: hasOutlierImpact 
                    ? 'Note: Large coefficient differences suggest outliers are affecting OLS estimates. Consider using robust estimates.'
                    : 'Note: Similar coefficients indicate minimal outlier impact. OLS estimates are likely reliable.',
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. OLS Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. OLS Regression Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const olsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Coefficient', true, 2500),
                    createTableCell('Std. Error', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Intercept', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(olsParams[0].toFixed(4), false, 2500),
                    createTableCell(olsBse[0].toFixed(4), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(xCol, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(olsParams[1].toFixed(4), false, 2500),
                    createTableCell(olsBse[1].toFixed(4), false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 2500], rows: olsRows }));

        children.push(new Paragraph({
            spacing: { before: 150 },
            children: [
                new TextRun({ text: 'R-squared: ', bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: `${olsR2.toFixed(4)} (${getR2Label(olsR2)})`, size: 22, font: 'Arial' })
            ]
        }));

        // 4. Robust Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `4. Robust Regression Results (${mNorm})`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const rlmRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Coefficient', true, 2500),
                    createTableCell('Std. Error', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Intercept', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(rlmParams[0].toFixed(4), false, 2500),
                    createTableCell(rlmBse[0].toFixed(4), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(xCol, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(rlmParams[1].toFixed(4), false, 2500),
                    createTableCell(rlmBse[1].toFixed(4), false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 2500], rows: rlmRows }));

        children.push(new Paragraph({
            spacing: { before: 150 },
            children: [
                new TextRun({ text: 'Pseudo R-squared: ', bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: rlmPseudoR2.toFixed(4), size: 22, font: 'Arial' })
            ]
        }));

        // 5. Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Coefficient Difference', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.05', false, 3000),
                    createTableCell('Minimal outlier impact', false, 3000),
                    createTableCell(slopeDiff < 0.05 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.05 - 0.10', false, 3000),
                    createTableCell('Moderate outlier impact', false, 3000),
                    createTableCell(slopeDiff >= 0.05 && slopeDiff < 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.20', false, 3000),
                    createTableCell('Substantial outlier impact', false, 3000),
                    createTableCell(slopeDiff >= 0.10 && slopeDiff < 0.20 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.20', false, 3000),
                    createTableCell('Severe outlier impact', false, 3000),
                    createTableCell(slopeDiff >= 0.20 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: guideRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = hasOutlierImpact
            ? [
                'Use robust regression estimates for inference and reporting.',
                'Investigate identified outliers for data entry errors or valid extreme values.',
                'Consider reporting both OLS and robust results for transparency.',
                'If outliers are valid, explain why robust estimates better represent the relationship.',
                'Document the M-estimator method used for reproducibility.'
            ]
            : [
                'OLS estimates are likely reliable as outlier impact is minimal.',
                'Both OLS and robust methods yield similar conclusions.',
                'Standard OLS inference can be used with confidence.',
                'The relationship between variables appears robust to extreme values.',
                'Consider robust regression as a sensitivity check for future analyses.'
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

        // 7. About Robust Regression
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. About Robust Regression', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Robust regression downweights influential observations automatically.',
            'M-estimators minimize a robust loss function instead of squared errors.',
            `${mNorm}: ` + (mNorm === 'HuberT' ? 'Combines squared loss near center with linear loss in tails.' : mNorm === 'TukeyBiweight' ? 'Completely ignores observations beyond a threshold.' : 'Alternative robust weighting scheme.'),
            'Pseudo R² indicates fit but is not directly comparable to OLS R².',
            'Large OLS-RLM differences indicate outliers are affecting standard estimates.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Robust Regression Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Robust_Regression_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
