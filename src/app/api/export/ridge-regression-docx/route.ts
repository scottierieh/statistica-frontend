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
        const { results, target, features, sampleSize, testSize } = await request.json();

        const metrics = results.metrics || {};
        const trainMetrics = metrics.train || {};
        const testMetrics = metrics.test || {};
        const coefficients = results.coefficients || {};
        const intercept = results.intercept || 0;
        const alpha = results.alpha || 1.0;
        
        const testR2 = testMetrics.r2_score || 0;
        const trainR2 = trainMetrics.r2_score || 0;
        const testRmse = testMetrics.rmse || 0;
        const testMae = testMetrics.mae || 0;
        const trainRmse = trainMetrics.rmse || 0;
        const trainMae = trainMetrics.mae || 0;
        
        const featureList = Array.isArray(features) ? features : [];
        const trainTestGap = Math.abs(trainR2 - testR2);
        const isOverfitting = trainTestGap > 0.1;
        const isGoodModel = testR2 >= 0.5 && !isOverfitting;
        
        const nTrain = Math.round((1 - (testSize || 0.2)) * sampleSize);
        const nTest = sampleSize - nTrain;
        
        const sortedCoeffs = Object.entries(coefficients)
            .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number));
        
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
            children: [new TextRun({ text: 'Ridge Regression Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Target: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: target, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${featureList.length} features | α = ${alpha.toFixed(3)} (L2 regularization)`, size: 22, font: 'Arial', color: COLORS.gray })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} (Train: ${nTrain}, Test: ${nTest})`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGoodModel ? '✓ ' : isOverfitting ? '△ ' : '○ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGoodModel ? COLORS.success : isOverfitting ? COLORS.warning : COLORS.gray 
                }),
                new TextRun({ 
                    text: isGoodModel 
                        ? 'Model Shows Good Predictive Performance'
                        : isOverfitting 
                            ? 'Model Shows Signs of Overfitting'
                            : 'Model Has Limited Predictive Power',
                    bold: true, size: 24, font: 'Arial',
                    color: isGoodModel ? COLORS.success : isOverfitting ? COLORS.warning : COLORS.gray
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Test R²: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${testR2.toFixed(4)} (${getR2Label(testR2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Variance Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(testR2 * 100).toFixed(1)}% on unseen data`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Prediction Error (RMSE): `, size: 22, font: 'Arial' }),
                new TextRun({ text: `±${testRmse.toFixed(4)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Regularization (α): `, size: 22, font: 'Arial' }),
                new TextRun({ text: alpha.toFixed(4), bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Train-Test Gap: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(trainTestGap * 100).toFixed(1)}%`, bold: true, size: 22, font: 'Arial', color: isOverfitting ? COLORS.warning : COLORS.success }),
                new TextRun({ text: isOverfitting ? ' (suggests overfitting)' : ' (good generalization)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A Ridge regression (L2-regularized) was performed to predict ${target} from ${featureList.length} predictors. `;
        apaText += `The data were split into training (n = ${nTrain}) and test (n = ${nTest}) sets. `;
        apaText += `With regularization parameter α = ${alpha.toFixed(3)}, the model achieved R² = ${testR2.toFixed(3)} on the test set, `;
        apaText += `explaining ${(testR2 * 100).toFixed(1)}% of the variance in ${target}. `;
        apaText += `Test RMSE was ${testRmse.toFixed(3)} and MAE was ${testMae.toFixed(3)}. `;
        apaText += `The train-test R² gap of ${(trainTestGap * 100).toFixed(1)}%`;
        apaText += isOverfitting 
            ? ' suggests some overfitting; consider increasing alpha.' 
            : ' indicates good generalization to new data.';

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
                    createTableCell('Train', true, 2500),
                    createTableCell('Test', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('R²', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(trainR2.toFixed(4), false, 2500),
                    createTableCell(testR2.toFixed(4), false, 2500, { highlight: true })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('RMSE', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(trainRmse.toFixed(4), false, 2500),
                    createTableCell(testRmse.toFixed(4), false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MAE', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(trainMae.toFixed(4), false, 2500),
                    createTableCell(testMae.toFixed(4), false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 2500], rows: perfRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Similar train/test performance indicates good generalization. Large gaps suggest overfitting.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Coefficients
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Model Coefficients', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const coeffRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Feature', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Coefficient', true, 2500),
                    createTableCell('|Coefficient|', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('(Intercept)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(intercept.toFixed(4), false, 2500),
                    createTableCell('—', false, 2000)
                ]
            })
        ];

        sortedCoeffs.forEach(([feature, coef]) => {
            const c = coef as number;
            const absCoef = Math.abs(c);
            coeffRows.push(new TableRow({
                children: [
                    createTableCell(feature.length > 25 ? feature.substring(0, 25) + '...' : feature, false, 3500, { align: AlignmentType.LEFT, bold: absCoef >= 0.1 }),
                    createTableCell(c.toFixed(4), false, 2500, { color: c > 0 ? COLORS.success : c < 0 ? COLORS.danger : COLORS.secondary }),
                    createTableCell(absCoef.toFixed(4), false, 2000)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3500, 2500, 2000], rows: coeffRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Ridge shrinks coefficients toward zero but does not eliminate them (unlike Lasso). Positive (green) = increases target; Negative (red) = decreases target.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. R² Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. R² Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
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
                    createTableCell(testR2 < 0.25 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.25 - 0.49', false, 3000),
                    createTableCell('Moderate', false, 3000),
                    createTableCell(testR2 >= 0.25 && testR2 < 0.50 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.50 - 0.74', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(testR2 >= 0.50 && testR2 < 0.75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.75', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(testR2 >= 0.75 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: r2Rows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGoodModel
            ? [
                'Model demonstrates good predictive performance on unseen data.',
                'The regularization effectively controls overfitting.',
                'Consider cross-validation to confirm alpha selection.',
                'Use the regularization path plot to explore different alpha values.',
                'Document the model for reproducibility.'
            ]
            : isOverfitting
                ? [
                    'Train-test gap suggests the model overfits training data.',
                    'Consider increasing alpha for stronger regularization.',
                    'Use cross-validation to find optimal alpha.',
                    'Check if training data is representative of the population.',
                    'Consider collecting more training data.'
                ]
                : [
                    'Model has limited predictive power.',
                    'Consider adding more relevant features.',
                    'Check for non-linear relationships (try polynomial features).',
                    'Examine data quality and potential outliers.',
                    'Consider alternative modeling approaches.'
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

        // 6. About Ridge Regression
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Ridge Regression', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Ridge regression uses L2 regularization: adds α × Σ(coefficient²) penalty.',
            'Shrinks coefficients toward zero but never exactly to zero.',
            'Prevents overfitting by penalizing large coefficient magnitudes.',
            'Particularly effective when predictors are correlated (multicollinearity).',
            'Higher alpha = stronger shrinkage = simpler model with more bias.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Ridge Regression Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Ridge_Regression_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

