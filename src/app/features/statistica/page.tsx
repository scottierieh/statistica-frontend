
'use client';
import React from 'react';
import { FeaturePageHeader } from '@/components/feature-page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUp, Bot, AppWindow, BookOpen, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const analysisMethods = [
    { category: 'Descriptive', method: 'Descriptive Statistics', purpose: 'Summarizes data using mean, SD, min, max, etc.', useCase: 'Summarizing survey responses, initial data overview', imageSeed: 'desc' },
    { category: 'Descriptive', method: 'Frequency Analysis', purpose: 'Calculates counts and percentages for each category', useCase: 'Showing response rates in Likert scale surveys', imageSeed: 'freq' },
    { category: 'Assumptions', method: 'Normality Test', purpose: 'Tests whether data follow a normal distribution', useCase: 'Pre-check for t-test or ANOVA', imageSeed: 'norm' },
    { category: 'Assumptions', method: 'Homogeneity of Variance', purpose: 'Tests if variances are equal across groups', useCase: 'Assumption check before ANOVA', imageSeed: 'homo' },
    { category: 'Comparison', method: 'T-Tests (One-Sample)', purpose: 'Compares sample mean to a population mean', useCase: 'Assessing overall satisfaction level', imageSeed: 'ttest1' },
    { category: 'Comparison', method: 'Independent Samples T-Test', purpose: 'Compares means between two independent groups', useCase: 'Comparing satisfaction between male/female respondents', imageSeed: 'ttest2' },
    { category: 'Comparison', method: 'Paired Samples T-Test', purpose: 'Compares means within the same group over time', useCase: 'Pre- vs. post-training evaluation', imageSeed: 'ttest3' },
    { category: 'Comparison', method: 'One-Way ANOVA', purpose: 'Compares means among three or more groups', useCase: 'Comparing satisfaction by age group', imageSeed: 'anova1' },
    { category: 'Comparison', method: 'Two-Way ANOVA', purpose: 'Tests interaction effects between two factors', useCase: 'Gender × Age interaction effects', imageSeed: 'anova2' },
    { category: 'Comparison', method: 'ANCOVA', purpose: 'Controls covariates while comparing group means', useCase: 'Adjusting for education level or time spent', imageSeed: 'ancova' },
    { category: 'Comparison', method: 'MANOVA', purpose: 'Compares multiple dependent variables simultaneously', useCase: 'Analyzing multiple satisfaction dimensions', imageSeed: 'manova' },
    { category: 'Comparison', method: 'Repeated Measures ANOVA', purpose: 'Analyzes repeated measurements within subjects', useCase: 'Measuring changes across time or conditions', imageSeed: 'rmanova' },
    { category: 'Relationship', method: 'Correlation', purpose: 'Measures strength and direction of relationships', useCase: 'Relationship between satisfaction and repurchase', imageSeed: 'corr' },
    { category: 'Relationship', method: 'Simple Linear Regression', purpose: 'Predicts one variable using another', useCase: 'Effect of price on satisfaction', imageSeed: 'reg1' },
    { category: 'Relationship', method: 'Multiple Linear Regression', purpose: 'Predicts outcome using multiple predictors', useCase: 'Impact of quality, price, and service on satisfaction', imageSeed: 'reg2' },
    { category: 'Relationship', method: 'Polynomial Regression', purpose: 'Models nonlinear relationships', useCase: 'Curvilinear relationship between price and satisfaction', imageSeed: 'regpoly' },
    { category: 'Relationship', method: 'Logistic Regression', purpose: 'Predicts categorical outcomes (e.g., yes/no)', useCase: 'Purchase decision prediction', imageSeed: 'logit' },
    { category: 'Relationship', method: 'Crosstab & Chi-Squared', purpose: 'Tests independence between categorical variables', useCase: 'Gender differences in brand preference', imageSeed: 'cross' },
    { category: 'Predictive', method: 'Generalized Linear Model (GLM)', purpose: 'Extends regression to non-normal distributions', useCase: 'Poisson, logistic, or gamma regression models', imageSeed: 'glm' },
    { category: 'Predictive', method: 'Discriminant Analysis', purpose: 'Classifies cases into predefined groups', useCase: 'Customer segmentation, churn prediction', imageSeed: 'disc' },
    { category: 'Structural', method: 'Factor Analysis', purpose: 'Identifies latent factors from correlated items', useCase: 'Reducing survey dimensions', imageSeed: 'factor' },
    { category: 'Structural', method: 'Reliability (Cronbach’s α)', purpose: 'Tests internal consistency among items', useCase: 'Reliability check for survey scales', imageSeed: 'alpha' },
    { category: 'Structural', method: 'Exploratory Factor Analysis (EFA)', purpose: 'Explores underlying factor structure', useCase: 'Identifying satisfaction dimensions', imageSeed: 'efa' },
    { category: 'Structural', method: 'Path Analysis', purpose: 'Tests direct and indirect relationships', useCase: 'Service → Satisfaction → Loyalty', imageSeed: 'path' },
    { category: 'Structural', method: 'Mediation Analysis', purpose: 'Tests indirect (mediating) effects', useCase: 'Satisfaction mediating the effect of quality on loyalty', imageSeed: 'mediate' },
    { category: 'Structural', method: 'Moderation Analysis', purpose: 'Tests interaction (moderating) effects', useCase: 'Gender moderating the quality–satisfaction link', imageSeed: 'moderate' },
    { category: 'Clustering', method: 'K-Means', purpose: 'Groups cases based on similarity (centroid-based)', useCase: 'Customer segmentation', imageSeed: 'kmeans' },
    { category: 'Clustering', method: 'K-Medoids', purpose: 'Similar to K-Means but more robust to outliers', useCase: 'Clustering noisy or non-numeric data', imageSeed: 'kmedoid' },
    { category: 'Clustering', method: 'Hierarchical (HCA)', purpose: 'Builds nested clusters in a tree-like structure', useCase: 'Visualizing customer hierarchy (dendrogram)', imageSeed: 'hca' },
    { category: 'Clustering', method: 'DBSCAN / HDBSCAN', purpose: 'Density-based clustering that handles noise', useCase: 'Finding natural clusters in large datasets', imageSeed: 'dbscan' },
    { category: 'Time Series', method: 'Trend Analysis', purpose: 'Detects upward or downward patterns over time', useCase: 'Sales or traffic trend analysis', imageSeed: 'trend' },
    { category: 'Time Series', method: 'Seasonal Decomposition', purpose: 'Decomposes time series into trend, seasonal, residual components', useCase: 'Identifying seasonal buying patterns', imageSeed: 'season' },
    { category: 'Time Series', method: 'ACF/PACF Plots', purpose: 'Examines autocorrelation patterns', useCase: 'Selecting ARIMA model parameters', imageSeed: 'acf' },
    { category: 'Time Series', method: 'Stationarity Test (ADF)', purpose: 'Tests whether a time series is stationary', useCase: 'Preprocessing for forecasting models', imageSeed: 'station' },
    { category: 'Time Series', method: 'Ljung-Box / ARCH-LM Test', purpose: 'Tests residual independence or heteroskedasticity', useCase: 'Model adequacy diagnostics', imageSeed: 'ljung' },
    { category: 'Time Series', method: 'Exponential Smoothing', purpose: 'Short-term forecasting using weighted averages', useCase: 'Simple forecast for demand or visits', imageSeed: 'expsmooth' },
    { category: 'Time Series', method: 'ARIMA / SARIMAX', purpose: 'Advanced time-series forecasting models', useCase: 'Monthly sales or traffic prediction', imageSeed: 'arima' },
    { category: 'Time Series', method: 'Forecast Model Evaluation', purpose: 'Compares prediction accuracy (RMSE, MAE, etc.)', useCase: 'Model performance comparison', imageSeed: 'forecast' },
    { category: 'Unstructured Data', method: 'Sentiment Analysis', purpose: 'Classifies text polarity (positive/negative/neutral)', useCase: 'Product review sentiment tracking', imageSeed: 'sentiment' },
    { category: 'Unstructured Data', method: 'Topic Modeling (LDA)', purpose: 'Identifies underlying topics from text', useCase: 'Extracting key themes from open-ended survey responses', imageSeed: 'topic' },
    { category: 'Unstructured Data', method: 'Word Cloud', purpose: 'Visualizes most frequent words', useCase: 'Highlighting main keywords in feedback', imageSeed: 'wordcloud' },
];

