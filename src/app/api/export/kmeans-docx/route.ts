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

const getSilhouetteLabel = (sil: number): string => {
    if (sil >= 0.7) return 'Excellent';
    if (sil >= 0.5) return 'Good';
    if (sil >= 0.25) return 'Fair';
    return 'Poor';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, nClusters, sampleSize } = await request.json();

        const clusteringSummary = results.clustering_summary || {};
        const profiles = results.profiles || {};
        const finalMetrics = results.final_metrics || {};
        const optimalK = results.optimal_k || {};
        const interpretations = results.interpretations || {};
        
        const numClusters = clusteringSummary.n_clusters || nClusters || 0;
        const inertia = clusteringSummary.inertia || 0;
        const silhouette = finalMetrics.silhouette || 0;
        const calinskiHarabasz = finalMetrics.calinski_harabasz || 0;
        const daviesBouldin = finalMetrics.davies_bouldin || 0;
        const recommendedK = optimalK.recommended_k;
        
        const isGood = silhouette >= 0.5;
        const totalPoints = Object.values(profiles).reduce((sum: number, p: any) => sum + (p.size || 0), 0);
        
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
            children: [new TextRun({ text: 'K-Means Clustering Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `k = ${numClusters} Clusters | ${selectedItems?.length || 0} Variables`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `N = ${sampleSize || totalPoints} Observations`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGood ? 'Well-Defined Clusters Identified' : 'Clusters Found — Quality Moderate',
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
                new TextRun({ text: `Segments Identified: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${numClusters} distinct clusters`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Silhouette Score: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${silhouette.toFixed(3)} (${getSilhouetteLabel(silhouette)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Data Points: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${totalPoints} observations clustered`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        if (recommendedK && recommendedK !== numClusters) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.warning }),
                    new TextRun({ text: `Elbow Recommendation: `, size: 22, font: 'Arial' }),
                    new TextRun({ text: `k = ${recommendedK} (consider testing)`, bold: true, size: 22, font: 'Arial', color: COLORS.warning })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `K-means cluster analysis was performed on ${selectedItems?.length || 0} variables using ${totalPoints} observations. `;
        apaText += `A ${numClusters}-cluster solution was selected${recommendedK ? ` (elbow method suggested k = ${recommendedK})` : ''}. `;
        apaText += `The silhouette coefficient was ${silhouette.toFixed(3)}, indicating ${getSilhouetteLabel(silhouette).toLowerCase()} cluster separation. `;
        apaText += `The Calinski-Harabasz index was ${calinskiHarabasz.toFixed(2)}, and the Davies-Bouldin index was ${daviesBouldin.toFixed(3)}. `;
        
        // Add cluster sizes
        const profileEntries = Object.entries(profiles);
        if (profileEntries.length > 0) {
            const clusterSizes = profileEntries.map(([name, p]: [string, any]) => `${name}: n = ${p.size} (${p.percentage?.toFixed(1) || 0}%)`).join('; ');
            apaText += `Cluster sizes were: ${clusterSizes}.`;
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Validation Metrics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Cluster Validation Metrics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const metricsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 3500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2000),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Silhouette Score', false, 3500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(silhouette.toFixed(4), false, 2000, { highlight: true }),
                    createTableCell(getSilhouetteLabel(silhouette) + ' separation', false, 3500, { color: isGood ? COLORS.success : COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Calinski-Harabasz Index', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(calinskiHarabasz.toFixed(2), false, 2000),
                    createTableCell('Higher = better defined', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Davies-Bouldin Index', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(daviesBouldin.toFixed(4), false, 2000),
                    createTableCell(daviesBouldin < 1 ? 'Good separation' : 'Some overlap', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Inertia (WCSS)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(inertia.toFixed(2), false, 2000),
                    createTableCell('Within-cluster variance', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3500, 2000, 3500], rows: metricsRows }));

        // 3. Cluster Profiles
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Cluster Profiles', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Cluster sizes table
        const sizeRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Cluster', true, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Size', true, 2000),
                    createTableCell('Percentage', true, 2000),
                    createTableCell('Status', true, 2000)
                ]
            })
        ];

        profileEntries.forEach(([name, profile]: [string, any]) => {
            const pct = profile.percentage || 0;
            const isSmall = pct < 10;
            sizeRows.push(new TableRow({
                children: [
                    createTableCell(name, false, 3000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(profile.size || 0), false, 2000),
                    createTableCell(`${pct.toFixed(1)}%`, false, 2000),
                    createTableCell(isSmall ? '⚠ Small' : '✓ OK', false, 2000, { color: isSmall ? COLORS.warning : COLORS.success })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [3000, 2000, 2000, 2000], rows: sizeRows }));

        // Centroids table (if variables provided)
        if (selectedItems && selectedItems.length > 0 && profileEntries.length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 },
                children: [new TextRun({ text: 'Cluster Centroids (Mean Values)', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
            }));

            // Calculate column widths based on number of variables
            const varColWidth = Math.floor(7000 / Math.min(selectedItems.length, 5));
            const clusterColWidth = 2000;

            const centroidHeaderCells = [createTableCell('Cluster', true, clusterColWidth, { align: AlignmentType.LEFT })];
            const displayVars = selectedItems.slice(0, 5); // Limit to 5 variables for table
            displayVars.forEach((v: string) => {
                centroidHeaderCells.push(createTableCell(v.length > 12 ? v.substring(0, 12) + '...' : v, true, varColWidth));
            });

            const centroidRows: TableRow[] = [new TableRow({ tableHeader: true, children: centroidHeaderCells })];

            profileEntries.forEach(([name, profile]: [string, any]) => {
                const rowCells = [createTableCell(name, false, clusterColWidth, { align: AlignmentType.LEFT, bold: true })];
                displayVars.forEach((v: string) => {
                    const value = profile.centroid?.[v];
                    rowCells.push(createTableCell(value !== undefined ? value.toFixed(3) : '—', false, varColWidth));
                });
                centroidRows.push(new TableRow({ children: rowCells }));
            });

            children.push(new Table({ columnWidths: [clusterColWidth, ...displayVars.map(() => varColWidth)], rows: centroidRows }));

            if (selectedItems.length > 5) {
                children.push(new Paragraph({
                    spacing: { before: 100 },
                    children: [new TextRun({ 
                        text: `Note: Showing first 5 of ${selectedItems.length} variables. See CSV export for complete centroids.`, 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 4. Silhouette Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Silhouette Score Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const silGuideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Silhouette Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.70 – 1.00', false, 3000),
                    createTableCell('Excellent separation', false, 3000),
                    createTableCell(silhouette >= 0.7 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.50 – 0.69', false, 3000),
                    createTableCell('Good separation', false, 3000),
                    createTableCell(silhouette >= 0.5 && silhouette < 0.7 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.25 – 0.49', false, 3000),
                    createTableCell('Fair separation', false, 3000),
                    createTableCell(silhouette >= 0.25 && silhouette < 0.5 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.25', false, 3000),
                    createTableCell('Poor separation', false, 3000),
                    createTableCell(silhouette < 0.25 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: silGuideRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGood
            ? [
                `${numClusters} well-defined clusters identified — suitable for strategic use.`,
                'Name each cluster based on centroid characteristics for communication.',
                'Use cluster assignments for targeted marketing or resource allocation.',
                'Validate clusters with domain experts to ensure business relevance.',
                'Consider profiling clusters with additional demographic or behavioral data.'
            ]
            : [
                `${numClusters} clusters found with moderate separation — use with caution.`,
                'Try different k values (elbow plot suggests testing alternatives).',
                'Consider removing outliers or highly correlated variables.',
                'Check if data needs preprocessing (scaling, transformation).',
                'Explore hierarchical clustering for comparison.'
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

        // 6. About K-Means Clustering
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About K-Means Clustering', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'K-Means partitions data into k clusters by minimizing within-cluster variance.',
            'Uses K-Means++ initialization for robust, reproducible results.',
            'Variables are standardized before clustering for equal weighting.',
            'Silhouette score measures how similar points are to their own cluster vs. others.',
            'Elbow method helps identify optimal k by finding diminishing returns in inertia.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'K-Means Clustering Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="KMeans_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}

