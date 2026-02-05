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

const getEffectSizeLabel = (eta: number): string => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, factorVar, covariateVars, sampleSize, numGroups } = await request.json();

        const anovaTable = results.anova_table || [];
        const assumptions = results.assumptions || {};
        const adjustedMeans = results.adjusted_means || {};
        const covariateInfo = results.covariate_info || {};
        
        // Find main effect row (factor)
        const factorRow = anovaTable.find((row: any) => 
            !row.Source.includes('Residual') && !row.Source.includes(':')
        );
        const residualRow = anovaTable.find((row: any) => row.Source.includes('Residual'));
        const covariateRows = anovaTable.filter((row: any) => 
            !row.Source.includes('Residual') && !row.Source.includes(':') && row !== factorRow
        );

        const isSignificant = factorRow && factorRow['p-value'] < 0.05;
        const effectSize = factorRow?.['η²p'] || 0;
        const effectLabel = getEffectSizeLabel(effectSize);
        
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
            children: [new TextRun({ text: 'ANCOVA', bold: true, size: 52, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Dependent Variable: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: dependentVar, size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Factor: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: factorVar, size: 24, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: ` (${numGroups} groups)`, size: 24, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: 'Covariates: ', bold: true, size: 24, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: covariateVars.join(', '), size: 24, font: 'Arial', color: COLORS.primary })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize}`, size: 24, font: 'Arial', color: COLORS.gray })]
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
                    text: isSignificant ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isSignificant ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isSignificant 
                        ? 'Significant Group Differences After Controlling for Covariates'
                        : 'No Significant Group Differences After Controlling for Covariates',
                    bold: true, size: 24, font: 'Arial',
                    color: isSignificant ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Main Effect: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `F(${factorRow?.df || '?'}, ${residualRow?.df || '?'}) = ${factorRow?.F?.toFixed(3) || 'N/A'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: `, p ${formatPValue(factorRow?.['p-value'] || 1)}`, size: 22, font: 'Arial', color: isSignificant ? COLORS.success : COLORS.danger })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Effect Size: η²p = `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${effectSize.toFixed(3)} (${effectLabel})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Covariates controlled: `, size: 22, font: 'Arial' }),
                new TextRun({ text: covariateVars.join(', '), bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // Assumptions
        const normMet = assumptions.normality?.met !== false;
        const homMet = assumptions.homogeneity?.met !== false;
        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Assumptions: `, size: 22, font: 'Arial' }),
                new TextRun({ 
                    text: normMet && homMet ? 'All met' : `${!normMet ? 'Normality violated' : ''}${!normMet && !homMet ? ', ' : ''}${!homMet ? 'Homogeneity violated' : ''}`, 
                    bold: true, size: 22, font: 'Arial',
                    color: normMet && homMet ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const pFormatted = factorRow && factorRow['p-value'] < 0.001 ? '< .001' : `= ${factorRow?.['p-value']?.toFixed(3) || 'N/A'}`;
        
        let apaText = `An analysis of covariance (ANCOVA) was conducted to examine the effect of ${factorVar} on ${dependentVar}, `;
        apaText += `controlling for ${covariateVars.join(' and ')}. `;
        apaText += `The sample consisted of N = ${sampleSize} observations across ${numGroups} groups. `;
        apaText += isSignificant
            ? `After controlling for the covariate${covariateVars.length > 1 ? 's' : ''}, there was a statistically significant effect of ${factorVar} on ${dependentVar}, F(${factorRow?.df}, ${residualRow?.df}) = ${factorRow?.F?.toFixed(2)}, p ${pFormatted}, η²p = ${effectSize.toFixed(3)}. `
            : `After controlling for the covariate${covariateVars.length > 1 ? 's' : ''}, there was no statistically significant effect of ${factorVar} on ${dependentVar}, F(${factorRow?.df}, ${residualRow?.df}) = ${factorRow?.F?.toFixed(2)}, p ${pFormatted}, η²p = ${effectSize.toFixed(3)}. `;
        apaText += `The effect size was ${effectLabel.toLowerCase()}, indicating that group membership ${effectSize >= 0.06 ? 'has a meaningful impact on' : 'has limited practical impact on'} ${dependentVar} after controlling for the covariate${covariateVars.length > 1 ? 's' : ''}.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Adjusted Means
        if (Object.keys(adjustedMeans).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '2. Adjusted Means', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 150 },
                children: [new TextRun({ 
                    text: 'Group means after controlling for covariates', 
                    size: 20, font: 'Arial', color: COLORS.gray, italics: true 
                })]
            }));

            const adjRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Group', true, 2500, { align: AlignmentType.LEFT }),
                        createTableCell('Adjusted Mean', true, 2500),
                        createTableCell('Std. Error', true, 2000),
                        createTableCell('N', true, 2000)
                    ]
                })
            ];

            Object.entries(adjustedMeans).forEach(([group, values]: [string, any]) => {
                adjRows.push(new TableRow({
                    children: [
                        createTableCell(group, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(values.adjusted_mean?.toFixed(3) || 'N/A', false, 2500, { highlight: true }),
                        createTableCell(values.se?.toFixed(3) || 'N/A', false, 2000),
                        createTableCell(String(values.n || 'N/A'), false, 2000)
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2500, 2500, 2000, 2000], rows: adjRows }));
        }

        // 3. ANCOVA Table
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: Object.keys(adjustedMeans).length > 0 ? '3. ANCOVA Table' : '2. ANCOVA Table', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const anovaRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Source', true, 2200, { align: AlignmentType.LEFT }),
                    createTableCell('SS', true, 1600),
                    createTableCell('df', true, 1000),
                    createTableCell('MS', true, 1600),
                    createTableCell('F', true, 1400),
                    createTableCell('p', true, 1400),
                    createTableCell('η²p', true, 1200)
                ]
            })
        ];

        anovaTable.forEach((row: any) => {
            const ms = row.sum_sq && row.df ? row.sum_sq / row.df : null;
            const isMainEffect = row === factorRow;
            anovaRows.push(new TableRow({
                children: [
                    createTableCell(row.Source, false, 2200, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(row.sum_sq?.toFixed(3) || '—', false, 1600),
                    createTableCell(String(row.df || '—'), false, 1000),
                    createTableCell(ms ? ms.toFixed(3) : '—', false, 1600),
                    createTableCell(row.F?.toFixed(3) || '—', false, 1400, { highlight: isMainEffect }),
                    createTableCell(row['p-value'] ? formatPValue(row['p-value']) : '—', false, 1400, { 
                        color: row['p-value'] && row['p-value'] < 0.05 ? COLORS.success : undefined 
                    }),
                    createTableCell(row['η²p']?.toFixed(3) || '—', false, 1200)
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2200, 1600, 1000, 1600, 1400, 1400, 1200], rows: anovaRows }));

        // 4. Covariate Analysis
        if (Object.keys(covariateInfo).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: Object.keys(adjustedMeans).length > 0 ? '4. Covariate Analysis' : '3. Covariate Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const covRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Covariate', true, 2500, { align: AlignmentType.LEFT }),
                        createTableCell('Coefficient', true, 2000),
                        createTableCell('Std. Error', true, 1800),
                        createTableCell('t', true, 1500),
                        createTableCell('p', true, 1500)
                    ]
                })
            ];

            Object.entries(covariateInfo).forEach(([cov, info]: [string, any]) => {
                const sig = info.p_value < 0.05;
                covRows.push(new TableRow({
                    children: [
                        createTableCell(cov, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(info.coefficient?.toFixed(4) || 'N/A', false, 2000),
                        createTableCell(info.std_err?.toFixed(4) || 'N/A', false, 1800),
                        createTableCell(info.t_value?.toFixed(3) || 'N/A', false, 1500),
                        createTableCell(formatPValue(info.p_value), false, 1500, { color: sig ? COLORS.success : undefined })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2500, 2000, 1800, 1500, 1500], rows: covRows }));

            // Model fit
            if (results.r_squared !== undefined) {
                children.push(new Paragraph({
                    spacing: { before: 150 },
                    children: [
                        new TextRun({ text: 'Model Fit: ', bold: true, size: 22, font: 'Arial' }),
                        new TextRun({ text: `R² = ${results.r_squared.toFixed(3)}`, size: 22, font: 'Arial' }),
                        new TextRun({ text: results.adj_r_squared !== undefined ? ` (Adjusted R² = ${results.adj_r_squared.toFixed(3)})` : '', size: 22, font: 'Arial', color: COLORS.gray })
                    ]
                }));
            }
        }

        // 5. Assumption Checks
        const sectionNum = Object.keys(adjustedMeans).length > 0 
            ? (Object.keys(covariateInfo).length > 0 ? '5' : '4')
            : (Object.keys(covariateInfo).length > 0 ? '4' : '3');
            
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${sectionNum}. Assumption Checks`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const assumptionRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Assumption', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Statistic', true, 2000),
                    createTableCell('p-value', true, 2000),
                    createTableCell('Status', true, 1500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Normality (Shapiro-Wilk)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(assumptions.normality?.statistic?.toFixed(4) || 'N/A', false, 2000),
                    createTableCell(formatPValue(assumptions.normality?.p_value || 1), false, 2000),
                    createTableCell(normMet ? 'Met' : 'Not Met', false, 1500, { bold: true, color: normMet ? COLORS.success : COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Homogeneity (Levene)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(assumptions.homogeneity?.statistic?.toFixed(4) || 'N/A', false, 2000),
                    createTableCell(formatPValue(assumptions.homogeneity?.p_value || 1), false, 2000),
                    createTableCell(homMet ? 'Met' : 'Not Met', false, 1500, { bold: true, color: homMet ? COLORS.success : COLORS.warning })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2000, 2000, 1500], rows: assumptionRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: p > .05 indicates assumption is met.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // Effect Size Reference
        const nextSection = parseInt(sectionNum) + 1;
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${nextSection}. Effect Size Interpretation`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const effectRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('η²p Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.01', false, 3000),
                    createTableCell('Negligible', false, 3000),
                    createTableCell(effectSize < 0.01 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.01 - 0.06', false, 3000),
                    createTableCell('Small', false, 3000),
                    createTableCell(effectSize >= 0.01 && effectSize < 0.06 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.06 - 0.14', false, 3000),
                    createTableCell('Medium', false, 3000),
                    createTableCell(effectSize >= 0.06 && effectSize < 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.14', false, 3000),
                    createTableCell('Large', false, 3000),
                    createTableCell(effectSize >= 0.14 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: effectRows }));

        // Recommendations
        const recSection = nextSection + 1;
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSection}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isSignificant && effectSize >= 0.06
            ? [
                'Significant group differences confirmed after controlling for covariates.',
                `${factorVar} has a ${effectLabel.toLowerCase()} impact on ${dependentVar}.`,
                'Consider post-hoc tests to identify which specific groups differ.',
                'The covariate adjustment provides more precise group comparisons.',
                'Report adjusted means for practical interpretation.'
            ]
            : isSignificant
                ? [
                    'Statistically significant but effect size is small.',
                    'The practical importance may be limited despite statistical significance.',
                    'Consider whether the difference is meaningful in your context.',
                    'The covariate adjustment has been applied successfully.',
                    'Report effect sizes alongside p-values for transparency.'
                ]
                : [
                    'No significant group differences after controlling for covariates.',
                    'The groups appear similar on the outcome variable.',
                    'The covariate(s) may account for most of the variance.',
                    'Consider whether additional factors should be examined.',
                    'Sample size may be insufficient for detecting small effects.'
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

        // Create Document
        const doc = new Document({
            styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'ANCOVA Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="ANCOVA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}