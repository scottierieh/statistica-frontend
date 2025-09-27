

'use server';
import { generateDataVisualization, GenerateDataVisualizationInput } from "@/ai/flows/generate-data-visualization";
import { generateSummaryReport, GenerateSummaryReportInput } from "@/ai/flows/generate-summary-report";
import { interpretFrequency, InterpretFrequencyInput } from "@/ai/flows/interpret-frequency";
import { interpretClustering, InterpretClusteringInput } from "@/ai/flows/interpret-clustering";

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

export async function getFrequencyInterpretation(input: InterpretFrequencyInput) {
    try {
        const result = await interpretFrequency(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate frequency interpretation." };
    }
}

export async function getClusteringInterpretation(input: InterpretClusteringInput) {
    try {
        const result = await interpretClustering(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate Clustering interpretation." };
    }
}
