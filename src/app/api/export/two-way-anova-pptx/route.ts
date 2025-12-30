import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';

interface AnovaRow {
    Source: string;
    sum_sq: number;
    df: number;
    MS: number;
    F: number;
    'p-value': number;
    'η²p': number;
}

interface MarginalMeansRow {
    [key: string]: string | number;
    mean: number;
    std: number;
    sem: number;
    count: number;
    group?: string;
    lower?: number;
    upper?: number;
}

interface TwoWayAnovaResults {
    anova_table: AnovaRow[];
    descriptive_stats_table: { [key: string]: { [key: string]: number } };
    marginal_means: { factor_a: MarginalMeansRow[]; factor_b: MarginalMeansRow[]; };
    assumptions: {
        normality: { [key: string]: { statistic: number | null; p_value: number | null; normal: boolean | null } };
        homogeneity: { test: string; statistic: number; p_value: number; assumption_met: boolean; f_statistic?: number };
    };
    posthoc_results?: any[];
    simple_main_effects?: any[];
    interpretation: string;
}

interface ExportParams {
    results: TwoWayAnovaResults;
    dependentVar: string;
    factorA: string;
    factorB: string;
    plotBase64?: string;
}

// Clean & Minimal Color Palette (matching UI)
const C = {
    primary: '2563EB',        // Blue-600 (primary)
    primaryLight: 'DBEAFE',   // Blue-100
    primaryMuted: '3B82F6',   // Blue-500
    
    background: 'FFFFFF',     // White
    card: 'FFFFFF',           // White
    cardBorder: 'E5E7EB',     // Gray-200
    muted: 'F9FAFB',          // Gray-50
    mutedBorder: 'E5E7EB',    // Gray-200
    
    text: '111827',           // Gray-900
    textSecondary: '6B7280',  // Gray-500
    textMuted: '9CA3AF',      // Gray-400
    
    success: '10B981',        // Emerald-500
    successBg: 'D1FAE5',      // Emerald-100
    warning: 'F59E0B',        // Amber-500
    warningBg: 'FEF3C7',      // Amber-100
    error: 'EF4444',          // Red-500
};

const formatP = (p: number | null | undefined): string => {
    if (p == null) return 'N/A';
    return p < 0.001 ? '<.001' : p.toFixed(3);
};

const getEffectLabel = (eta: number): string => {
    if (eta >= 0.14) return 'Large';
    if (eta >= 0.06) return 'Medium';
    if (eta >= 0.01) return 'Small';
    return 'Negligible';
};

