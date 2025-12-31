
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sigma, BarChart, Users, CheckSquare, TrendingUp, Network, Columns, Target, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, ClipboardList, Handshake, Replace, Activity, Palette, Brain, Link2, ShieldCheck, FileSearch, TestTube
} from "lucide-react";
import Mindmap from '@/components/mindmap';

const analysisMethods = [
    { category: 'Descriptive', method: 'Descriptive Statistics', purpose: 'Summarizes data using mean, SD, min, max, etc.', useCase: 'Summarizing survey responses, initial data overview' },
    { category: 'Descriptive', method: 'Frequency Analysis', purpose: 'Calculates counts and percentages for each category', useCase: 'Showing response rates in Likert scale surveys' },
    { category: 'Assumptions', method: 'Normality Test', purpose: 'Tests whether data follow a normal distribution', useCase: 'Pre-check for t-test or ANOVA' },
    { category: 'Assumptions', method: 'Homogeneity of Variance', purpose: 'Tests if variances are equal across groups', useCase: 'Assumption check before ANOVA' },
    { category: 'Comparison', method: 'T-Tests (One-Sample)', purpose: 'Compares sample mean to a population mean', useCase: 'Assessing overall satisfaction level' },
    { category: 'Comparison', method: 'Independent Samples T-Test', purpose: 'Compares means between two independent groups', useCase: 'Comparing satisfaction between male/female respondents' },
    { category: 'Comparison', method: 'Paired Samples T-Test', purpose: 'Compares means within the same group over time', useCase: 'Pre- vs. post-training evaluation' },
    { category: 'Comparison', method: 'One-Way ANOVA', purpose: 'Compares means among three or more groups', useCase: 'Comparing satisfaction by age group' },
    { category: 'Comparison', method: 'Two-Way ANOVA', purpose: 'Tests interaction effects between two factors', useCase: 'Gender × Age interaction effects' },
    { category: 'Comparison', method: 'ANCOVA', purpose: 'Controls covariates while comparing group means', useCase: 'Adjusting for education level or time spent' },
    { category: 'Comparison', method: 'MANOVA', purpose: 'Compares multiple dependent variables simultaneously', useCase: 'Analyzing multiple satisfaction dimensions' },
    { category: 'Comparison', method: 'Repeated Measures ANOVA', purpose: 'Analyzes repeated measurements within subjects', useCase: 'Measuring changes across time or conditions' },
    { category: 'Relationship', method: 'Correlation', purpose: 'Measures strength and direction of relationships', useCase: 'Relationship between satisfaction and repurchase' },
    { category: 'Relationship', method: 'Simple Linear Regression', purpose: 'Predicts one variable using another', useCase: 'Effect of price on satisfaction' },
    { category: 'Relationship', method: 'Multiple Linear Regression', purpose: 'Predicts outcome using multiple predictors', useCase: 'Impact of quality, price, and service on satisfaction' },
    { category: 'Relationship', method: 'Polynomial Regression', purpose: 'Models nonlinear relationships', useCase: 'Curvilinear relationship between price and satisfaction' },
    { category: 'Relationship', method: 'Logistic Regression', purpose: 'Predicts categorical outcomes (e.g., yes/no)', useCase: 'Purchase decision prediction' },
    { category: 'Relationship', method: 'Crosstab & Chi-Squared', purpose: 'Tests independence between categorical variables', useCase: 'Gender differences in brand preference' },
    { category: 'Predictive', method: 'Generalized Linear Model (GLM)', purpose: 'Extends regression to non-normal distributions', useCase: 'Poisson, logistic, or gamma regression models' },
    { category: 'Predictive', method: 'Discriminant Analysis', purpose: 'Classifies cases into predefined groups', useCase: 'Customer segmentation, churn prediction' },
    { category: 'Structural', method: 'Factor Analysis', purpose: 'Identifies latent factors from correlated items', useCase: 'Reducing survey dimensions' },
    { category: 'Structural', method: 'Reliability (Cronbach’s α)', purpose: 'Tests internal consistency among items', useCase: 'Reliability check for survey scales' },
    { category: 'Structural', method: 'Exploratory Factor Analysis (EFA)', purpose: 'Explores underlying factor structure', useCase: 'Identifying satisfaction dimensions' },
    { category: 'Structural', method: 'Path Analysis', purpose: 'Tests direct and indirect relationships', useCase: 'Service → Satisfaction → Loyalty' },
    { category: 'Structural', method: 'Mediation Analysis', purpose: 'Tests indirect (mediating) effects', useCase: 'Satisfaction mediating the effect of quality on loyalty' },
    { category: 'Structural', method: 'Moderation Analysis', purpose: 'Tests interaction (moderating) effects', useCase: 'Gender moderating the quality–satisfaction link' },
    { category: 'Clustering', method: 'K-Means', purpose: 'Groups cases based on similarity (centroid-based)', useCase: 'Customer segmentation' },
    { category: 'Clustering', method: 'K-Medoids', purpose: 'Similar to K-Means but more robust to outliers', useCase: 'Clustering noisy or non-numeric data' },
    { category: 'Clustering', method: 'Hierarchical (HCA)', purpose: 'Builds nested clusters in a tree-like structure', useCase: 'Visualizing customer hierarchy (dendrogram)' },
    { category: 'Clustering', method: 'DBSCAN / HDBSCAN', purpose: 'Density-based clustering that handles noise', useCase: 'Finding natural clusters in large datasets' },
    { category: 'Time Series', method: 'Trend Analysis', purpose: 'Detects upward or downward patterns over time', useCase: 'Sales or traffic trend analysis' },
    { category: 'Time Series', method: 'Seasonal Decomposition', purpose: 'Decomposes time series into trend, seasonal, residual components', useCase: 'Identifying seasonal buying patterns' },
    { category: 'Time Series', method: 'ACF/PACF Plots', purpose: 'Examines autocorrelation patterns', useCase: 'Selecting ARIMA model parameters' },
    { category: 'Time Series', method: 'Stationarity Test (ADF)', purpose: 'Tests whether a time series is stationary', useCase: 'Preprocessing for forecasting models' },
    { category: 'Time Series', method: 'Ljung-Box / ARCH-LM Test', purpose: 'Tests residual independence or heteroskedasticity', useCase: 'Model adequacy diagnostics' },
    { category: 'Time Series', method: 'Exponential Smoothing', purpose: 'Short-term forecasting using weighted averages', useCase: 'Simple forecast for demand or visits' },
    { category: 'Time Series', method: 'ARIMA / SARIMAX', purpose: 'Advanced time-series forecasting models', useCase: 'Monthly sales or traffic prediction' },
    { category: 'Time Series', method: 'Forecast Model Evaluation', purpose: 'Compares prediction accuracy (RMSE, MAE, etc.)', useCase: 'Model performance comparison' },
    { category: 'Unstructured Data', method: 'Sentiment Analysis', purpose: 'Classifies text polarity (positive/negative/neutral)', useCase: 'Product review sentiment tracking' },
    { category: 'Unstructured Data', method: 'Topic Modeling (LDA)', purpose: 'Identifies underlying topics from text', useCase: 'Extracting key themes from open-ended survey responses' },
    { category: 'Unstructured Data', method: 'Word Cloud', purpose: 'Visualizes most frequent words', useCase: 'Highlighting main keywords in feedback' },
];

