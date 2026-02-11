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

const getSilhouetteLabel = (s: number): string => {
    if (s >= 0.7) return 'Excellent';
    if (s >= 0.5) return 'Good';
    if (s >= 0.25) return 'Fair';
    return 'Weak';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, linkageMethod, distanceMetric, sampleSize, plot } = await request.json();

        const nClusters = results.n_clusters || 0;
        const profiles = results.profiles || {};
        const finalMetrics = results.final_metrics || {};
        const interpretations = results.interpretations || {};
        const optimalK = results.optimal_k_recommendation || {};
        
        const silhouette = finalMetrics.silhouette || 0;
        const calinskiHarabasz = finalMetrics.calinski_harabasz || 0;
        const daviesBouldin = finalMetrics.davies_bouldin || 0;
        
        const isGoodQuality = silhouette >= 0.5;
        const numVariables = selectedItems?.length || Object.keys(profiles[Object.keys(profiles)[0]]?.centroid || {}).length;
        
        const sortedProfiles = Object.entries(profiles).sort((a: any, b: any) => b[1].size - a[1].size);
        const largestCluster = sortedProfiles[0];
        
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Clustering Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Hierarchical Cluster Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Agglomerative Clustering with Dendrogram Visualization', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${nClusters} Clusters | ${numVariables} Variables | N = ${sampleSize}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isGoodQuality ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isGoodQuality ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isGoodQuality 
                        ? 'Good Cluster Quality'
                        : 'Moderate Cluster Quality',
                    bold: true, size: 24, font: 'Arial',
                    color: isGoodQuality ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Clusters Identified: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${nClusters}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ' distinct groups in the data', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Silhouette Score: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${silhouette.toFixed(3)}`, bold: true, size: 22, font: 'Arial', color: isGoodQuality ? COLORS.success : COLORS.warning }),
                new TextRun({ text: ` (${getSilhouetteLabel(silhouette)} separation)`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (largestCluster) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Largest Cluster: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: `${largestCluster[0]}`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` (${(largestCluster[1] as any).percentage.toFixed(1)}% of observations)`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Method: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${linkageMethod || 'Ward'}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` linkage with ${distanceMetric || 'Euclidean'} distance`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A hierarchical cluster analysis was conducted using ${linkageMethod || 'Ward'} linkage with ${distanceMetric || 'Euclidean'} distance metric on ${numVariables} variables. `;
        apaText += `The analysis identified ${nClusters} clusters from ${sampleSize} observations. `;
        apaText += `Cluster quality was assessed using multiple metrics: silhouette coefficient = ${silhouette.toFixed(3)}, `;
        apaText += `Calinski-Harabasz index = ${calinskiHarabasz.toFixed(1)}, and Davies-Bouldin index = ${daviesBouldin.toFixed(3)}. `;
        apaText += `The silhouette score indicates ${getSilhouetteLabel(silhouette).toLowerCase()} cluster separation.`;

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
                    createTableCell('Metric', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2000),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Silhouette Score', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(silhouette.toFixed(4), false, 2000, { bold: true, highlight: true, color: isGoodQuality ? COLORS.success : COLORS.warning }),
                    createTableCell(`${getSilhouetteLabel(silhouette)} (-1 to 1, higher is better)`, false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Calinski-Harabasz Index', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(calinskiHarabasz.toFixed(2), false, 2000, { bold: true }),
                    createTableCell('Higher is better (no upper bound)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Davies-Bouldin Index', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(daviesBouldin.toFixed(4), false, 2000, { bold: true }),
                    createTableCell('Lower is better (minimum 0)', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Number of Clusters', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(String(nClusters), false, 2000, { bold: true }),
                    createTableCell('Groups identified', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2000, 3500], rows: metricsRows }));

        // 3. Cluster Profiles
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Cluster Profiles', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ 
                text: 'Each cluster is characterized by its centroid (mean values) across the selected variables.', 
                size: 20, font: 'Arial', color: COLORS.gray 
            })]
        }));

        // Profile summary table
        const profileRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Cluster', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Size', true, 1500),
                    createTableCell('Percentage', true, 1500),
                    createTableCell('Characteristics', true, 4000, { align: AlignmentType.LEFT })
                ]
            })
        ];

        sortedProfiles.forEach(([name, profile]: [string, any]) => {
            // Find distinguishing characteristics
            const centroid = profile.centroid || {};
            const sortedFeatures = Object.entries(centroid).sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1]));
            const topFeatures = sortedFeatures.slice(0, 2).map(([f, v]: [string, any]) => `${f}: ${v.toFixed(2)}`).join(', ');
            
            profileRows.push(new TableRow({
                children: [
                    createTableCell(name, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(String(profile.size), false, 1500),
                    createTableCell(`${profile.percentage.toFixed(1)}%`, false, 1500, { highlight: true }),
                    createTableCell(topFeatures || 'N/A', false, 4000, { align: AlignmentType.LEFT })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2500, 1500, 1500, 4000], rows: profileRows }));

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
                    createTableCell('Score Range', true, 2500),
                    createTableCell('Quality', true, 2500),
                    createTableCell('Your Result', true, 4500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.70 - 1.00', false, 2500),
                    createTableCell('Excellent', false, 2500, { color: COLORS.success }),
                    createTableCell(silhouette >= 0.7 ? `<-- Your result (${silhouette.toFixed(3)})` : '', false, 4500, { color: COLORS.success })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.50 - 0.70', false, 2500),
                    createTableCell('Good', false, 2500, { color: COLORS.primary }),
                    createTableCell(silhouette >= 0.5 && silhouette < 0.7 ? `<-- Your result (${silhouette.toFixed(3)})` : '', false, 4500, { color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.25 - 0.50', false, 2500),
                    createTableCell('Fair', false, 2500, { color: COLORS.warning }),
                    createTableCell(silhouette >= 0.25 && silhouette < 0.5 ? `<-- Your result (${silhouette.toFixed(3)})` : '', false, 4500, { color: COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.25', false, 2500),
                    createTableCell('Weak', false, 2500, { color: COLORS.danger }),
                    createTableCell(silhouette < 0.25 ? `<-- Your result (${silhouette.toFixed(3)})` : '', false, 4500, { color: COLORS.danger })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [2500, 2500, 4500], rows: silGuideRows }));

        // 5. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Dendrogram & Visualizations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'The dendrogram shows the hierarchical structure of cluster formation.', 
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
                            transformation: { width: 550, height: 450 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 6. Optimal K Recommendations (if available)
        const recSectionNum = plot ? 6 : 5;
        
        if (Object.keys(optimalK).length > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: `${recSectionNum}. Optimal K Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            const kRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Method', true, 4500, { align: AlignmentType.LEFT }),
                        createTableCell('Recommended K', true, 4500)
                    ]
                })
            ];

            Object.entries(optimalK).forEach(([method, k]) => {
                kRows.push(new TableRow({
                    children: [
                        createTableCell(method, false, 4500, { align: AlignmentType.LEFT }),
                        createTableCell(String(k), false, 4500, { bold: true })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [4500, 4500], rows: kRows }));
        }

        // Recommendations
        const finalRecSection = Object.keys(optimalK).length > 0 ? recSectionNum + 1 : recSectionNum;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${finalRecSection}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isGoodQuality
            ? [
                'Cluster structure is well-defined and interpretable.',
                'Use cluster assignments for segmentation or downstream analysis.',
                'Profile each cluster to understand distinguishing characteristics.',
                'Consider cluster stability across different random seeds.',
                'Document linkage method and distance metric for reproducibility.'
            ]
            : [
                'Cluster separation is moderate - interpret with caution.',
                'Consider trying different numbers of clusters.',
                'Experiment with alternative linkage methods (Ward, Complete, Average).',
                'Try different distance metrics if appropriate.',
                'Scale or normalize variables before clustering.'
            ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: isGoodQuality ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // About HCA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${finalRecSection + 1}. About Hierarchical Clustering`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'HCA builds a hierarchy of clusters through agglomerative (bottom-up) merging.',
            'Ward linkage minimizes within-cluster variance - often produces balanced clusters.',
            'Complete linkage uses maximum distance - tends to find compact clusters.',
            'Silhouette score measures how similar points are to their own cluster vs others.',
            'The dendrogram visualizes the nested grouping structure at all levels.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Hierarchical Cluster Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="HCA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}