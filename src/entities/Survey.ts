// A mock entity to simulate data persistence
// In a real app, this would interact with a database.

export type Question = {
    id: string;
    type: string;
    title: string;
    text: string; // Keep for backward compatibility, but prefer title
    description?: string;
    options?: string[];
    items?: string[];
    columns?: string[];
    scale?: string[];
    required?: boolean;
    content?: string;
    imageUrl?: string;
    rows?: string[];
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
