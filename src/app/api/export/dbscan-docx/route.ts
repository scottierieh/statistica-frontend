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

const getNoiseQuality = (noisePercent: number): string => {
    if (noisePercent <= 5) return 'Excellent';
    if (noisePercent <= 15) return 'Good';
    if (noisePercent <= 30) return 'Moderate';
    return 'High Noise';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, eps, minSamples, sampleSize } = await request.json();

        const nClusters = results.n_clusters || 0;
        const nNoise = results.n_noise || 0;
        const nSamples = results.n_samples || sampleSize || 0;
        const profiles = results.profiles || {};
        const interpretations = results.interpretations || {};
        
        const noisePercent = nSamples > 0 ? (nNoise / nSamples) * 100 : 0;
        const isGood = nClusters > 0 && noisePercent <= 30;
        const avgClusterSize = nClusters > 0 ? Math.floor((nSamples - nNoise) / nClusters) : 0;
        
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
            children: [new TextRun({ text: 'DBSCAN Clustering Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Density-Based Spatial Clustering', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `ε = ${eps} | min_samples = ${minSamples} | N = ${nSamples} | ${selectedItems?.length || 0} Variables`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: nClusters === 0 ? 'No Clusters Found' : `${nClusters} Cluster${nClusters > 1 ? 's' : ''} Identified`,
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
                new TextRun({ text: `Clusters Auto-Detected: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${nClusters}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ' (no pre-specification needed)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Noise Points: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${nNoise} (${noisePercent.toFixed(1)}%)`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` — ${getNoiseQuality(noisePercent)}`, size: 22, font: 'Arial', color: noisePercent <= 15 ? COLORS.success : COLORS.warning })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Average Cluster Size: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${avgClusterSize} points`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Algorithm: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `DBSCAN (Density-Based)`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `DBSCAN clustering was performed on ${selectedItems?.length || 0} variables using ${nSamples} observations. `;
        apaText += `The algorithm was configured with ε = ${eps} (neighborhood radius) and min_samples = ${minSamples} (core point threshold). `;
        
        if (nClusters === 0) {
            apaText += `No clusters were identified under these parameters. Consider adjusting ε or min_samples.`;
        } else {
            apaText += `The analysis identified ${nClusters} cluster${nClusters > 1 ? 's' : ''} and classified ${nNoise} points (${noisePercent.toFixed(1)}%) as noise/outliers. `;
            
            const profileEntries = Object.entries(profiles).filter(([name]) => name !== 'Noise');
            if (profileEntries.length > 0) {
                const sizes = profileEntries.map(([name, p]: [string, any]) => `${name}: n = ${p.size}`).join('; ');
                apaText += `Cluster sizes were: ${sizes}.`;
            }
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Clustering Results
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Clustering Results', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const summaryRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 4500, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Number of Clusters', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nClusters), false, 2500, { highlight: true, bold: true }),
                    createTableCell(nClusters === 0 ? 'Adjust params' : nClusters === 1 ? 'Single group' : 'Multiple groups', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Noise Points', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nNoise), false, 2500),
                    createTableCell('Outliers/sparse', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Noise Percentage', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(`${noisePercent.toFixed(1)}%`, false, 2500),
                    createTableCell(getNoiseQuality(noisePercent), false, 2000, { color: noisePercent <= 15 ? COLORS.success : COLORS.warning })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Total Observations', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nSamples), false, 2500),
                    createTableCell('Sample size', false, 2000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Clustered Points', false, 4500, { align: AlignmentType.LEFT }),
                    createTableCell(String(nSamples - nNoise), false, 2500),
                    createTableCell(`${((nSamples - nNoise) / nSamples * 100).toFixed(1)}% of data`, false, 2000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4500, 2500, 2000], rows: summaryRows }));

        // 3. Cluster Profiles
        if (nClusters > 0) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '3. Cluster Profiles', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            // Cluster sizes table
            const profileEntries = Object.entries(profiles).filter(([name]) => name !== 'Noise');
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

            // Add noise row if exists
            if (nNoise > 0) {
                sizeRows.push(new TableRow({
                    children: [
                        createTableCell('Noise', false, 3000, { align: AlignmentType.LEFT, bold: true }),
                        createTableCell(String(nNoise), false, 2000),
                        createTableCell(`${noisePercent.toFixed(1)}%`, false, 2000),
                        createTableCell('Outliers', false, 2000, { color: COLORS.warning })
                    ]
                }));
            }

            children.push(new Table({ columnWidths: [3000, 2000, 2000, 2000], rows: sizeRows }));

            // Centroids table (if variables provided)
            if (selectedItems && selectedItems.length > 0 && profileEntries.length > 0) {
                children.push(new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                    children: [new TextRun({ text: 'Cluster Centroids (Mean Values)', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
                }));

                const displayVars = selectedItems.slice(0, 5);
                const varColWidth = Math.floor(7000 / Math.min(displayVars.length, 5));
                const clusterColWidth = 2000;

                const centroidHeaderCells = [createTableCell('Cluster', true, clusterColWidth, { align: AlignmentType.LEFT })];
                displayVars.forEach((v: string) => {
                    centroidHeaderCells.push(createTableCell(v.length > 12 ? v.substring(0, 12) + '...' : v, true, varColWidth));
                });

                const centroidRows: TableRow[] = [new TableRow({ tableHeader: true, children: centroidHeaderCells })];

                profileEntries.forEach(([name, profile]: [string, any]) => {
                    const rowCells = [createTableCell(name, false, clusterColWidth, { align: AlignmentType.LEFT, bold: true })];
                    displayVars.forEach((v: string) => {
                        const value = profile.centroid?.[v];
                        rowCells.push(createTableCell(value !== undefined ? Number(value).toFixed(3) : '—', false, varColWidth));
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
        }

        // 4. Parameter Interpretation
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: nClusters > 0 ? '4. Parameter Interpretation' : '3. Parameter Interpretation', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const paramRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Parameter', true, 3000),
                    createTableCell('Value', true, 2000),
                    createTableCell('Effect', true, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Epsilon (ε)', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(eps), false, 2000, { highlight: true }),
                    createTableCell(eps < 0.3 ? 'Small: many tight clusters' : eps > 1 ? 'Large: fewer, merged clusters' : 'Moderate: balanced clustering', false, 4000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Min Samples', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell(String(minSamples), false, 2000, { highlight: true }),
                    createTableCell(minSamples > 10 ? 'High: stricter cores, more noise' : minSamples < 3 ? 'Low: lenient cores' : 'Moderate: balanced threshold', false, 4000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 2000, 4000], rows: paramRows }));

        // 5. DBSCAN vs K-Means
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: nClusters > 0 ? '5. DBSCAN vs K-Means' : '4. DBSCAN vs K-Means', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const comparisonRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Aspect', true, 3000),
                    createTableCell('DBSCAN', true, 3000),
                    createTableCell('K-Means', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Cluster Count', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Auto-detected', false, 3000, { color: COLORS.success }),
                    createTableCell('Must specify k', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Cluster Shape', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Any shape', false, 3000, { color: COLORS.success }),
                    createTableCell('Spherical only', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Outlier Handling', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Identifies noise', false, 3000, { color: COLORS.success }),
                    createTableCell('Forces assignment', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Parameters', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('ε, min_samples', false, 3000),
                    createTableCell('k only', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Best For', false, 3000, { align: AlignmentType.LEFT }),
                    createTableCell('Unknown structure', false, 3000),
                    createTableCell('Known cluster count', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: comparisonRows }));

        // 6. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: nClusters > 0 ? '6. Recommendations' : '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = nClusters === 0
            ? [
                'No clusters found — try increasing ε (neighborhood radius).',
                'Consider decreasing min_samples for more lenient core points.',
                'Check if data requires normalization/standardization.',
                'Visualize data to understand its distribution.',
                'Compare with K-Means to see if spherical clusters exist.'
            ]
            : isGood
            ? [
                `${nClusters} clusters successfully identified — suitable for analysis.`,
                'Review noise points for potential data quality issues.',
                'Name each cluster based on centroid characteristics.',
                'Use cluster assignments for targeted strategies.',
                'Consider profiling clusters with additional variables.'
            ]
            : [
                `High noise rate (${noisePercent.toFixed(1)}%) — consider parameter tuning.`,
                'Try larger ε to capture more points in clusters.',
                'Lower min_samples may reduce noise classification.',
                'Review individual noise points for patterns.',
                'Check if data contains distinct density regions.'
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

        // 7. About DBSCAN
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: nClusters > 0 ? '7. About DBSCAN' : '6. About DBSCAN', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'DBSCAN = Density-Based Spatial Clustering of Applications with Noise.',
            'Groups points that are closely packed (within ε distance).',
            'Core points have at least min_samples neighbors within ε.',
            'Border points are within ε of a core point but have fewer neighbors.',
            'Noise points don\'t belong to any cluster — potential outliers.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'DBSCAN Clustering Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new  NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="DBSCAN_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