export default function StatisticaFeaturePage() {
    const groupedMethods = analysisMethods.reduce((acc, method) => {
        if (!acc[method.category]) {
            acc[method.category] = [];
        }
        acc[method.category].push(method);
        return acc;
    }, {} as Record<string, typeof analysisMethods>);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <FeaturePageHeader title="Statistica" />
            <main className="flex-1 p-4 md:p-8 lg:p-12">
                <div className="max-w-6xl mx-auto">
                    <Card className="mb-8">
                        <CardHeader className="text-center">
                            <CardTitle className="text-4xl font-headline">The All-in-One Statistical Analysis Tool</CardTitle>
                            <CardDescription className="text-lg text-muted-foreground mt-2">
                                From raw data to actionable insights in just a few clicks. Statistica empowers you to perform complex analyses with ease.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <FileUp className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Direct Data Upload</h3>
                                    <p className="text-xs text-muted-foreground">Upload CSV or Excel files and start analyzing instantly.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <BookOpen className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Example Datasets</h3>
                                    <p className="text-xs text-muted-foreground">Explore any analysis with one-click example data loading.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <Bot className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">AI Interpretations</h3>
                                    <p className="text-xs text-muted-foreground">Get automated, APA-style reports and clear explanations.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <AppWindow className="mx-auto h-10 w-10 text-primary mb-2" />
                                    <h3 className="font-semibold">Integrated Interface</h3>
                                    <p className="text-xs text-muted-foreground">Results, charts, and interpretations all in one view.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
          
                    <Card>
                        <CardHeader>
                            <CardTitle>Available Analysis Methods</CardTitle>
                            <CardDescription>A comprehensive suite of tools for any research question.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/6">Category</TableHead>
                                        <TableHead className="w-1/6">Analysis Method</TableHead>
                                        <TableHead className="w-1/3">Purpose / Description</TableHead>
                                        <TableHead className="w-1/3">Typical Use Case</TableHead>
                                        <TableHead className="text-center">Preview</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(groupedMethods).map(([category, methods]) => (
                                        <React.Fragment key={category}>
                                            {methods.map((method, index) => (
                                                <TableRow key={method.method}>
                                                    {index === 0 && (
                                                        <TableCell rowSpan={methods.length} className="align-middle font-semibold">
                                                            {category}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>{method.method}</TableCell>
                                                    <TableCell>{method.purpose}</TableCell>
                                                    <TableCell>{method.useCase}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-3xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>{method.method} - Example Result</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="flex justify-center p-4">
                                                                    <Image 
                                                                        src={`https://picsum.photos/seed/${method.imageSeed}/800/600`}
                                                                        alt={`Example result for ${method.method}`}
                                                                        width={800}
                                                                        height={600}
                                                                        className="rounded-lg border"
                                                                    />
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

