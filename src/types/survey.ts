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

export interface ConjointAttribute {
  id: string;
  name: string;
  levels: string[];
}

export type ScaleItem = { value: number; label: string };

export interface Question {
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
  leftLabel?: string;
  rightLabel?: string;
  attributes?: ConjointAttribute[];
  designMethod?: 'full-factorial' | 'balanced-overlap' | 'randomized' | 'hybrid' | 'd-efficient';
  sets?: number;
  cardsPerSet?: number;
  profiles?: any[];
  tasks?: any[];
  criteria?: { id: string; name: string; subCriteria?: { id: string; name: string }[] }[];
  alternatives?: string[];
  servqualType?: 'Expectation' | 'Perception';
}