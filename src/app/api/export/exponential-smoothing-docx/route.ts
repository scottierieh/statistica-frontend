import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber, ImageRun
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Handle different naming conventions
        const analysisResponse = body.analysisResult || body;
        const results = analysisResponse.results || analysisResponse;
        const plot = body.plot || analysisResponse.plot;
        
        const valueCol = body.valueCol || body.variable || '';
        const timeCol = body.timeCol || '';
        const smoothingType = body.smoothingType || 'simple';
        const trendType = body.trendType || 'add';
        const seasonalType = body.seasonalType || 'add';
        const seasonalPeriods = body.seasonalPeriods || 12;
        const sampleSize = body.sampleSize || 0;

        // Extract results
        const aic = results.aic || 0;
        const bic = results.bic || 0;
        const aicc = results.aicc || 0;
        const modelParams = results.model_params || {};

        // Model type labels
        const modelTypeLabel = smoothingType === 'simple' ? 'Simple' : 
                              smoothingType === 'holt' ? "Holt's Linear" : 'Holt-Winters';
        
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
            children: [new TextRun({ text: 'Exponential Smoothing', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${modelTypeLabel} Method`, size: 28, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Variable: ${valueCol} | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: `${modelTypeLabel} Exponential Smoothing Model Fitted`,
                    bold: true, size: 24, font: 'Arial', color: COLORS.success
                })
            ]
        }));

        // Key metrics
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Model Type: ', size: 22, font: 'Arial' }),
                new TextRun({ text: modelTypeLabel, bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ 
                    text: smoothingType === 'simple' ? ' (level only)' : 
                          smoothingType === 'holt' ? ' (level + trend)' : ' (level + trend + seasonal)', 
                    size: 22, font: 'Arial', color: COLORS.gray 
                })
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

        const alpha = modelParams.smoothing_level;
        if (alpha !== undefined) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Alpha (α): ', size: 22, font: 'Arial' }),
                    new TextRun({ text: alpha.toFixed(4), bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                    new TextRun({ 
                        text: alpha > 0.7 ? ' — High (reactive to recent changes)' : 
                              alpha > 0.3 ? ' — Medium (balanced)' : ' — Low (stable, more history)', 
                        size: 22, font: 'Arial', color: COLORS.gray 
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

        let apaText = `${modelTypeLabel} exponential smoothing was applied to ${valueCol} across N = ${sampleSize} observations. `;
        
        if (smoothingType === 'simple') {
            apaText += 'This method models only the level component, suitable for series without trend or seasonality. ';
        } else if (smoothingType === 'holt') {
            apaText += `This method models both level and trend components using ${trendType === 'add' ? 'additive' : 'multiplicative'} trend. `;
        } else {
            apaText += `This method models level, trend, and seasonal components using ${trendType === 'add' ? 'additive' : 'multiplicative'} trend and ${seasonalType === 'add' ? 'additive' : 'multiplicative'} seasonality with period ${seasonalPeriods}. `;
        }
        
        apaText += `Model fit was evaluated using information criteria: AIC = ${aic.toFixed(2)}, BIC = ${bic.toFixed(2)}, and AICc = ${aicc.toFixed(2)}. `;
        apaText += `The optimized level smoothing parameter α = ${alpha?.toFixed(4) || 'N/A'}`;
        
        if (modelParams.smoothing_trend) {
            apaText += `, trend smoothing β = ${modelParams.smoothing_trend.toFixed(4)}`;
        }
        if (modelParams.smoothing_seasonal) {
            apaText += `, seasonal smoothing γ = ${modelParams.smoothing_seasonal.toFixed(4)}`;
        }
        apaText += '.';

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
                    createTableCell('Akaike Information Criterion — lower is better', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('BIC', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(bic.toFixed(4), false, 2500, { bold: true }),
                    createTableCell('Bayesian IC — penalizes complexity more heavily', false, 5000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('AICc', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(aicc.toFixed(4), false, 2500),
                    createTableCell('Small-sample corrected AIC', false, 5000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 5000], rows: criteriaRows }));

        // 3. Model Parameters Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Model Parameters', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const paramDescriptions: Record<string, string> = {
            'smoothing_level': 'Level smoothing (α) — weight on recent observations',
            'smoothing_trend': 'Trend smoothing (β) — trend adaptation rate',
            'smoothing_seasonal': 'Seasonal smoothing (γ) — seasonal pattern weight',
            'damping_trend': 'Trend damping — dampens trend over time',
            'initial_level': 'Initial level estimate',
            'initial_trend': 'Initial trend estimate'
        };

        const paramRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2000),
                    createTableCell('Description', true, 5000)
                ]
            })
        ];

        Object.entries(modelParams).forEach(([key, value]) => {
            if (typeof value === 'number') {
                paramRows.push(new TableRow({
                    children: [
                        createTableCell(key.replace(/_/g, ' '), false, 3500, { align: AlignmentType.LEFT }),
                        createTableCell(value.toFixed(6), false, 2000, { bold: key.includes('smoothing') }),
                        createTableCell(paramDescriptions[key] || '', false, 5000)
                    ]
                }));
            }
        });

        children.push(new Table({ columnWidths: [3500, 2000, 5000], rows: paramRows }));

        // 4. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '4. Fitted vs Original Series', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Visual comparison of original data and fitted exponential smoothing model.', 
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
        }

        // 5. Recommendations
        const recSectionNum = plot ? 5 : 4;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recs = smoothingType === 'simple'
            ? [
                'Simple smoothing is appropriate for flat series without trend or seasonality.',
                'If trend is visible in the data, upgrade to Holt\'s linear method.',
                'If seasonal patterns exist, consider Holt-Winters method.',
                'Compare models using AIC/BIC — lower values indicate better fit.',
                'Check residuals for remaining patterns or autocorrelation.'
            ]
            : smoothingType === 'holt'
                ? [
                    'Holt\'s method captures level and trend dynamics.',
                    'If seasonal patterns are present, upgrade to Holt-Winters.',
                    'Consider multiplicative trend for exponentially growing series.',
                    'Compare AIC/BIC with simpler (Simple) and richer (Holt-Winters) models.',
                    'Verify trend extrapolation is reasonable for forecast horizon.'
                ]
                : [
                    'Holt-Winters captures level, trend, and seasonal components.',
                    'Verify seasonal period matches actual data periodicity.',
                    'Additive seasonality: constant seasonal swings. Multiplicative: proportional.',
                    'Compare AIC/BIC with simpler models to ensure complexity is justified.',
                    'For long forecasts, consider trend damping to prevent unrealistic extrapolation.'
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

        // 6. About Exponential Smoothing
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Exponential Smoothing`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Exponential smoothing assigns exponentially decreasing weights to past observations.',
            'Simple: Models level only (α parameter). Best for flat, stable series.',
            'Holt: Models level (α) and trend (β). Best for trending data without seasonality.',
            'Holt-Winters: Models level (α), trend (β), and seasonality (γ). Best for seasonal data.',
            'Lower AIC/BIC indicates better model fit with appropriate complexity penalization.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Exponential Smoothing Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ExpSmoothing_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}