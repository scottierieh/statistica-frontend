import { config } from 'dotenv';
config();

import '@/ai/flows/generate-summary-report.ts';
import '@/ai/flows/generate-data-visualization.ts';
import '@/ai/flows/interpret-anova.ts';
import '@/ai/flows/interpret-reliability.ts';
import '@/ai/flows/interpret-correlation.ts';
import '@/ai/flows/interpret-crosstab.ts';
import '@/ai/flows/interpret-cfa.ts';
