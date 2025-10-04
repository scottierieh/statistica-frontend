
export interface Survey {
  id: string;
  title: string; // Changed from name to title
  status: 'active' | 'draft' | 'closed';
  created_date: string;
  startDate?: string;
  endDate?: string;
  questions?: any[]; // Keep questions for saving logic
  description?: string; // Keep for saving logic
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
}
