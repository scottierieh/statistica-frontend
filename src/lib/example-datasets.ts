
import { Car, Coffee, Database, ShieldCheck, LucideIcon, BookOpen, Users, BrainCircuit } from "lucide-react";
import { likertScaleData } from "./example-datasets/likert-scale-data";
import { studentPerformanceData } from "./example-datasets/student-performance";

// The definition for AnalysisType was moved to statistica-app.tsx to avoid circular dependencies.
// Let's define it here locally for this file's purpose.
type AnalysisType = 'stats' | 'correlation' | 'anova' | 'reliability' | 'visuals' | 'discriminant' | 'efa';


export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    analysisTypes: AnalysisType[];
    recommendedAnalysis?: AnalysisType;
    data: string;
}

const irisData = `sepal.length,sepal.width,petal.length,petal.width,variety
5.1,3.5,1.4,.2,Setosa
4.9,3,1.4,.2,Setosa
4.7,3.2,1.3,.2,Setosa
7,3.2,4.7,1.4,Versicolor
6.4,3.2,4.5,1.5,Versicolor
6.9,3.1,4.9,1.5,Versicolor
6.5,3,5.2,2,Virginica
6.3,3.4,5.6,2.4,Virginica
5.8,2.7,5.1,1.9,Virginica
`;

const tipsData = `total_bill,tip,sex,smoker,day,time,size
16.99,1.01,Female,No,Sun,Dinner,2
10.34,1.66,Male,No,Sun,Dinner,3
21.01,3.5,Male,No,Sun,Dinner,3
23.68,3.31,Male,No,Sun,Dinner,2
24.59,3.61,Female,No,Sun,Dinner,4
25.29,4.71,Male,No,Sun,Dinner,4
8.77,2,Male,No,Sun,Dinner,2
26.88,3.12,Male,No,Sun,Dinner,4
15.04,1.96,Male,No,Sun,Dinner,2
14.78,3.22,Male,No,Sun,Dinner,2
`;


export const exampleDatasets: ExampleDataSet[] = [
    {
        id: 'well-being-survey',
        name: 'Well-being Survey',
        description: 'Survey data for Anxiety, Depression, and Stress. Ideal for EFA.',
        icon: BrainCircuit,
        analysisTypes: ['stats', 'reliability', 'efa'],
        recommendedAnalysis: 'efa',
        data: likertScaleData,
    },
    {
        id: 'iris',
        name: 'Iris Flowers',
        description: 'Sepal and petal measurements for three species of iris flowers.',
        icon: Users,
        analysisTypes: ['stats', 'correlation', 'anova', 'visuals', 'discriminant'],
        recommendedAnalysis: 'discriminant',
        data: irisData
    },
    {
        id: 'tips',
        name: 'Restaurant Tips',
        description: 'Tips received by a server, along with customer and bill info.',
        icon: Coffee,
        analysisTypes: ['stats', 'anova', 'visuals'],
        data: tipsData
    },
    {
        id: 'student-performance',
        name: 'Student Performance',
        description: 'Study hours, attendance, and previous scores vs. final exam scores.',
        icon: BookOpen,
        analysisTypes: ['stats', 'correlation', 'visuals'],
        recommendedAnalysis: 'correlation',
        data: studentPerformanceData
    }
]
