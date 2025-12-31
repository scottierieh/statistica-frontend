import { ArrowLeftRight, Users, TrendingUp, Target, Layers, Timer } from 'lucide-react';

export const analysisGoals = [
    {
        id: 'compare',
        title: 'Compare Groups',
        description: 'See if there are significant differences between two or more groups.',
        icon: Users,
    },
    {
        id: 'relationship',
        title: 'Explore Relationships',
        description: 'Understand how two or more variables are connected.',
        icon: TrendingUp,
    },
    {
        id: 'predict',
        title: 'Predict an Outcome',
        description: 'Forecast a value or classify an outcome based on other variables.',
        icon: Target,
    },
    {
        id: 'structure',
        title: 'Find Underlying Structure',
        description: 'Reduce complexity by finding hidden factors or groups in your data.',
        icon: Layers,
    },
    {
        id: 'time',
        title: 'Analyze Over Time',
        description: 'Look for trends, seasonality, or changes in data over a period.',
        icon: Timer,
    },
     {
        id: 'change',
        title: 'Measure Change',
        description: 'Compare measurements taken before and after an event or intervention.',
        icon: ArrowLeftRight,
    },
];
