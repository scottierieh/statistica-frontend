import { BarChart, Users, Repeat } from 'lucide-react';
import type { DataSet } from '../stats';
import { studentPerformance } from './student-performance';
import { marketingAnalysisData } from './marketing-analysis-data';
import { stressSupportData } from './stress-support-data';
import { tipsData } from './tips-data';
import { likertScaleData } from './likert-scale-data';
import { workStressData } from './work-stress-data';
import { studentAdmissionData } from './admission-data';
import { restaurantReviewsData } from './restaurant-reviews-data';
import { cancerData } from './cancer-data';
import { loanApprovalData } from './loan-approval-data';
import { gbmData } from './gbm-data';
import { timeSeriesData } from './time-series-data';
import { survivalData } from './survival-data';
import { metaAnalysisData } from './meta-analysis-data';
import { nonlinearRegressionData } from './nonlinear-regression-data';
import { twoWayAnovaData } from './two-way-anova-data';
import { manovaData } from './manova-data';
import { crosstabData } from './crosstab-data';
import { abTestData } from './ab-test-data';
import { irisData } from './iris-data';
import { conjointSmartphoneData } from './conjoint-smartphone-data';
import { rmAnovaData } from './rm-anova-data'; // Import new data

export interface ExampleDataSet {
  id: string;
  name: string;
  description: string;
  data: string; // CSV data as a string
  recommendedAnalysis?: string;
  icon?: React.ComponentType<any>;
}

export const exampleDatasets: ExampleDataSet[] = [
  studentPerformance,
  marketingAnalysisData,
  stressSupportData,
  tipsData,
  likertScaleData,
  workStressData,
  studentAdmissionData,
  restaurantReviewsData,
  cancerData,
  loanApprovalData,
  gbmData,
  timeSeriesData,
  survivalData,
  metaAnalysisData,
  nonlinearRegressionData,
  twoWayAnovaData,
  manovaData,
  crosstabData,
  abTestData,
  irisData,
  conjointSmartphoneData,
  rmAnovaData, // Add new data to the list
];
