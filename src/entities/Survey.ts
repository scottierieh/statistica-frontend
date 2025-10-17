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
    scale?: string[];
    required?: boolean;
    content?: string;
    imageUrl?: string;
    rows?: string[];
    numScalePoints?: number;
    // NPS labels
    leftLabel?: string;
    rightLabel?: string;
    // For Conjoint Analysis
    attributes?: ConjointAttribute[];
    designMethod?: 'full-factorial' | 'balanced-overlap' | 'randomized' | 'hybrid';
    sets?: number;
    cardsPerSet?: number;
    profiles?: any[]; // For generated profiles
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
  status: 'draft' | 'active' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
  styles?: any;
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
  submittedAt: string; // Changed from submitted_at
  answers: {
    [questionId: string]: any;
  };
}

export interface ConjointAttribute {
  id: string;
  name: string;
  levels: string[];
}