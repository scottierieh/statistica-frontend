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
        const { result, dependentVar, independentVars } = await request.json();
        
        const metrics = result.metrics;
        const insights = result.insights || [];
        const recommendations = result.recommendations || [];
        const modelSummary = result.model_summary;
        
        const hasNonLinearity = insights.some((i: any) => 
            i.type === 'warning' && 
            (i.title.toLowerCase().includes('curvature') || 
             i.title.toLowerCase().includes('correlation') || 
             i.title.toLowerCase().includes('pattern'))
        );
        
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
            children: [new TextRun({ text: 'Linearity Check', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Model: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: `${dependentVar} ~ ${independentVars.join(' + ')}`, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Observations: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(metrics.n_observations), size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: '    |    ', size: 24, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Predictors: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: String(metrics.n_predictors), size: 24, font: 'Arial', color: COLORS.primary })
            ]
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

        // Conclusion box
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: !hasNonLinearity ? '✓ ' : '⚠ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: !hasNonLinearity ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: !hasNonLinearity 
                        ? 'Linearity Assumption MET - Linear model is appropriate'
                        : 'Non-linearity Detected - Consider model modifications',
                    bold: true, size: 24, font: 'Arial',
                    color: !hasNonLinearity ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        const explainedPct = (metrics.r_squared * 100).toFixed(1);
        
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `R-squared: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${metrics.r_squared.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` — Model explains ${explainedPct}% of variance`, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Curvature Test: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `F = ${metrics.curvature_f_statistic.toFixed(3)}, p = ${formatPValue(metrics.curvature_p_value)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: metrics.curvature_p_value >= 0.05 ? ' — No significant curvature' : ' — Significant curvature detected', size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Residual-Fitted Correlation: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `r = ${metrics.residual_fitted_corr.toFixed(4)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: Math.abs(metrics.residual_fitted_corr) < 0.1 ? ' — Near zero (good)' : ' — Deviates from zero (concern)', size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const formatPAPA = (p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`;
        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: `Linearity was assessed using residual diagnostics for the model ${dependentVar} ~ ${independentVars.join(' + ')} `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `(N = ${metrics.n_observations}). `, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: `The curvature test yielded F = ${metrics.curvature_f_statistic.toFixed(2)}, p ${formatPAPA(metrics.curvature_p_value)}`, size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: metrics.curvature_p_value >= 0.05 ? ', suggesting no significant departure from linearity.' : ', indicating potential non-linearity.', size: 22, font: 'Arial', italics: true }),
                new TextRun({ text: ` The model explained ${explainedPct}% of the variance (R² = ${metrics.r_squared.toFixed(4)}).`, size: 22, font: 'Arial', italics: true })
            ]
        }));

        // 2. Model Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Model Summary', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const modelRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Component', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 5500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Dependent Variable', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(modelSummary.dependent, false, 5500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Independent Variables', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(modelSummary.independents.join(', '), false, 5500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Model Equation', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(modelSummary.equation || `${modelSummary.dependent} = ${metrics.intercept.toFixed(4)} + ...`, false, 5500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('R-squared', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.r_squared.toFixed(4), false, 5500, { highlight: true })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Sample Size (N)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(metrics.n_observations), false, 5500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 5500], rows: modelRows }));

        // 3. Diagnostic Tests
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Diagnostic Tests', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ 
                text: 'Tests for linearity assumption. P-value > 0.05 indicates linearity is satisfied.', 
                size: 22, font: 'Arial', color: COLORS.gray 
            })]
        }));

        const testsHeaderRow = new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Test', true, 2800, { align: AlignmentType.LEFT }),
                createTableCell('Statistic', true, 2000),
                createTableCell('P-Value', true, 1800),
                createTableCell('Conclusion', true, 2400)
            ]
        });

        const getConclusion = (p: number) => p >= 0.05 ? 'Linear OK' : 'Non-linear';
        const getColor = (p: number) => p >= 0.05 ? COLORS.success : COLORS.danger;

        const testsDataRows = [
            new TableRow({
                children: [
                    createTableCell('Residual-Fitted Correlation', false, 2800, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`r = ${metrics.residual_fitted_corr.toFixed(4)}`, false, 2000),
                    createTableCell(formatPValue(metrics.residual_fitted_corr_pvalue), false, 1800, { 
                        highlight: metrics.residual_fitted_corr_pvalue < 0.05 
                    }),
                    createTableCell(getConclusion(metrics.residual_fitted_corr_pvalue), false, 2400, { 
                        bold: true, color: getColor(metrics.residual_fitted_corr_pvalue) 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Runs Test', false, 2800, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`z = ${metrics.runs_z_statistic.toFixed(4)}`, false, 2000),
                    createTableCell(formatPValue(metrics.runs_p_value), false, 1800, { 
                        highlight: metrics.runs_p_value < 0.05 
                    }),
                    createTableCell(getConclusion(metrics.runs_p_value), false, 2400, { 
                        bold: true, color: getColor(metrics.runs_p_value) 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Curvature Test', false, 2800, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`F = ${metrics.curvature_f_statistic.toFixed(4)}`, false, 2000),
                    createTableCell(formatPValue(metrics.curvature_p_value), false, 1800, { 
                        highlight: metrics.curvature_p_value < 0.05 
                    }),
                    createTableCell(getConclusion(metrics.curvature_p_value), false, 2400, { 
                        bold: true, color: getColor(metrics.curvature_p_value) 
                    })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Rainbow Test', false, 2800, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`F = ${metrics.rainbow_f_statistic.toFixed(4)}`, false, 2000),
                    createTableCell(formatPValue(metrics.rainbow_p_value), false, 1800, { 
                        highlight: metrics.rainbow_p_value < 0.05 
                    }),
                    createTableCell(getConclusion(metrics.rainbow_p_value), false, 2400, { 
                        bold: true, color: getColor(metrics.rainbow_p_value) 
                    })
                ]
            })
        ];

        children.push(new Table({
            columnWidths: [2800, 2000, 1800, 2400],
            rows: [testsHeaderRow, ...testsDataRows]
        }));

        // 4. Residual Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Residual Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const residualRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 4500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Residual Mean', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.residual_mean.toFixed(6), false, 2500),
                    createTableCell(Math.abs(metrics.residual_mean) < 0.001 ? 'Near zero (good)' : 'Check model', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Residual Std. Deviation', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.residual_std.toFixed(4), false, 2500),
                    createTableCell('Typical error magnitude', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Runs (Observed / Expected)', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(`${metrics.runs_observed} / ${metrics.runs_expected.toFixed(1)}`, false, 2500),
                    createTableCell(Math.abs(metrics.runs_observed - metrics.runs_expected) < 5 ? 'Random pattern' : 'Check pattern', false, 2500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Quadratic Coefficient', false, 4500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(metrics.quadratic_coef.toFixed(6), false, 2500),
                    createTableCell(Math.abs(metrics.quadratic_coef) < 0.1 ? 'Negligible curve' : 'Curvature present', false, 2500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4500, 2500, 2500], rows: residualRows }));

        // 5. Insights
        if (insights.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Key Insights', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            insights.forEach((insight: any, idx: number) => {
                const isWarning = insight.type === 'warning';
                children.push(new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: isWarning ? '⚠ ' : 'ℹ ', bold: true, size: 22, font: 'Arial', color: isWarning ? COLORS.warning : COLORS.primary }),
                        new TextRun({ text: `${insight.title}: `, bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: insight.description, size: 22, font: 'Arial' })
                    ]
                }));
            });
        }

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '6. Recommendations' : '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const defaultRecommendations = !hasNonLinearity 
            ? [
                'Linearity assumption is satisfied. Proceed with linear regression.',
                'Check other assumptions: normality, homoscedasticity, independence.',
                'Examine influential observations and outliers.',
                'Consider cross-validation for model robustness.'
            ]
            : [
                'Consider adding polynomial terms (e.g., X²) to capture curvature.',
                'Try log or square root transformation of predictor variables.',
                'Consider piecewise linear regression or splines.',
                'Generalized Additive Models (GAM) can handle non-linear patterns.',
                'Re-examine the theoretical relationship between variables.'
            ];

        const allRecommendations = recommendations.length > 0 ? recommendations : defaultRecommendations;

        allRecommendations.forEach((rec: string, idx: number) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.success }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: insights.length > 0 ? '7. Interpretation Guide' : '6. Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const guideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('P-Value Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Action', true, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p > 0.10', false, 3000),
                    createTableCell('Strong evidence for linearity', false, 3000, { color: COLORS.success }),
                    createTableCell('Linear model appropriate', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.05 < p ≤ 0.10', false, 3000),
                    createTableCell('Marginal - borderline', false, 3000, { color: COLORS.warning }),
                    createTableCell('Interpret with caution', false, 3500, { align: AlignmentType.LEFT })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('p ≤ 0.05', false, 3000),
                    createTableCell('Evidence of non-linearity', false, 3000, { color: COLORS.danger }),
                    createTableCell('Consider transformations or alternative models', false, 3500, { align: AlignmentType.LEFT })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3500], rows: guideRows }));

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Linearity Check Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Linearity_Check_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}