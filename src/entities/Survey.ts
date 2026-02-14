export interface Criterion {
  id: string;
  name: string;
  subCriteria?: { id: string; name: string }[];
}

export interface LogicCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface DisplayLogic {
  conditions: LogicCondition[];
  // Future: condition_operator: 'and' | 'or';
}

export interface SkipLogic {
    conditionValue: any; // The value of the option that triggers the logic
    action: 'skip_to' | 'end_survey';
    targetQuestionId?: string; // for 'skip_to'
}

export type Question = {
    id: string;
    type: string;
    title: string;
    text?: string;
    description?: string;
    options?: string[];
    items?: string[];
    columns?: string[];
    scale?: ScaleItem[];
    required?: boolean;
    randomizeOptions?: boolean;
    content?: string;
    imageUrl?: string;
    rows?: string[] | { left: string; right: string }[];
    numScalePoints?: number;
    // NPS labels
    leftLabel?: string;
    rightLabel?: string;
    // For Conjoint Analysis
    attributes?: ConjointAttribute[];
    designMethod?: 'full-factorial' | 'balanced-overlap' | 'randomized' | 'hybrid' | 'd-efficient';
    sets?: number;
    cardsPerSet?: number;
    profiles?: any[]; // For generated profiles
    tasks?: any[];
    // For AHP
    criteria?: Criterion[];
    alternatives?: string[];
    // For SERVQUAL
    servqualType?: 'Expectation' | 'Perception';
    // Logic
    displayLogic?: DisplayLogic;
    skipLogic?: SkipLogic[];
};


export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  status: 'draft' | 'active' | 'closed' | 'scheduled';
  created_date: string;
  startDate?: string;
  endDate?: string;
  styles?: any;
  template?: string;
  showStartPage?: boolean;
  startPage?: {
    title?: string;
    description?: string;
    buttonText?: string;
    logo?: {
      src?: string;
      alt?: string;
    };
    imageUrl?: string;
  };
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submittedAt: string;
  answers: {
    [questionId: string]: any;
  };
  completionTime?: number;
  qualityFlags?: ('fast_completion' | 'straight_lining')[];
}

export type ScaleItem = { value: number; label: string };

export type RowItem = { left: string; right: string };

export interface CvmBidSet {
  id: string;
  initialBid: number;
  higherBid: number;
  lowerBid: number;
}

export interface ConjointAttribute {
  id: string;
  name: string;
  levels: string[];
}
