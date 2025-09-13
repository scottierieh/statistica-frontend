'use server';
import { generateDataVisualization, GenerateDataVisualizationInput } from "@/ai/flows/generate-data-visualization";
import { generateSummaryReport, GenerateSummaryReportInput } from "@/ai/flows/generate-summary-report";
import { interpretAnova, InterpretAnovaInput } from "@/ai/flows/interpret-anova";

export async function getVisualizationDescription(input: GenerateDataVisualizationInput) {
    try {
        const result = await generateDataVisualization(input);
        return { success: true, description: result.visualizationDescription };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate visualization description." };
    }
}

export async function getSummaryReport(input: GenerateSummaryReportInput) {
    try {
        const result = await generateSummaryReport(input);
        return { success: true, report: result.report };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate summary report." };
    }
}

export async function getAnovaInterpretation(input: InterpretAnovaInput) {
    try {
        const result = await interpretAnova(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate ANOVA interpretation." };
    }
}
