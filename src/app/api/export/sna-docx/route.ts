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

const getDensityLabel = (density: number): string => {
    if (density >= 0.5) return 'Dense';
    if (density >= 0.3) return 'Moderately Connected';
    if (density >= 0.1) return 'Sparse';
    return 'Very Sparse';
};

export async function POST(request: NextRequest) {
    try {
        const { results, sourceCol, targetCol, weightCol, isDirected, plot } = await request.json();

        const metrics = results.metrics || {};
        const topNodes = results.top_nodes || {};
        const communities = results.communities || [];
        const centrality = results.centrality || {};
        
        const nodes = metrics.nodes || 0;
        const edges = metrics.edges || 0;
        const density = metrics.density || 0;
        const isConnected = metrics.is_connected || false;
        const components = metrics.components || 1;
        
        const topDegree = topNodes.degree || [];
        const topBetweenness = topNodes.betweenness || [];
        const topCloseness = topNodes.closeness || [];
        const topEigenvector = topNodes.eigenvector || [];
        
        const children: (Paragraph | Table)[] = [];

        // Title
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'Network Analysis Report', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: 'Social Network Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Graph Structure, Centrality Measures & Community Detection', size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${nodes} Nodes | ${edges} Edges | ${communities.length} Communities | ${isDirected ? 'Directed' : 'Undirected'}`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isConnected ? '✓ ' : '△ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isConnected ? COLORS.success : COLORS.warning 
                }),
                new TextRun({ 
                    text: isConnected 
                        ? 'Connected Network'
                        : 'Fragmented Network',
                    bold: true, size: 24, font: 'Arial',
                    color: isConnected ? COLORS.success : COLORS.warning
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Network Size: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${nodes} nodes`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` connected by `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${edges} edges`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Network Density: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${(density * 100).toFixed(2)}%`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ` (${getDensityLabel(density)})`, size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: 'Communities Detected: ', size: 22, font: 'Arial' }),
                new TextRun({ text: `${communities.length}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: ' distinct groups', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        if (topDegree.length > 0) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Most Connected Node: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: `${topDegree[0][0]}`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` (degree: ${topDegree[0][1].toFixed(3)})`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        if (topBetweenness.length > 0) {
            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                    new TextRun({ text: 'Key Bridge Node: ', size: 22, font: 'Arial' }),
                    new TextRun({ text: `${topBetweenness[0][0]}`, bold: true, size: 22, font: 'Arial' }),
                    new TextRun({ text: ` (betweenness: ${topBetweenness[0][1].toFixed(3)})`, size: 22, font: 'Arial', color: COLORS.gray })
                ]
            }));
        }

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `A social network analysis was conducted on an ${isDirected ? 'directed' : 'undirected'} network consisting of N = ${nodes} nodes and E = ${edges} edges. `;
        apaText += `The edge list was derived from the ${sourceCol} to ${targetCol} relationship${weightCol ? `, weighted by ${weightCol}` : ''}. `;
        apaText += `Network density was ${density.toFixed(4)} (${(density * 100).toFixed(1)}%), indicating ${getDensityLabel(density).toLowerCase()} connectivity. `;
        apaText += `The network ${isConnected ? 'was fully connected' : `comprised ${components} disconnected components`}. `;
        
        if (topDegree.length > 0) {
            apaText += `Centrality analysis identified ${topDegree[0][0]} as the most connected node (degree centrality = ${topDegree[0][1].toFixed(3)}). `;
        }
        
        apaText += `Community detection using the Louvain algorithm revealed ${communities.length} distinct communities.`;

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Network Metrics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Network Metrics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const metricsRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Metric', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Number of Nodes', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(String(nodes), false, 2500, { bold: true, highlight: true }),
                    createTableCell('Unique entities', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Number of Edges', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(String(edges), false, 2500, { bold: true }),
                    createTableCell('Connections between nodes', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Network Density', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(`${(density * 100).toFixed(2)}%`, false, 2500, { bold: true }),
                    createTableCell(getDensityLabel(density), false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Is Connected', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(isConnected ? 'Yes' : 'No', false, 2500, { color: isConnected ? COLORS.success : COLORS.warning }),
                    createTableCell(isConnected ? 'All nodes reachable' : 'Has isolated components', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Number of Components', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(String(components), false, 2500),
                    createTableCell('Disconnected subgraphs', false, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Graph Type', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(isDirected ? 'Directed' : 'Undirected', false, 2500),
                    createTableCell(isDirected ? 'A->B differs from B->A' : 'Symmetric connections', false, 3000)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 3000], rows: metricsRows }));

        // 3. Centrality Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Centrality Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        // Degree Centrality
        if (topDegree.length > 0) {
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: 'Top Nodes by Degree Centrality', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ text: 'Measures how many direct connections a node has. High degree = popular or hub node.', size: 20, font: 'Arial', color: COLORS.gray })]
            }));

            const degreeRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Rank', true, 1000),
                        createTableCell('Node', true, 4500, { align: AlignmentType.LEFT }),
                        createTableCell('Degree Centrality', true, 3000)
                    ]
                })
            ];

            topDegree.slice(0, 10).forEach(([node, value]: [string, number], idx: number) => {
                degreeRows.push(new TableRow({
                    children: [
                        createTableCell(String(idx + 1), false, 1000),
                        createTableCell(node, false, 4500, { align: AlignmentType.LEFT, bold: idx < 3 }),
                        createTableCell(value.toFixed(4), false, 3000, { bold: idx === 0 })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [1000, 4500, 3000], rows: degreeRows }));
        }

        // Betweenness Centrality
        if (topBetweenness.length > 0) {
            children.push(new Paragraph({
                spacing: { before: 300, after: 100 },
                children: [new TextRun({ text: 'Top Nodes by Betweenness Centrality', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ text: 'Measures how often a node lies on shortest paths. High betweenness = bridge or gatekeeper.', size: 20, font: 'Arial', color: COLORS.gray })]
            }));

            const betweennessRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Rank', true, 1000),
                        createTableCell('Node', true, 4500, { align: AlignmentType.LEFT }),
                        createTableCell('Betweenness', true, 3000)
                    ]
                })
            ];

            topBetweenness.slice(0, 10).forEach(([node, value]: [string, number], idx: number) => {
                betweennessRows.push(new TableRow({
                    children: [
                        createTableCell(String(idx + 1), false, 1000),
                        createTableCell(node, false, 4500, { align: AlignmentType.LEFT, bold: idx < 3 }),
                        createTableCell(value.toFixed(4), false, 3000, { bold: idx === 0 })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [1000, 4500, 3000], rows: betweennessRows }));
        }

        // 4. Community Detection
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Community Detection', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ 
                text: `Louvain algorithm detected ${communities.length} communities in the network.`, 
                size: 22, font: 'Arial' 
            })]
        }));

        if (communities.length > 0) {
            const commRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Community', true, 2000),
                        createTableCell('Size', true, 1500),
                        createTableCell('Members (Sample)', true, 6000, { align: AlignmentType.LEFT })
                    ]
                })
            ];

            communities.slice(0, 10).forEach((community: string[], idx: number) => {
                const memberSample = community.slice(0, 5).join(', ');
                const suffix = community.length > 5 ? `, +${community.length - 5} more` : '';
                
                commRows.push(new TableRow({
                    children: [
                        createTableCell(`Community ${idx + 1}`, false, 2000, { bold: true }),
                        createTableCell(String(community.length), false, 1500, { highlight: true }),
                        createTableCell(memberSample + suffix, false, 6000, { align: AlignmentType.LEFT })
                    ]
                }));
            });

            children.push(new Table({ columnWidths: [2000, 1500, 6000], rows: commRows }));

            if (communities.length > 10) {
                children.push(new Paragraph({
                    spacing: { before: 100 },
                    children: [new TextRun({ 
                        text: `Showing 10 of ${communities.length} communities.`, 
                        size: 18, font: 'Arial', color: COLORS.gray, italics: true 
                    })]
                }));
            }
        }

        // 5. Visualization (if available)
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [new TextRun({ text: '5. Network Visualization', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ 
                    text: 'Node size represents degree centrality. Colors indicate community membership.', 
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
                            transformation: { width: 550, height: 400 },
                            type: 'png'
                        })
                    ]
                }));
            } catch (e) {
                console.error('Image processing error:', e);
            }
        }

        // 6. Recommendations
        const recSectionNum = plot ? 6 : 5;
        
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum}. Recommendations`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = density >= 0.3
            ? [
                'Network is well-connected with high collaboration.',
                'Focus on maintaining existing connections.',
                'Monitor for potential cliques or echo chambers.',
                `Key influencer: ${topDegree[0]?.[0] || 'N/A'} - consider for leadership roles.`,
                `Bridge node: ${topBetweenness[0]?.[0] || 'N/A'} - critical for information flow.`
            ]
            : density >= 0.1
                ? [
                    'Network has moderate connectivity.',
                    'Consider connecting isolated nodes to improve flow.',
                    `${communities.length} communities suggest natural groupings.`,
                    `Bridge node ${topBetweenness[0]?.[0] || 'N/A'} connects different groups.`,
                    'Facilitate cross-community interactions.'
                ]
                : [
                    'Network is sparse with limited connections.',
                    'Prioritize building more connections.',
                    `Connect isolated components (${components} found).`,
                    'Identify and empower potential bridge nodes.',
                    'Consider targeted interventions to increase density.'
                ];

        recommendations.forEach((rec, idx) => {
            children.push(new Paragraph({
                spacing: { after: 80 },
                children: [
                    new TextRun({ text: `${idx + 1}. `, bold: true, size: 22, font: 'Arial', color: density >= 0.1 ? COLORS.success : COLORS.warning }),
                    new TextRun({ text: rec, size: 22, font: 'Arial' })
                ]
            }));
        });

        // 7. About SNA
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: `${recSectionNum + 1}. About Social Network Analysis`, bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            'SNA studies relationships and flows between entities (nodes) connected by links (edges).',
            'Degree centrality measures direct connections - identifies popular/hub nodes.',
            'Betweenness centrality identifies bridge nodes controlling information flow.',
            'Closeness centrality measures efficiency of reaching other nodes.',
            'Community detection groups nodes with stronger internal connections.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Social Network Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="SNA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}
