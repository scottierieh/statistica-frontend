
export interface Survey {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'closed';
  created_date: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
}
