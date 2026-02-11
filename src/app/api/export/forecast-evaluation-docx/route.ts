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

interface ModelResult {
    Method: string;
    RMSE: number | null;
    MAE: number | null;
    "MAPE (%)": number | null;
    MASE: number | null;
    "Coverage (95% PI)": number | null;
    error?: string;
}

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
        const body = await request.json();
        
        // Handle different naming conventions
        const analysisResponse = body.analysisResult || body;
        const results: ModelResult[] = analysisResponse.results || [];
        
        const valueCol = body.valueCol || body.variable || '';
        const timeCol = body.timeCol || '';
        const sampleSize = body.sampleSize || 0;
        const testPeriod = body.testPeriod || 12;

        // Find best models
        const validResults = results.filter(r => r.RMSE !== null).sort((a, b) => (a.RMSE || Infinity) - (b.RMSE || Infinity));
        const bestModel = validResults[0];
        const failedModels = results.filter(r => r.error || r.RMSE === null);

        const findBest = (metric: keyof ModelResult, lowerIsBetter = true) => {
            const valid = results.filter(r => r[metric] !== null && r[metric] !== undefined);
            if (valid.length === 0) return null;
            return valid.reduce((best, curr) => {
                const bestVal = best[metric] as number;
                const currVal = curr[metric] as number;
                return lowerIsBetter ? (currVal < bestVal ? curr : best) : (currVal > bestVal ? curr : best);
            });
        };

        const bestRMSE = findBest('RMSE');
        const bestMAE = findBest('MAE');
        const bestMAPE = findBest('MAPE (%)');
        const bestMASE = findBest('MASE');
        
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Time Series Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Forecast Model Evaluation', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Automated Model Comparison & Selection', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${valueCol} | N = ${sampleSize} | Test Period: ${testPeriod} observations`, size: 22, font: 'Arial', color: COLORS.gray })]
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

        if (bestModel) {
            children.push(new Paragraph({
                spacing: { after: 200 },
                children: [
                    new TextRun({ text: '✓ ', bold: true, size: 28, font: 'Arial', color: COLORS.success }),
                    new TextRun({ 
                        text: `Best Model: ${bestModel.Method}`,
                        bold: true, size: 24, font: 'Arial', color: COLORS.success
                    })
                ]
            }));

            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'RMSE: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: bestModel.RMSE?.toFixed(4) || 'N/A', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                    new TextRun({ text: ' (Root Mean Squared Error — lower is better)', size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'MAE: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: bestModel.MAE?.toFixed(4) || 'N/A', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                    new TextRun({ text: ' | MAPE: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: `${bestModel['MAPE (%)']?.toFixed(2) || 'N/A'}%`, bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark })
                ]
            }));

            if (bestModel.MASE !== null) {
                const maseStatus = bestModel.MASE < 1 ? 'Outperforms naive baseline' : 'At or below naive baseline level';
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                        new TextRun({ text: 'MASE: ', size: 22, font: 'Arial' }),
                        new TextRun({ 
                            text: bestModel.MASE.toFixed(4), 
                            bold: true, size: 22, font: 'Arial', 
                            color: bestModel.MASE < 1 ? COLORS.success : COLORS.warning 
                        }),
                        new TextRun({ text: ` — ${maseStatus}`, size: 22, font: 'Arial', color: COLORS.gray })
                    ]
                }));
            }

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Models Evaluated: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: `${validResults.length} successful`, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: failedModels.length > 0 ? `, ${failedModels.length} failed` : '', size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        } else {
            children.push(new Paragraph({
                spacing: { after: 200 },
                children: [
                    new TextRun({ text: '✗ ', bold: true, size: 28, font: 'Arial', color: COLORS.danger }),
                    new TextRun({ 
                        text: 'No models successfully fitted',
                        bold: true, size: 24, font: 'Arial', color: COLORS.danger
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

        let apaText = `A forecast model evaluation was conducted on ${valueCol} (N = ${sampleSize}) using out-of-sample testing with the last ${testPeriod} observations as the test set. `;
        apaText += `${validResults.length} forecasting methods were successfully fitted and evaluated. `;
        
        if (bestModel) {
            apaText += `${bestModel.Method} achieved the best performance with RMSE = ${bestModel.RMSE?.toFixed(4)}, `;
            apaText += `MAE = ${bestModel.MAE?.toFixed(4)}, and MAPE = ${bestModel['MAPE (%)']?.toFixed(2)}%. `;
            
            if (bestModel.MASE !== null) {
                if (bestModel.MASE < 1) {
                    apaText += `The MASE of ${bestModel.MASE.toFixed(4)} indicates the model outperforms the naive seasonal baseline. `;
                } else {
                    apaText += `The MASE of ${bestModel.MASE.toFixed(4)} suggests performance comparable to or below the naive seasonal baseline. `;
                }
            }
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Model Comparison Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Model Comparison', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const comparisonRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Rank', true, 800),
                    createTableCell('Method', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('RMSE', true, 1500),
                    createTableCell('MAE', true, 1500),
                    createTableCell('MAPE (%)', true, 1500),
                    createTableCell('MASE', true, 1500)
                ]
            })
        ];

        validResults.forEach((model, idx) => {
            const isBest = idx === 0;
            comparisonRows.push(new TableRow({
                children: [
                    createTableCell(`#${idx + 1}`, false, 800, { bold: isBest, color: isBest ? COLORS.success : undefined }),
                    createTableCell(model.Method, false, 2500, { align: AlignmentType.LEFT, bold: isBest, color: isBest ? COLORS.success : undefined }),
                    createTableCell(model.RMSE?.toFixed(2) || 'N/A', false, 1500, { 
                        bold: model.Method === bestRMSE?.Method, 
                        color: model.Method === bestRMSE?.Method ? COLORS.success : undefined 
                    }),
                    createTableCell(model.MAE?.toFixed(2) || 'N/A', false, 1500, {
                        bold: model.Method === bestMAE?.Method,
                        color: model.Method === bestMAE?.Method ? COLORS.success : undefined
                    }),
                    createTableCell(model['MAPE (%)']?.toFixed(1) || 'N/A', false, 1500, {
                        bold: model.Method === bestMAPE?.Method,
                        color: model.Method === bestMAPE?.Method ? COLORS.success : undefined
                    }),
                    createTableCell(model.MASE?.toFixed(2) || 'N/A', false, 1500, {
                        bold: model.Method === bestMASE?.Method,
                        color: model.Method === bestMASE?.Method ? COLORS.success : undefined
                    })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [800, 2500, 1500, 1500, 1500, 1500], rows: comparisonRows }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [new TextRun({ 
                text: 'Note: Green highlighting indicates best performance for each metric. Lower values are better for all metrics.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // Failed models (if any)
        if (failedModels.length > 0) {
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: 'Failed Models: ', bold: true, size: 22, font: 'Arial', color: COLORS.warning })]
            }));

            failedModels.forEach(model => {
                children.push(new Paragraph({
                    spacing: { after: 50 },
                    children: [
                        new TextRun({ text: `• ${model.Method}`, size: 20, font: 'Arial', color: COLORS.gray }),
                        new TextRun({ text: model.error ? ` — ${model.error}` : ' — Failed to converge', size: 20, font: 'Arial', color: COLORS.gray, italics: true })
                    ]
                }));
            });
        }

        // 3. Metric Descriptions
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Metric Definitions', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const metricRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 2000, { align: AlignmentType.LEFT }),
                    createTableCell('Description', true, 5500),
                    createTableCell('Best Value', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('RMSE', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Root Mean Squared Error — penalizes large errors more heavily', false, 5500, { align: AlignmentType.LEFT }),
                    createTableCell('Lower', false, 2000, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MAE', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Mean Absolute Error — average of absolute forecast errors', false, 5500, { align: AlignmentType.LEFT }),
                    createTableCell('Lower', false, 2000, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MAPE (%)', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Mean Absolute Percentage Error — scale-independent percentage error', false, 5500, { align: AlignmentType.LEFT }),
                    createTableCell('Lower', false, 2000, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('MASE', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Mean Absolute Scaled Error — relative to naive seasonal forecast. <1 = better than naive', false, 5500, { align: AlignmentType.LEFT }),
                    createTableCell('< 1.0', false, 2000, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Coverage', false, 2000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell('Percentage of actual values within 95% prediction interval', false, 5500, { align: AlignmentType.LEFT }),
                    createTableCell('≈ 95%', false, 2000, { color: COLORS.success })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2000, 5500, 2000], rows: metricRows }));

        // 4. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        let recs: string[] = [];
        
        if (bestModel) {
            recs.push(`Use ${bestModel.Method} for forecasting — achieved lowest RMSE (${bestModel.RMSE?.toFixed(2)}).`);
            
            if (bestModel.MASE !== null && bestModel.MASE < 1) {
                recs.push(`MASE < 1 confirms the model outperforms naive seasonal baseline.`);
            } else if (bestModel.MASE !== null) {
                recs.push(`MASE ≥ 1 suggests considering simpler models or investigating data patterns.`);
            }
            
            if (bestModel.Method === 'Naive Seasonal') {
                recs.push('Naive seasonal is best — strong seasonality but limited trend. May not need complex models.');
            } else if (bestModel.Method === 'SARIMA') {
                recs.push('SARIMA performs best — fine-tune parameters for optimal performance.');
            } else if (bestModel.Method.includes('Holt')) {
                recs.push('Exponential smoothing performs well — good for short-term forecasting.');
            }
        }
        
        recs.push('Consider time series cross-validation for more robust model evaluation.');
        recs.push('Monitor forecast performance over time and retrain as needed.');
        recs.push('Use prediction intervals for uncertainty quantification in decisions.');

        recs.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 5. About Forecast Evaluation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. About Forecast Evaluation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Out-of-sample testing: Last observations held out as test set to simulate real forecasting.',
            'Multiple metrics provide different perspectives on forecast accuracy.',
            'MASE enables comparison across series with different scales.',
            'Single train/test split may be unstable — cross-validation is more robust.',
            'No single best model for all situations — domain knowledge matters.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Forecast Evaluation Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ForecastEval_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}