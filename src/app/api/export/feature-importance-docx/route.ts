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
    tableBorder: 'DDDDDD',
    gold: 'F1C40F',
    silver: 'BDC3C7',
    bronze: 'CD6133'
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

const getModelLabel = (modelType: string): string => {
    const labels: { [key: string]: string } = {
        'random_forest': 'Random Forest',
        'gradient_boosting': 'Gradient Boosting',
        'linear': 'Linear Regression',
        'ridge': 'Ridge Regression',
        'decision_tree': 'Decision Tree',
        'logistic': 'Logistic Regression'
    };
    return labels[modelType] || modelType;
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, independentVars, modelType, taskType, sampleSize } = await request.json();

        const modelPerformance = results.model_performance || {};
        const featureRanking = results.feature_ranking || [];
        const permutationImportance = results.permutation_importance || [];
        const insights = results.insights || [];
        const recommendations = results.recommendations || [];
        
        const nFeatures = results.n_features || independentVars?.length || 0;
        const nTrain = results.n_train || 0;
        const nTest = results.n_test || 0;
        const nRepeats = results.n_repeats || 10;
        
        const testScore = modelPerformance.test_score || 0;
        const metric = modelPerformance.metric || (taskType === 'classification' ? 'Accuracy' : 'R²');
        
        const topFeature = featureRanking[0];
        const isGoodModel = (metric === 'Accuracy' && testScore >= 0.7) || (metric !== 'Accuracy' && testScore >= 0.5);
        
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
            children: [new TextRun({ text: 'Feature Importance Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Permutation Importance with Confidence Intervals', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${getModelLabel(modelType)} | ${taskType} | ${nFeatures} Features | N = ${sampleSize || results.n_observations}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGoodModel ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGoodModel ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: `${topFeature?.feature} is the Most Important Feature`,
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
                new TextRun({ text: `Top Feature: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${topFeature?.feature}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${topFeature?.relative_importance?.toFixed(1)}% of total importance)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Importance Score: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${topFeature?.importance?.toFixed(4)} ± ${topFeature?.std?.toFixed(4)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Model ${metric}: `, size: 22, font: 'Arial' }),
                new TextRun({ text: metric === 'Accuracy' ? `${(testScore * 100).toFixed(1)}%` : testScore.toFixed(4), bold: true, size: 22, font: 'Arial', color: isGoodModel ? COLORS.success : COLORS.warning })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Permutation Repeats: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${nRepeats} iterations`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `Permutation importance analysis was conducted using a ${getModelLabel(modelType)} model for ${taskType} `;
        apaText += `to identify the relative contribution of ${nFeatures} features in predicting ${dependentVar}. `;
        apaText += `The sample (N = ${results.n_observations || sampleSize}) was split into training (n = ${nTrain}) and test (n = ${nTest}) sets. `;
        apaText += `The model achieved ${metric} = ${metric === 'Accuracy' ? `${(testScore * 100).toFixed(1)}%` : testScore.toFixed(4)} on the test set. `;
        apaText += `Each feature was permuted ${nRepeats} times to compute importance with standard errors. `;
        apaText += `The most important feature was ${topFeature?.feature} with permutation importance = ${topFeature?.importance?.toFixed(4)} `;
        apaText += `(SD = ${topFeature?.std?.toFixed(4)}), accounting for ${topFeature?.relative_importance?.toFixed(1)}% of total importance.`;

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
                    createTableCell('Metric', true, 4500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Model Type', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(getModelLabel(modelType), false, 2500, { bold: true }),
                    createTableCell(taskType, false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell(`Test ${metric}`, false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(metric === 'Accuracy' ? `${(testScore * 100).toFixed(1)}%` : testScore.toFixed(4), false, 2500, { highlight: true, bold: true }),
                    createTableCell(isGoodModel ? 'Good' : 'Moderate', false, 2000, { color: isGoodModel ? COLORS.success : COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Train Score', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(metric === 'Accuracy' ? `${((modelPerformance.train_score || 0) * 100).toFixed(1)}%` : (modelPerformance.train_score || 0).toFixed(4), false, 2500),
                    createTableCell('Training fit', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Training Samples', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nTrain), false, 2500),
                    createTableCell('—', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Test Samples', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nTest), false, 2500),
                    createTableCell('—', false, 2000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4500, 2500, 2000], rows: perfRows }));

        // 3. Feature Ranking
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Feature Importance Ranking', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const rankingRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Rank', true, 1000),
                    createTableCell('Feature', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Importance', true, 2000),
                    createTableCell('Std Dev', true, 1500),
                    createTableCell('Relative %', true, 1500)
                ]
            })
        ];

        featureRanking.forEach((item: any, idx: number) => {
            const isNegative = item.importance < 0;
            let rankColor = COLORS.secondary;
            if (idx === 0) rankColor = COLORS.gold;
            else if (idx === 1) rankColor = COLORS.silver;
            else if (idx === 2) rankColor = COLORS.bronze;

            rankingRows.push(new TableRow({
                children: [
                    createTableCell(`#${item.rank || idx + 1}`, false, 1000, { bold: true, color: rankColor }),
                    createTableCell(item.feature, false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(item.importance.toFixed(6), false, 2000, { color: isNegative ? COLORS.danger : undefined }),
                    createTableCell(item.std.toFixed(6), false, 1500),
                    createTableCell(`${item.relative_importance.toFixed(1)}%`, false, 1500)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [1000, 3000, 2000, 1500, 1500], rows: rankingRows }));

        // 4. Top Features Spotlight
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Top Features Spotlight', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const topThree = featureRanking.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];

        topThree.forEach((feat: any, idx: number) => {
            children.push(new Paragraph({
                spacing: { before: 150, after: 100 },
                children: [
                    new TextRun({ text: `${medals[idx]} `, size: 24, font: 'Arial' }),
                    new TextRun({ text: `${feat.feature}`, bold: true, size: 24, font: 'Arial', color: COLORS.primaryDark }),
                    new TextRun({ text: ` — Importance: ${feat.importance.toFixed(4)} (${feat.relative_importance.toFixed(1)}%)`, size: 22, font: 'Arial', color: COLORS.secondary })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                indent: { left: 720 },
                children: [new TextRun({ 
                    text: `Shuffling this feature decreases model performance by approximately ${(feat.importance * 100).toFixed(2)} percentage points.`, 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));
        });

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
                    createTableCell('Importance Value', true, 3000),
                    createTableCell('Interpretation', true, 6000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Positive (high)', false, 3000, { color: COLORS.success }),
                    createTableCell('Important — shuffling hurts model significantly', false, 6000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Positive (low)', false, 3000),
                    createTableCell('Somewhat useful — minor contribution', false, 6000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Near zero', false, 3000, { color: COLORS.gray }),
                    createTableCell('Not useful — may be removed', false, 6000, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Negative', false, 3000, { color: COLORS.danger }),
                    createTableCell('May hurt model — consider removing', false, 6000, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 6000], rows: guideRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const defaultRecommendations = [
            `Focus on ${topFeature?.feature} — this feature has the highest predictive power.`,
            'Consider feature engineering on top-ranked features to improve model.',
            'Features with near-zero importance can be removed to simplify the model.',
            'Negative importance features may introduce noise — consider removing.',
            'Validate findings with domain experts for business interpretation.'
        ];

        const finalRecommendations = recommendations.length > 0 ? recommendations : defaultRecommendations;

        finalRecommendations.forEach((rec: string, idx: number) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 7. About Permutation Importance
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. About Permutation Importance', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Measures how much model performance decreases when a feature is randomly shuffled.',
            'Model-agnostic: works with any fitted model (tree-based, linear, etc.).',
            'Computed on held-out test data for unbiased estimates.',
            'Multiple repeats provide confidence intervals (standard errors).',
            'Captures nonlinear relationships and feature interactions.'
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

        // Caveats
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'Caveats', bold: true, size: 26, font: 'Arial', color: COLORS.warning })]
        }));

        children.push(new Paragraph({
            spacing: { after: 80 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.warning }),
                new TextRun({ text: 'Correlated features may share importance (importance is split between them).', size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 80 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.warning }),
                new TextRun({ text: 'Results depend on model quality — low-performing models yield unreliable importance.', size: 22, font: 'Arial' })
            ]
        }));

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Feature Importance Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Feature_Importance_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

