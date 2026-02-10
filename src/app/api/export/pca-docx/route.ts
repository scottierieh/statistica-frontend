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

const getVarianceLabel = (variance: number): string => {
    if (variance >= 90) return 'Excellent';
    if (variance >= 80) return 'Very Good';
    if (variance >= 70) return 'Good';
    if (variance >= 60) return 'Fair';
    return 'Poor';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, nComponents, sampleSize } = await request.json();

        const eigenvalues = results.eigenvalues || [];
        const explainedVarianceRatio = results.explained_variance_ratio || [];
        const cumulativeVarianceRatio = results.cumulative_variance_ratio || [];
        const loadings = results.loadings || [];
        const variables = results.variables || [];
        const numComponents = results.n_components || nComponents || 1;
        
        const totalVariance = (cumulativeVarianceRatio[numComponents - 1] || 0) * 100;
        const kaiserComponents = eigenvalues.filter((ev: number) => ev > 1).length;
        const isGood = totalVariance >= 70;
        const pc1Variance = (explainedVarianceRatio[0] || 0) * 100;
        
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
            children: [new TextRun({ text: 'Principal Component Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${variables.length} Variables → ${numComponents} Components`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize} | ${totalVariance.toFixed(1)}% Variance Explained`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGood ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGood ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isGood 
                        ? 'Effective Dimension Reduction Achieved'
                        : 'Dimension Reduction Completed — Consider More Components',
                    bold: true, size: 24, font: 'Arial',
                    color: isGood ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Dimension Reduction: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${variables.length} variables → ${numComponents} components`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Total Variance Explained: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalVariance.toFixed(1)}% (${getVarianceLabel(totalVariance)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Kaiser Criterion: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${kaiserComponents} components with eigenvalue > 1`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `PC1 Contribution: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${pc1Variance.toFixed(1)}% of total variance`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        const ratio = (sampleSize / variables.length).toFixed(1);
        let apaText = `A principal component analysis was conducted on ${variables.length} variables with N = ${sampleSize} observations. `;
        apaText += `The subject-to-variable ratio was ${ratio}:1. `;
        apaText += `Based on ${nComponents ? 'the specified number' : 'the Kaiser criterion (eigenvalue > 1)'}, ${numComponents} components were extracted, `;
        apaText += `explaining ${totalVariance.toFixed(1)}% of the total variance. `;
        apaText += `The first principal component (PC1) explained ${pc1Variance.toFixed(1)}% of variance (λ = ${eigenvalues[0]?.toFixed(3) || 'N/A'}). `;
        
        if (numComponents > 1 && explainedVarianceRatio.length > 1) {
            apaText += `PC2 explained an additional ${(explainedVarianceRatio[1] * 100).toFixed(1)}% (λ = ${eigenvalues[1]?.toFixed(3) || 'N/A'}).`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Eigenvalues & Variance
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Eigenvalues & Variance Explained', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const eigenRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Component', true, 2000),
                    createTableCell('Eigenvalue', true, 2000),
                    createTableCell('% Variance', true, 2000),
                    createTableCell('Cumulative %', true, 2000)
                ]
            })
        ];

        eigenvalues.forEach((ev: number, i: number) => {
            const isRetained = i < numComponents;
            eigenRows.push(new TableRow({
                children: [
                    createTableCell(`PC${i + 1}`, false, 2000, { bold: isRetained }),
                    createTableCell(ev.toFixed(4), false, 2000, { bold: ev > 1 }),
                    createTableCell(`${(explainedVarianceRatio[i] * 100).toFixed(2)}%`, false, 2000),
                    createTableCell(`${(cumulativeVarianceRatio[i] * 100).toFixed(2)}%`, false, 2000, { highlight: i === numComponents - 1 })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2000, 2000, 2000, 2000], rows: eigenRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Components with eigenvalue > 1 (Kaiser criterion) are in bold. Retained components total is highlighted.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 3. Component Loadings
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Component Loadings', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Calculate column widths
        const varColWidth = 2500;
        const compColWidth = Math.floor((9000 - varColWidth) / numComponents);

        const loadingHeaderCells = [createTableCell('Variable', true, varColWidth, { align: AlignmentType.LEFT })];
        for (let i = 0; i < numComponents; i++) {
            loadingHeaderCells.push(createTableCell(`PC${i + 1}`, true, compColWidth));
        }

        const loadingRows: TableRow[] = [new TableRow({ tableHeader: true, children: loadingHeaderCells })];

        variables.forEach((variable: string, varIndex: number) => {
            const rowCells = [createTableCell(
                variable.length > 18 ? variable.substring(0, 18) + '...' : variable, 
                false, varColWidth, { align: AlignmentType.LEFT }
            )];
            
            for (let c = 0; c < numComponents; c++) {
                const loading = loadings[varIndex]?.[c] || 0;
                const isStrong = Math.abs(loading) >= 0.4;
                rowCells.push(createTableCell(
                    loading.toFixed(4), 
                    false, 
                    compColWidth, 
                    { bold: isStrong, color: isStrong ? COLORS.primary : undefined }
                ));
            }
            
            loadingRows.push(new TableRow({ children: rowCells }));
        });

        const loadingColWidths = [varColWidth, ...Array(numComponents).fill(compColWidth)];
        children.push(new Table({ columnWidths: loadingColWidths, rows: loadingRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Loadings ≥ |0.4| are highlighted in bold as meaningful contributions.', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Variance Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Variance Explained Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const varianceGuideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Cumulative Variance', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 90%', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(totalVariance >= 90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('80% - 89%', false, 3000),
                    createTableCell('Very Good', false, 3000),
                    createTableCell(totalVariance >= 80 && totalVariance < 90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('70% - 79%', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(totalVariance >= 70 && totalVariance < 80 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('60% - 69%', false, 3000),
                    createTableCell('Fair', false, 3000),
                    createTableCell(totalVariance >= 60 && totalVariance < 70 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 60%', false, 3000),
                    createTableCell('Poor', false, 3000),
                    createTableCell(totalVariance < 60 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: varianceGuideRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGood
            ? [
                `Successfully reduced ${variables.length} variables to ${numComponents} principal components.`,
                'Components are uncorrelated and can be used in subsequent analyses.',
                'Use component scores for regression, clustering, or visualization.',
                'Name each component based on high-loading variables.',
                'Consider the scree plot to verify the optimal number of components.'
            ]
            : [
                `Current solution explains ${totalVariance.toFixed(0)}% of variance — consider more components.`,
                'Examine the scree plot for the "elbow" to determine optimal components.',
                'Variables with low communalities may need review.',
                'Ensure adequate sample size (5-10 observations per variable).',
                'Check if variables are sufficiently correlated for PCA.'
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

        // 6. About PCA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Principal Component Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'PCA transforms correlated variables into uncorrelated principal components.',
            'Each component is a linear combination of original variables.',
            'Components are ordered by variance explained (PC1 explains most).',
            'Kaiser criterion: retain components with eigenvalue > 1.',
            'Loadings indicate how much each variable contributes to each component.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Principal Component Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="PCA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}



