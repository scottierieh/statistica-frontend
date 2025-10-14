
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Info, 
    BarChart, 
    PieChart, 
    LineChart, 
    AreaChart, 
    ScatterChart, 
    Box, 
    GitBranch, 
    Network, 
    Map, 
    TrendingUp, 
    CheckCircle, 
    AlertTriangle, 
    Settings, 
    FileSearch, 
    Users, 
    Repeat, 
    TestTube, 
    Columns, 
    Target, 
    Component, 
    HeartPulse, 
    Feather, 
    Smile, 
    Scaling, 
    ChevronsUpDown, 
    Calculator, 
    Brain, 
    Link2, 
    ShieldCheck, 
    Zap, 
    Sparkles, 
    Star, 
    Search,
    GanttChartSquare,
    CandlestickChart,
    Pyramid,
    Orbit,
    Hexagon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface ChartCardProps {
    name: string;
    description: string;
    icon: React.ElementType;
    tags: string[];
}

const ChartCard = ({ name, description, icon: Icon, tags }: ChartCardProps) => (
  <Card className="hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 flex flex-col">
    <CardHeader>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold text-primary">{name}</CardTitle>
          <CardDescription className="text-sm mt-1">{description}</CardDescription>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex items-end">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <Badge key={i} variant={i === 0 ? "default" : "secondary"}>{tag}</Badge>
        ))}
      </div>
    </CardContent>
  </Card>
);

const chartCategories = {
    "Basic Charts": [
        { name: "Bar Chart", description: "Compare categorical values", icon: BarChart, tags: ["Ranking", "Categorical"] },
        { name: "Column Chart", description: "Vertical bar comparison", icon: BarChart, tags: ["Time Series", "Comparison"] },
        { name: "Line Chart", description: "Display trends over time", icon: LineChart, tags: ["Trend Analysis", "Time Series"] },
        { name: "Area Chart", description: "Line chart with filled area", icon: AreaChart, tags: ["Cumulative", "Volume"] },
        { name: "Pie Chart", description: "Show proportions of a whole", icon: PieChart, tags: ["Percentage", "Composition"] },
        { name: "Donut Chart", description: "Pie chart with center space", icon: PieChart, tags: ["Composition", "KPI"] },
        { name: "Scatter Plot", description: "Relationship between two variables", icon: ScatterChart, tags: ["Correlation", "Relationship"] },
        { name: "Bubble Chart", description: "Scatter plot with a third variable for size", icon: GitBranch, tags: ["3 Variables", "Multivariate"] },
    ],
    "Survey Response Charts": [
        { name: "Likert Scale Chart", description: "Visualize attitude scale responses", icon: Users, tags: ["Satisfaction", "Attitude"] },
        { name: "Diverging Bar Chart", description: "Compare positive/negative responses", icon: BarChart, tags: ["Sentiment", "Comparison"] },
        { name: "Radar (Spider) Chart", description: "Compare multiple attributes radially", icon: Orbit, tags: ["Multi-attribute", "IPA"] },
        { name: "NPS Chart", description: "Net Promoter Score distribution", icon: TrendingUp, tags: ["Loyalty", "Recommendation"] },
        { name: "Word Cloud", description: "Visualize open-ended keywords", icon: Feather, tags: ["Text Analysis", "Open-ended"] },
        { name: "Matrix Heatmap", description: "Show item × response distribution", icon: Box, tags: ["Matrix", "Crosstab"] },
    ],
    "Statistical Analysis Charts": [
        { name: "Histogram", description: "Show frequency distribution", icon: BarChart, tags: ["Distribution", "Frequency"] },
        { name: "Box Plot", description: "Summary of distribution with outliers", icon: Box, tags: ["Statistical Summary", "Outliers"] },
        { name: "Violin Plot", description: "Box plot with density distribution", icon: GitBranch, tags: ["Detailed Distribution", "Density"] },
        { name: "Regression Plot", description: "Show relationship with trend line", icon: TrendingUp, tags: ["Correlation", "Trend"] },
        { name: "PCA Plot", description: "Principal component analysis visualization", icon: Component, tags: ["Factor Analysis", "Dimensionality"] },
        { name: "Cluster Plot", description: "Display data segmentation results", icon: Users, tags: ["Segmentation", "Clustering"] },
        { name: "Dendrogram", description: "Hierarchical clustering tree", icon: Network, tags: ["Hierarchy", "Clustering"] },
    ],
    "Time Series Charts": [
        { name: "Time Series Line", description: "Track changes over time periods", icon: LineChart, tags: ["Trends", "Monthly Response"] },
        { name: "Streamgraph", description: "Stacked area chart flowing over time", icon: AreaChart, tags: ["Sentiment", "Evolution"] },
        { name: "Calendar Heatmap", description: "Activity patterns by date", icon: Map, tags: ["Activity", "Patterns"] },
        { name: "Gantt Chart", description: "Project timeline and scheduling", icon: GanttChartSquare, tags: ["Project", "Schedule"] },
        { name: "Candlestick Chart", description: "Financial-style OHLC visualization", icon: CandlestickChart, tags: ["Financial", "OHLC"] },
    ],
     "Relationship & Network": [
        { name: "Network Graph", description: "Node and edge relationships", icon: Network, tags: ["Connections", "Social Network"] },
        { name: "Sankey Diagram", description: "Flow between multiple stages", icon: GitBranch, tags: ["Flow", "Path Analysis"] },
        { name: "Chord Diagram", description: "Inter-group flow relationships", icon: Orbit, tags: ["Inter-relationship", "Matrix Flow"] },
        { name: "Alluvial Diagram", description: "Changes in categorical flows", icon: TrendingUp, tags: ["Migration", "Temporal Change"] },
    ],
};


export default function VisualizationPage() {

    return (
        <div className="bg-slate-50 dark:bg-slate-900 p-5 md:p-10 min-h-screen">
            <div className="container mx-auto">
                <Card className="mb-6 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold font-headline">📊 Chart Types Reference Guide</CardTitle>
                        <CardDescription>Comprehensive visualization guide for survey analysis and data representation</CardDescription>
                    </CardHeader>
                </Card>
                
                <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300">Quick Guide</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-300">
                        This reference guide contains various chart types organized into categories. Each chart includes visual examples, descriptions, and recommended use cases.
                    </AlertDescription>
                </Alert>
                
                {Object.entries(chartCategories).map(([category, charts]) => (
                     <div key={category} className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BarChart className="w-5 h-5 text-primary" />
                            </div>
                           {category}
                            <Badge variant="secondary">{charts.length} Charts</Badge>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {charts.map((chart) => (
                                <ChartCard key={chart.name} {...chart} />
                            ))}
                        </div>
                    </div>
                ))}

                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Selection Tips</AlertTitle>
                    <AlertDescription>
                        <strong>For Survey Analysis:</strong> Use Likert Scale Charts, Diverging Bars, and Radar Charts to visualize satisfaction and preference. <strong>For Time-Based Data:</strong> Time Series Line and Calendar Heatmaps are excellent for tracking trends and patterns.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
