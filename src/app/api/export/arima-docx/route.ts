import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber, ImageRun
} from 'docx';

interface ForecastItem {
    forecast_date?: string;
    mean: number;
    mean_ci_lower?: number;
    mean_ci_upper?: number;
}

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
        const body = await request.json();
        
        // Handle different naming conventions
        const analysisResponse = body.analysisResult || body;
        const results = analysisResponse.results || analysisResponse;
        const plot = body.plot || analysisResponse.plot;
        const diagnosticsPlot = body.diagnosticsPlot || analysisResponse.diagnostics_plot;
        
        const valueCol = body.valueCol || body.variable || '';
        const timeCol = body.timeCol || '';
        const modelType = body.modelType || 'arima';
        const p = body.p ?? 1;
        const d = body.d ?? 1;
        const q = body.q ?? 1;
        const P = body.P ?? 0;
        const D = body.D ?? 0;
        const Q = body.Q ?? 0;
        const s = body.s ?? 12;
        const forecastPeriods = body.forecastPeriods || 12;
        const sampleSize = body.sampleSize || 0;
        const exogCols = body.exogCols || [];

        // Extract results
        const aic = results.aic || 0;
        const bic = results.bic || 0;
        const hqic = results.hqic || 0;
        const forecast: ForecastItem[] = results.forecast || [];
        const summaryData = results.summary_data || [];

        // Model type labels
        const modelLabels: Record<string, string> = {
            'ar': 'AR', 'ma': 'MA', 'arma': 'ARMA', 
            'arima': 'ARIMA', 'sarima': 'SARIMA', 'arimax': 'ARIMAX'
        };
        const modelLabel = modelLabels[modelType] || 'ARIMA';
        
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
            children: [new TextRun({ text: `${modelLabel} Model`, bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${modelLabel}(${p}, ${d}, ${q})${modelType === 'sarima' ? ` × (${P}, ${D}, ${Q})${s}` : ''}`, size: 28, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${valueCol} | N = ${sampleSize} | Forecast: ${forecastPeriods} periods`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                new TextRun({ text: '✓ ', bold: true, size: 28, font: 'Arial', color: COLORS.success }),
                new TextRun({ 
                    text: `${modelLabel}(${p}, ${d}, ${q}) Model Successfully Fitted`,
                    bold: true, size: 24, font: 'Arial', color: COLORS.success
                })
            ]
        }));

        // Model description
        const modelDescriptions: Record<string, string> = {
            'ar': `AR(${p}) model fitted. Uses ${p} autoregressive term(s) to predict future values from past values.`,
            'ma': `MA(${q}) model fitted. Uses ${q} moving average term(s) based on past forecast errors.`,
            'arma': `ARMA(${p}, ${q}) model fitted. Combines ${p} AR and ${q} MA terms for stationary series.`,
            'arima': `ARIMA(${p}, ${d}, ${q}) model fitted. Applied ${d}-order differencing for stationarity.`,
            'sarima': `SARIMA(${p}, ${d}, ${q})(${P}, ${D}, ${Q})${s} model fitted. Captures both trend and seasonal patterns with period ${s}.`,
            'arimax': `ARIMAX(${p}, ${d}, ${q}) model fitted. Includes ${exogCols.length} exogenous variable(s).`
        };

        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: modelDescriptions[modelType] || modelDescriptions['arima'], size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'AIC: ', size: 22, font: 'Arial' }),
                new TextRun({ text: aic.toFixed(2), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: ' | BIC: ', size: 22, font: 'Arial' }),
                new TextRun({ text: bic.toFixed(2), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: ' (lower is better)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (forecast.length > 0) {
            const firstForecast = forecast[0].mean;
            const lastForecast = forecast[forecast.length - 1].mean;
            const trend = lastForecast > firstForecast ? 'upward' : lastForecast < firstForecast ? 'downward' : 'stable';
            
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: `${forecastPeriods}-period forecast shows `, size: 22, font: 'Arial' }),
                    new TextRun({ text: trend, bold: true, size: 22, font: 'Arial', color: trend === 'upward' ? COLORS.success : trend === 'downward' ? COLORS.danger : COLORS.gray }),
                    new TextRun({ text: ` trend (${firstForecast.toFixed(2)} → ${lastForecast.toFixed(2)})`, size: 22, font: 'Arial' })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A ${modelLabel}(${p}, ${d}, ${q}) model was fitted to ${valueCol} across N = ${sampleSize} observations using ${timeCol} as the time index. `;
        
        if (modelType === 'sarima') {
            apaText += `Seasonal order (${P}, ${D}, ${Q}) with period ${s} was applied. `;
        }
        if (modelType === 'arimax' && exogCols.length > 0) {
            apaText += `Exogenous variables included: ${exogCols.join(', ')}. `;
        }
        
        apaText += `Model selection criteria indicated AIC = ${aic.toFixed(4)}, BIC = ${bic.toFixed(4)}, and HQIC = ${hqic.toFixed(4)}. `;
        
        if (d === 0) {
            apaText += 'No differencing was applied, treating the original series as stationary. ';
        } else if (d === 1) {
            apaText += 'First-order differencing was applied to achieve stationarity. ';
        } else {
            apaText += `${d}-order differencing was applied to achieve stationarity. `;
        }
        
        apaText += `The model incorporates ${p} autoregressive term${p !== 1 ? 's' : ''} and ${q} moving average term${q !== 1 ? 's' : ''}. `;
        apaText += `A ${forecastPeriods}-period ahead forecast was generated with 95% confidence intervals.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Information Criteria Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Information Criteria', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const criteriaRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Criterion', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('AIC', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(aic.toFixed(4), false, 2500, { bold: true }),
                    createTableCell('Akaike IC — balance between fit and complexity', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('BIC', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(bic.toFixed(4), false, 2500, { bold: true }),
                    createTableCell('Bayesian IC — higher complexity penalty', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('HQIC', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(hqic.toFixed(4), false, 2500),
                    createTableCell('Hannan-Quinn IC — intermediate penalty', false, 5000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 5000], rows: criteriaRows }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [new TextRun({ 
                text: 'Note: Lower values indicate better model fit. Compare across different (p, d, q) specifications.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Model Parameters
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Model Specification', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const specRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 1500),
                    createTableCell('Description', true, 6500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p (AR order)', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(String(p), false, 1500, { bold: true }),
                    createTableCell('Number of autoregressive terms — determined by PACF cutoff', false, 6500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('d (Differencing)', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(String(d), false, 1500, { bold: true }),
                    createTableCell('Order of differencing — determined by stationarity tests (ADF/KPSS)', false, 6500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('q (MA order)', false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(String(q), false, 1500, { bold: true }),
                    createTableCell('Number of moving average terms — determined by ACF cutoff', false, 6500)
                ]
            })
        ];

        if (modelType === 'sarima') {
            specRows.push(
                new TableRow({
                    children: [
                        createTableCell('P (Seasonal AR)', false, 2500, { align: AlignmentType.LEFT }),
                        createTableCell(String(P), false, 1500),
                        createTableCell('Seasonal autoregressive order', false, 6500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('D (Seasonal I)', false, 2500, { align: AlignmentType.LEFT }),
                        createTableCell(String(D), false, 1500),
                        createTableCell('Seasonal differencing order', false, 6500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('Q (Seasonal MA)', false, 2500, { align: AlignmentType.LEFT }),
                        createTableCell(String(Q), false, 1500),
                        createTableCell('Seasonal moving average order', false, 6500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell('s (Period)', false, 2500, { align: AlignmentType.LEFT }),
                        createTableCell(String(s), false, 1500, { bold: true }),
                        createTableCell('Seasonal period length (e.g., 12 for monthly, 4 for quarterly)', false, 6500)
                    ]
                })
            );
        }

        children.push(new Table({ columnWidths: [2500, 1500, 6500], rows: specRows }));

        // 4. Forecast Table
        if (forecast.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Forecast Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const forecastRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Period', true, 2500, { align: AlignmentType.LEFT }),
                        createTableCell('Forecast', true, 2000),
                        createTableCell('95% CI Lower', true, 2000),
                        createTableCell('95% CI Upper', true, 2000),
                        createTableCell('CI Width', true, 2000)
                    ]
                })
            ];

            // Show first 10 and last 2 if more than 12 forecasts
            const displayForecasts: (ForecastItem | null)[] = forecast.length > 12 
                ? [...forecast.slice(0, 10), null, ...forecast.slice(-2)]
                : forecast;

            displayForecasts.forEach((f: ForecastItem | null, idx: number) => {
                if (f === null) {
                    forecastRows.push(new TableRow({
                        children: [
                            createTableCell('...', false, 2500, { align: AlignmentType.CENTER }),
                            createTableCell('...', false, 2000),
                            createTableCell('...', false, 2000),
                            createTableCell('...', false, 2000),
                            createTableCell('...', false, 2000)
                        ]
                    }));
                } else {
                    const ciWidth = (f.mean_ci_upper || 0) - (f.mean_ci_lower || 0);
                    forecastRows.push(new TableRow({
                        children: [
                            createTableCell(f.forecast_date || `t+${idx + 1}`, false, 2500, { align: AlignmentType.LEFT }),
                            createTableCell(f.mean.toFixed(4), false, 2000, { bold: true }),
                            createTableCell(f.mean_ci_lower?.toFixed(4) || 'N/A', false, 2000),
                            createTableCell(f.mean_ci_upper?.toFixed(4) || 'N/A', false, 2000),
                            createTableCell(ciWidth.toFixed(4), false, 2000, { color: COLORS.gray })
                        ]
                    }));
                }
            });

            children.push(new Table({ columnWidths: [2500, 2000, 2000, 2000, 2000], rows: forecastRows }));
        }

        // 5. Visualization (if available)
        let sectionNum = 5;
        
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${sectionNum}. Forecast Visualization`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Time series with fitted values and forecast with 95% confidence intervals.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = plot.startsWith('data:') ? plot.split(',')[1] : plot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 300 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Plot image error:', e);
            }
            sectionNum++;
        }

        // Diagnostics Plot (if available)
        if (diagnosticsPlot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${sectionNum}. Model Diagnostics`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Residual diagnostics: ACF, Q-Q plot, and Ljung-Box test for model validation.', 
                    size: 20, font: 'Arial', color: COLORS.gray 
                })]
            }));

            try {
                const imageData = diagnosticsPlot.startsWith('data:') ? diagnosticsPlot.split(',')[1] : diagnosticsPlot;
                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: Buffer.from(imageData, 'base64'),
                            transformation: { width: 550, height: 400 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Diagnostics plot image error:', e);
            }
            sectionNum++;
        }

        // Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = [
            'Validate model fit through residual diagnostics — residuals should be white noise.',
            'Ljung-Box test: p > 0.05 indicates no significant autocorrelation in residuals.',
            'Q-Q plot: Residuals should approximately follow normal distribution.',
            'Compare AIC/BIC across different (p, d, q) specifications to select optimal model.',
            'For seasonal data, ensure seasonal period matches actual data frequency.',
            'Forecast uncertainty increases at longer horizons — use confidence intervals for planning.'
        ];

        recs.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // About ARIMA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum + 1}. About ARIMA Models`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'AR (Autoregressive): Predicts current value from past values. Order p from PACF.',
            'I (Integrated): Differencing to achieve stationarity. Order d from ADF/KPSS tests.',
            'MA (Moving Average): Predicts from past forecast errors. Order q from ACF.',
            'SARIMA adds seasonal components (P, D, Q) with period s for seasonal patterns.',
            'ARIMAX includes exogenous (external) variables as additional predictors.',
            'Lower AIC/BIC indicates better model fit with appropriate complexity penalty.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${modelLabel} Model Report`, size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${modelLabel}_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
