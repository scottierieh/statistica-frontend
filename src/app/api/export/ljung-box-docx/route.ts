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

export async function POST(request: NextRequest) {
    try {
        const { results, valueCol, lags, sampleSize } = await request.json();

        const lbStatistic = results.lb_statistic || 0;
        const pValue = results.p_value || 1;
        const isSignificant = results.is_significant || pValue < 0.05;
        const testedLags = results.lags || lags;
        
        const isGood = !isSignificant; // No autocorrelation = good model
        
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
            children: [new TextRun({ text: 'Ljung-Box Test', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: valueCol, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} observations | Lags = ${testedLags}`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                    text: isGood ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGood ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isGood 
                        ? 'No Significant Autocorrelation (White Noise)'
                        : 'Significant Autocorrelation Detected',
                    bold: true, size: 24, font: 'Arial',
                    color: isGood ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Ljung-Box Q Statistic: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `Q(${testedLags}) = ${lbStatistic.toFixed(3)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `p-value: `, size: 22, font: 'Arial' }),
                new TextRun({ text: formatPValue(pValue), bold: true, size: 22, font: 'Arial', color: isGood ? COLORS.success : COLORS.danger }),
                new TextRun({ text: isGood ? ' (Not significant at α = .05)' : ' (Significant at α = .05)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Interpretation: `, size: 22, font: 'Arial' }),
                new TextRun({ text: isGood ? 'Residuals are white noise — model is well-specified' : 'Autocorrelation exists — model needs refinement', bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = pValue < 0.001 ? '< .001' : `= ${pValue.toFixed(3)}`;
        
        let apaText = `A Ljung-Box test was conducted to examine autocorrelation in the residuals of ${valueCol}. `;
        apaText += `The test was performed with ${testedLags} lags on N = ${sampleSize} observations. `;
        apaText += isGood
            ? `The test did not reveal statistically significant autocorrelation, Q(${testedLags}) = ${lbStatistic.toFixed(2)}, p ${pFormatted}, indicating that residuals behave like white noise.`
            : `The test revealed statistically significant autocorrelation, Q(${testedLags}) = ${lbStatistic.toFixed(2)}, p ${pFormatted}, suggesting the model may be misspecified.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Test Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Test Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const testRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Ljung-Box Q', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(lbStatistic.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell('Chi-squared test statistic', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Degrees of Freedom', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(testedLags), false, 2500),
                    createTableCell(`Number of lags tested`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p-value', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(formatPValue(pValue), false, 2500, { color: isGood ? COLORS.success : COLORS.danger }),
                    createTableCell(isGood ? 'Not significant (p ≥ .05)' : 'Significant (p < .05)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Conclusion', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(isGood ? 'White Noise' : 'Autocorrelated', false, 2500, { bold: true, color: isGood ? COLORS.success : COLORS.danger }),
                    createTableCell(isGood ? 'Residuals are random' : 'Patterns remain in residuals', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: testRows }));

        // 3. Hypothesis Test
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Hypothesis Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [
                new TextRun({ text: 'Null Hypothesis (H₀): ', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: 'No autocorrelation exists in the residuals (white noise).', size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [
                new TextRun({ text: 'Alternative Hypothesis (H₁): ', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: 'At least one autocorrelation coefficient is significantly different from zero.', size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [
                new TextRun({ text: 'Decision: ', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ 
                    text: isGood 
                        ? 'Fail to reject H₀ — No evidence of autocorrelation' 
                        : 'Reject H₀ — Evidence of autocorrelation exists', 
                    size: 22, font: 'Arial', color: isGood ? COLORS.success : COLORS.danger 
                })
            ]
        }));

        // 4. P-Value Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. P-Value Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const pValueRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('P-Value Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p > 0.10', false, 3000),
                    createTableCell('No autocorrelation', false, 3000),
                    createTableCell(pValue > 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.05 < p ≤ 0.10', false, 3000),
                    createTableCell('Marginal (borderline)', false, 3000),
                    createTableCell(pValue > 0.05 && pValue <= 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 < p ≤ 0.05', false, 3000),
                    createTableCell('Significant autocorrelation', false, 3000),
                    createTableCell(pValue > 0.01 && pValue <= 0.05 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≤ 0.01', false, 3000),
                    createTableCell('Highly significant autocorrelation', false, 3000),
                    createTableCell(pValue <= 0.01 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.danger })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: pValueRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGood
            ? [
                'Model residuals are consistent with white noise.',
                'The time series model appears well-specified.',
                'Proceed with forecasting and predictions.',
                'Monitor model performance with out-of-sample validation.',
                'Re-test periodically as new data becomes available.'
            ]
            : [
                'Model residuals show significant autocorrelation.',
                'Consider increasing the AR (autoregressive) order.',
                'Consider increasing the MA (moving average) order.',
                'Check for seasonal patterns and add seasonal components if needed.',
                'Examine whether important explanatory variables are missing.'
            ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isGood ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 6. About the Test
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Ljung-Box Test', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'Portmanteau test for autocorrelation in time series residuals.',
            'Tests multiple lags simultaneously rather than one at a time.',
            'Q statistic follows a chi-squared distribution with k degrees of freedom.',
            'Essential for validating ARIMA, SARIMA, and other time series models.',
            'Commonly used with lags = 10-20 or √n for appropriate coverage.'
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

        // Formula
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: 'Formula: ', bold: true, size: 22, font: 'Arial', color: COLORS.primaryDark }),
                new TextRun({ text: 'Q = n(n+2) Σ (ρ²ₖ / (n-k))', size: 22, font: 'Arial', italics: true })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ 
                text: 'where n = sample size, ρₖ = sample autocorrelation at lag k, k = 1, 2, ..., h', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Ljung-Box Test Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Ljung_Box_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
