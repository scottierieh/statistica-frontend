
'use server';
import { generateDataVisualization, GenerateDataVisualizationInput } from "@/ai/flows/generate-data-visualization";
import { generateSummaryReport, GenerateSummaryReportInput } from "@/ai/flows/generate-summary-report";
import { interpretAnova, InterpretAnovaInput } from "@/ai/flows/interpret-anova";
import { interpretReliability, InterpretReliabilityInput } from "@/ai/flows/interpret-reliability";
import { interpretCrosstab, InterpretCrosstabInput } from "@/ai/flows/interpret-crosstab";
import { interpretCfa, InterpretCfaInput } from "@/ai/flows/interpret-cfa";
import { interpretFrequency, InterpretFrequencyInput } from "@/ai/flows/interpret-frequency";
import { interpretKmeans, InterpretKmeansInput } from "@/ai/flows/interpret-kmeans";

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

export async function getReliabilityInterpretation(input: InterpretReliabilityInput) {
    try {
        const result = await interpretReliability(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate reliability interpretation." };
    }
}

export async function getCrosstabInterpretation(input: InterpretCrosstabInput) {
    try {
        const result = await interpretCrosstab(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate crosstab interpretation." };
    }
}

export async function getCfaInterpretation(input: InterpretCfaInput) {
    try {
        const result = await interpretCfa(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate CFA interpretation." };
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

export async function getKmeansInterpretation(input: InterpretKmeansInput) {
    try {
        const result = await interpretKmeans(input);
        return { success: true, interpretation: result.interpretation };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to generate K-Means interpretation." };
    }
}
