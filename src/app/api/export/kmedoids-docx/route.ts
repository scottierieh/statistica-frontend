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
        const interpretations = results.interpretations || {};
        const medoids = clusteringSummary.medoids || [];
        
        const numClusters = clusteringSummary.n_clusters || nClusters || 0;
        const inertia = clusteringSummary.inertia || 0;
        const silhouette = finalMetrics.silhouette || 0;
        const calinskiHarabasz = finalMetrics.calinski_harabasz || 0;
        const daviesBouldin = finalMetrics.davies_bouldin || 0;
        
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
            children: [new TextRun({ text: 'K-Medoids Clustering Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Partitioning Around Medoids (PAM)', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `k = ${numClusters} Clusters | ${selectedItems?.length || 0} Variables | N = ${sampleSize || totalPoints}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                new TextRun({ text: `Algorithm: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `PAM (Partitioning Around Medoids)`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Clusters Found: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${numClusters} distinct groups`, bold: true, size: 22, font: 'Arial' })
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

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Advantage: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `More robust to outliers than K-Means`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `K-medoids cluster analysis (PAM algorithm) was performed on ${selectedItems?.length || 0} variables using ${totalPoints} observations. `;
        apaText += `A ${numClusters}-cluster solution was extracted. `;
        apaText += `The silhouette coefficient was ${silhouette.toFixed(3)}, indicating ${getSilhouetteLabel(silhouette).toLowerCase()} cluster separation. `;
        apaText += `The Calinski-Harabasz index was ${calinskiHarabasz.toFixed(2)}, and the Davies-Bouldin index was ${daviesBouldin.toFixed(3)}. `;
        apaText += `Unlike K-means, K-medoids uses actual data points (medoids) as cluster centers, making it more robust to outliers and providing interpretable exemplars for each cluster.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Cluster Validation Metrics
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
                    createTableCell('Inertia (Sum of Distances)', false, 3500, { align: AlignmentType.LEFT }),
                    createTableCell(inertia.toFixed(2), false, 2000),
                    createTableCell('Total within-cluster dissimilarity', false, 3500)
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
        const profileEntries = Object.entries(profiles);
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

        // 4. Medoids (Cluster Exemplars)
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Medoids (Cluster Exemplars)', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ 
                text: 'Unlike K-Means centroids, medoids are actual data points from your dataset. They represent the most "central" observation in each cluster.', 
                size: 22, font: 'Arial', color: COLORS.secondary 
            })]
        }));

        if (medoids.length > 0 && selectedItems && selectedItems.length > 0) {
            const displayVars = selectedItems.slice(0, 5);
            const varColWidth = Math.floor(7000 / Math.min(displayVars.length, 5));
            const clusterColWidth = 2000;

            const medoidHeaderCells = [createTableCell('Cluster', true, clusterColWidth, { align: AlignmentType.LEFT })];
            displayVars.forEach((v: string) => {
                medoidHeaderCells.push(createTableCell(v.length > 12 ? v.substring(0, 12) + '...' : v, true, varColWidth));
            });

            const medoidRows: TableRow[] = [new TableRow({ tableHeader: true, children: medoidHeaderCells })];

            medoids.forEach((medoid: any, idx: number) => {
                const rowCells = [createTableCell(`Cluster ${idx + 1}`, false, clusterColWidth, { align: AlignmentType.LEFT, bold: true })];
                displayVars.forEach((v: string) => {
                    const value = medoid[v];
                    rowCells.push(createTableCell(value !== undefined ? Number(value).toFixed(3) : '—', false, varColWidth));
                });
                medoidRows.push(new TableRow({ children: rowCells }));
            });

            children.push(new Table({ columnWidths: [clusterColWidth, ...displayVars.map(() => varColWidth)], rows: medoidRows }));

            if (selectedItems.length > 5) {
                children.push(new Paragraph({
                    spacing: { before: 100 },
                    children: [new TextRun({ 
                        text: `Note: Showing first 5 of ${selectedItems.length} variables. See CSV export for complete medoids.`, 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 5. K-Medoids vs K-Means Comparison
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. K-Medoids vs K-Means', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const comparisonRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Aspect', true, 3000),
                    createTableCell('K-Medoids (PAM)', true, 3000),
                    createTableCell('K-Means', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Cluster Center', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Actual data point (medoid)', false, 3000),
                    createTableCell('Computed average (centroid)', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Outlier Robustness', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('More robust', false, 3000, { color: COLORS.success }),
                    createTableCell('Sensitive to outliers', false, 3000, { color: COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Interpretability', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Centers are real examples', false, 3000, { color: COLORS.success }),
                    createTableCell('Centers may not exist in data', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Computation', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Slower (O(n²))', false, 3000),
                    createTableCell('Faster', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Best For', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Noisy data, small-medium N', false, 3000),
                    createTableCell('Large datasets, clean data', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: comparisonRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGood
            ? [
                `${numClusters} well-defined clusters identified — suitable for strategic use.`,
                'Use medoids as "prototype" examples representing each segment.',
                'Communicate findings using medoid characteristics for each cluster.',
                'Validate clusters with domain experts for business relevance.',
                'Consider profiling clusters with additional categorical variables.'
            ]
            : [
                `${numClusters} clusters found with moderate separation — use with caution.`,
                'Try different k values to find clearer group boundaries.',
                'Check for outliers that may be affecting cluster quality.',
                'Consider removing highly correlated variables.',
                'Compare with K-Means results to assess robustness.'
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

        // 7. About K-Medoids
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '7. About K-Medoids Clustering', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'K-Medoids (PAM) partitions data into k clusters using actual data points as centers.',
            'Medoids are selected to minimize total dissimilarity to other points in the cluster.',
            'More robust to outliers than K-Means because medoids are not influenced by extreme values.',
            'Silhouette score measures how similar points are to their own cluster vs. others.',
            'Use when interpretability of cluster centers is important or data contains outliers.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'K-Medoids Clustering Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="KMedoids_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


