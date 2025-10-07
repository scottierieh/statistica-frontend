
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
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1"',, '6.7"'] },
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
            id: 'ipa_q_attributes',
            type: 'matrix',
            title: 'Attribute Satisfaction',
            required: true,
            rows: ['Food Quality', 'Service Speed', 'Ambiance', 'Value for Money'],
            columns: ['1', '2', '3', '4', '5'],
            scale: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
        },
        {
            id: 'ipa_q_overall',
            type: 'matrix',
            title: 'Overall Satisfaction',
            required: true,
            rows: ['Overall_Satisfaction'],
            columns: ['1', '2', '3', '4', '5'],
            scale: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']
        }
    ],
};

export const vanWestendorpTemplate = {
    title: "New Product Price Sensitivity",
    description: "We'd like to understand your perceptions of pricing for a new product. Please enter the price you feel corresponds to each question.",
    questions: [
        {
            id: 'psm_desc',
            type: 'description',
            title: 'Price Perception Questions',
            content: 'Considering the new [Product Name], what price comes to mind for each of the following descriptions?'
        },
        {
            id: 'psm_too_expensive',
            type: 'number',
            title: 'Too Expensive',
            description: 'At what price would you consider the product to be so expensive that you would not consider buying it?',
            required: true,
        },
         {
            id: 'psm_expensive',
            type: 'number',
            title: 'Expensive/High Side',
            description: 'At what price would you consider the product starting to get expensive, so that it is not out of the question, but you would have to give some thought to buying it?',
            required: true,
        },
        {
            id: 'psm_cheap',
            type: 'number',
            title: 'Cheap/Bargain',
            description: 'At what price would you consider the product to be a bargain—a great buy for the money?',
            required: true,
        },
        {
            id: 'psm_too_cheap',
            type: 'number',
            title: 'Too Cheap',
            description: 'At what price would you consider the product to be priced so low that you would feel the quality couldn\'t be very good?',
            required: true,
        },
    ] as Question[]
};

export const turfTemplate = {
    title: "Product Line Optimization (TURF)",
    description: "Help us understand which combination of potential new product flavors you find most appealing.",
    questions: [
        {
            id: 'turf_desc',
            type: 'description',
            title: 'Instructions',
            content: 'From the list below, please select all the soda flavors you would be interested in purchasing.'
        },
        {
            id: 'turf_q_1',
            type: 'multiple',
            title: 'Which of the following soda flavors would you consider buying?',
            description: 'Select all that apply.',
            required: true,
            options: [
                'Classic Cola',
                'Zesty Lemon-Lime',
                'Sweet Orange Soda',
                'Bold Grape Soda',
                'Creamy Root Beer',
                'Spicy Ginger Ale',
            ],
        },
    ] as Question[],
};

export const ahpTemplate = {
    title: "AHP: Choosing a New Smartphone",
    description: "This survey uses the Analytic Hierarchy Process (AHP) to determine the best smartphone choice by comparing criteria and alternatives.",
    questions: [
        {
            id: 'ahp_desc',
            type: 'description',
            title: 'AHP Instructions',
            content: 'You will be asked to make a series of pairwise comparisons. For each pair, please indicate how much more important or preferred one item is over the other using a 9-point scale, where 1 is "Equal Importance" and 9 is "Extreme Importance".'
        },
        {
            id: 'ahp_q_criteria',
            type: 'matrix',
            title: 'Pairwise Comparison of Criteria',
            description: 'For the goal of "Choosing a New Smartphone", how important is each criterion relative to the others?',
            required: true,
            rows: ['Price vs Performance', 'Price vs Design', 'Performance vs Design'],
            columns: ['9', '7', '5', '3', '1', '3', '5', '7', '9'],
            scale: ['Left item is much more important', '', '', '', 'Equal importance', '', '', '', 'Right item is much more important']
        },
        {
            id: 'ahp_q_price',
            type: 'matrix',
            title: 'Pairwise Comparison of Alternatives by Price',
            description: 'Based on PRICE, how much do you prefer each smartphone over the others?',
            required: true,
            rows: ['Phone X vs Phone Y', 'Phone X vs Phone Z', 'Phone Y vs Phone Z'],
            columns: ['9', '7', '5', '3', '1', '3', '5', '7', '9'],
            scale: ['Strongly Prefer Left', '', '', '', 'Equal Preference', '', '', '', 'Strongly Prefer Right']
        },
         {
            id: 'ahp_q_performance',
            type: 'matrix',
            title: 'Pairwise Comparison of Alternatives by Performance',
            description: 'Based on PERFORMANCE, how much do you prefer each smartphone over the others?',
            required: true,
            rows: ['Phone X vs Phone Y', 'Phone X vs Phone Z', 'Phone Y vs Phone Z'],
            columns: ['9', '7', '5', '3', '1', '3', '5', '7', '9'],
            scale: ['Strongly Prefer Left', '', '', '', 'Equal Preference', '', '', '', 'Strongly Prefer Right']
        },
         {
            id: 'ahp_q_design',
            type: 'matrix',
            title: 'Pairwise Comparison of Alternatives by Design',
            description: 'Based on DESIGN, how much do you prefer each smartphone over the others?',
            required: true,
            rows: ['Phone X vs Phone Y', 'Phone X vs Phone Z', 'Phone Y vs Phone Z'],
            columns: ['9', '7', '5', '3', '1', '3', '5', '7', '9'],
            scale: ['Strongly Prefer Left', '', '', '', 'Equal Preference', '', '', '', 'Strongly Prefer Right']
        },
    ] as Question[],
};
