import { NextRequest, NextResponse } from 'next/server';
import { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, 
    HeadingLevel, PageNumber, LevelFormat, ImageRun
} from 'docx';

// 색상 팔레트 - HTML 보고서 스타일 반영 (더 세련된 블루 톤)
const COLORS = {
    primary: '3498DB',      // 메인 블루
    primaryDark: '2C3E50',  // 다크 네이비
    secondary: '34495E',    // 서브 네이비
    success: '27AE60',      // 그린
    warning: 'E67E22',      // 오렌지
    danger: 'E74C3C',       // 레드
    gray: '7F8C8D',         // 회색
    lightGray: 'BDC3C7',    // 연한 회색
    background: 'ECF0F1',   // 배경색
    highlight: 'F0F8FF',    // 하이라이트 배경
    tableHeader: 'D5E8F0',  // 테이블 헤더 배경
    tableBorder: 'DDDDDD'   // 테이블 테두리
};

const formatPValue = (p: number | null | undefined): string => {
    if (p === null || p === undefined) return 'N/A';
    return p < 0.001 ? '<0.001' : p.toFixed(4);
};

const getSignificanceStars = (p: number | undefined): string => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return ' ***';
    if (p < 0.01) return ' **';
    if (p < 0.05) return ' *';
    return '';
};

const getEffectSizeInterpretation = (etaSq: number | undefined): string => {
    if (etaSq === undefined || etaSq === null) return '';
    if (etaSq >= 0.14) return 'large';
    if (etaSq >= 0.06) return 'medium';
    if (etaSq >= 0.01) return 'small';
    return 'negligible';
};

