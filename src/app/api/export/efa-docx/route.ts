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

const getKmoLabel = (kmo: number): string => {
    if (kmo >= 0.9) return 'Marvelous';
    if (kmo >= 0.8) return 'Meritorious';
    if (kmo >= 0.7) return 'Middling';
    if (kmo >= 0.6) return 'Mediocre';
    if (kmo >= 0.5) return 'Miserable';
    return 'Unacceptable';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, nFactors, rotationMethod, extractionMethod, sampleSize } = await request.json();

        const eigenvalues = results.eigenvalues || [];
        const factorLoadings = results.factor_loadings || [];
        const varianceExplained = results.variance_explained || { per_factor: [], cumulative: [] };
        const variables = results.variables || [];
        const communalities = results.communalities || [];
        const adequacy = results.adequacy || {};
        
        const numFactors = results.n_factors || nFactors || 1;
        const kmo = adequacy.kmo || 0;
        const bartlettChi = adequacy.bartlett_statistic || 0;
        const bartlettP = adequacy.bartlett_p_value || 0;
        const bartlettSig = adequacy.bartlett_significant ?? true;
        
        const totalVariance = varianceExplained.cumulative?.[numFactors - 1] || 0;
        const isAdequate = kmo >= 0.6 && bartlettSig;
        const isGoodVariance = totalVariance >= 60;
        
        const avgCommunality = communalities.length > 0 
            ? communalities.reduce((a: number, b: number) => a + b, 0) / communalities.length 
            : 0;
        
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
            children: [new TextRun({ text: 'Exploratory Factor Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${numFactors} Factor${numFactors > 1 ? 's' : ''} | ${variables.length} Variables`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
                new TextRun({ text: `Extraction: ${extractionMethod === 'principal' ? 'Principal Axis Factoring' : 'PCA'}`, size: 22, font: 'Arial', color: COLORS.gray }),
                new TextRun({ text: ` | Rotation: ${rotationMethod?.charAt(0).toUpperCase()}${rotationMethod?.slice(1) || 'Varimax'}`, size: 22, font: 'Arial', color: COLORS.gray })
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

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ 
                    text: isAdequate ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isAdequate ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isAdequate && isGoodVariance
                        ? 'Clear Factor Structure Identified'
                        : isAdequate
                        ? 'Factor Structure Found — Consider Refinement'
                        : 'Data Adequacy Concerns',
                    bold: true, size: 24, font: 'Arial',
                    color: isAdequate ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `KMO Score: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${kmo.toFixed(3)} (${getKmoLabel(kmo)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Total Variance Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalVariance.toFixed(1)}%`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: isGoodVariance ? ' (Good)' : ' (Consider more factors)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Factors Extracted: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${numFactors}`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Average Communality: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${avgCommunality.toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: avgCommunality > 0.6 ? ' (Good)' : avgCommunality > 0.4 ? ' (Moderate)' : ' (Low)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const extractionName = extractionMethod === 'principal' ? 'Principal Axis Factoring' : 'Principal Component Analysis';
        const rotationName = rotationMethod?.charAt(0).toUpperCase() + rotationMethod?.slice(1) || 'Varimax';
        const pFormatted = bartlettP < 0.001 ? '< .001' : `= ${bartlettP.toFixed(3)}`;
        
        let apaText = `An exploratory factor analysis was conducted on ${variables.length} items using ${extractionName} with ${rotationName} rotation. `;
        apaText += `The Kaiser-Meyer-Olkin measure verified the sampling adequacy for the analysis, KMO = ${kmo.toFixed(2)}, and Bartlett's test of sphericity, χ² = ${bartlettChi.toFixed(2)}, p ${pFormatted}, indicated that correlations between items were sufficiently large for EFA. `;
        apaText += `A ${numFactors}-factor solution was extracted, explaining ${totalVariance.toFixed(1)}% of the total variance. `;
        
        if (varianceExplained.per_factor && varianceExplained.per_factor.length > 0) {
            const factorVariances = varianceExplained.per_factor.slice(0, Math.min(3, numFactors))
                .map((v: number, i: number) => `Factor ${i + 1} (${v.toFixed(1)}%)`).join(', ');
            apaText += `Variance explained by factors: ${factorVariances}${numFactors > 3 ? ', ...' : ''}.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Data Adequacy Tests
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Data Adequacy Tests', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const adequacyRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Test', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Kaiser-Meyer-Olkin (KMO)', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(kmo.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(getKmoLabel(kmo), false, 3000, { color: kmo >= 0.6 ? COLORS.success : COLORS.danger })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Bartlett's Chi-Square", false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(bartlettChi.toFixed(2), false, 2500),
                    createTableCell('', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Bartlett's p-value", false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(bartlettP < 0.001 ? '< .001' : bartlettP.toFixed(4), false, 2500),
                    createTableCell(bartlettSig ? 'Significant' : 'Not Significant', false, 3000, { color: bartlettSig ? COLORS.success : COLORS.danger })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2500, 3000], rows: adequacyRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: KMO ≥ 0.6 and significant Bartlett\'s test indicate data suitability for factor analysis.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Variance Explained
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Variance Explained', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const varianceRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Factor', true, 2000),
                    createTableCell('Eigenvalue', true, 2000),
                    createTableCell('% Variance', true, 2000),
                    createTableCell('Cumulative %', true, 2000)
                ]
            })
        ];

        for (let i = 0; i < numFactors; i++) {
            varianceRows.push(new TableRow({
                children: [
                    createTableCell(`Factor ${i + 1}`, false, 2000, { bold: true }),
                    createTableCell(eigenvalues[i]?.toFixed(3) || '—', false, 2000),
                    createTableCell(`${varianceExplained.per_factor[i]?.toFixed(1) || '—'}%`, false, 2000),
                    createTableCell(`${varianceExplained.cumulative[i]?.toFixed(1) || '—'}%`, false, 2000, { highlight: i === numFactors - 1 })
                ]
            }));
        }

        children.push(new Table({ columnWidths: [2000, 2000, 2000, 2000], rows: varianceRows }));

        // 4. Factor Loadings
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Factor Loadings (Rotated)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Calculate column widths
        const varColWidth = 2500;
        const factorColWidth = Math.floor((9000 - varColWidth - 1500) / numFactors);
        const commColWidth = 1500;

        const loadingHeaderCells = [createTableCell('Variable', true, varColWidth, { align: AlignmentType.LEFT })];
        for (let i = 0; i < numFactors; i++) {
            loadingHeaderCells.push(createTableCell(`F${i + 1}`, true, factorColWidth));
        }
        loadingHeaderCells.push(createTableCell('h²', true, commColWidth));

        const loadingRows: TableRow[] = [new TableRow({ tableHeader: true, children: loadingHeaderCells })];

        variables.forEach((variable: string, varIndex: number) => {
            const rowCells = [createTableCell(
                variable.length > 18 ? variable.substring(0, 18) + '...' : variable, 
                false, varColWidth, { align: AlignmentType.LEFT }
            )];
            
            for (let f = 0; f < numFactors; f++) {
                const loading = factorLoadings[varIndex]?.[f] || 0;
                const isStrong = Math.abs(loading) >= 0.4;
                rowCells.push(createTableCell(
                    loading.toFixed(3), 
                    false, 
                    factorColWidth, 
                    { bold: isStrong, color: isStrong ? COLORS.primary : undefined }
                ));
            }
            
            rowCells.push(createTableCell((communalities[varIndex] || 0).toFixed(3), false, commColWidth));
            loadingRows.push(new TableRow({ children: rowCells }));
        });

        const loadingColWidths = [varColWidth, ...Array(numFactors).fill(factorColWidth), commColWidth];
        children.push(new Table({ columnWidths: loadingColWidths, rows: loadingRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Loadings ≥ 0.4 are highlighted in bold. h² = communality (variance explained by factors).', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

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
                    createTableCell('Metric', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Threshold', true, 2000),
                    createTableCell('Interpretation', true, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('KMO', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.60', false, 2000),
                    createTableCell('Adequate for factor analysis', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Factor Loading', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.40', false, 2000),
                    createTableCell('Meaningful contribution to factor', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Communality', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 0.40', false, 2000),
                    createTableCell('Good variance explained', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Total Variance', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('≥ 60%', false, 2000),
                    createTableCell('Adequate solution', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Eigenvalue', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('> 1.0', false, 2000),
                    createTableCell('Factor worth retaining (Kaiser criterion)', false, 4000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2000, 4000], rows: guideRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isAdequate && isGoodVariance
            ? [
                'Factor structure is well-defined and explains adequate variance.',
                'Name each factor based on high-loading items.',
                'Confirm with Confirmatory Factor Analysis (CFA) if needed.',
                'Calculate reliability (Cronbach\'s α) for each factor.',
                'Review any items with cross-loadings > 0.30 on multiple factors.'
            ]
            : isAdequate
            ? [
                'Factor structure is interpretable but variance explained is limited.',
                'Consider extracting more factors or adding relevant items.',
                'Review items with low communalities (< 0.40).',
                'Check for cross-loadings that may indicate item revision needed.',
                'Validate factor structure with independent sample.'
            ]
            : [
                'Data may not be suitable for factor analysis.',
                'Check if variables are truly correlated.',
                'Consider increasing sample size.',
                'Review item quality and measurement.',
                'Explore alternative dimensionality reduction methods.'
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

        // 7. About EFA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. About Exploratory Factor Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'EFA identifies latent factors underlying observed variables.',
            'KMO measures sampling adequacy — higher values indicate better suitability.',
            'Bartlett\'s test checks if correlations are significantly different from identity matrix.',
            'Rotation (Varimax, Promax, etc.) simplifies factor interpretation.',
            'Communalities indicate how much variance in each variable is explained by the factors.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Exploratory Factor Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="EFA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}