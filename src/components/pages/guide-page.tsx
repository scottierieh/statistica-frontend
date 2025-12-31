
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sigma, BarChart, Users, CheckSquare, TrendingUp, Network, Columns, Target, Component, HeartPulse, Feather, GitBranch, Smile, Scaling, AreaChart, LineChart, Layers, Map, Repeat, ScanSearch, Atom, MessagesSquare, Share2, GitCommit, DollarSign, ThumbsUp, ClipboardList, Handshake, Replace, Activity, Palette, Brain, Link2, ShieldCheck, FileSearch, TestTube, Briefcase, Factory, Landmark, Megaphone, FileUp, Settings, Check, FileDown, Bot, ListChecks, Upload, Database, Play, Variable, BookOpen, ChevronsRight, Milestone, Settings2, Shield, Search, Info, Lightbulb, CheckCircle2, AlertTriangle, ChevronDown, Sparkles
} from "lucide-react";
import Mindmap from '@/components/mindmap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

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
    { category: 'Predictive', method: 'Survival Analysis', purpose: 'Analyzes time-to-event data', useCase: 'Customer churn analysis, product failure time' },
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
    { category: 'Time Series', method: 'Ljung–Box / ARCH-LM Test', purpose: 'Tests residual independence or heteroskedasticity', useCase: 'Model adequacy diagnostics' },
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

const WORKFLOW_STEPS = [
    { id: 1, icon: ListChecks, label: 'Select Analysis', description: 'Choose your desired statistical method from the sidebar.' },
    { id: 2, icon: Database, label: 'Prepare Data', description: 'Upload your dataset or select from our pre-loaded examples.' },
    { id: 3, icon: Play, label: 'Run Analysis', description: 'Configure, validate, and execute the analysis through a guided 6-step process.' },
];

const RUN_ANALYSIS_STEPS = [
    { id: 1, icon: Variable, label: 'Variables', description: 'Select your dependent and independent variables for the analysis.' },
    { id: 2, icon: Settings2, label: 'Settings', description: 'Configure model-specific parameters and options.' },
    { id: 3, icon: ShieldCheck, label: 'Validation', description: 'The system checks data suitability and statistical assumptions.' },
    { id: 4, icon: FileSearch, label: 'Summary', description: 'Review a high-level, easy-to-understand summary of the key findings.' },
    { id: 5, icon: Lightbulb, label: 'Reasoning', description: 'Understand the "why" behind the summary with detailed interpretations.' },
    { id: 6, icon: Sigma, label: 'Statistics', description: 'Dive deep into the full statistical output, tables, and charts.' }
];

const industryApplications = [
    {
        industry: 'Marketing',
        icon: Megaphone,
        applications: [
            { method: 'A/B Testing (T-Test)', use: 'Compare conversion rates of two different ad campaigns.' },
            { method: 'Customer Segmentation (Clustering)', use: 'Group customers based on purchasing behavior and demographics.' },
            { method: 'Brand Funnel Analysis', use: 'Track awareness, consideration, and preference for your brand vs. competitors.' },
            { method: 'Conjoint Analysis', use: 'Identify which product features are most valued by customers.' },
            { method: 'TURF Analysis', use: 'Optimize product lines or marketing messages to maximize reach.' },
            { method: 'RFM Analysis', use: 'Segment customers based on Recency, Frequency, and Monetary value.' }
        ]
    },
    {
        industry: 'Human Resources (HR)',
        icon: Users,
        applications: [
            { method: 'Employee Satisfaction Surveys (Descriptive Stats)', use: 'Summarize feedback on workplace satisfaction.' },
            { method: 'Turnover Analysis (Survival Analysis)', use: 'Analyze factors that contribute to employee churn.' },
            { method: 'Performance Structure Diagnosis (Regression)', use: 'Identify key drivers of employee performance.' },
            { method: 'Attendance Pattern Analysis', use: 'Find patterns in employee absenteeism or tardiness.' },
        ]
    },
    {
        industry: 'Manufacturing & Quality',
        icon: Factory,
        applications: [
            { method: 'Statistical Process Control (SPC)', use: 'Monitor production processes to ensure they are stable and within limits.' },
            { method: 'Process Capability Analysis (Cpk, Ppk)', use: 'Assess if a process is capable of meeting specifications.' },
            { method: 'Pareto Analysis', use: 'Identify the most frequent causes of defects (the "vital few").' },
            { method: 'Gage R&R', use: 'Evaluate the reliability and consistency of measurement systems.' },
        ]
    },
    {
        industry: 'Finance & Investment',
        icon: Landmark,
        applications: [
            { method: 'Portfolio Optimization', use: 'Construct a portfolio of assets that maximizes expected return for a given level of risk.' },
            { method: 'Value at Risk (VaR) Analysis', use: 'Estimate potential losses in an investment portfolio over a specific time frame.' },
            { method: 'Time Series Forecasting (ARIMA)', use: 'Forecast stock prices or economic indicators.' },
            { method: 'Factor Analysis', use: 'Identify underlying factors that affect asset returns (e.g., Fama-French models).' },
        ]
    }
];

