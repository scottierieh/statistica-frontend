
import type { Question } from '@/entities/Survey';

export const choiceBasedConjointTemplate = {
    title: "Smartphone Feature Preference (Choice-Based)",
    description: "Please choose the smartphone you would be most likely to purchase from each set.",
    questions: [
        {
            id: 'cbc_desc',
            type: 'description',
            title: 'Instructions',
            content: 'In the following questions, you will be presented with a few different smartphone options. From each set, please choose the one you would be most likely to purchase.'
        },
        {
            id: 'cbc_q_1',
            type: 'conjoint',
            title: 'Which of these smartphones would you choose?',
            required: true,
            attributes: [
                { id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung', 'Google'] },
                { id: `attr-2`, name: 'Price', levels: ['$999', '$799', '$699'] },
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1"', '6.7"'] },
                { id: `attr-4`, name: 'Battery', levels: ['4000mAh', '5000mAh'] },
            ],
        },
    ],
};


export const ratingBasedConjointTemplate = {
    title: "Smartphone Profile Rating (Conjoint)",
    description: "Please rate the following smartphone profiles based on your likelihood to purchase on a 1-10 scale.",
    questions: [
        {
            id: 'rating_desc',
            type: 'description',
            title: 'Instructions',
            content: 'On the following screens, you will be presented with several different smartphone concepts. Please rate each one on a scale of 1 (Very Unlikely to Buy) to 10 (Very Likely to Buy).'
        },
        {
            id: 'rating_conjoint_q_1',
            type: 'rating-conjoint',
            title: 'Please rate each of these smartphone profiles.',
            required: true,
            attributes: [
                { id: `attr-1`, name: 'Brand', levels: ['Apple', 'Samsung', 'Google'] },
                { id: `attr-2`, name: 'Price', levels: ['$999', '$799', '$699'] },
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1"', '6.7"'] },
            ],
            profiles: [
                { id: 'profile_1', Brand: 'Apple', Price: '$999', 'Screen Size': '6.7"' },
                { id: 'profile_2', Brand: 'Samsung', Price: '$799', 'Screen Size': '6.7"' },
                { id: 'profile_3', Brand: 'Google', Price: '$699', 'Screen Size': '6.1"' },
            ]
        }
    ],
};
