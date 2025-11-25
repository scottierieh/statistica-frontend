'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, HelpCircle, Settings, BarChart, TrendingUp, CheckCircle, AlertTriangle, Target, Layers, Download, BookOpen, Activity } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import Papa from 'papaparse';

interface DtResults {
    accuracy: number;
    confusion_matrix: number[][];
    class_names: string[];
    train_accuracy?: number;
    test_accuracy?: number;
    n_features?: number;
    n_samples?: number;
    tree_depth?: number;
    n_leaves?: number;
}

interface FullAnalysisResponse {
    results: DtResults;
    plot: string;
    pruning_plot?: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: DtResults }) => {
    const overfit = results.train_accuracy && results.test_accuracy 
        ? results.train_accuracy - results.test_accuracy > 0.1 
        : false;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Accuracy Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Test Accuracy
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(results.accuracy * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.accuracy >= 0.9 ? 'Excellent' : results.accuracy >= 0.8 ? 'Good' : results.accuracy >= 0.7 ? 'Fair' : 'Needs Improvement'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Tree Depth Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Tree Depth
                            </p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.tree_depth || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {(results.tree_depth || 0) > 10 ? 'Deep tree' : 'Shallow tree'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Number of Leaves Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Leaf Nodes
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.n_leaves || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Decision endpoints
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Overfitting Indicator Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Model Fit
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${overfit ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                            {overfit ? 'Overfit' : 'Good Fit'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.train_accuracy && results.test_accuracy 
                                ? `Gap: ${((results.train_accuracy - results.test_accuracy) * 100).toFixed(1)}%`
                                : 'Training vs test'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const DecisionTreeOverview = ({ target, features, data, randomState }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (target && features.length > 0) {
            overview.push(`Predicting ${target} using ${features.length} feature${features.length > 1 ? 's' : ''}`);
        } else {
            overview.push('⚠ Select target and at least one feature variable');
        }

        // Feature information
        if (features.length > 0) {
            overview.push(`Features: ${features.slice(0, 3).join(', ')}${features.length > 3 ? `, +${features.length - 3} more` : ''}`);
            
            if (features.length < 2) {
                overview.push('⚠ Consider adding more features for better predictions');
            } else if (features.length > 20) {
                overview.push('⚠ Many features - may increase complexity and training time');
            }
        }

        // Class balance check
        if (target && data.length > 0) {
            const targetValues = data.map((row: any) => row[target]).filter((v: any) => v != null);
            const classCounts = targetValues.reduce((acc: any, val: any) => {
                acc[val] = (acc[val] || 0) + 1;
                return acc;
            }, {});
            
            const classes = Object.keys(classCounts);
            const counts = Object.values(classCounts) as number[];
            const minCount = Math.min(...counts);
            const maxCount = Math.max(...counts);
            
            overview.push(`Classes: ${classes.length} categories (${classes.slice(0, 3).join(', ')}${classes.length > 3 ? '...' : ''})`);
            
            const imbalanceRatio = maxCount / minCount;
            if (imbalanceRatio > 3) {
                overview.push(`⚠ Class imbalance detected (ratio: ${imbalanceRatio.toFixed(1)}:1) - consider balancing techniques`);
            } else {
                overview.push(`✓ Classes relatively balanced`);
            }
        }

        // Sample size
        if (data.length < 50) {
            overview.push(`Sample size: ${data.length} observations (⚠ Very small - results may be unreliable)`);
        } else if (data.length < 200) {
            overview.push(`Sample size: ${data.length} observations (⚠ Small - use pruning to prevent overfitting)`);
        } else {
            overview.push(`Sample size: ${data.length} observations (Good)`);
        }
        
        // Missing value check
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        if (data && data.length > 0 && target && features.length > 0) {
            const missingCount = data.filter((row: any) => 
                isMissing(row[target]) || features.some((f: string) => isMissing(row[f]))
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Random state info
        overview.push(`Random state: ${randomState} (ensures reproducibility)`);
        
        // Model characteristics
        overview.push('Algorithm: CART (Classification and Regression Trees)');
        overview.push('Evaluation: 70/30 train-test split with cross-validation');

        return overview;
    }, [target, features, data, randomState]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Generate interpretations
const generateDecisionTreeInterpretations = (results: DtResults, target: string, features: string[]) => {
    const insights: string[] = [];
    
    const accuracy = results.accuracy;
    const trainAcc = results.train_accuracy || 0;
    const testAcc = results.test_accuracy || accuracy;
    const overfit = trainAcc - testAcc > 0.1;
    
    // Overall analysis
    let overall = '';
    if (accuracy >= 0.9) {
        overall = `<strong>Excellent model performance.</strong> The decision tree achieved ${(accuracy * 100).toFixed(1)}% accuracy on the test set, indicating highly reliable predictions for ${target}. ${overfit ? 'However, there are signs of overfitting - the model performs better on training data than test data.' : 'The model generalizes well to unseen data.'} With ${results.n_leaves || 'multiple'} leaf nodes across ${results.tree_depth || 'several'} levels, the tree has learned clear decision rules from the ${features.length} input features.`;
    } else if (accuracy >= 0.8) {
        overall = `<strong>Good model performance.</strong> The decision tree shows ${(accuracy * 100).toFixed(1)}% accuracy on the test set, demonstrating solid predictive capability for ${target}. ${overfit ? 'The model shows some overfitting - consider pruning to improve generalization.' : 'The model appears to generalize reasonably well.'} The tree structure with ${results.tree_depth || 'multiple'} levels provides interpretable decision paths.`;
    } else if (accuracy >= 0.7) {
        overall = `<strong>Fair model performance.</strong> The decision tree achieved ${(accuracy * 100).toFixed(1)}% accuracy, which is moderate for predicting ${target}. ${overfit ? 'Significant overfitting detected - the model memorizes training data rather than learning general patterns.' : 'Consider adding more relevant features or collecting more data to improve performance.'} The current tree configuration may benefit from optimization.`;
    } else {
        overall = `<strong>Model needs improvement.</strong> With ${(accuracy * 100).toFixed(1)}% accuracy, the decision tree struggles to predict ${target} reliably. This could indicate: insufficient training data, irrelevant features, high class overlap, or inappropriate model choice. Consider feature engineering, data collection, or trying other algorithms.`;
    }
    
    // Accuracy insight
    insights.push(`<strong>Test Accuracy:</strong> ${(accuracy * 100).toFixed(1)}%. ${accuracy >= 0.9 ? 'Excellent - the model correctly classifies over 90% of cases.' : accuracy >= 0.8 ? 'Good - reliable predictions in most cases.' : accuracy >= 0.7 ? 'Fair - acceptable but has room for improvement.' : 'Poor - significant misclassifications occur.'} This represents the proportion of correct predictions on unseen test data.`);
    
    // Overfitting insight
    if (trainAcc && testAcc) {
        const gap = trainAcc - testAcc;
        if (gap > 0.15) {
            insights.push(`<strong>Overfitting Alert:</strong> Training accuracy (${(trainAcc * 100).toFixed(1)}%) is significantly higher than test accuracy (${(testAcc * 100).toFixed(1)}%), with a gap of ${(gap * 100).toFixed(1)}%. The model has memorized training data and doesn't generalize well. Solutions: (1) Prune the tree using the alpha parameter, (2) Set max_depth limit, (3) Increase min_samples_split, (4) Use cross-validation, (5) Collect more training data.`);
        } else if (gap > 0.1) {
            insights.push(`<strong>Moderate Overfitting:</strong> Training accuracy (${(trainAcc * 100).toFixed(1)}%) exceeds test accuracy (${(testAcc * 100).toFixed(1)}%) by ${(gap * 100).toFixed(1)}%. Some overfitting is present but manageable. Consider light pruning or regularization to improve generalization.`);
        } else if (gap > 0.05) {
            insights.push(`<strong>Good Generalization:</strong> Training accuracy (${(trainAcc * 100).toFixed(1)}%) and test accuracy (${(testAcc * 100).toFixed(1)}%) are similar, with only ${(gap * 100).toFixed(1)}% difference. The model generalizes well to new data without significant overfitting.`);
        } else {
            insights.push(`<strong>Excellent Generalization:</strong> Training and test accuracy are nearly identical (difference: ${(gap * 100).toFixed(1)}%). The model has learned robust patterns that transfer well to unseen data.`);
        }
    }
    
    // Tree structure insight
    if (results.tree_depth && results.n_leaves) {
        if (results.tree_depth > 15) {
            insights.push(`<strong>Tree Structure:</strong> Very deep tree (depth: ${results.tree_depth}) with ${results.n_leaves} leaf nodes. Deep trees are prone to overfitting as they create highly specific rules. Consider setting max_depth=10-12 or using cost complexity pruning (alpha parameter) to simplify the model.`);
        } else if (results.tree_depth > 10) {
            insights.push(`<strong>Tree Structure:</strong> Moderately deep tree (depth: ${results.tree_depth}) with ${results.n_leaves} leaf nodes. This depth allows complex decision rules while maintaining some interpretability. Monitor for overfitting and consider pruning if generalization is poor.`);
        } else if (results.tree_depth > 5) {
            insights.push(`<strong>Tree Structure:</strong> Well-balanced tree (depth: ${results.tree_depth}) with ${results.n_leaves} leaf nodes. This depth provides good interpretability while capturing important patterns in the data. The tree is easy to visualize and explain.`);
        } else {
            insights.push(`<strong>Tree Structure:</strong> Shallow tree (depth: ${results.tree_depth}) with ${results.n_leaves} leaf nodes. Very simple and interpretable, but may be underfitting - missing important patterns. Consider allowing more depth if accuracy is low.`);
        }
    }
    
    // Confusion matrix insight
    if (results.confusion_matrix && results.class_names) {
        const n_classes = results.class_names.length;
        const total = results.confusion_matrix.flat().reduce((a, b) => a + b, 0);
        const correct = results.confusion_matrix.reduce((sum, row, i) => sum + row[i], 0);
        
        // Find most confused classes
        let maxConfusion = 0;
        let confusedPair = ['', ''];
        for (let i = 0; i < n_classes; i++) {
            for (let j = 0; j < n_classes; j++) {
                if (i !== j && results.confusion_matrix[i][j] > maxConfusion) {
                    maxConfusion = results.confusion_matrix[i][j];
                    confusedPair = [results.class_names[i], results.class_names[j]];
                }
            }
        }
        
        if (maxConfusion > 0) {
            insights.push(`<strong>Class Confusion:</strong> The model most commonly misclassifies '${confusedPair[0]}' as '${confusedPair[1]}' (${maxConfusion} cases). This suggests these classes have similar feature patterns. Consider: (1) Adding features that better distinguish these classes, (2) Examining instances that are misclassified to understand why, (3) Using ensemble methods like Random Forest for better separation.`);
        }
        
        // Per-class accuracy
        const classAccuracies = results.confusion_matrix.map((row, i) => {
            const classTotal = row.reduce((a, b) => a + b, 0);
            return classTotal > 0 ? row[i] / classTotal : 0;
        });
        
        const minAccIdx = classAccuracies.indexOf(Math.min(...classAccuracies));
        const maxAccIdx = classAccuracies.indexOf(Math.max(...classAccuracies));
        
        if (classAccuracies[minAccIdx] < 0.7) {
            insights.push(`<strong>Weak Class Performance:</strong> The model struggles most with '${results.class_names[minAccIdx]}' (${(classAccuracies[minAccIdx] * 100).toFixed(1)}% accuracy), while performing best on '${results.class_names[maxAccIdx]}' (${(classAccuracies[maxAccIdx] * 100).toFixed(1)}% accuracy). The weak class may be under-represented, have noisy labels, or overlap significantly with other classes.`);
        }
    }
    
    // Feature count insight
    if (features.length < 3) {
        insights.push(`<strong>Feature Set:</strong> Using only ${features.length} feature${features.length > 1 ? 's' : ''} (${features.join(', ')}). Limited features may constrain model performance. Consider adding more relevant variables that could help distinguish between classes.`);
    } else if (features.length > 20) {
        insights.push(`<strong>Feature Set:</strong> Using ${features.length} features. Many features can lead to complex trees and overfitting. Consider: (1) Feature importance analysis to identify key predictors, (2) Removing redundant or low-importance features, (3) Feature selection techniques like recursive feature elimination.`);
    } else {
        insights.push(`<strong>Feature Set:</strong> Using ${features.length} features for prediction. This is a reasonable number that balances model complexity with predictive power. Examine feature importances in the tree to understand which variables drive predictions.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (accuracy < 0.7) {
        recommendations = 'Low accuracy indicates significant issues. Actions: (1) <strong>Collect more data</strong> - especially for underrepresented classes, (2) <strong>Feature engineering</strong> - create new features that better capture class differences, (3) <strong>Check data quality</strong> - verify labels are correct and features are meaningful, (4) <strong>Try other algorithms</strong> - Random Forests, Gradient Boosting, or even neural networks, (5) <strong>Exploratory analysis</strong> - visualize feature distributions by class to understand separability, (6) <strong>Consider domain expertise</strong> - are you using the right variables for this prediction task?';
    } else if (overfit) {
        recommendations = 'Overfitting detected - model memorizes training data. Solutions: (1) <strong>Cost complexity pruning</strong> - use the alpha parameter shown in the pruning plot to find optimal tree size, (2) <strong>Set constraints</strong> - limit max_depth (try 8-12), increase min_samples_split (try 20-50), increase min_samples_leaf (try 10-20), (3) <strong>Use cross-validation</strong> - evaluate on multiple train-test splits, (4) <strong>Collect more data</strong> - more examples help the model learn general patterns, (5) <strong>Ensemble methods</strong> - Random Forests and Gradient Boosting combine multiple trees to reduce overfitting, (6) <strong>Feature selection</strong> - remove noisy or irrelevant features that cause memorization.';
    } else if (accuracy >= 0.9) {
        recommendations = 'Excellent performance! Next steps: (1) <strong>Validate robustness</strong> - test on completely new data if available, (2) <strong>Interpret the tree</strong> - examine the visualization to understand decision rules and validate they make domain sense, (3) <strong>Feature importance</strong> - identify which features are most predictive, (4) <strong>Deploy carefully</strong> - monitor performance on real-world data, (5) <strong>Document assumptions</strong> - note that performance assumes new data resembles training data, (6) <strong>Consider ensemble</strong> - Random Forests or XGBoost might provide small improvements and more stability, (7) <strong>Explain predictions</strong> - the tree structure makes it easy to explain why specific predictions were made.';
    } else {
        recommendations = 'Good performance with room for optimization. Suggestions: (1) <strong>Fine-tune pruning</strong> - use the alpha plot to find the optimal complexity-accuracy tradeoff, (2) <strong>Feature engineering</strong> - try creating interaction terms or transformations of existing features, (3) <strong>Analyze errors</strong> - examine misclassified cases to identify patterns and gaps, (4) <strong>Collect targeted data</strong> - focus on cases the model struggles with, (5) <strong>Try ensemble methods</strong> - Random Forests or Gradient Boosting often improve single tree performance, (6) <strong>Cross-validation</strong> - use k-fold CV to get more reliable performance estimates, (7) <strong>Hyperparameter tuning</strong> - systematically search for optimal max_depth, min_samples_split, and other parameters using GridSearchCV.';
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

// Intro page component
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const loanApprovalExample = exampleDatasets.find(ex => ex.id === 'loan-approval');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Decision Tree Classifier</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Interpretable machine learning through tree-based decision rules
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interpretable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Clear decision rules you can understand and explain
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Versatile</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Handles numeric and categorical data naturally
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Foundation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Basis for Random Forests and Gradient Boosting
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Decision trees create a flowchart-like structure where each internal node represents a test on a feature, 
                            each branch represents an outcome, and each leaf node represents a class label. They work by recursively 
                            splitting the data based on feature values that best separate the classes, using metrics like Gini impurity 
                            or information gain. The result is an intuitive, visual model that mimics human decision-making and can be 
                            easily explained to non-technical stakeholders.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Setup Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Target:</strong> Categorical variable to predict (2+ classes)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Features:</strong> Input variables (numeric or categorical)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 100+ observations recommended</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Random state:</strong> For reproducible results</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <BarChart className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Accuracy:</strong> % of correct predictions on test data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Confusion Matrix:</strong> Detailed prediction breakdown</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Tree Viz:</strong> Visual decision rules and splits</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pruning Plot:</strong> Optimal complexity parameter</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {loanApprovalExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(loanApprovalExample)} size="lg">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Load Loan Approval Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface DecisionTreePageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DecisionTreePage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DecisionTreePageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [randomState, setRandomState] = useState<number>(42);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, allHeaders, categoricalHeaders]);
    
    const loanApprovalExample = exampleDatasets.find(ex => ex.id === 'loan-approval');

    useEffect(() => {
        if (!canRun) {
            setView('intro');
        } else {
            const defaultTarget = categoricalHeaders[0];
            setTarget(defaultTarget);
            setFeatures(allHeaders.filter(h => h !== defaultTarget));
            setAnalysisResult(null);
            if (view === 'intro') setView('main');
        }
    }, [data, allHeaders, numericHeaders, categoricalHeaders, canRun, view]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/decision-tree-classifier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    target, 
                    features,
                    random_state: randomState,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            toast({ title: 'Decision Tree Training Complete', description: 'Model has been trained successfully.' });

        } catch (e: any) {
            console.error('Decision Tree error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, randomState, toast]);
    
    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const results = analysisResult.results;
        const exportData = [{
            test_accuracy: results.accuracy,
            train_accuracy: results.train_accuracy || 'N/A',
            tree_depth: results.tree_depth || 'N/A',
            n_leaves: results.n_leaves || 'N/A',
            n_features: features.length,
            n_samples: results.n_samples || data.length,
            target_variable: target,
            features_used: features.join('; '),
            random_state: randomState,
            ...Object.fromEntries(
                results.class_names.flatMap((className, i) => 
                    results.class_names.map((_, j) => 
                        [`confusion_${className}_vs_${results.class_names[j]}`, results.confusion_matrix[i][j]]
                    )
                )
            )
        }];
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'decision_tree_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Decision tree results are being downloaded." });
    }, [analysisResult, features, target, data, randomState, toast]);
    
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const interpretations = results ? generateDecisionTreeInterpretations(results, target || '', features) : null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Decision Tree Classifier Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Configure your classification model by selecting target and feature variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target">Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger id="target"><SelectValue placeholder="Select target..."/></SelectTrigger>
                                <SelectContent>
                                    {categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="features">Feature Variables</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2 py-1">
                                        <Checkbox 
                                            id={`feat-${h}`} 
                                            checked={features.includes(h)} 
                                            onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} 
                                        />
                                        <Label htmlFor={`feat-${h}`} className="text-sm cursor-pointer">{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="randomState">Random State</Label>
                            <Input 
                                id="randomState"
                                type="number" 
                                value={randomState} 
                                onChange={e => setRandomState(Number(e.target.value))} 
                            />
                            <p className="text-xs text-muted-foreground">For reproducible results</p>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <DecisionTreeOverview 
                        target={target}
                        features={features}
                        data={data}
                        randomState={randomState}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? 
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Training Model...</> : 
                            <><Sigma className="mr-2 h-4 w-4"/>Train Model</>
                        }
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full"/>
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && interpretations && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Detailed Analysis - Consistent vertical layout */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Analysis</CardTitle>
                            <CardDescription>Comprehensive interpretation of decision tree results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {/* Overall Analysis */}
                                <div className="rounded-xl border-2 p-5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/40">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                            <BarChart className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-semibold text-base">Overall Analysis</h3>
                                    </div>
                                    <div 
                                        className="text-sm text-muted-foreground leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: interpretations.overall_analysis }}
                                    />
                                </div>

                                {/* Statistical Insights */}
                                <div className="rounded-xl border-2 p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-semibold text-base">Statistical Insights</h3>
                                    </div>
                                    <div className="space-y-2.5 text-sm">
                                        {interpretations.statistical_insights.map((insight, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">→</span>
                                                <span 
                                                    className="text-muted-foreground leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: insight }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recommendations */}
                                <div className="rounded-xl border-2 p-5 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                            <Target className="h-5 w-5" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <div 
                                        className="text-sm text-muted-foreground leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: interpretations.recommendations }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confusion Matrix */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Confusion Matrix</CardTitle>
                            <CardDescription>Detailed breakdown of predictions vs actual values</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-32"></TableHead>
                                            {results.class_names.map(name => (
                                                <TableHead key={name} className="text-center font-semibold">
                                                    Predicted<br/>{name}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.class_names.map((name, i) => (
                                            <TableRow key={name}>
                                                <TableHead className="font-semibold">
                                                    Actual<br/>{name}
                                                </TableHead>
                                                {results.confusion_matrix[i].map((val, j) => (
                                                    <TableCell 
                                                        key={j} 
                                                        className={`text-center font-mono text-base ${i === j ? 'bg-green-50 dark:bg-green-950/20 font-bold' : 'bg-red-50 dark:bg-red-950/20'}`}
                                                    >
                                                        {val}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="mt-4 text-sm text-muted-foreground">
                                <p>Green diagonal: Correct predictions | Red off-diagonal: Misclassifications</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tree Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Decision Tree Visualization</CardTitle>
                            <CardDescription>Visual representation of the learned decision rules</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot} 
                                alt="Decision Tree Visualization" 
                                width={1200} 
                                height={800} 
                                className="w-3/4 rounded-md border"
                            />
                            <div className="mt-4 text-sm text-muted-foreground space-y-1">
                                <p>• Each node shows: feature condition, gini impurity, samples, value distribution, and predicted class</p>
                                <p>• Color intensity indicates class confidence (darker = more confident)</p>
                                <p>• Follow paths from root to leaves to understand decision logic</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pruning Plot */}
                    {analysisResult.pruning_plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Cost Complexity Pruning Analysis</CardTitle>
                                <CardDescription>
                                    Find the optimal alpha parameter to balance model complexity and accuracy
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.pruning_plot} 
                                    alt="Accuracy vs Alpha Plot" 
                                    width={1000} 
                                    height={600} 
                                    className="w-1/2 rounded-md border"
                                />
                                <div className="mt-4 text-sm text-muted-foreground space-y-1">
                                    <p>• <strong>Alpha (α):</strong> Controls tree complexity - higher values = simpler trees</p>
                                    <p>• <strong>Blue line:</strong> Training accuracy (typically decreases as alpha increases)</p>
                                    <p>• <strong>Orange line:</strong> Test accuracy (may increase then decrease)</p>
                                    <p>• <strong>Optimal alpha:</strong> Maximizes test accuracy while preventing overfitting</p>
                                    <p>• Use this plot to set the 'ccp_alpha' parameter when retraining the model</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Download Button Card */}
                    <Card>
                        <CardContent className="p-6 flex justify-end">
                            <Button onClick={handleDownloadResults} variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Download Results (CSV)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <GitBranch className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure your model and click 'Train Model' to build a decision tree.</p>
                </div>
            )}
        </div>
    );
}