export async function POST(request: NextRequest) {
    try {
        const { results, dependentVar, factorA, factorB, plotBase64 }: ExportParams = await request.json();
        
        const pptx = new pptxgen();
        pptx.layout = 'LAYOUT_16x9';
        pptx.title = 'Two-Way ANOVA Analysis';
        
        // Extract data
        const intRow = results.anova_table.find(r => r.Source.includes('*'));
        const facARow = results.anova_table.find(r => !r.Source.includes('*') && !r.Source.toLowerCase().includes('residual'));
        const facBRow = results.anova_table.find(r => !r.Source.includes('*') && !r.Source.toLowerCase().includes('residual') && r !== facARow);
        
        const intSig = intRow && intRow['p-value'] <= 0.05;
        const facASig = facARow && facARow['p-value'] <= 0.05;
        const facBSig = facBRow && facBRow['p-value'] <= 0.05;
        const sigCount = [intSig, facASig, facBSig].filter(Boolean).length;
        
        const facAMeans = results.marginal_means?.factor_a || [];
        const facBMeans = results.marginal_means?.factor_b || [];
        const getHL = (m: MarginalMeansRow[]) => {
            if (!m.length) return { high: null, low: null };
            const s = [...m].sort((a, b) => (b.mean || 0) - (a.mean || 0));
            return { high: s[0], low: s[s.length - 1] };
        };
        const facAHL = getHL(facAMeans);
        const facBHL = getHL(facBMeans);
        
        const normPass = Object.values(results.assumptions?.normality || {}).every((t: any) => t?.p_value > 0.05 || t?.normal);
        const homPass = results.assumptions?.homogeneity?.assumption_met || results.assumptions?.homogeneity?.p_value > 0.05;

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 1: TITLE - Clean & Minimal
        // ══════════════════════════════════════════════════════════════════
        const s1 = pptx.addSlide();
        s1.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
        
        // Primary accent bar at top
        s1.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: C.primary } });
        
        // Icon placeholder (circle with icon simulation)
        s1.addShape('ellipse', { 
            x: 0.6, y: 1.5, w: 0.5, h: 0.5, 
            fill: { color: C.primaryLight }
        });
        s1.addText('📊', { x: 0.6, y: 1.55, w: 0.5, h: 0.4, fontSize: 16, align: 'center' });
        
        // Title
        s1.addText('Two-Way ANOVA', { 
            x: 1.3, y: 1.5, w: 7, h: 0.6, 
            fontSize: 32, bold: true, color: C.text, fontFace: 'Arial' 
        });
        s1.addText('Statistical Analysis Report', { 
            x: 1.3, y: 2.1, w: 7, h: 0.4, 
            fontSize: 14, color: C.textSecondary, fontFace: 'Arial'
        });
        
        // Info card
        s1.addShape('rect', { 
            x: 0.6, y: 2.8, w: 8.8, h: 1.4, 
            fill: { color: C.muted },
            line: { color: C.cardBorder, pt: 1 }
        });
        
        // Grid inside card
        s1.addText('Dependent Variable', { x: 0.8, y: 2.95, w: 2, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
        s1.addText(dependentVar, { x: 0.8, y: 3.2, w: 2, h: 0.35, fontSize: 13, bold: true, color: C.text, fontFace: 'Arial' });
        
        s1.addText('Factor A', { x: 3.0, y: 2.95, w: 2, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
        s1.addText(factorA, { x: 3.0, y: 3.2, w: 2, h: 0.35, fontSize: 13, bold: true, color: C.text, fontFace: 'Arial' });
        
        s1.addText('Factor B', { x: 5.2, y: 2.95, w: 2, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
        s1.addText(factorB, { x: 5.2, y: 3.2, w: 2, h: 0.35, fontSize: 13, bold: true, color: C.text, fontFace: 'Arial' });
        
        s1.addText('Significant Effects', { x: 7.4, y: 2.95, w: 2, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
        s1.addShape('rect', { 
            x: 7.4, y: 3.25, w: 0.9, h: 0.3, 
            fill: { color: sigCount > 0 ? C.primary : C.muted },
            line: { color: sigCount > 0 ? C.primary : C.cardBorder, pt: 1 }
        });
        s1.addText(`${sigCount} found`, { x: 7.4, y: 3.27, w: 0.9, h: 0.26, fontSize: 9, color: sigCount > 0 ? C.background : C.textSecondary, align: 'center', fontFace: 'Arial' });
        
        s1.addText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), { 
            x: 0.6, y: 4.9, w: 3, h: 0.25, fontSize: 10, color: C.textMuted, fontFace: 'Arial' 
        });

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 2: ANALYSIS SUMMARY - Card Style
        // ══════════════════════════════════════════════════════════════════
        const s2 = pptx.addSlide();
        s2.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
        
        // Header with icon
        s2.addShape('ellipse', { x: 0.5, y: 0.35, w: 0.4, h: 0.4, fill: { color: C.primaryLight } });
        s2.addText('✨', { x: 0.5, y: 0.38, w: 0.4, h: 0.35, fontSize: 14, align: 'center' });
        s2.addText('Analysis Summary', { x: 1.0, y: 0.35, w: 8, h: 0.45, fontSize: 18, bold: true, color: C.text, fontFace: 'Arial' });
        s2.addText('Key findings from Two-Way ANOVA', { x: 1.0, y: 0.75, w: 8, h: 0.3, fontSize: 11, color: C.textSecondary, fontFace: 'Arial' });
        
        // Three effect cards
        const effectCards = [
            { label: 'Interaction', sub: `${factorA} × ${factorB}`, sig: intSig, p: intRow?.['p-value'], eta: intRow?.['η²p'] },
            { label: factorA, sub: 'Main Effect', sig: facASig, p: facARow?.['p-value'], eta: facARow?.['η²p'] },
            { label: factorB, sub: 'Main Effect', sig: facBSig, p: facBRow?.['p-value'], eta: facBRow?.['η²p'] }
        ];
        
        effectCards.forEach((card, i) => {
            const x = 0.5 + i * 3.1;
            s2.addShape('rect', { 
                x, y: 1.3, w: 2.9, h: 1.5, 
                fill: { color: C.card },
                line: { color: C.cardBorder, pt: 1 }
            });
            
            // Header row with icon
            s2.addText(card.sub, { x: x + 0.15, y: 1.4, w: 2, h: 0.2, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
            s2.addText(card.label, { x: x + 0.15, y: 1.58, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: C.text, fontFace: 'Arial' });
            
            // Status icon
            s2.addShape('ellipse', { 
                x: x + 2.4, y: 1.45, w: 0.35, h: 0.35, 
                fill: { color: card.sig ? C.primaryLight : C.muted }
            });
            s2.addText(card.sig ? '✓' : '−', { 
                x: x + 2.4, y: 1.47, w: 0.35, h: 0.3, 
                fontSize: 12, align: 'center', color: card.sig ? C.primary : C.textMuted 
            });
            
            // Stats
            s2.addText('p-value', { x: x + 0.15, y: 2.0, w: 1.3, h: 0.2, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
            s2.addText(formatP(card.p), { x: x + 1.5, y: 2.0, w: 1.2, h: 0.2, fontSize: 9, color: card.sig ? C.text : C.textSecondary, align: 'right', fontFace: 'Arial', bold: card.sig });
            
            s2.addText('η²p', { x: x + 0.15, y: 2.3, w: 1.3, h: 0.2, fontSize: 9, color: C.textMuted, fontFace: 'Arial' });
            s2.addText(card.eta?.toFixed(3) || 'N/A', { x: x + 1.5, y: 2.3, w: 1.2, h: 0.2, fontSize: 9, color: C.textSecondary, align: 'right', fontFace: 'Arial' });
        });
        
        // Assumption cards
        s2.addText('Assumption Tests', { x: 0.5, y: 3.0, w: 8, h: 0.35, fontSize: 12, bold: true, color: C.text, fontFace: 'Arial' });
        
        // Normality card
        s2.addShape('rect', { 
            x: 0.5, y: 3.4, w: 4.55, h: 0.8, 
            fill: { color: normPass ? 'F0FDF4' : 'FFFBEB' },
            line: { color: normPass ? 'BBF7D0' : 'FDE68A', pt: 1 }
        });
        s2.addShape('ellipse', { x: 0.65, y: 3.55, w: 0.35, h: 0.35, fill: { color: normPass ? C.successBg : C.warningBg } });
        s2.addText(normPass ? '✓' : '!', { x: 0.65, y: 3.57, w: 0.35, h: 0.3, fontSize: 11, align: 'center', color: normPass ? C.success : C.warning });
        s2.addText('Normality (Shapiro-Wilk)', { x: 1.1, y: 3.52, w: 3.5, h: 0.25, fontSize: 10, bold: true, color: C.text, fontFace: 'Arial' });
        s2.addText(normPass ? 'Assumption met - Results reliable' : 'Violation detected - Consider robust methods', { x: 1.1, y: 3.78, w: 3.8, h: 0.25, fontSize: 9, color: C.textSecondary, fontFace: 'Arial' });
        
        // Homogeneity card
        s2.addShape('rect', { 
            x: 5.15, y: 3.4, w: 4.35, h: 0.8, 
            fill: { color: homPass ? 'F0FDF4' : 'FFFBEB' },
            line: { color: homPass ? 'BBF7D0' : 'FDE68A', pt: 1 }
        });
        s2.addShape('ellipse', { x: 5.3, y: 3.55, w: 0.35, h: 0.35, fill: { color: homPass ? C.successBg : C.warningBg } });
        s2.addText(homPass ? '✓' : '!', { x: 5.3, y: 3.57, w: 0.35, h: 0.3, fontSize: 11, align: 'center', color: homPass ? C.success : C.warning });
        s2.addText("Homogeneity (Levene's)", { x: 5.75, y: 3.52, w: 3.5, h: 0.25, fontSize: 10, bold: true, color: C.text, fontFace: 'Arial' });
        s2.addText(homPass ? 'Equal variances confirmed' : 'Consider Welch ANOVA', { x: 5.75, y: 3.78, w: 3.5, h: 0.25, fontSize: 9, color: C.textSecondary, fontFace: 'Arial' });
        
        // Key insight box
        s2.addShape('rect', { 
            x: 0.5, y: 4.4, w: 9.0, h: 0.7, 
            fill: { color: C.muted },
            line: { color: C.cardBorder, pt: 1 }
        });
        s2.addShape('rect', { x: 0.5, y: 4.4, w: 0.06, h: 0.7, fill: { color: C.primary } });
        
        let keyInsight = '';
        if (intSig) {
            keyInsight = `Interaction detected: The effect of ${factorA} on ${dependentVar} depends on ${factorB} level.`;
        } else if (facASig || facBSig) {
            const sigFactors = [];
            if (facASig) sigFactors.push(factorA);
            if (facBSig) sigFactors.push(factorB);
            keyInsight = `Main effect${sigFactors.length > 1 ? 's' : ''} found: ${sigFactors.join(' and ')} significantly affect${sigFactors.length === 1 ? 's' : ''} ${dependentVar}.`;
        } else {
            keyInsight = `No significant effects detected. ${factorA} and ${factorB} do not significantly affect ${dependentVar}.`;
        }
        s2.addText(keyInsight, { x: 0.7, y: 4.52, w: 8.6, h: 0.5, fontSize: 10, color: C.text, fontFace: 'Arial', valign: 'middle' });

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 3: ANOVA TABLE - Clean Table
        // ══════════════════════════════════════════════════════════════════
        const s3 = pptx.addSlide();
        s3.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
        
        s3.addShape('ellipse', { x: 0.5, y: 0.35, w: 0.4, h: 0.4, fill: { color: C.primaryLight } });
        s3.addText('📋', { x: 0.5, y: 0.38, w: 0.4, h: 0.35, fontSize: 14, align: 'center' });
        s3.addText('ANOVA Results', { x: 1.0, y: 0.35, w: 8, h: 0.45, fontSize: 18, bold: true, color: C.text, fontFace: 'Arial' });
        s3.addText('Complete statistical output', { x: 1.0, y: 0.75, w: 8, h: 0.3, fontSize: 11, color: C.textSecondary, fontFace: 'Arial' });
        
        // Table
        const tRows: pptxgen.TableRow[] = [[
            { text: 'Source', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'left' } },
            { text: 'SS', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
            { text: 'df', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
            { text: 'MS', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
            { text: 'F', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
            { text: 'p-value', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
            { text: 'η²p', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } }
        ]];
        
        results.anova_table.forEach((r) => {
            const isRes = r.Source.toLowerCase().includes('residual');
            const sig = r['p-value'] <= 0.05 && !isRes;
            tRows.push([
                { text: r.Source, options: { fill: { color: C.card }, bold: !isRes, align: 'left', color: C.text } },
                { text: r.sum_sq?.toFixed(2) || '-', options: { fill: { color: C.card }, align: 'right', color: C.textSecondary } },
                { text: String(r.df), options: { fill: { color: C.card }, align: 'right', color: C.textSecondary } },
                { text: r.MS?.toFixed(2) || '-', options: { fill: { color: C.card }, align: 'right', color: C.textSecondary } },
                { text: r.F?.toFixed(2) || '-', options: { fill: { color: C.card }, align: 'right', color: C.text } },
                { text: formatP(r['p-value']), options: { fill: { color: C.card }, align: 'right', bold: sig, color: sig ? C.primary : C.text } },
                { text: r['η²p']?.toFixed(3) || '-', options: { fill: { color: C.card }, align: 'right', color: C.textSecondary } }
            ]);
        });
        
        s3.addTable(tRows, { 
            x: 0.5, y: 1.2, w: 9, 
            fontFace: 'Arial', fontSize: 10, 
            border: { pt: 0.5, color: C.cardBorder }, 
            valign: 'middle' 
        });
        
        // Legend
        s3.addText('Bold p-values indicate statistical significance (p < .05)', { 
            x: 0.5, y: 4.7, w: 9, h: 0.3, fontSize: 9, color: C.textMuted, fontFace: 'Arial' 
        });

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 4: VISUALIZATION
        // ══════════════════════════════════════════════════════════════════
        if (plotBase64) {
            const s4 = pptx.addSlide();
            s4.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
            
            s4.addShape('ellipse', { x: 0.5, y: 0.35, w: 0.4, h: 0.4, fill: { color: C.primaryLight } });
            s4.addText('📈', { x: 0.5, y: 0.38, w: 0.4, h: 0.35, fontSize: 14, align: 'center' });
            s4.addText('Interaction Plot', { x: 1.0, y: 0.35, w: 8, h: 0.45, fontSize: 18, bold: true, color: C.text, fontFace: 'Arial' });
            s4.addText('Visual representation of factor effects', { x: 1.0, y: 0.75, w: 8, h: 0.3, fontSize: 11, color: C.textSecondary, fontFace: 'Arial' });
            
            try {
                const b64 = plotBase64.replace(/^data:image\/\w+;base64,/, '');
                s4.addShape('rect', { 
                    x: 0.5, y: 1.15, w: 9, h: 3.5, 
                    fill: { color: C.card },
                    line: { color: C.cardBorder, pt: 1 }
                });
                s4.addImage({ data: `data:image/png;base64,${b64}`, x: 0.6, y: 1.25, w: 8.8, h: 3.3 });
            } catch (e) {
                s4.addText('Plot could not be embedded', { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 12, color: C.textMuted, align: 'center', fontFace: 'Arial' });
            }
            
            // Interpretation note
            s4.addShape('rect', { 
                x: 0.5, y: 4.75, w: 9, h: 0.4, 
                fill: { color: C.muted },
                line: { color: C.cardBorder, pt: 1 }
            });
            s4.addText(intSig ? '→ Non-parallel lines indicate significant interaction between factors' : '→ Relatively parallel lines suggest factors act independently', 
                { x: 0.6, y: 4.82, w: 8.8, h: 0.3, fontSize: 10, color: C.textSecondary, fontFace: 'Arial' }
            );
        }

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 5: MARGINAL MEANS
        // ══════════════════════════════════════════════════════════════════
        if (results.marginal_means) {
            const s5 = pptx.addSlide();
            s5.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
            
            s5.addShape('ellipse', { x: 0.5, y: 0.35, w: 0.4, h: 0.4, fill: { color: C.primaryLight } });
            s5.addText('🎯', { x: 0.5, y: 0.38, w: 0.4, h: 0.35, fontSize: 14, align: 'center' });
            s5.addText('Marginal Means', { x: 1.0, y: 0.35, w: 8, h: 0.45, fontSize: 18, bold: true, color: C.text, fontFace: 'Arial' });
            s5.addText('Group comparisons by factor', { x: 1.0, y: 0.75, w: 8, h: 0.3, fontSize: 11, color: C.textSecondary, fontFace: 'Arial' });
            
            // Factor A Card
            s5.addShape('rect', { x: 0.5, y: 1.15, w: 4.4, h: 2.4, fill: { color: C.card }, line: { color: C.cardBorder, pt: 1 } });
            s5.addText(factorA, { x: 0.65, y: 1.25, w: 3.5, h: 0.35, fontSize: 12, bold: true, color: C.text, fontFace: 'Arial' });
            if (facASig) {
                s5.addShape('rect', { x: 4.1, y: 1.3, w: 0.65, h: 0.25, fill: { color: C.primaryLight } });
                s5.addText('Sig.', { x: 4.1, y: 1.32, w: 0.65, h: 0.22, fontSize: 8, color: C.primary, align: 'center', fontFace: 'Arial' });
            }
            
            const faRows: pptxgen.TableRow[] = [[
                { text: 'Group', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'left' } },
                { text: 'Mean', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
                { text: 'SE', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } }
            ]];
            [...facAMeans].sort((a, b) => (b.mean || 0) - (a.mean || 0)).forEach((r, i) => {
                const top = i === 0;
                faRows.push([
                    { text: String(r.group || ''), options: { fill: { color: C.card }, bold: top, color: top ? C.primary : C.text, align: 'left' } },
                    { text: r.mean?.toFixed(2) || '', options: { fill: { color: C.card }, bold: top, color: top ? C.primary : C.text, align: 'right' } },
                    { text: r.sem?.toFixed(3) || '', options: { fill: { color: C.card }, color: C.textSecondary, align: 'right' } }
                ]);
            });
            s5.addTable(faRows, { x: 0.6, y: 1.65, w: 4.2, fontFace: 'Arial', fontSize: 9, border: { pt: 0.5, color: C.cardBorder }, valign: 'middle' });
            
            // Factor B Card
            s5.addShape('rect', { x: 5.1, y: 1.15, w: 4.4, h: 2.4, fill: { color: C.card }, line: { color: C.cardBorder, pt: 1 } });
            s5.addText(factorB, { x: 5.25, y: 1.25, w: 3.5, h: 0.35, fontSize: 12, bold: true, color: C.text, fontFace: 'Arial' });
            if (facBSig) {
                s5.addShape('rect', { x: 8.7, y: 1.3, w: 0.65, h: 0.25, fill: { color: C.primaryLight } });
                s5.addText('Sig.', { x: 8.7, y: 1.32, w: 0.65, h: 0.22, fontSize: 8, color: C.primary, align: 'center', fontFace: 'Arial' });
            }
            
            const fbRows: pptxgen.TableRow[] = [[
                { text: 'Group', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'left' } },
                { text: 'Mean', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } },
                { text: 'SE', options: { bold: true, fill: { color: C.muted }, color: C.text, align: 'right' } }
            ]];
            [...facBMeans].sort((a, b) => (b.mean || 0) - (a.mean || 0)).forEach((r, i) => {
                const top = i === 0;
                fbRows.push([
                    { text: String(r.group || ''), options: { fill: { color: C.card }, bold: top, color: top ? C.primary : C.text, align: 'left' } },
                    { text: r.mean?.toFixed(2) || '', options: { fill: { color: C.card }, bold: top, color: top ? C.primary : C.text, align: 'right' } },
                    { text: r.sem?.toFixed(3) || '', options: { fill: { color: C.card }, color: C.textSecondary, align: 'right' } }
                ]);
            });
            s5.addTable(fbRows, { x: 5.2, y: 1.65, w: 4.2, fontFace: 'Arial', fontSize: 9, border: { pt: 0.5, color: C.cardBorder }, valign: 'middle' });
            
            // Key findings
            s5.addShape('rect', { x: 0.5, y: 3.7, w: 9, h: 1.0, fill: { color: C.muted }, line: { color: C.cardBorder, pt: 1 } });
            s5.addText('Key Findings', { x: 0.65, y: 3.8, w: 8.5, h: 0.3, fontSize: 11, bold: true, color: C.text, fontFace: 'Arial' });
            
            let findings = '';
            if (facASig && facAHL.high && facAHL.low) {
                findings += `• ${factorA}: "${facAHL.high.group}" > "${facAHL.low.group}" (Δ = ${((facAHL.high.mean || 0) - (facAHL.low.mean || 0)).toFixed(2)})\n`;
            }
            if (facBSig && facBHL.high && facBHL.low) {
                findings += `• ${factorB}: "${facBHL.high.group}" > "${facBHL.low.group}" (Δ = ${((facBHL.high.mean || 0) - (facBHL.low.mean || 0)).toFixed(2)})`;
            }
            if (!findings) findings = '• No significant differences between groups detected';
            s5.addText(findings, { x: 0.65, y: 4.1, w: 8.5, h: 0.5, fontSize: 10, color: C.textSecondary, fontFace: 'Arial' });
        }

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 6: CONCLUSIONS
        // ══════════════════════════════════════════════════════════════════
        const s6 = pptx.addSlide();
        s6.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
        
        s6.addShape('ellipse', { x: 0.5, y: 0.35, w: 0.4, h: 0.4, fill: { color: C.primaryLight } });
        s6.addText('💡', { x: 0.5, y: 0.38, w: 0.4, h: 0.35, fontSize: 14, align: 'center' });
        s6.addText('Conclusions', { x: 1.0, y: 0.35, w: 8, h: 0.45, fontSize: 18, bold: true, color: C.text, fontFace: 'Arial' });
        s6.addText('Summary and recommendations', { x: 1.0, y: 0.75, w: 8, h: 0.3, fontSize: 11, color: C.textSecondary, fontFace: 'Arial' });
        
        // Statistical findings card
        s6.addShape('rect', { x: 0.5, y: 1.15, w: 9, h: 1.5, fill: { color: C.card }, line: { color: C.cardBorder, pt: 1 } });
        s6.addText('Statistical Findings', { x: 0.65, y: 1.25, w: 8.5, h: 0.3, fontSize: 11, bold: true, color: C.text, fontFace: 'Arial' });
        
        let findings = '';
        findings += `• Interaction (${factorA} × ${factorB}): ${intSig ? `Significant (p = ${formatP(intRow?.['p-value'])})` : 'Not significant'}\n`;
        findings += `• ${factorA} main effect: ${facASig ? `Significant (p = ${formatP(facARow?.['p-value'])})` : 'Not significant'}\n`;
        findings += `• ${factorB} main effect: ${facBSig ? `Significant (p = ${formatP(facBRow?.['p-value'])})` : 'Not significant'}`;
        s6.addText(findings, { x: 0.65, y: 1.55, w: 8.5, h: 1.0, fontSize: 10, color: C.textSecondary, fontFace: 'Arial' });
        
        // Two cards side by side
        // Implications
        s6.addShape('rect', { x: 0.5, y: 2.8, w: 4.4, h: 1.4, fill: { color: C.muted }, line: { color: C.cardBorder, pt: 1 } });
        s6.addShape('rect', { x: 0.5, y: 2.8, w: 0.06, h: 1.4, fill: { color: C.success } });
        s6.addText('Implications', { x: 0.7, y: 2.9, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.text, fontFace: 'Arial' });
        
        let impl = '';
        if (intSig) impl = '• Consider factor interactions\n• Examine simple main effects\n• Context-specific strategies needed';
        else if (facASig || facBSig) {
            if (facASig && facAHL.high) impl += `• Optimize ${factorA}: "${facAHL.high.group}"\n`;
            if (facBSig && facBHL.high) impl += `• Optimize ${factorB}: "${facBHL.high.group}"`;
            if (!impl) impl = '• Apply findings directly';
        } else impl = '• No actionable differences found\n• Consider other variables';
        s6.addText(impl, { x: 0.7, y: 3.2, w: 4, h: 0.9, fontSize: 9, color: C.textSecondary, fontFace: 'Arial' });
        
        // Next steps
        s6.addShape('rect', { x: 5.1, y: 2.8, w: 4.4, h: 1.4, fill: { color: C.muted }, line: { color: C.cardBorder, pt: 1 } });
        s6.addShape('rect', { x: 5.1, y: 2.8, w: 0.06, h: 1.4, fill: { color: C.primary } });
        s6.addText('Next Steps', { x: 5.3, y: 2.9, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.text, fontFace: 'Arial' });
        
        const next = intSig 
            ? '• Simple main effects analysis\n• Post-hoc comparisons\n• Visualize interactions'
            : '• Post-hoc tests if needed\n• Effect size interpretation\n• Practical applications';
        s6.addText(next, { x: 5.3, y: 3.2, w: 4, h: 0.9, fontSize: 9, color: C.textSecondary, fontFace: 'Arial' });
        
        // Note
        s6.addShape('rect', { x: 0.5, y: 4.4, w: 9, h: 0.4, fill: { color: C.warningBg }, line: { color: 'FDE68A', pt: 1 } });
        s6.addText('Note: Consider both statistical and practical significance when interpreting results.', 
            { x: 0.6, y: 4.47, w: 8.8, h: 0.3, fontSize: 9, color: C.text, fontFace: 'Arial' }
        );

        // ══════════════════════════════════════════════════════════════════
        // SLIDE 7: THANK YOU
        // ══════════════════════════════════════════════════════════════════
        const s7 = pptx.addSlide();
        s7.addShape('rect', { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.background } });
        s7.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: C.primary } });
        
        s7.addText('Thank You', { x: 0, y: 1.8, w: '100%', h: 0.7, fontSize: 36, bold: true, color: C.text, align: 'center', fontFace: 'Arial' });
        s7.addText('Two-Way ANOVA Analysis Complete', { x: 0, y: 2.5, w: '100%', h: 0.4, fontSize: 14, color: C.textSecondary, align: 'center', fontFace: 'Arial' });
        
        // Summary card
        s7.addShape('rect', { x: 2.5, y: 3.2, w: 5, h: 1.0, fill: { color: C.muted }, line: { color: C.cardBorder, pt: 1 } });
        
        const sumItems = [
            { label: 'Interaction', val: intSig },
            { label: factorA, val: facASig },
            { label: factorB, val: facBSig }
        ];
        sumItems.forEach((item, i) => {
            const x = 2.7 + i * 1.6;
            s7.addText(item.label, { x, y: 3.35, w: 1.5, h: 0.25, fontSize: 9, color: C.textMuted, align: 'center', fontFace: 'Arial' });
            s7.addShape('ellipse', { x: x + 0.55, y: 3.65, w: 0.3, h: 0.3, fill: { color: item.val ? C.primaryLight : C.muted } });
            s7.addText(item.val ? '✓' : '−', { x: x + 0.55, y: 3.67, w: 0.3, h: 0.26, fontSize: 11, align: 'center', color: item.val ? C.primary : C.textMuted });
        });
        
        s7.addText('Questions?', { x: 0, y: 4.5, w: '100%', h: 0.4, fontSize: 12, color: C.textMuted, align: 'center', fontFace: 'Arial' });

        // Generate output
        const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="ANOVA_${factorA}_${factorB}_${new Date().toISOString().split('T')[0]}.pptx"`
            }
        });
    } catch (error) {
        console.error('PPTX error:', error);
        return NextResponse.json({ error: 'Failed to generate PPTX' }, { status: 500 });
    }
}
