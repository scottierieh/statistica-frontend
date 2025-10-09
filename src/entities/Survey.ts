
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
    // For Conjoint Analysis
    attributes?: ConjointAttribute[];
    designMethod?: 'full-factorial' | 'random';
    sets?: number;
    cardsPerSet?: number;
    profiles?: any[]; // For generated profiles
    // For AHP
    criteria?: Criterion[];
    alternatives?: string[];
    // For SERVQUAL
    servqualType?: 'Expectation' | 'Perception';
};


type SurveyData = {
    title: string;
    description?: string;
    questions?: Question[];
    status?: 'draft' | 'active' | 'closed';
    response_count?: number;
    id?: string;
    created_at?: string;
}

// In-memory store
let surveys: (SurveyData & { id: string, created_at: string })[] = [];

if (typeof window !== 'undefined' && localStorage.getItem('surveys')) {
    try {
        surveys = JSON.parse(localStorage.getItem('surveys') || '[]');
    } catch (e) {
        surveys = [];
    }
}

const saveToLocalStorage = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('surveys', JSON.stringify(surveys));
    }
}

export const SurveyEntity = {
    async list(): Promise<(SurveyData & { id: string, created_at: string })[]> {
        return Promise.resolve(surveys);
    },

    async create(data: SurveyData): Promise<SurveyData> {
        const newSurvey = {
            ...data,
            id: Date.now().toString(),
            created_at: new Date().toISOString()
        };
        surveys.push(newSurvey);
        saveToLocalStorage();
        return Promise.resolve(newSurvey);
    },

    async update(id: string, data: SurveyData): Promise<SurveyData | null> {
        const index = surveys.findIndex(s => s.id === id);
        if (index > -1) {
            surveys[index] = { ...surveys[index], ...data };
            saveToLocalStorage();
            return Promise.resolve(surveys[index]);
        }
        return Promise.resolve(null);
    }
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
