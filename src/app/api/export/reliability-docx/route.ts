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

const getAlphaLabel = (alpha: number): string => {
    if (alpha >= 0.9) return 'Excellent';
    if (alpha >= 0.8) return 'Good';
    if (alpha >= 0.7) return 'Acceptable';
    if (alpha >= 0.6) return 'Questionable';
    if (alpha >= 0.5) return 'Poor';
    return 'Unacceptable';
};

export async function POST(request: NextRequest) {
    try {
        const { results, selectedItems, sampleSize } = await request.json();

        const alpha = results.alpha || 0;
        const nItems = results.n_items || 0;
        const nCases = results.n_cases || sampleSize || 0;
        const confidenceInterval = results.confidence_interval || [0, 0];
        const sem = results.sem || 0;
        const scaleStats = results.scale_statistics || {};
        const itemStats = results.item_statistics || {};
        
        const isAcceptable = alpha >= 0.7;
        
        // Identify problematic items
        const alphaIfDeleted = itemStats.alpha_if_deleted || {};
        const problematicItems = Object.entries(alphaIfDeleted)
            .filter(([_, aid]) => (aid as number) > alpha)
            .map(([item, aid]) => ({ item, alphaIfDeleted: aid as number }));
        
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
            children: [new TextRun({ text: 'Reliability Analysis', bold: true, size: 48, font: 'Arial', color: COLORS.primaryDark })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `Cronbach's Alpha Internal Consistency`, size: 24, font: 'Arial', color: COLORS.secondary })]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `${nItems} Items | N = ${nCases} Cases`, size: 22, font: 'Arial', color: COLORS.gray })]
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
                    text: isAcceptable ? '✓ ' : '✗ ', 
                    bold: true, size: 28, font: 'Arial', 
                    color: isAcceptable ? COLORS.success : COLORS.danger 
                }),
                new TextRun({ 
                    text: isAcceptable 
                        ? `Scale Reliability is ${getAlphaLabel(alpha)}`
                        : `Scale Reliability Needs Improvement`,
                    bold: true, size: 24, font: 'Arial',
                    color: isAcceptable ? COLORS.success : COLORS.danger
                })
            ]
        }));

        // Key findings
        children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Cronbach's Alpha: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${alpha.toFixed(3)} (${getAlphaLabel(alpha)})`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `95% Confidence Interval: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `[${confidenceInterval[0].toFixed(3)}, ${confidenceInterval[1].toFixed(3)}]`, bold: true, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Average Inter-Item Correlation: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${(scaleStats.avg_inter_item_correlation || 0).toFixed(3)}`, bold: true, size: 22, font: 'Arial' }),
                new TextRun({ text: (scaleStats.avg_inter_item_correlation || 0) >= 0.3 ? ' (Good coherence)' : ' (Low coherence)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({ text: '• ', bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
                new TextRun({ text: `Items to Review: `, size: 22, font: 'Arial' }),
                new TextRun({ text: `${problematicItems.length}`, bold: true, size: 22, font: 'Arial', color: problematicItems.length > 0 ? COLORS.warning : COLORS.success }),
                new TextRun({ text: problematicItems.length > 0 ? ' (would improve α if removed)' : ' (all items contribute positively)', size: 22, font: 'Arial', color: COLORS.gray })
            ]
        }));

        // APA Format Summary
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [new TextRun({ text: 'APA Format Summary', bold: true, size: 26, font: 'Arial', color: COLORS.primary })]
        }));

        let apaText = `Internal consistency reliability was assessed using Cronbach's alpha. `;
        apaText += `The ${nItems}-item scale demonstrated ${getAlphaLabel(alpha).toLowerCase()} internal consistency, α = ${alpha.toFixed(2)}, 95% CI [${confidenceInterval[0].toFixed(2)}, ${confidenceInterval[1].toFixed(2)}]. `;
        apaText += `The average inter-item correlation was r = ${(scaleStats.avg_inter_item_correlation || 0).toFixed(2)}, `;
        apaText += (scaleStats.avg_inter_item_correlation || 0) >= 0.3 
            ? 'indicating adequate item homogeneity. '
            : 'suggesting items may measure different aspects of the construct. ';
        
        if (problematicItems.length > 0) {
            apaText += `Examination of the item-total statistics indicated that removing ${problematicItems.length} item${problematicItems.length > 1 ? 's' : ''} would improve scale reliability.`;
        } else {
            apaText += 'All items contributed positively to scale reliability.';
        }

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: apaText, size: 22, font: 'Arial', italics: true })]
        }));

        // 2. Scale Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '2. Scale Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const scaleRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Statistic', true, 4000, { align: AlignmentType.LEFT }),
                    createTableCell('Value', true, 2500),
                    createTableCell('Interpretation', true, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell("Cronbach's Alpha", false, 4000, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(alpha.toFixed(4), false, 2500, { highlight: true }),
                    createTableCell(getAlphaLabel(alpha), false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('95% CI Lower', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(confidenceInterval[0].toFixed(4), false, 2500),
                    createTableCell('', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('95% CI Upper', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(confidenceInterval[1].toFixed(4), false, 2500),
                    createTableCell('', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Standard Error of Measurement', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell(sem.toFixed(4), false, 2500),
                    createTableCell('Lower = more precise', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Avg Inter-Item Correlation', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell((scaleStats.avg_inter_item_correlation || 0).toFixed(4), false, 2500),
                    createTableCell((scaleStats.avg_inter_item_correlation || 0) >= 0.3 ? 'Good coherence' : 'Low coherence', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Scale Mean', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell((scaleStats.mean || 0).toFixed(4), false, 2500),
                    createTableCell('', false, 3500)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('Scale Std. Deviation', false, 4000, { align: AlignmentType.LEFT }),
                    createTableCell((scaleStats.std || 0).toFixed(4), false, 2500),
                    createTableCell('', false, 3500)
                ]
            })
        ];

        children.push(new Table({ columnWidths: [4000, 2500, 3500], rows: scaleRows }));

        // 3. Item-Total Statistics
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '3. Item-Total Statistics', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const itemRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Item', true, 2500, { align: AlignmentType.LEFT }),
                    createTableCell('Mean', true, 1500),
                    createTableCell('Std. Dev', true, 1500),
                    createTableCell('Item-Total r', true, 1700),
                    createTableCell('α if Deleted', true, 1700),
                    createTableCell('Flag', true, 1100)
                ]
            })
        ];

        const means = itemStats.means || {};
        const stds = itemStats.stds || {};
        const citc = itemStats.corrected_item_total_correlations || {};

        Object.keys(means).forEach((item) => {
            const itemMean = means[item] || 0;
            const itemStd = stds[item] || 0;
            const itemCitc = citc[item] || 0;
            const itemAid = alphaIfDeleted[item] || 0;
            const isProblematic = itemAid > alpha;
            const lowCorrelation = itemCitc < 0.3;
            
            itemRows.push(new TableRow({
                children: [
                    createTableCell(item.length > 18 ? item.substring(0, 18) + '...' : item, false, 2500, { align: AlignmentType.LEFT }),
                    createTableCell(itemMean.toFixed(3), false, 1500),
                    createTableCell(itemStd.toFixed(3), false, 1500),
                    createTableCell(itemCitc.toFixed(3), false, 1700, { color: lowCorrelation ? COLORS.danger : undefined }),
                    createTableCell(itemAid.toFixed(3), false, 1700, { color: isProblematic ? COLORS.success : undefined }),
                    createTableCell(isProblematic ? '⚠ Remove' : lowCorrelation ? '⚠ Low r' : '✓', false, 1100, { color: (isProblematic || lowCorrelation) ? COLORS.warning : COLORS.success })
                ]
            }));
        });

        children.push(new Table({ columnWidths: [2500, 1500, 1500, 1700, 1700, 1100], rows: itemRows }));

        children.push(new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ 
                text: 'Note: Items flagged "Remove" would improve α if deleted. Items flagged "Low r" have weak correlation with the scale total (< 0.3).', 
                size: 18, font: 'Arial', color: COLORS.gray, italics: true 
            })]
        }));

        // 4. Alpha Interpretation Guide
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '4. Alpha Interpretation Guide', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const alphaGuideRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Alpha Range', true, 3000),
                    createTableCell('Interpretation', true, 3000),
                    createTableCell('Your Result', true, 3000)
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('≥ 0.90', false, 3000),
                    createTableCell('Excellent', false, 3000),
                    createTableCell(alpha >= 0.90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.80 - 0.89', false, 3000),
                    createTableCell('Good', false, 3000),
                    createTableCell(alpha >= 0.80 && alpha < 0.90 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.70 - 0.79', false, 3000),
                    createTableCell('Acceptable', false, 3000),
                    createTableCell(alpha >= 0.70 && alpha < 0.80 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('0.60 - 0.69', false, 3000),
                    createTableCell('Questionable', false, 3000),
                    createTableCell(alpha >= 0.60 && alpha < 0.70 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            }),
            new TableRow({
                children: [
                    createTableCell('< 0.60', false, 3000),
                    createTableCell('Poor / Unacceptable', false, 3000),
                    createTableCell(alpha < 0.60 ? '← Your result' : '', false, 3000, { bold: true, color: COLORS.primary })
                ]
            })
        ];

        children.push(new Table({ columnWidths: [3000, 3000, 3000], rows: alphaGuideRows }));

        // 5. Recommendations
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '5. Recommendations', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const recommendations = isAcceptable
            ? [
                'Scale reliability is adequate for research purposes.',
                'You can confidently compute a total or mean score for the scale.',
                problematicItems.length > 0 
                    ? `Consider removing ${problematicItems.map(p => p.item).join(', ')} to improve reliability.`
                    : 'All items contribute positively — no removals recommended.',
                'Document the reliability coefficient in your methods section.',
                'For high-stakes decisions, aim for α ≥ 0.80.'
            ]
            : [
                'Scale reliability is below acceptable thresholds.',
                'Review items with low item-total correlations (< 0.3).',
                'Consider revising or removing problematic items.',
                'Ensure all items measure the same underlying construct.',
                'Consider whether items need reverse coding.'
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

        // 6. About Reliability Analysis
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [new TextRun({ text: '6. About Reliability Analysis', bold: true, size: 32, font: 'Arial', color: COLORS.primaryDark })]
        }));

        const aboutPoints = [
            "Cronbach's Alpha measures internal consistency — how well items measure the same construct.",
            'Higher alpha indicates greater homogeneity among scale items.',
            'Item-total correlations show how each item relates to the overall scale.',
            '"Alpha if deleted" indicates whether removing an item would improve reliability.',
            'For scales, α ≥ 0.70 is generally considered acceptable for research.'
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
                headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Reliability Analysis Report', size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ text: ' of ', size: 18, color: COLORS.gray, font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COLORS.gray, font: 'Arial' })] })] }) },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Reliability_Analysis_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });

    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
    }
}