export default function GuidePage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="procedure">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="procedure">Analysis Procedure</TabsTrigger>
          <TabsTrigger value="byCategory">By Categories</TabsTrigger>
          <TabsTrigger value="byIndustry">By Field</TabsTrigger>
        </TabsList>
        <TabsContent value="procedure">
            <Card>
                <CardHeader>
                    <CardTitle>Standard Analysis Procedure</CardTitle>
                    <CardDescription>Our platform follows a structured, step-by-step process to guide you from data to insight. Here’s how it works.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {WORKFLOW_STEPS.map((step, index) => (
                            <div key={step.id} className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                                        {step.id}
                                    </div>
                                    {index < WORKFLOW_STEPS.length - 1 && (
                                        <div className="w-1 flex-1 bg-border mt-2"></div>
                                    )}
                                </div>
                                <div className="space-y-4 pt-1">
                                    <div>
                                        <h3 className="font-semibold text-xl mb-1 flex items-center gap-2"><step.icon className="w-5 h-5"/>{step.label}</h3>
                                        <p className="text-muted-foreground">{step.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-12 pt-8 border-t">
                        <h3 className="text-2xl font-bold text-center mb-8">Detailed Analysis Steps (Run Analysis)</h3>
                         <div className="space-y-8">
                            {RUN_ANALYSIS_STEPS.map((step, index) => (
                                <div key={step.id} className="grid md:grid-cols-2 gap-8 items-center">
                                    <div className={`md:order-${index % 2 === 0 ? '2' : '1'} `}>
                                        <Card className="overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="bg-muted h-64 rounded-lg flex items-center justify-center p-4">
                                                    {step.id === 1 && (
                                                        <div className="w-full max-w-sm space-y-3">
                                                            <h4 className="text-sm font-semibold text-center mb-2">Select Variables</h4>
                                                            <div className="p-3 bg-white rounded-md border shadow-sm">
                                                                <Label className="text-xs text-muted-foreground">Dependent Variable</Label>
                                                                <div className="flex items-center justify-between mt-1"><span>Satisfaction</span> <Target className="w-4 h-4 text-primary"/></div>
                                                            </div>
                                                            <div className="p-3 bg-white rounded-md border shadow-sm">
                                                                <Label className="text-xs text-muted-foreground">Independent Variables</Label>
                                                                <div className="flex items-center justify-between mt-1"><span>Price, Quality</span><Users className="w-4 h-4 text-primary"/></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {step.id === 2 && (
                                                        <div className="w-full max-w-sm space-y-3">
                                                            <h4 className="text-sm font-semibold text-center mb-2">Configure Settings</h4>
                                                            <div className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                                                                <Label>Alpha Level</Label>
                                                                <Badge>0.05</Badge>
                                                            </div>
                                                            <div className="flex items-center justify-between p-3 bg-white rounded-md border shadow-sm">
                                                                <Label>Post-hoc Test</Label>
                                                                <Badge variant="outline">Tukey HSD</Badge>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {step.id === 3 && (
                                                         <div className="w-full max-w-sm space-y-3">
                                                            <h4 className="text-sm font-semibold text-center mb-2">Data Validation</h4>
                                                             <div className="p-3 bg-white rounded-md border shadow-sm flex items-start gap-3">
                                                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                                                                <div>
                                                                    <p className="font-medium text-sm">Variables selected</p>
                                                                    <p className="text-xs text-muted-foreground">3 variable(s) selected</p>
                                                                </div>
                                                             </div>
                                                              <div className="p-3 bg-white rounded-md border shadow-sm flex items-start gap-3">
                                                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
                                                                <div>
                                                                    <p className="font-medium text-sm">Data completeness</p>
                                                                    <p className="text-xs text-muted-foreground">No missing values detected</p>
                                                                </div>
                                                             </div>
                                                        </div>
                                                    )}
                                                    {step.id === 4 && (
                                                        <div className="w-full max-w-md p-6 bg-white rounded-lg border shadow-sm">
                                                            <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                                                <Sparkles className="w-5 h-5 text-primary" /> Key Findings
                                                            </h4>
                                                            <Alert className="border-primary bg-primary/5">
                                                                <AlertTitle className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>Significant Result</AlertTitle>
                                                                <AlertDescription>The analysis shows both <strong>Price</strong> and <strong>Quality</strong> have a significant positive impact on <strong>Satisfaction</strong>.</AlertDescription>
                                                            </Alert>
                                                        </div>
                                                    )}
                                                    {step.id === 5 && (
                                                        <div className="w-full max-w-md p-6 bg-white rounded-lg border shadow-sm">
                                                            <h4 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                                                <Lightbulb className="w-5 h-5 text-primary" /> Why This Conclusion?
                                                            </h4>
                                                            <ul className="text-sm space-y-3 text-muted-foreground">
                                                                <li className="flex gap-3"><strong className="text-primary font-bold">1.</strong>Both 'Price' and 'Quality' have p-values less than 0.05, meaning their effect is not due to random chance.</li>
                                                                <li className="flex gap-3"><strong className="text-primary font-bold">2.</strong>The model's R-squared value (0.65) shows that 65% of the change in 'Satisfaction' is explained by these two factors.</li>
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {step.id === 6 && (
                                                        <div className="w-full max-w-sm space-y-3">
                                                            <h4 className="text-sm font-semibold text-center mb-2">Full Statistics</h4>
                                                            <Table className="text-xs bg-white rounded-md border">
                                                                <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead>Coefficient</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                                                <TableBody>
                                                                    <TableRow><TableCell>Price</TableCell><TableCell>0.45</TableCell><TableCell>{'<'}0.001</TableCell></TableRow>
                                                                    <TableRow><TableCell>Quality</TableCell><TableCell>0.62</TableCell><TableCell>{'<'}0.001</TableCell></TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className={`md:order-${index % 2 === 0 ? '1' : '2'} space-y-4`}>
                                         <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0 border-2 border-primary/20">
                                                <step.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xl">{step.label}</h4>
                                                <p className="text-muted-foreground text-sm">{step.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
        <TabsContent value="byIndustry">
           <Card>
            <CardHeader>
              <CardTitle>Analysis by Field of Application</CardTitle>
              <CardDescription>Discover which statistical analyses are commonly used in your industry and how they can provide value.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {industryApplications.map(industry => {
                const Icon = industry.icon;
                return (
                  <div key={industry.industry}>
                    <h3 className="text-2xl font-bold font-headline mb-4 flex items-center gap-3">
                      <Icon className="w-7 h-7 text-primary" />
                      {industry.industry}
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {industry.applications.map(app => (
                        <Card key={app.method} className="flex flex-col">
                           <CardHeader className="pb-2">
                             <CardTitle className="text-base">{app.method}</CardTitle>
                           </CardHeader>
                           <CardContent className="flex-1">
                             <p className="text-sm text-muted-foreground">{app.use}</p>
                           </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
