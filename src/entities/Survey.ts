

export interface Criterion {
  id: string;
  name: string;
  subCriteria?: { id: string; name: string }[];
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
