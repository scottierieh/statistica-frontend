
'use server';

/**
 * @fileOverview This file imports and registers all Genkit flows for the application.
 *
 * It ensures that all AI-powered functionalities, such as generating summary reports,
 * creating data visualizations, and interpreting statistical results, are available
 * for use throughout the application. By centralizing imports here, it simplifies
 * management of AI flows and their dependencies.
 *
 * Imported flows:
 * - generateSummaryReport: Generates a comprehensive summary report from statistical data.
 * - generateDataVisualization: Creates descriptive text for data visualizations.
 * - interpretAnova: Provides expert interpretation of ANOVA test results.
 * - interpretReliability: Interprets reliability analysis metrics like Cronbach's Alpha.
 * - interpretCorrelation: Explains the meaning and strength of correlation matrices.
 * - interpretCrosstab: Analyzes and interprets crosstabulation and Chi-squared test results.
 * - interpretCfa: Delivers insights on Confirmatory Factor Analysis outcomes.
 * - interpretFrequency: Summarizes and interprets frequency distribution tables.
 */

import {config} from 'dotenv';
config();

import '@/ai/flows/generate-summary-report.ts';
import '@/ai/flows/generate-data-visualization.ts';
import '@/ai/flows/interpret-anova.ts';
import '@/ai/flows/interpret-reliability.ts';
import '@/ai/flows/interpret-correlation.ts';
import '@/ai/flows/interpret-crosstab.ts';
import '@/ai/flows/interpret-cfa.ts';
import '@/ai/flows/interpret-frequency.ts';
import '@/ai/flows/interpret-clustering.ts';
