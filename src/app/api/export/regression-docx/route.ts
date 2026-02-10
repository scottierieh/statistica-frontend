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

const getR2Label = (r2: number): string => {
    if (r2 >= 0.75) return 'Excellent';
    if (r2 >= 0.50) return 'Good';
    if (r2 >= 0.25) return 'Moderate';
    return 'Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, targetVar, features, modelType, sampleSize, polyDegree } = await request.json();

        const metrics = results.metrics?.all_data || {};
        const diagnostics = results.diagnostics || {};
        const coefficients = diagnostics.coefficient_tests || {};
        const standardizedCoeffs = diagnostics.standardized_coefficients || {};
        const vif = diagnostics.vif || {};
        
        const r2 = metrics.r2 || 0;
        const adjR2 = metrics.adj_r2 || 0;
        const rmse = metrics.rmse || 0;
        const mae = metrics.mae || 0;
        const fStatistic = diagnostics.f_statistic;
        const fPValue = diagnostics.f_pvalue;
        const durbinWatson = diagnostics.durbin_watson;
        
        const isModelSignificant = fPValue !== undefined && fPValue < 0.05;
        const modelLabel = modelType.charAt(0).toUpperCase() + modelType.slice(1);
        const featureList = Array.isArray(features) ? features : [];
        
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
            children: [new TextRun({ text: `${modelLabel} Regression Analysis`, bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Target: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: targetVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Predictors: ${featureList.join(', ')}`, size: 22, font: 'Arial', color: COLORS.gray })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize}${modelType === 'polynomial' && polyDegree ? ` | Degree = ${polyDegree}` : ''}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                new TextRun({ text: `R-squared: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `R² = ${r2.toFixed(4)} (${getR2Label(r2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Variance Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(r2 * 100).toFixed(1)}% of variance in ${targetVar}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        if (modelType !== 'simple') {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Adjusted R-squared: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `Adj. R² = ${adjR2.toFixed(4)}`, bold: true, size: 22, font: 'Arial' })
                ]
            }));
        }

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Prediction Error (RMSE): `, size: 22, font: 'Arial' }),
                new TextRun({ text: rmse.toFixed(4), bold: true, size: 22, font: 'Arial' })
            ]
        }));

        if (fPValue !== undefined) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `Model Significance: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `F = ${fStatistic?.toFixed(2) || 'N/A'}, p ${formatPValue(fPValue)}`, bold: true, size: 22, font: 'Arial', color: isModelSignificant ? COLORS.success : COLORS.danger })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = fPValue !== undefined ? (fPValue < 0.001 ? '< .001' : `= ${fPValue.toFixed(3)}`) : '';
        
        let apaText = `A ${modelLabel.toLowerCase()} regression analysis was conducted to predict ${targetVar} from ${featureList.join(', ')}. `;
        apaText += `The sample consisted of N = ${sampleSize} observations. `;
        
        if (modelType === 'simple' && featureList.length === 1) {
            apaText += isModelSignificant
                ? `${featureList[0]} significantly predicted ${targetVar}, F(1, ${sampleSize - 2}) = ${fStatistic?.toFixed(2) || '—'}, p ${pFormatted}, R² = ${r2.toFixed(2)}. `
                : `${featureList[0]} did not significantly predict ${targetVar}, F(1, ${sampleSize - 2}) = ${fStatistic?.toFixed(2) || '—'}, p ${pFormatted}, R² = ${r2.toFixed(2)}. `;
        } else {
            const dfModel = featureList.length;
            const dfResidual = sampleSize - dfModel - 1;
            apaText += isModelSignificant
                ? `The model was statistically significant, F(${dfModel}, ${dfResidual}) = ${fStatistic?.toFixed(2) || '—'}, p ${pFormatted}, R² = ${r2.toFixed(2)}, Adj. R² = ${adjR2.toFixed(2)}. `
                : `The model was not statistically significant, F(${dfModel}, ${dfResidual}) = ${fStatistic?.toFixed(2) || '—'}, p ${pFormatted}, R² = ${r2.toFixed(2)}, Adj. R² = ${adjR2.toFixed(2)}. `;
        }
        
        apaText += `The model explains ${(r2 * 100).toFixed(1)}% of the variance in ${targetVar}.`;

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
                    createTableCell('R-squared (R²)', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(r2.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(`${getR2Label(r2)} - ${(r2 * 100).toFixed(1)}% variance explained`, false, 3500)
                ]
            })
        ];

        if (modelType !== 'simple') {
            perfRows.push(new TableRow({
                children: [
                    createTableCell('Adjusted R²', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(adjR2.toFixed(4), false, 2500),
                    createTableCell('Penalized for number of predictors', false, 3500)
                ]
            }));
        }

        perfRows.push(
            new TableRow({
                children: [
                    createTableCell('RMSE', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(rmse.toFixed(4), false, 2500),
                    createTableCell('Average prediction error (same units as Y)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MAE', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(mae.toFixed(4), false, 2500),
                    createTableCell('Mean absolute error', false, 3500)
                ]
            })
        );

        if (fStatistic !== undefined && fPValue !== undefined) {
            perfRows.push(new TableRow({
                children: [
                    createTableCell('F-statistic', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`F = ${fStatistic.toFixed(2)}, p ${formatPValue(fPValue)}`, false, 2500, { color: isModelSignificant ? COLORS.success : COLORS.danger }),
                    createTableCell(isModelSignificant ? 'Model is significant' : 'Model not significant', false, 3500)
                ]
            }));
        }

        if (durbinWatson !== undefined) {
            const dwInterpretation = durbinWatson < 1.5 ? 'Positive autocorrelation' : durbinWatson > 2.5 ? 'Negative autocorrelation' : 'No autocorrelation';
            perfRows.push(new TableRow({
                children: [
                    createTableCell('Durbin-Watson', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(durbinWatson.toFixed(3), false, 2500),
                    createTableCell(dwInterpretation, false, 3500)
                ]
            }));
        }

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: perfRows }));

        // 3. Coefficients
        if (coefficients.params && Object.keys(coefficients.params).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Regression Coefficients', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const coeffRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Variable', true, 2000, { align: AlignmentType.LEFT }),
                        createTableCell('B', true, 1500),
                        createTableCell('SE', true, 1500),
                        createTableCell('t', true, 1200),
                        createTableCell('p', true, 1200),
                        createTableCell('Sig.', true, 800)
                    ]
                })
            ];

            Object.entries(coefficients.params).forEach(([varName, coef]) => {
                const b = coef as number;
                const se = coefficients.bse?.[varName] || 0;
                const t = coefficients.tvalues?.[varName] || 0;
                const p = coefficients.pvalues?.[varName] || 1;
                const isSig = p < 0.05;

                coeffRows.push(new TableRow({
                    children: [
                        createTableCell(varName.length > 15 ? varName.substring(0, 15) + '...' : varName, false, 2000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(b.toFixed(4), false, 1500),
                        createTableCell(se.toFixed(4), false, 1500),
                        createTableCell(t.toFixed(3), false, 1200),
                        createTableCell(formatPValue(p), false, 1200, { color: isSig ? COLORS.success : COLORS.gray }),
                        createTableCell(getSignificanceStars(p) || 'ns', false, 800, { bold: true, color: isSig ? COLORS.success : COLORS.gray })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2000, 1500, 1500, 1200, 1200, 800], rows: coeffRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: 'Note: *** p < .001, ** p < .01, * p < .05, ns = not significant', 
                    size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 4. VIF (for multiple regression)
        if (modelType !== 'simple' && Object.keys(vif).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Multicollinearity Check (VIF)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const vifRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Variable', true, 4000, { align: AlignmentType.LEFT }),
                        createTableCell('VIF', true, 2500),
                        createTableCell('Assessment', true, 2500)
                    ]
                })
            ];

            Object.entries(vif).forEach(([varName, vifValue]) => {
                const v = vifValue as number;
                const assessment = v > 10 ? 'Severe multicollinearity' : v > 5 ? 'Moderate multicollinearity' : 'Acceptable';
                const color = v > 10 ? COLORS.danger : v > 5 ? COLORS.warning : COLORS.success;

                vifRows.push(new TableRow({
                    children: [
                        createTableCell(varName, false, 4000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(v.toFixed(2), false, 2500, { color }),
                        createTableCell(assessment, false, 2500, { color })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [4000, 2500, 2500], rows: vifRows }));

            children.push(new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ 
                    text: 'Note: VIF < 5 acceptable, 5-10 moderate concern, > 10 severe multicollinearity', 
                    size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));
        }

        // 5. R² Interpretation Guide
        const sectionNum = modelType !== 'simple' && Object.keys(vif).length > 0 ? 5 : 4;
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum}. R² Interpretation Guide`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
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
                    createTableCell('< 0.25', false, 3000),
                    createTableCell('Weak', false, 3000),
                    createTableCell(r2 < 0.25 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.25 - 0.49', false, 3000),
                    createTableCell('Moderate', false, 3000),
                    createTableCell(r2 >= 0.25 && r2 < 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.50 - 0.74', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(r2 >= 0.50 && r2 < 0.75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.75', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(r2 >= 0.75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: r2Rows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum + 1}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isModelSignificant && r2 >= 0.5
            ? [
                'Model shows strong predictive power.',
                'Check regression diagnostics (residual plots, normality).',
                'Validate model with holdout sample or cross-validation.',
                'Consider practical significance of coefficient magnitudes.',
                'Document model for reproducibility.'
            ]
            : isModelSignificant
                ? [
                    'Model is statistically significant but explains limited variance.',
                    'Consider adding more predictors to improve R².',
                    'Check for non-linear relationships or interactions.',
                    'Examine residuals for patterns suggesting model misspecification.',
                    'Effect sizes may have practical importance despite modest R².'
                ]
                : [
                    'Model is not statistically significant.',
                    'Predictors may not have meaningful relationship with outcome.',
                    'Consider alternative predictors or transformations.',
                    'Check sample size adequacy for number of predictors.',
                    'Investigate potential outliers or influential observations.'
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

        // 7. About the Method
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum + 2}. About ${modelLabel} Regression`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const methodDescriptions: { [key: string]: string[] } = {
            'Simple': [
                'Models linear relationship between one predictor and one outcome.',
                'Equation: Y = β₀ + β₁X + ε',
                'β₁ represents change in Y for one-unit change in X.',
                'Assumes linearity, independence, homoscedasticity, and normality of residuals.',
                'Best for understanding bivariate relationships.'
            ],
            'Multiple': [
                'Models relationship between multiple predictors and one outcome.',
                'Equation: Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε',
                'Each coefficient represents effect controlling for other predictors.',
                'Adjusted R² penalizes for number of predictors.',
                'Check VIF for multicollinearity among predictors.'
            ],
            'Polynomial': [
                'Captures non-linear (curved) relationships.',
                'Extends linear regression with polynomial terms (X², X³, etc.).',
                'Higher degrees can model complex curves but risk overfitting.',
                'Degree 2 = parabola, Degree 3 = S-curve.',
                'Use validation to prevent overfitting.'
            ]
        };

        const aboutPoints = methodDescriptions[modelLabel] || methodDescriptions['Simple'];
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${modelLabel} Regression Report`, size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${modelLabel}_Regression_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


