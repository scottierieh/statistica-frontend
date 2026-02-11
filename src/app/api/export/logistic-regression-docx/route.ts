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

const getSignificanceStars = (p: number): string => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const getAUCLabel = (auc: number): string => {
    if (auc >= 0.9) return 'Excellent';
    if (auc >= 0.8) return 'Good';
    if (auc >= 0.7) return 'Fair';
    if (auc >= 0.6) return 'Poor';
    return 'Fail';
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, independentVars, sampleSize } = await request.json();

        const metrics = results.metrics || {};
        const modelSummary = results.model_summary || {};
        const coefficients = results.coefficients || {};
        const oddsRatios = results.odds_ratios || {};
        const oddsRatiosCi = results.odds_ratios_ci || {};
        const pValues = results.p_values || {};
        const rocData = results.roc_data || {};
        const classificationReport = metrics.classification_report || {};
        const dependentClasses = results.dependent_classes || [];
        
        const accuracy = metrics.accuracy || 0;
        const auc = rocData.auc || 0;
        const pseudoR2 = modelSummary.prsquared || 0;
        const llf = modelSummary.llf || 0;
        const llr = modelSummary.llr || 0;
        const llrPValue = modelSummary.llr_pvalue || 1;
        
        const isModelSignificant = llrPValue < 0.05;
        const predictorList = Array.isArray(independentVars) ? independentVars : [];
        const significantPredictors = Object.entries(pValues).filter(([k, p]) => k !== 'const' && (p as number) < 0.05);
        
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
            children: [new TextRun({ text: 'Logistic Regression Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Outcome: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dependentVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Predictors: ${predictorList.join(', ')}`, size: 22, font: 'Arial', color: COLORS.gray })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} observations`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isModelSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isModelSignificant ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isModelSignificant 
                        ? 'Model is Statistically Significant'
                        : 'Model is Not Statistically Significant',
                    bold: true, size: 24, font: 'Arial',
                    color: isModelSignificant ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Classification Accuracy: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(accuracy * 100).toFixed(1)}%`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `AUC-ROC: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${auc.toFixed(3)} (${getAUCLabel(auc)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `McFadden's Pseudo R²: `, size: 22, font: 'Arial' }),
                new TextRun({ text: pseudoR2.toFixed(4), bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Model Significance (LLR): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `χ² = ${llr.toFixed(2)}, p ${formatPValue(llrPValue)}`, bold: true, size: 22, font: 'Arial', color: isModelSignificant ? COLORS.success : COLORS.danger })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Significant Predictors: `, size: 22, font: 'Arial' }),
                new TextRun({ text: significantPredictors.length > 0 ? `${significantPredictors.length} (${significantPredictors.map(([k]) => k).join(', ')})` : 'None', bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = llrPValue < 0.001 ? '< .001' : `= ${llrPValue.toFixed(3)}`;
        
        let apaText = `A binary logistic regression was performed to examine the effects of ${predictorList.join(', ')} on ${dependentVar}. `;
        apaText += `The analysis included N = ${sampleSize} observations. `;
        apaText += isModelSignificant
            ? `The overall model was statistically significant, χ²(${predictorList.length}) = ${llr.toFixed(2)}, p ${pFormatted}. `
            : `The overall model was not statistically significant, χ²(${predictorList.length}) = ${llr.toFixed(2)}, p ${pFormatted}. `;
        apaText += `The model explained ${(pseudoR2 * 100).toFixed(1)}% of the variance (McFadden's R² = ${pseudoR2.toFixed(3)}) and correctly classified ${(accuracy * 100).toFixed(1)}% of cases. `;
        apaText += `The area under the ROC curve was ${auc.toFixed(3)}, indicating ${getAUCLabel(auc).toLowerCase()} discriminative ability.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Model Performance
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Model Performance', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const perfRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Accuracy', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${(accuracy * 100).toFixed(1)}%`, false, 2500, { highlight: true }),
                    createTableCell(accuracy >= 0.8 ? 'High' : accuracy >= 0.7 ? 'Good' : accuracy >= 0.6 ? 'Moderate' : 'Low', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('AUC-ROC', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(auc.toFixed(4), false, 2500),
                    createTableCell(`${getAUCLabel(auc)} discrimination`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("McFadden's R²", false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(pseudoR2.toFixed(4), false, 2500),
                    createTableCell('Proportion of variance explained', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Log-Likelihood', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(llf.toFixed(2), false, 2500),
                    createTableCell('Model fit measure', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('LLR Chi-Square', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`χ² = ${llr.toFixed(2)}, p ${formatPValue(llrPValue)}`, false, 2500, { color: isModelSignificant ? COLORS.success : COLORS.danger }),
                    createTableCell(isModelSignificant ? 'Model is significant' : 'Model not significant', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: perfRows }));

        // 3. Coefficients & Odds Ratios
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Coefficients & Odds Ratios', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const coeffRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Variable', true, 1800, { align: AlignmentType.LEFT }),
                    createTableCell('B', true, 1200),
                    createTableCell('OR', true, 1200),
                    createTableCell('95% CI', true, 1800),
                    createTableCell('p', true, 1000),
                    createTableCell('Sig.', true, 700)
                ]
            })
        ];

        Object.entries(coefficients).forEach(([varName, coef]) => {
            const b = coef as number;
            const or = oddsRatios[varName] || Math.exp(b);
            const ci = oddsRatiosCi[varName] || { '2.5%': 0, '97.5%': 0 };
            const p = pValues[varName] || 1;
            const isSig = p < 0.05;

            coeffRows.push(new TableRow({
                children: [
                    createTableCell(varName.length > 12 ? varName.substring(0, 12) + '...' : varName, false, 1800, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(b.toFixed(3), false, 1200),
                    createTableCell(or.toFixed(3), false, 1200, { color: or > 1 ? COLORS.success : or < 1 ? COLORS.danger : COLORS.secondary }),
                    createTableCell(`[${ci['2.5%'].toFixed(2)}, ${ci['97.5%'].toFixed(2)}]`, false, 1800),
                    createTableCell(formatPValue(p), false, 1000, { color: isSig ? COLORS.success : COLORS.gray }),
                    createTableCell(getSignificanceStars(p) || 'ns', false, 700, { bold: true, color: isSig ? COLORS.success : COLORS.gray })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [1800, 1200, 1200, 1800, 1000, 700], rows: coeffRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: OR > 1 = increased odds (green), OR < 1 = decreased odds (red). *** p < .001, ** p < .01, * p < .05', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Classification Report
        if (dependentClasses.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Classification Performance by Class', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const classRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Class', true, 2000, { align: AlignmentType.LEFT }),
                        createTableCell('Precision', true, 1800),
                        createTableCell('Recall', true, 1800),
                        createTableCell('F1-Score', true, 1800),
                        createTableCell('Support', true, 1600)
                    ]
                })
            ];

            dependentClasses.forEach((cls: string) => {
                const report = classificationReport[cls];
                if (report) {
                    classRows.push(new TableRow({
                        children: [
                            createTableCell(cls, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                            createTableCell(report.precision.toFixed(3), false, 1800),
                            createTableCell(report.recall.toFixed(3), false, 1800),
                            createTableCell(report['f1-score'].toFixed(3), false, 1800),
                            createTableCell(String(report.support), false, 1600)
                        ]
                    }));
                }
            });

            children.push(new Table({ columnWidths: [2000, 1800, 1800, 1800, 1600], rows: classRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: 'Precision: accuracy of positive predictions | Recall: coverage of actual positives | F1: harmonic mean', 
                    size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 5. AUC Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. AUC Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aucRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('AUC Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.90 - 1.00', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(auc >= 0.90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.80 - 0.89', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(auc >= 0.80 && auc < 0.90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.70 - 0.79', false, 3000),
                    createTableCell('Fair', false, 3000),
                    createTableCell(auc >= 0.70 && auc < 0.80 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.60 - 0.69', false, 3000),
                    createTableCell('Poor', false, 3000),
                    createTableCell(auc >= 0.60 && auc < 0.70 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.60', false, 3000),
                    createTableCell('Fail (no better than chance)', false, 3000),
                    createTableCell(auc < 0.60 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: aucRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isModelSignificant && auc >= 0.7
            ? [
                'Model demonstrates good predictive performance.',
                'Focus on significant predictors for decision-making.',
                'Validate model with holdout sample or cross-validation.',
                'Consider the practical implications of odds ratios.',
                'Monitor model performance over time with new data.'
            ]
            : isModelSignificant
                ? [
                    'Model is significant but classification ability is limited.',
                    'Consider adding more predictors to improve AUC.',
                    'Check for non-linear relationships or interactions.',
                    'Examine class imbalance and consider resampling techniques.',
                    'Validate findings with external dataset.'
                ]
                : [
                    'Model is not statistically significant.',
                    'Current predictors may not effectively predict the outcome.',
                    'Consider different predictor variables.',
                    'Check for sufficient sample size and class balance.',
                    'Explore alternative modeling approaches.'
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

        // 7. About Logistic Regression
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. About Logistic Regression', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Models probability of binary outcomes using the logistic (sigmoid) function.',
            'Coefficients represent change in log-odds per unit increase in predictor.',
            'Odds ratios (exp(B)) indicate multiplicative change in odds.',
            'AUC measures model ability to discriminate between classes.',
            "McFadden's R² indicates proportion of variance explained (0.2-0.4 is good)."
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Logistic Regression Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Logistic_Regression_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