const groupedMethods = analysisMethods.reduce((acc, method) => {
    if (!acc[method.category]) {
        acc[method.category] = [];
    }
    acc[method.category].push(method);
    return acc;
}, {} as Record<string, typeof analysisMethods>);

const STEPS = [
    { id: 1, label: 'Variables', description: 'Select the variables you want to analyze from your dataset.' },
    { id: 2, label: 'Settings', description: 'Configure options for the analysis, such as grouping variables or specific parameters.' },
    { id: 3, label: 'Validation', description: 'The system checks if your data is suitable for the chosen analysis, highlighting potential issues.' },
    { id: 4, label: 'Summary', description: 'Get a high-level, easy-to-understand summary of the key findings from the analysis.' },
    { id: 5, label: 'Reasoning', description: 'Understand how the conclusions were reached with a step-by-step explanation.' },
    { id: 6, label: 'Statistics', description: 'Dive deep into detailed statistical tables, charts, and downloadable reports.' }
];

export default function GuidePage() {
  return (
    <div className="space-y-6">


      <Tabs defaultValue="procedure">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="procedure">Analysis Procedure</TabsTrigger>
          <TabsTrigger value="byCategory">By Categories</TabsTrigger>
          <TabsTrigger value="byAnalysis">By Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="procedure">
            <Card>
                <CardHeader>
                    <CardTitle>Standard Analysis Procedure</CardTitle>
                    <CardDescription>Our platform follows a structured, step-by-step process to guide you from data to insight. Here’s how it works, using Descriptive Statistics as an example.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-8">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                                        {step.id}
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className="w-1 flex-1 bg-border mt-2"></div>
                                    )}
                                </div>
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <h3 className="font-semibold text-xl mb-1">{step.label}</h3>
                                        <p className="text-muted-foreground">{step.description}</p>
                                    </div>
                                    <Card className="overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="bg-muted h-48 flex items-center justify-center">
                                                <p className="text-sm text-muted-foreground">Image for Step {step.id}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="byCategory">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Methods by Categories</CardTitle>
              <CardDescription>Find the right tool for your research question, grouped by statistical area.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/6">Category</TableHead>
                    <TableHead className="w-1/6">Analysis Method</TableHead>
                    <TableHead className="w-1/3">Purpose / Description</TableHead>
                    <TableHead className="w-1/3">Typical Use Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedMethods).map(([category, methods]) => (
                    <React.Fragment key={category}>
                      {methods.map((method, index) => (
                        <TableRow key={method.method}>
                          {index === 0 && (
                            <TableCell rowSpan={methods.length} className="align-top font-semibold">
                              {category}
                            </TableCell>
                          )}
                          <TableCell>{method.method}</TableCell>
                          <TableCell>{method.purpose}</TableCell>
                          <TableCell>{method.useCase}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="byAnalysis">
           <Card>
            <CardHeader>
              <CardTitle>All Analysis Methods</CardTitle>
              <CardDescription>A complete list of all available statistical analyses.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Analysis Method</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisMethods.sort((a,b) => a.method.localeCompare(b.method)).map((method) => (
                      <TableRow key={method.method}>
                        <TableCell className="font-semibold">{method.method}</TableCell>
                        <TableCell>{method.category}</TableCell>
                        <TableCell>{method.purpose}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
