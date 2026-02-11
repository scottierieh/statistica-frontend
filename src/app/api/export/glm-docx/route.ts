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

const getPseudoR2Label = (r2: number): string => {
    if (r2 >= 0.40) return 'Excellent';
    if (r2 >= 0.20) return 'Good';
    if (r2 >= 0.10) return 'Moderate';
    return 'Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, targetVar, features, family, linkFunction, sampleSize } = await request.json();

        const coefficients = results.coefficients || [];
        const pseudoR2 = results.pseudo_r2 || 0;
        const aic = results.aic || 0;
        const bic = results.bic || 0;
        const logLikelihood = results.log_likelihood || 0;
        const deviance = results.deviance || 0;
        
        const featureList = Array.isArray(features) ? features : [];
        const significantCoeffs = coefficients.filter((c: any) => c.p_value < 0.05);
        const hasSignificant = significantCoeffs.length > 0;
        
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
            children: [new TextRun({ text: 'Generalized Linear Model Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
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
            children: [new TextRun({ text: `Family: ${family} | Link: ${linkFunction || 'default'}`, size: 22, font: 'Arial', color: COLORS.gray })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} | ${featureList.length} predictors`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: hasSignificant ? '✓ ' : '○ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: hasSignificant ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: hasSignificant 
                        ? `${significantCoeffs.length} Significant Predictor${significantCoeffs.length > 1 ? 's' : ''} Identified`
                        : 'No Significant Predictors Found',
                    bold: true, size: 24, font: 'Arial',
                    color: hasSignificant ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Pseudo R²: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${pseudoR2.toFixed(4)} (${getPseudoR2Label(pseudoR2)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Variance Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `approximately ${(pseudoR2 * 100).toFixed(1)}%`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Model Comparison: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `AIC = ${aic.toFixed(1)}, BIC = ${bic.toFixed(1)}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Significant Predictors: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${significantCoeffs.length} of ${coefficients.length} (p < 0.05)`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A generalized linear model with ${family} distribution and ${linkFunction || 'default'} link function was fitted to predict ${targetVar} from ${featureList.length} predictors. `;
        apaText += `The sample included N = ${sampleSize} observations. `;
        apaText += `The model achieved pseudo-R² = ${pseudoR2.toFixed(3)}, indicating ${getPseudoR2Label(pseudoR2).toLowerCase()} fit. `;
        apaText += `Model comparison criteria were AIC = ${aic.toFixed(2)} and BIC = ${bic.toFixed(2)}. `;
        
        if (significantCoeffs.length > 0) {
            const topCoeffs = significantCoeffs.slice(0, 3);
            apaText += `Significant predictors included `;
            topCoeffs.forEach((c: any, idx: number) => {
                const varName = c.variable.replace(/Q\("([^"]+)"\)/g, '$1');
                const pFormatted = c.p_value < 0.001 ? '< .001' : `= ${c.p_value.toFixed(3)}`;
                apaText += `${idx > 0 ? ', ' : ''}${varName} (b = ${c.coefficient.toFixed(3)}, p ${pFormatted})`;
            });
            if (significantCoeffs.length > 3) {
                apaText += `, and ${significantCoeffs.length - 3} additional predictor${significantCoeffs.length - 3 > 1 ? 's' : ''}`;
            }
            apaText += '.';
        } else {
            apaText += 'No predictors reached statistical significance at the p < .05 level.';
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Model Fit Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Model Fit Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const fitRows: TableRow[] = [
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
                    createTableCell('Pseudo R²', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(pseudoR2.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(`${getPseudoR2Label(pseudoR2)} fit`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('AIC', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(aic.toFixed(2), false, 2500),
                    createTableCell('Lower = better fit', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('BIC', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(bic.toFixed(2), false, 2500),
                    createTableCell('Lower = better fit (penalizes complexity)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Log-Likelihood', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(logLikelihood.toFixed(2), false, 2500),
                    createTableCell('Higher = better fit', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Deviance', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(deviance.toFixed(2), false, 2500),
                    createTableCell('Lower = better fit', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2500, 3500], rows: fitRows }));

        // 3. Coefficients
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Coefficient Estimates', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const showExpCoef = family === 'binomial' || family === 'poisson';
        
        const coeffHeaderCells = [
            createTableCell('Variable', true, 2000, { align: AlignmentType.LEFT }),
            createTableCell('B', true, 1200),
        ];
        if (showExpCoef) {
            coeffHeaderCells.push(createTableCell('Exp(B)', true, 1200));
        }
        coeffHeaderCells.push(
            createTableCell('p', true, 1000),
            createTableCell('95% CI', true, 1800),
            createTableCell('Sig.', true, 700)
        );

        const coeffRows: TableRow[] = [
            new TableRow({ tableHeader: true, children: coeffHeaderCells })
        ];

        coefficients.forEach((c: any) => {
            const varName = c.variable.replace(/Q\("([^"]+)"\)/g, '$1');
            const isSig = c.p_value < 0.05;
            
            const rowCells = [
                createTableCell(varName.length > 15 ? varName.substring(0, 15) + '...' : varName, false, 2000, { align: AlignmentType.LEFT, bold: isSig }),
                createTableCell(c.coefficient.toFixed(4), false, 1200),
            ];
            if (showExpCoef) {
                rowCells.push(createTableCell(c.exp_coefficient?.toFixed(4) || '—', false, 1200));
            }
            rowCells.push(
                createTableCell(formatPValue(c.p_value), false, 1000, { color: isSig ? COLORS.success : COLORS.gray }),
                createTableCell(`[${c.conf_int_lower.toFixed(3)}, ${c.conf_int_upper.toFixed(3)}]`, false, 1800),
                createTableCell(getSignificanceStars(c.p_value) || 'ns', false, 700, { bold: true, color: isSig ? COLORS.success : COLORS.gray })
            );
            
            coeffRows.push(new TableRow({ children: rowCells }));
        });

        const coeffColWidths = showExpCoef ? [2000, 1200, 1200, 1000, 1800, 700] : [2000, 1200, 1000, 1800, 700];
        children.push(new Table({ columnWidths: coeffColWidths, rows: coeffRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: `Note: *** p < .001, ** p < .01, * p < .05, ns = not significant${showExpCoef ? '. Exp(B) = ' + (family === 'binomial' ? 'Odds Ratio' : 'Rate Ratio') : ''}`, 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Pseudo R² Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Pseudo R² Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const r2Rows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Pseudo R² Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.10', false, 3000),
                    createTableCell('Weak', false, 3000),
                    createTableCell(pseudoR2 < 0.10 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.10 - 0.19', false, 3000),
                    createTableCell('Moderate', false, 3000),
                    createTableCell(pseudoR2 >= 0.10 && pseudoR2 < 0.20 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.20 - 0.39', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(pseudoR2 >= 0.20 && pseudoR2 < 0.40 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.40', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(pseudoR2 >= 0.40 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
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

        const recommendations = hasSignificant && pseudoR2 >= 0.1
            ? [
                'Model identifies meaningful predictors for the outcome.',
                `Focus on the ${significantCoeffs.length} significant predictor${significantCoeffs.length > 1 ? 's' : ''} for interpretation.`,
                family === 'binomial' ? 'Interpret odds ratios (Exp(B)) for effect sizes.' : 'Interpret coefficients in terms of the link function.',
                'Compare AIC/BIC with alternative models to assess relative fit.',
                'Validate findings with cross-validation or holdout sample.'
            ]
            : hasSignificant
                ? [
                    'Some significant predictors were found but model fit is limited.',
                    'Consider adding more relevant predictors.',
                    'Check for non-linear relationships or interactions.',
                    'Verify the model family and link function are appropriate.',
                    'Examine residuals for model diagnostics.'
                ]
                : [
                    'No significant predictors were found.',
                    'Consider different predictor variables.',
                    'Check if the sample size is adequate for the number of predictors.',
                    'Verify the model family and link function are appropriate.',
                    'Collect more data or consider alternative modeling approaches.'
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

        // 6. About GLM
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Generalized Linear Models', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const familyDescriptions: { [key: string]: string } = {
            'gaussian': 'Gaussian (Normal): For continuous outcomes; equivalent to linear regression.',
            'binomial': 'Binomial: For binary outcomes (0/1); coefficients as log-odds, Exp(B) as odds ratios.',
            'poisson': 'Poisson: For count data; coefficients as log-rates, Exp(B) as rate ratios.',
            'gamma': 'Gamma: For positive continuous outcomes with right skew.'
        };

        const aboutPoints = [
            'GLM extends linear regression to various outcome distributions.',
            'Link functions connect linear predictors to the expected response.',
            familyDescriptions[family] || `${family}: Selected distribution family.`,
            'Pseudo R² provides an approximate measure of explained variance.',
            'AIC/BIC allow comparison of different models (lower = better).'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'GLM Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="GLM_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


