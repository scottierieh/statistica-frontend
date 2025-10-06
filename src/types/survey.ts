export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  status: 'draft' | 'active' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submittedAt: string; // Changed from submitted_at
  answers: {
    [questionId: string]: any;
  };
}

export interface Question {
  id: string;
  type: string;
  title: string;
  description?: string;
  options?: string[];
  items?: string[];
  columns?: string[];
  scale?: string[];
  required?: boolean;
  content?: string;
  imageUrl?: string;
  rows?: string[];
  text?: string;
}
