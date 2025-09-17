
import { Car, Coffee, Database, ShieldCheck, LucideIcon, BookOpen, Users, BrainCircuit, Network, TrendingUp, FlaskConical, Binary, Copy, Sigma, BarChart, Columns, Target, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare } from "lucide-react";

// The definition for AnalysisType was moved to statistica-app.tsx to avoid circular dependencies.
// Let's define it here locally for this file's purpose.
type AnalysisType = 'stats' | 'correlation' | 'one-way-anova' | 'two-way-anova' | 'ancova' | 'manova' | 'reliability' | 'visuals' | 'discriminant' | 'efa' | 'cfa' | 'mediation' | 'moderation' | 'nonparametric' | 'hca' | 't-test' | 'regression' | 'logistic-regression' | 'glm' | 'kmeans' | 'kmedoids' | 'hdbscan' | 'frequency' | 'crosstab' | 'sem' | 'conjoint' | 'ipa' | 'pca' | 'survival' | 'wordcloud' | 'gbm' | 'sentiment' | 'meta-analysis' | 'mds' | 'rm-anova' | 'dbscan' | 'nonlinear-regression' | 'sna' | 'topic-modeling' | 'dea' | string;


export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    analysisTypes: AnalysisType[];
    recommendedAnalysis?: AnalysisType;
    data: string;
}

export const exampleDatasets: ExampleDataSet[] = [
]
