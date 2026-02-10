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
        const alpha = results.alpha || 0;
        
        const testR2 = testMetrics.r2_score || 0;
        const trainR2 = trainMetrics.r2_score || 0;
        const testRmse = testMetrics.rmse || 0;
        const testMae = testMetrics.mae || 0;
        const trainRmse = trainMetrics.rmse || 0;
        const trainMae = trainMetrics.mae || 0;
        
        const featureList = Array.isArray(features) ? features : [];
        const totalFeatures = Object.keys(coefficients).length;
        const nonZeroFeatures = Object.values(coefficients).filter((c: any) => Math.abs(c) >= 1e-6).length;
        const excludedFeatures = totalFeatures - nonZeroFeatures;
        const trainTestGap = Math.abs(trainR2 - testR2);
        const isOverfitting = trainTestGap > 0.1;
        
        const nTrain = Math.round((1 - (testSize || 0.2)) * sampleSize);
        const nTest = sampleSize - nTrain;
        
        const sortedCoeffs = Object.entries(coefficients)
            .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number));
        const topFeatures = sortedCoeffs.filter(([_, c]) => Math.abs(c as number) >= 1e-6).slice(0, 5);
        
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
            children: [new TextRun({ text: 'Lasso Regression Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
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
            children: [new TextRun({ text: `${totalFeatures} candidate features | α = ${alpha.toFixed(3)}`, size: 22, font: 'Arial', color: COLORS.gray })]
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

        const isGoodModel = testR2 >= 0.25 && !isOverfitting;
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: isGoodModel ? '✓ ' : '○ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGoodModel ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isGoodModel 
                        ? 'Model Shows Good Predictive Performance'
                        : testR2 >= 0.25 
                            ? 'Model May Be Overfitting'
                            : 'Model Has Limited Predictive Power',
                    bold: true, size: 24, font: 'Arial',
                    color: isGoodModel ? COLORS.success : COLORS.warning
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
                new TextRun({ text: `Feature Selection: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${nonZeroFeatures} selected, ${excludedFeatures} eliminated`, bold: true, size: 22, font: 'Arial' })
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
                new TextRun({ text: isOverfitting ? ' (possible overfitting)' : ' (good generalization)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A Lasso regression (L1-regularized) was performed to predict ${target} from ${totalFeatures} candidate predictors. `;
        apaText += `The data were split into training (n = ${nTrain}) and test (n = ${nTest}) sets. `;
        apaText += `With regularization parameter α = ${alpha.toFixed(3)}, Lasso selected ${nonZeroFeatures} of ${totalFeatures} features by shrinking ${excludedFeatures} coefficients to zero. `;
        apaText += `The model achieved R² = ${testR2.toFixed(3)} on the test set, explaining ${(testR2 * 100).toFixed(1)}% of the variance in ${target}. `;
        apaText += `Training performance was R² = ${trainR2.toFixed(3)}, with a train-test gap of ${(trainTestGap * 100).toFixed(1)} percentage points`;
        apaText += isOverfitting ? ', suggesting some overfitting.' : ', indicating good generalization.';

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
                text: 'Note: Test metrics reflect performance on unseen data. Similar train/test values indicate good generalization.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Selected Features (Coefficients)
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Feature Coefficients', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const coeffRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Feature', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Coefficient', true, 2500),
                    createTableCell('Status', true, 2000)
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
            const isZero = Math.abs(c) < 1e-6;
            coeffRows.push(new TableRow({
                children: [
                    createTableCell(feature.length > 25 ? feature.substring(0, 25) + '...' : feature, false, 3500, { align: AlignmentType.LEFT, bold: !isZero, color: isZero ? COLORS.lightGray : COLORS.secondary }),
                    createTableCell(isZero ? '0.0000' : c.toFixed(4), false, 2500, { color: isZero ? COLORS.lightGray : COLORS.secondary }),
                    createTableCell(isZero ? 'Excluded' : 'Selected', false, 2000, { color: isZero ? COLORS.danger : COLORS.success, bold: true })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3500, 2500, 2000], rows: coeffRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Lasso shrinks unimportant coefficients to exactly zero, performing automatic feature selection.', 
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
                `Focus on the ${nonZeroFeatures} selected features for interpretation.`,
                'Consider cross-validation to confirm robustness.',
                'Use the regularization path plot to explore different alpha values.',
                'Document the selected features for reproducibility.'
            ]
            : isOverfitting
                ? [
                    'Train-test gap suggests possible overfitting.',
                    'Consider increasing alpha for more regularization.',
                    'Try cross-validation to tune alpha optimally.',
                    'Examine if training data is representative.',
                    'Consider collecting more data if possible.'
                ]
                : [
                    'Model has limited predictive power.',
                    'Consider adding more relevant predictors.',
                    'Try different alpha values using the regularization path.',
                    'Check for non-linear relationships (consider polynomial features).',
                    'Examine data quality and potential outliers.'
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

        // 6. About Lasso Regression
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Lasso Regression', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Lasso (Least Absolute Shrinkage and Selection Operator) uses L1 regularization.',
            'The L1 penalty forces some coefficients to become exactly zero.',
            'This performs automatic feature selection, creating sparse models.',
            'Alpha (α) controls regularization strength: higher = more sparsity.',
            'Ideal for high-dimensional data with many potential predictors.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Lasso Regression Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Lasso_Regression_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