// 테이블 셀 생성 헬퍼 함수
const createTableCell = (
    text: string, 
    isHeader = false, 
    width = 1500,
    options: { highlight?: boolean; bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}
): TableCell => {
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder }
    };

    let fillColor: string | undefined;
    if (isHeader) {
        fillColor = COLORS.tableHeader;
    } else if (options.highlight) {
        fillColor = COLORS.highlight;
    }

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
                        color: isHeader ? COLORS.primaryDark : COLORS.secondary,
                        size: isHeader ? 22 : 20,
                        font: 'Arial'
                    })
                ]
            })
        ],
        borders
    });
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, factorA, factorB, plot } = await request.json();
        
        const interactionRow = results.anova_table.find((row: any) => row.Source.includes('*'));
        const factorARow = results.anova_table.find((row: any) => 
            !row.Source.includes('*') && !row.Source.includes('Residuals')
        );
        const factorBRow = results.anova_table.find((row: any) => 
            !row.Source.includes('*') && !row.Source.includes('Residuals') && row !== factorARow
        );
        const residualsRow = results.anova_table.find((row: any) => row.Source.includes('Residuals'));
        
        const isInteractionSignificant = interactionRow && interactionRow['p-value'] <= 0.05;
        const isFactorASignificant = factorARow && factorARow['p-value'] <= 0.05;
        const isFactorBSignificant = factorBRow && factorBRow['p-value'] <= 0.05;

        const children: (Paragraph | Table)[] = [];

        // ============================================
        // 타이틀 섹션
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: 'Statistical Report',
                    bold: true,
                    size: 24,
                    font: 'Arial',
                    color: COLORS.primary
                })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({
                    text: 'Two-Way ANOVA Analysis',
                    bold: true,
                    size: 52,
                    font: 'Arial',
                    color: COLORS.primaryDark
                })
            ]
        }));

        // 변수 정보 박스 스타일
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
                new TextRun({ text: 'Factor A: ', bold: true, size: 22, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: factorA, size: 22, font: 'Arial' }),
                new TextRun({ text: '    |    ', size: 22, font: 'Arial', color: COLORS.lightGray }),
                new TextRun({ text: 'Factor B: ', bold: true, size: 22, font: 'Arial', color: COLORS.secondary }),
                new TextRun({ text: factorB, size: 22, font: 'Arial' })
            ]
        }));

        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
                new TextRun({
                    text: `Report Generated: ${new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                    })}`,
                    size: 20,
                    font: 'Arial',
                    color: COLORS.gray,
                    italics: true
                })
            ]
        }));

        // ============================================
        // 1. Executive Summary
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [
                new TextRun({
                    text: '1. Executive Summary',
                    bold: true,
                    size: 32,
                    font: 'Arial',
                    color: COLORS.primaryDark
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: `This two-way ANOVA examined the effects of `,
                    size: 22,
                    font: 'Arial'
                }),
                new TextRun({
                    text: factorA,
                    bold: true,
                    size: 22,
                    font: 'Arial',
                    color: COLORS.primary
                }),
                new TextRun({
                    text: ` and `,
                    size: 22,
                    font: 'Arial'
                }),
                new TextRun({
                    text: factorB,
                    bold: true,
                    size: 22,
                    font: 'Arial',
                    color: COLORS.primary
                }),
                new TextRun({
                    text: ` on `,
                    size: 22,
                    font: 'Arial'
                }),
                new TextRun({
                    text: dependentVar,
                    bold: true,
                    size: 22,
                    font: 'Arial',
                    color: COLORS.primary
                }),
                new TextRun({
                    text: `. The analysis reveals the following key findings:`,
                    size: 22,
                    font: 'Arial'
                })
            ]
        }));

        // Key Findings 테이블
        const summaryRows: TableRow[] = [];
        
        // 헤더
        summaryRows.push(new TableRow({
            tableHeader: true,
            children: [
                createTableCell('Effect', true, 2500, { align: AlignmentType.LEFT }),
                createTableCell('F-value', true, 1500),
                createTableCell('p-value', true, 1500),
                createTableCell('Effect Size (η²p)', true, 1800),
                createTableCell('Significance', true, 2000)
            ]
        }));

        // Interaction
        if (interactionRow) {
            summaryRows.push(new TableRow({
                children: [
                    createTableCell(`${factorA} × ${factorB}`, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(interactionRow.F?.toFixed(2) || 'N/A', false, 1500),
                    createTableCell(formatPValue(interactionRow['p-value']) + getSignificanceStars(interactionRow['p-value']), false, 1500, { highlight: isInteractionSignificant }),
                    createTableCell(`${interactionRow['η²p']?.toFixed(3) || 'N/A'} (${getEffectSizeInterpretation(interactionRow['η²p'])})`, false, 1800),
                    createTableCell(isInteractionSignificant ? '✓ Significant' : '✗ Not Significant', false, 2000, { bold: true })
                ]
            }));
        }

        // Factor A
        if (factorARow) {
            summaryRows.push(new TableRow({
                children: [
                    createTableCell(`Main Effect: ${factorA}`, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(factorARow.F?.toFixed(2) || 'N/A', false, 1500),
                    createTableCell(formatPValue(factorARow['p-value']) + getSignificanceStars(factorARow['p-value']), false, 1500, { highlight: isFactorASignificant }),
                    createTableCell(`${factorARow['η²p']?.toFixed(3) || 'N/A'} (${getEffectSizeInterpretation(factorARow['η²p'])})`, false, 1800),
                    createTableCell(isFactorASignificant ? '✓ Significant' : '✗ Not Significant', false, 2000, { bold: true })
                ]
            }));
        }

        // Factor B
        if (factorBRow) {
            summaryRows.push(new TableRow({
                children: [
                    createTableCell(`Main Effect: ${factorB}`, false, 2500, { align: AlignmentType.LEFT, bold: true }),
                    createTableCell(factorBRow.F?.toFixed(2) || 'N/A', false, 1500),
                    createTableCell(formatPValue(factorBRow['p-value']) + getSignificanceStars(factorBRow['p-value']), false, 1500, { highlight: isFactorBSignificant }),
                    createTableCell(`${factorBRow['η²p']?.toFixed(3) || 'N/A'} (${getEffectSizeInterpretation(factorBRow['η²p'])})`, false, 1800),
                    createTableCell(isFactorBSignificant ? '✓ Significant' : '✗ Not Significant', false, 2000, { bold: true })
                ]
            }));
        }

        children.push(new Table({
            columnWidths: [2500, 1500, 1500, 1800, 2000],
            rows: summaryRows
        }));

        children.push(new Paragraph({
            spacing: { before: 100, after: 400 },
            children: [
                new TextRun({
                    text: 'Note: *** p < 0.001, ** p < 0.01, * p < 0.05. Effect size interpretation: small (η²p ≥ 0.01), medium (η²p ≥ 0.06), large (η²p ≥ 0.14).',
                    size: 18,
                    font: 'Arial',
                    color: COLORS.gray,
                    italics: true
                })
            ]
        }));

        // ============================================
        // 2. ANOVA Results (상세)
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [
                new TextRun({
                    text: '2. ANOVA Results',
                    bold: true,
                    size: 32,
                    font: 'Arial',
                    color: COLORS.primaryDark
                })
            ]
        }));

        children.push(new Paragraph({
            spacing: { after: 100 },
            children: [
                new TextRun({
                    text: '2.1 Complete ANOVA Summary Table',
                    bold: true,
                    size: 26,
                    font: 'Arial',
                    color: COLORS.secondary
                })
            ]
        }));

        // ANOVA 상세 테이블
        const anovaRows: TableRow[] = [
            new TableRow({
                tableHeader: true,
                children: [
                    createTableCell('Source of Variation', true, 2200, { align: AlignmentType.LEFT }),
                    createTableCell('Sum of Squares', true, 1500),
                    createTableCell('df', true, 900),
                    createTableCell('Mean Square', true, 1500),
                    createTableCell('F', true, 1100),
                    createTableCell('p-value', true, 1200),
                    createTableCell('η²p', true, 900)
                ]
            })
        ];

        results.anova_table.forEach((row: any) => {
            const isSignificant = row['p-value'] !== undefined && row['p-value'] <= 0.05;
            anovaRows.push(new TableRow({
                children: [
                    createTableCell(row.Source, false, 2200, { align: AlignmentType.LEFT, bold: !row.Source.includes('Residuals') }),
                    createTableCell(row.sum_sq?.toFixed(2) || '', false, 1500),
                    createTableCell(String(row.df), false, 900),
                    createTableCell(row.MS?.toFixed(2) || '', false, 1500),
                    createTableCell(row.F?.toFixed(2) || '', false, 1100),
                    createTableCell(
                        row['p-value'] !== undefined ? formatPValue(row['p-value']) + getSignificanceStars(row['p-value']) : '',
                        false, 1200,
                        { highlight: isSignificant }
                    ),
                    createTableCell(row['η²p']?.toFixed(3) || '', false, 900)
                ]
            }));
        });

        children.push(new Table({
            columnWidths: [2200, 1500, 900, 1500, 1100, 1200, 900],
            rows: anovaRows
        }));

        // ============================================
        // 3. Marginal Means
        // ============================================
        if (results.marginal_means) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [
                    new TextRun({
                        text: '3. Descriptive Statistics',
                        bold: true,
                        size: 32,
                        font: 'Arial',
                        color: COLORS.primaryDark
                    })
                ]
            }));

            // Factor A Marginal Means
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({
                        text: `3.1 ${factorA} Marginal Means`,
                        bold: true,
                        size: 26,
                        font: 'Arial',
                        color: COLORS.secondary
                    })
                ]
            }));

            const factorARows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Level', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('Mean', true, 1600),
                        createTableCell('Std. Error', true, 1600),
                        createTableCell('Lower CI', true, 1600),
                        createTableCell('Upper CI', true, 1600)
                    ]
                })
            ];

            results.marginal_means.factor_a.forEach((row: any) => {
                factorARows.push(new TableRow({
                    children: [
                        createTableCell(String(row.group || ''), false, 2200, { align: AlignmentType.LEFT }),
                        createTableCell(row.mean?.toFixed(3) || '', false, 1600, { highlight: true }),
                        createTableCell(row.sem?.toFixed(3) || '', false, 1600),
                        createTableCell(row.lower?.toFixed(3) || '', false, 1600),
                        createTableCell(row.upper?.toFixed(3) || '', false, 1600)
                    ]
                }));
            });

            children.push(new Table({
                columnWidths: [2200, 1600, 1600, 1600, 1600],
                rows: factorARows
            }));

            // Factor B Marginal Means
            children.push(new Paragraph({
                spacing: { before: 300, after: 100 },
                children: [
                    new TextRun({
                        text: `3.2 ${factorB} Marginal Means`,
                        bold: true,
                        size: 26,
                        font: 'Arial',
                        color: COLORS.secondary
                    })
                ]
            }));

            const factorBRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Level', true, 2200, { align: AlignmentType.LEFT }),
                        createTableCell('Mean', true, 1600),
                        createTableCell('Std. Error', true, 1600),
                        createTableCell('Lower CI', true, 1600),
                        createTableCell('Upper CI', true, 1600)
                    ]
                })
            ];

            results.marginal_means.factor_b.forEach((row: any) => {
                factorBRows.push(new TableRow({
                    children: [
                        createTableCell(String(row.group || ''), false, 2200, { align: AlignmentType.LEFT }),
                        createTableCell(row.mean?.toFixed(3) || '', false, 1600, { highlight: true }),
                        createTableCell(row.sem?.toFixed(3) || '', false, 1600),
                        createTableCell(row.lower?.toFixed(3) || '', false, 1600),
                        createTableCell(row.upper?.toFixed(3) || '', false, 1600)
                    ]
                }));
            });

            children.push(new Table({
                columnWidths: [2200, 1600, 1600, 1600, 1600],
                rows: factorBRows
            }));

            // Cell Means (if available)
            if (results.marginal_means.cell_means) {
                children.push(new Paragraph({
                    spacing: { before: 300, after: 100 },
                    children: [
                        new TextRun({
                            text: '3.3 Cell Means (Interaction)',
                            bold: true,
                            size: 26,
                            font: 'Arial',
                            color: COLORS.secondary
                        })
                    ]
                }));

                const cellRows: TableRow[] = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            createTableCell(factorA, true, 2000, { align: AlignmentType.LEFT }),
                            createTableCell(factorB, true, 2000),
                            createTableCell('Mean', true, 1800),
                            createTableCell('Std. Error', true, 1800),
                            createTableCell('N', true, 1200)
                        ]
                    })
                ];

                results.marginal_means.cell_means.forEach((row: any) => {
                    cellRows.push(new TableRow({
                        children: [
                            createTableCell(String(row.factor_a || ''), false, 2000, { align: AlignmentType.LEFT }),
                            createTableCell(String(row.factor_b || ''), false, 2000),
                            createTableCell(row.mean?.toFixed(3) || '', false, 1800, { highlight: true }),
                            createTableCell(row.sem?.toFixed(3) || '', false, 1800),
                            createTableCell(String(row.n || ''), false, 1200)
                        ]
                    }));
                });

                children.push(new Table({
                    columnWidths: [2000, 2000, 1800, 1800, 1200],
                    rows: cellRows
                }));
            }
        }

        // ============================================
        // 4. Assumption Tests
        // ============================================
        if (results.assumptions) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [
                    new TextRun({
                        text: '4. Assumption Tests',
                        bold: true,
                        size: 32,
                        font: 'Arial',
                        color: COLORS.primaryDark
                    })
                ]
            }));

            // Homogeneity of Variance
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({
                        text: '4.1 Homogeneity of Variance',
                        bold: true,
                        size: 26,
                        font: 'Arial',
                        color: COLORS.secondary
                    })
                ]
            }));

            const h = results.assumptions.homogeneity;
            const homogeneityMet = h.assumption_met;

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({
                        text: "Levene's Test for Equality of Error Variances",
                        bold: true,
                        size: 22,
                        font: 'Arial'
                    })
                ]
            }));

            // Levene's Test 결과 테이블
            const leveneRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('F-statistic', true, 2500),
                        createTableCell('p-value', true, 2500),
                        createTableCell('Assumption Met', true, 2500)
                    ]
                }),
                new TableRow({
                    children: [
                        createTableCell(h.f_statistic?.toFixed(4) || 'N/A', false, 2500),
                        createTableCell(formatPValue(h.p_value), false, 2500, { highlight: !homogeneityMet }),
                        createTableCell(
                            homogeneityMet ? '✓ Yes (p > 0.05)' : '✗ No (p ≤ 0.05)',
                            false, 2500,
                            { bold: true }
                        )
                    ]
                })
            ];

            children.push(new Table({
                columnWidths: [2500, 2500, 2500],
                rows: leveneRows
            }));

            // Normality Tests
            children.push(new Paragraph({
                spacing: { before: 300, after: 100 },
                children: [
                    new TextRun({
                        text: '4.2 Normality of Residuals',
                        bold: true,
                        size: 26,
                        font: 'Arial',
                        color: COLORS.secondary
                    })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                children: [
                    new TextRun({
                        text: 'Shapiro-Wilk Test by Group',
                        bold: true,
                        size: 22,
                        font: 'Arial'
                    })
                ]
            }));

            const normalityRows: TableRow[] = [
                new TableRow({
                    tableHeader: true,
                    children: [
                        createTableCell('Group', true, 3500, { align: AlignmentType.LEFT }),
                        createTableCell('W-statistic', true, 1800),
                        createTableCell('p-value', true, 1800),
                        createTableCell('Normal Distribution', true, 2200)
                    ]
                })
            ];

            Object.entries(results.assumptions.normality).forEach(([group, test]: [string, any]) => {
                normalityRows.push(new TableRow({
                    children: [
                        createTableCell(group, false, 3500, { align: AlignmentType.LEFT }),
                        createTableCell(test.statistic?.toFixed(4) || 'N/A', false, 1800),
                        createTableCell(formatPValue(test.p_value), false, 1800, { highlight: !test.normal }),
                        createTableCell(
                            test.normal ? '✓ Yes' : '✗ No',
                            false, 2200,
                            { bold: true }
                        )
                    ]
                }));
            });

            children.push(new Table({
                columnWidths: [3500, 1800, 1800, 2200],
                rows: normalityRows
            }));

            // Assumption Summary Box
            const allNormal = Object.values(results.assumptions.normality).every((t: any) => t.normal);
            
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({
                        text: '4.3 Assumption Summary',
                        bold: true,
                        size: 26,
                        font: 'Arial',
                        color: COLORS.secondary
                    })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 100 },
                border: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.primary },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.primary },
                    left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.primary },
                    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.primary }
                },
                shading: { fill: COLORS.highlight, type: ShadingType.CLEAR },
                children: [
                    new TextRun({
                        text: homogeneityMet && allNormal
                            ? '✓ All assumptions for two-way ANOVA are met. Results can be interpreted with confidence.'
                            : homogeneityMet
                                ? '⚠ Homogeneity assumption is met, but some groups violate normality. Consider the robustness of ANOVA to normality violations with adequate sample sizes.'
                                : '⚠ Homogeneity of variance assumption is violated. Consider using Welch\'s correction or a non-parametric alternative.',
                        size: 22,
                        font: 'Arial',
                        color: homogeneityMet && allNormal ? COLORS.success : COLORS.warning
                    })
                ]
            }));
        }

        // ============================================
        // 5. Interpretation
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [
                new TextRun({
                    text: '5. Interpretation and Discussion',
                    bold: true,
                    size: 32,
                    font: 'Arial',
                    color: COLORS.primaryDark
                })
            ]
        }));

        // Clean and format interpretation
        const cleanInterpretation = results.interpretation
            .replace(/<[^>]*>/g, '')
            .replace(/\*\*/g, '')
            .trim();

        children.push(new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({
                    text: cleanInterpretation,
                    size: 22,
                    font: 'Arial'
                })
            ]
        }));

        // Effect interpretation based on significance
        if (isInteractionSignificant) {
            children.push(new Paragraph({
                spacing: { before: 200, after: 100 },
                border: {
                    left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.warning }
                },
                children: [
                    new TextRun({
                        text: 'Important: ',
                        bold: true,
                        size: 22,
                        font: 'Arial',
                        color: COLORS.warning
                    }),
                    new TextRun({
                        text: `Because the interaction between ${factorA} and ${factorB} is statistically significant, the main effects should be interpreted with caution. The effect of one factor depends on the level of the other factor.`,
                        size: 22,
                        font: 'Arial'
                    })
                ]
            }));
        }

        // ============================================
        // 6. Visualization (이미지가 있는 경우)
        // ============================================
        if (plot) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
                children: [
                    new TextRun({
                        text: '6. Visualization',
                        bold: true,
                        size: 32,
                        font: 'Arial',
                        color: COLORS.primaryDark
                    })
                ]
            }));

            children.push(new Paragraph({
                spacing: { after: 200 },
                children: [
                    new TextRun({
                        text: 'The following figure displays the interaction plot showing mean values of ',
                        size: 22,
                        font: 'Arial'
                    }),
                    new TextRun({
                        text: dependentVar,
                        bold: true,
                        size: 22,
                        font: 'Arial',
                        color: COLORS.primary
                    }),
                    new TextRun({
                        text: ` across different levels of ${factorA} and ${factorB}.`,
                        size: 22,
                        font: 'Arial'
                    })
                ]
            }));

            // Base64 이미지 디코딩 및 삽입
            try {
                // plot이 data:image/png;base64, 형식인 경우 처리
                let imageData: Buffer;
                let imageType: 'png' | 'jpg' | 'jpeg' = 'png';
                
                if (plot.startsWith('data:image/')) {
                    const matches = plot.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (matches) {
                        imageType = matches[1] as 'png' | 'jpg' | 'jpeg';
                        imageData = Buffer.from(matches[2], 'base64');
                    } else {
                        imageData = Buffer.from(plot, 'base64');
                    }
                } else {
                    // 순수 base64 문자열인 경우
                    imageData = Buffer.from(plot, 'base64');
                }

                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 },
                    children: [
                        new ImageRun({
                            type: imageType,
                            data: imageData,
                            transformation: {
                                width: 500,
                                height: 400
                            },
                            altText: {
                                title: 'Two-Way ANOVA Interaction Plot',
                                description: `Interaction plot showing ${dependentVar} across ${factorA} and ${factorB}`,
                                name: 'anova_plot'
                            }
                        })
                    ]
                }));

                children.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                    children: [
                        new TextRun({
                            text: `Figure 1. Interaction plot of ${dependentVar} by ${factorA} and ${factorB}`,
                            size: 20,
                            font: 'Arial',
                            color: COLORS.gray,
                            italics: true
                        })
                    ]
                }));
            } catch (imageError) {
                console.error('Failed to process image:', imageError);
                children.push(new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: '[Visualization image could not be embedded]',
                            size: 20,
                            font: 'Arial',
                            color: COLORS.gray,
                            italics: true
                        })
                    ]
                }));
            }
        }

        // ============================================
        // 7. Recommendations
        // ============================================
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary } },
            children: [
                new TextRun({
                    text: '7. Statistical Recommendations',
                    bold: true,
                    size: 32,
                    font: 'Arial',
                    color: COLORS.primaryDark
                })
            ]
        }));

        const recommendations = isInteractionSignificant
            ? [
                { title: 'Focus on Interaction Effect', desc: 'The significant interaction effect should be the primary focus of interpretation and reporting.' },
                { title: 'Conduct Simple Main Effects Analysis', desc: `Examine the effect of ${factorA} at each level of ${factorB}, and vice versa.` },
                { title: 'Use Post-hoc Comparisons', desc: 'Apply appropriate post-hoc tests (e.g., Tukey HSD) to identify specific group differences.' },
                { title: 'Visualize the Interaction', desc: 'Create an interaction plot to illustrate the pattern of means across conditions.' }
            ]
            : [
                { title: 'Interpret Main Effects Directly', desc: 'Without a significant interaction, main effects can be interpreted independently.' },
                { title: 'Examine Marginal Means', desc: 'Compare the marginal means for each factor to understand the direction of effects.' },
                { title: 'Consider Practical Significance', desc: 'Evaluate effect sizes (η²p) alongside statistical significance for meaningful conclusions.' },
                { title: 'Report Confidence Intervals', desc: 'Include confidence intervals for mean differences to communicate precision of estimates.' }
            ];

        recommendations.forEach((rec, i) => {
            children.push(new Paragraph({
                spacing: { before: 150, after: 50 },
                children: [
                    new TextRun({
                        text: `${i + 1}. ${rec.title}`,
                        bold: true,
                        size: 24,
                        font: 'Arial',
                        color: COLORS.primary
                    })
                ]
            }));
            children.push(new Paragraph({
                spacing: { after: 100 },
                indent: { left: 360 },
                children: [
                    new TextRun({
                        text: rec.desc,
                        size: 22,
                        font: 'Arial'
                    })
                ]
            }));
        });

        // ============================================
        // Document 생성
        // ============================================
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: 'Arial',
                            size: 22
                        }
                    }
                },
                paragraphStyles: [
                    {
                        id: 'Title',
                        name: 'Title',
                        basedOn: 'Normal',
                        run: { size: 56, bold: true, color: COLORS.primaryDark, font: 'Arial' },
                        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER }
                    },
                    {
                        id: 'Heading1',
                        name: 'Heading 1',
                        basedOn: 'Normal',
                        next: 'Normal',
                        quickFormat: true,
                        run: { size: 32, bold: true, color: COLORS.primaryDark, font: 'Arial' },
                        paragraph: { spacing: { before: 240, after: 120 } }
                    },
                    {
                        id: 'Heading2',
                        name: 'Heading 2',
                        basedOn: 'Normal',
                        next: 'Normal',
                        quickFormat: true,
                        run: { size: 26, bold: true, color: COLORS.secondary, font: 'Arial' },
                        paragraph: { spacing: { before: 200, after: 100 } }
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 }
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.lightGray } },
                                spacing: { after: 200 },
                                children: [
                                    new TextRun({
                                        text: 'Two-Way ANOVA Statistical Report',
                                        size: 20,
                                        font: 'Arial',
                                        color: COLORS.gray,
                                        italics: true
                                    })
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.lightGray } },
                                spacing: { before: 200 },
                                children: [
                                    new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: COLORS.gray }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: COLORS.gray }),
                                    new TextRun({ text: ' of ', size: 18, font: 'Arial', color: COLORS.gray }),
                                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: 'Arial', color: COLORS.gray })
                                ]
                            })
                        ]
                    })
                },
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Two_Way_ANOVA_Report_${new Date().toISOString().split('T')[0]}.docx"`
            }
        });
        
    } catch (error) {
        console.error('DOCX generation error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
