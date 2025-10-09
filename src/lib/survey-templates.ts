
import type { Question, Criterion } from '@/entities/Survey';

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

export const gaborGrangerTemplate1 = {
    title: "Gabor-Granger (Sequential)",
    description: "Determine price elasticity by asking sequential purchase likelihood questions.",
    questions: [
        {
            id: 'gg_desc_1',
            type: 'description',
            title: 'Instructions',
            content: 'For each of the prices shown, please indicate whether you would be willing to purchase the product.'
        },
        { id: 'gg_q_5000', type: 'single', title: 'If this product was sold for $5000, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_7000', type: 'single', title: 'If this product was sold for $7000, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_9000', type: 'single', title: 'If this product was sold for $9000, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_11000', type: 'single', title: 'If this product was sold for $11000, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_13000', type: 'single', title: 'If this product was sold for $13000, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] }
    ] as Question[]
};

export const gaborGrangerTemplate2 = {
    title: "Gabor-Granger (Random)",
    description: "Determine price elasticity by asking questions in a random order.",
    questions: [
        {
            id: 'gg_desc_2',
            type: 'description',
            title: 'Instructions',
            content: 'For each of the prices shown, please indicate whether you would be willing to purchase the product.'
        },
        { id: 'gg_q_80', type: 'single', title: 'If this product was sold for $80, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_120', type: 'single', title: 'If this product was sold for $120, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_100', type: 'single', title: 'If this product was sold for $100, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_150', type: 'single', title: 'If this product was sold for $150, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] },
        { id: 'gg_q_60', type: 'single', title: 'If this product was sold for $60, would you buy it?', required: true, options: ['Yes, I would buy', 'No, I would not buy'] }
    ] as Question[]
};


export const ahpCriteriaOnlyTemplate = {
    title: "Feature Prioritization (AHP)",
    description: "Help us understand which features are most important to you by comparing them against each other.",
    questions: [
        {
            id: 'ahp_criteria_q_1',
            type: 'ahp',
            title: 'Which feature is more important to you for a new smartphone?',
            required: true,
            criteria: [
                { id: 'c1', name: 'Performance', subCriteria: [{id: 'sc1', name: 'CPU Speed'}, {id: 'sc2', name: 'GPU Performance'}] },
                { id: 'c2', name: 'Design' },
                { id: 'c3', name: 'Camera' }
            ] as Criterion[],
            alternatives: [],
        },
    ],
};

export const ahpWithAlternativesTemplate = {
    title: "Smartphone Selection (AHP)",
    description: "Help us select the best smartphone by providing your preferences on different criteria.",
    questions: [
        {
            id: 'ahp_full_q_1',
            type: 'ahp',
            title: 'Which feature is more important for a new smartphone?',
            required: true,
            criteria: [
                 { id: 'c1', name: 'Price' },
                 { id: 'c2', name: 'Performance' },
                 { id: 'c3', name: 'Design' }
            ] as Criterion[],
            alternatives: ['Phone X', 'Phone Y', 'Phone Z'],
        },
    ],
};

export const csatTemplate = {
    title: "Customer Satisfaction (CSAT) Survey",
    description: "Please rate your satisfaction with our product/service. Your feedback is important to us.",
    questions: [
        {
            id: 'csat_q_1',
            type: 'rating',
            title: 'Overall, how satisfied are you with our product/service?',
            required: true,
            scale: ['1', '2', '3', '4', '5'],
            description: '1 - Very Dissatisfied, 5 - Very Satisfied'
        },
        {
            id: 'csat_q_2',
            type: 'text',
            title: 'What did you like most about the product/service?',
            required: false,
        },
        {
            id: 'csat_q_3',
            type: 'text',
            title: 'What could be improved?',
            required: false,
        }
    ] as Question[],
};

export const semanticDifferentialTemplate = {
    title: "Brand Perception (Semantic Differential)",
    description: "Please rate your perception of our brand on the following scales.",
    questions: [
        {
            id: 'sd_q_1',
            type: 'semantic-differential',
            title: 'Please rate "Our Brand" on the following dimensions.',
            required: true,
            rows: [
                'Low Quality vs High Quality',
                'Unreliable vs Reliable',
                'Not Innovative vs Innovative',
                'Poor Value vs Good Value',
                'Difficult to Use vs Easy to Use'
            ],
            numScalePoints: 7,
            scale: [
                'Very Negative',
                '',
                '',
                'Neutral',
                '',
                '',
                'Very Positive'
            ]
        }
    ] as Question[],
};

export const brandFunnelTemplate = {
    title: "Brand Funnel Analysis",
    description: "Please answer the following questions about your awareness and perception of these brands.",
    questions: [
        {
            id: 'awareness',
            type: 'multiple',
            title: 'Which of the following brands have you heard of?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
        },
        {
            id: 'consideration',
            type: 'single',
            title: 'Of the brands you have heard of, which would you consider purchasing?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
        },
        {
            id: 'preference',
            type: 'single',
            title: 'Of the brands you are considering, which do you prefer?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
        },
        {
            id: 'usage',
            type: 'single',
            title: 'Which of these brands have you actually used or purchased?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
        },
    ] as Question[],
};
