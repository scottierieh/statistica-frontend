
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
            designMethod: 'full-factorial',
            sets: 3,
            cardsPerSet: 3,
            profiles: [],
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

export const ipaTemplate = {
    title: "Restaurant Satisfaction Survey (for IPA)",
    description: "Please rate your experience based on the following attributes. Your feedback will help us improve.",
    questions: [
        {
            id: 'ipa_desc',
            type: 'description',
            title: 'Instructions',
            content: 'Please rate your satisfaction with the following aspects of your visit on a scale of 1 (Very Dissatisfied) to 5 (Very Satisfied).'
        },
        {
            id: 'ipa_q_1',
            type: 'rating',
            title: 'Food Quality',
            description: 'How satisfied were you with the quality of the food?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
        },
        {
            id: 'ipa_q_2',
            type: 'rating',
            title: 'Service Speed',
            description: 'How satisfied were you with the speed of service?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
        },
        {
            id: 'ipa_q_3',
            type: 'rating',
            title: 'Ambiance',
            description: 'How satisfied were you with the restaurant\'s atmosphere and decor?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
        },
        {
            id: 'ipa_q_4',
            type: 'rating',
            title: 'Value for Money',
            description: 'How satisfied were you with the value you received for the price you paid?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
        },
        {
            id: 'ipa_q_overall',
            type: 'rating',
            title: 'Overall Satisfaction',
            description: 'Overall, how satisfied were you with your experience today?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
        }
    ],
};
