import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { results, dependentVar, factorA, factorB, plot } = body;
        
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(22);
        doc.text("Two-Way ANOVA Analysis Report", 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Dependent Variable: ${dependentVar}`, 105, 30, { align: 'center' });
        doc.text(`Factors: ${factorA}, ${factorB}`, 105, 38, { align: 'center' });

        // Plot
        if (plot) {
             doc.addImage(plot, 'PNG', 15, 45, 180, 100);
        }

        // ANOVA Table
        let finalY = 160;
        doc.setFontSize(14);
        doc.text("ANOVA Results", 15, finalY);
        
        const anovaHead = [['Source', 'Sum Sq.', 'df', 'F', 'p-value', 'η²p']];
        const anovaBody = results.anova_table.map((row: any) => [
            row.Source,
            row.sum_sq.toFixed(2),
            row.df,
            row.F.toFixed(2),
            row['p-value'] < 0.001 ? '<0.001' : row['p-value'].toFixed(3),
            row['η²p'].toFixed(3)
        ]);

        doc.autoTable({
            startY: finalY + 5,
            head: anovaHead,
            body: anovaBody,
            theme: 'grid'
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15;

        // Interpretation
        doc.setFontSize(14);
        doc.text("Interpretation", 15, finalY);
        doc.setFontSize(10);
        doc.text(results.interpretation.replace(/<[^>]*>/g, ''), 15, finalY + 7, { maxWidth: 180 });

        const buffer = doc.output('arraybuffer');
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Two-Way-ANOVA-Report.pdf"`
            }
        });

    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
