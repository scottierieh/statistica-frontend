
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
                { id: `attr-1`, name: 'Brand', levels: ['Brand A', 'Brand B', 'Brand C'] },
                { id: `attr-2`, name: 'Price', levels: ['$799', '$999', '$1199'] },
                { id: `attr-3`, name: 'Screen Size', levels: ['6.1-inch', '6.7-inch'] },
                { id: `attr-4`, name: 'Camera', levels: ['Dual-lens', 'Triple-lens Pro'] },
                { id: `attr-5`, name: 'Storage', levels: ['128GB', '256GB', '512GB'] },
            ],
            designMethod: 'fractional-factorial',
            sets: 10,
            cardsPerSet: 3,
            tasks: [],
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
            profiles: []
        }
    ],
};

export const rankingConjointTemplate = {
    title: "Vacation Package Ranking (Conjoint)",
    description: "Please rank the following vacation packages from most to least preferred.",
    questions: [
        {
            id: 'ranking_desc',
            type: 'description',
            title: 'Instructions',
            content: 'In the following task, please rank the vacation packages shown from your most preferred (Rank 1) to least preferred. You can drag and drop the cards to change their order.'
        },
        {
            id: 'ranking_conjoint_q_1',
            type: 'ranking-conjoint',
            title: 'Please rank these vacation packages.',
            required: true,
            attributes: [
                { id: `attr-r-1`, name: 'Destination', levels: ['Hawaii', 'Paris', 'Tokyo'] },
                { id: `attr-r-2`, name: 'Duration', levels: ['7 Days', '10 Days'] },
                { id: `attr-r-3`, name: 'Price', levels: ['$2000', '$3000'] },
            ],
            tasks: []
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
    title: "Product Portfolio Optimization (TURF)",
    description: "Help us understand which combination of products you find most appealing. Your feedback is vital for our product strategy.",
    questions: [
        {
            id: 'turf_main_selection',
            type: 'multiple',
            title: '1. Product/Service Preference (Reach)',
            description: 'From the list below, please select ALL the products/services you would genuinely consider purchasing or using.',
            required: true,
            options: ['Premium Coffee Blend', 'Artisanal Tea Selection', 'Organic Juice Line', 'Gourmet Pastries', 'Healthy Snack Box'],
        },
        {
            id: 'demographics_separator',
            type: 'description',
            title: '2. About You (for Segment Analysis)',
            content: 'These questions help us understand our customers better.'
        },
        {
            id: 'age_group',
            type: 'single',
            title: 'What is your age group?',
            required: true,
            options: ['18-24', '25-34', '35-44', '45-54', '55+'],
        },
        {
            id: 'gender',
            type: 'single',
            title: 'What is your gender?',
            required: false,
            options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        },
        {
            id: 'region',
            type: 'dropdown',
            title: 'What region do you live in?',
            required: false,
            options: ['North', 'South', 'East', 'West'],
        },
        {
            id: 'income_level',
            type: 'single',
            title: 'What is your approximate annual household income?',
            required: false,
            options: ['Under $30,000', '$30,000 - $49,999', '$50,000 - $99,999', '$100,000 or more', 'Prefer not to say'],
        },
        {
            id: 'education_level',
            type: 'single',
            title: 'What is your highest level of education?',
            required: false,
            options: ['High School', 'Some College', 'Bachelor\'s Degree', 'Graduate Degree (Master\'s, PhD, etc.)'],
        },
        {
            id: 'behavioral_separator',
            type: 'description',
            title: '3. Purchase Behavior (for Frequency Analysis)',
            content: 'A few questions about your purchasing habits.'
        },
        {
            id: 'purchase_frequency',
            type: 'single',
            title: 'How often do you typically purchase products like these?',
            required: false,
            options: ['Daily', 'Weekly', 'Monthly', 'A few times a year', 'Rarely'],
        },
        {
            id: 'competitor_usage',
            type: 'multiple',
            title: 'Which of the following competitor products do you currently use?',
            required: false,
            options: ['Competitor Brand X', 'Competitor Brand Y', 'None of these'],
        },
        {
            id: 'price_sensitivity',
            type: 'rating',
            title: 'How important is price to you when choosing these types of products?',
            description: '1 - Not important at all, 5 - Extremely important',
            required: false,
            scale: ['1','2','3','4','5'],
        },
         {
            id: 'preference_strength_separator',
            type: 'description',
            title: '4. Preference Strength (for Weighted TURF)',
            content: 'Help us understand how much you like the options.'
        },
        {
            id: 'likert_preference',
            type: 'likert',
            title: 'How much do you like each of the following products?',
            rows: ['Premium Coffee Blend', 'Artisanal Tea Selection', 'Organic Juice Line', 'Gourmet Pastries', 'Healthy Snack Box'],
            scale: ['Dislike', 'Neutral', 'Like'],
            required: false
        },
        {
            id: 'first_choice',
            type: 'single',
            title: 'Of all the products listed, which ONE would be your top choice?',
            required: false,
            options: ['Premium Coffee Blend', 'Artisanal Tea Selection', 'Organic Juice Line', 'Gourmet Pastries', 'Healthy Snack Box'],
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

export const cesTemplate = {
    title: "Customer Effort Score (CES) Survey",
    description: "Please let us know how easy it was to interact with us. Your feedback helps us simplify our processes.",
    questions: [
        {
            id: 'ces_q_1',
            type: 'rating',
            title: 'How much effort did you personally have to put forth to handle your request?',
            required: true,
            scale: ['1', '2', '3', '4', '5', '6', '7'],
            description: '1 - Very Low Effort, 7 - Very High Effort'
        },
        {
            id: 'ces_q_2',
            type: 'text',
            title: 'What made this interaction difficult or easy?',
            required: false,
            description: 'Please tell us a bit more about why you chose that score.'
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
            type: 'multiple',
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
            type: 'multiple',
            title: 'Which of these brands have you actually used or purchased?',
            required: true,
            options: ['Brand A', 'Brand B', 'Brand C', 'Brand D'],
        },
    ] as Question[],
};

export const servqualTemplate = {
    title: "Service Quality Survey (SERVQUAL)",
    description: "Please rate your expectations and perceptions of our service quality across different dimensions.",
    questions: [
        {
            id: 'servqual_desc',
            type: 'description',
            title: 'Instructions',
            content: 'For each statement, please rate your level of expectation and your perception of our actual performance on a scale of 1 (Strongly Disagree) to 7 (Strongly Agree).'
        },
        {
            id: 'servqual_tangibles',
            type: 'servqual',
            title: 'Tangibles (Physical Facilities, Equipment, and Appearance of Personnel)',
            required: true,
            rows: [
                'Have up-to-date equipment.',
                'Physical facilities are visually appealing.',
                'Employees are well-dressed and appear neat.',
                'Materials associated with the service (such as pamphlets or statements) are visually appealing.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servqual_reliability',
            type: 'servqual',
            title: 'Reliability (Ability to perform the promised service dependably and accurately)',
            required: true,
            rows: [
                'When they promise to do something by a certain time, they do so.',
                'When you have a problem, they show a sincere interest in solving it.',
                'Perform the service right the first time.',
                'Provide their services at the time they promise to do so.',
                'Maintain error-free records.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servqual_responsiveness',
            type: 'servqual',
            title: 'Responsiveness (Willingness to help customers and provide prompt service)',
            required: true,
            rows: [
                'Tell customers exactly when services will be performed.',
                'Give prompt service to customers.',
                'Are always willing to help customers.',
                'Are never too busy to respond to customer requests.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servqual_assurance',
            type: 'servqual',
            title: 'Assurance (Knowledge and courtesy of employees and their ability to inspire trust and confidence)',
            required: true,
            rows: [
                'The behavior of employees instills confidence in customers.',
                'Customers feel safe in their transactions.',
                'Employees are consistently courteous with customers.',
                'Employees have the knowledge to answer customer questions.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servqual_empathy',
            type: 'servqual',
            title: 'Empathy (Caring, individualized attention the firm provides its customers)',
            required: true,
            rows: [
                'Give customers individual attention.',
                'Have operating hours convenient to all their customers.',
                'Have employees who give customers personal attention.',
                'Have the customers’ best interests at heart.',
                'The employees understand the specific needs of their customers.'
            ],
            scale: ['1','2','3','4','5','6','7']
        }
    ] as Question[],
};

export const servperfTemplate = {
    title: "Service Performance Survey (SERVPERF)",
    description: "Please rate your perceptions of our service quality across different dimensions.",
    questions: [
        {
            id: 'servperf_desc',
            type: 'description',
            title: 'Instructions',
            content: 'For each statement, please rate your perception of our actual performance on a scale of 1 (Strongly Disagree) to 7 (Strongly Agree).'
        },
        {
            id: 'servperf_tangibles',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Tangibles (Physical Facilities, Equipment, and Appearance of Personnel)',
            required: true,
            rows: [
                'Have up-to-date equipment.',
                'Physical facilities are visually appealing.',
                'Employees are well-dressed and appear neat.',
                'Materials associated with the service (such as pamphlets or statements) are visually appealing.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servperf_reliability',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Reliability (Ability to perform the promised service dependably and accurately)',
            required: true,
            rows: [
                'When they promise to do something by a certain time, they do so.',
                'When you have a problem, they show a sincere interest in solving it.',
                'Perform the service right the first time.',
                'Provide their services at the time they promise to do so.',
                'Maintain error-free records.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servperf_responsiveness',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Responsiveness (Willingness to help customers and provide prompt service)',
            required: true,
            rows: [
                'Tell customers exactly when services will be performed.',
                'Give prompt service to customers.',
                'Are always willing to help customers.',
                'Are never too busy to respond to customer requests.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servperf_assurance',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Assurance (Knowledge and courtesy of employees and their ability to inspire trust and confidence)',
            required: true,
            rows: [
                'The behavior of employees instills confidence in customers.',
                'Customers feel safe in their transactions.',
                'Employees are consistently courteous with customers.',
                'Employees have the knowledge to answer customer questions.'
            ],
            scale: ['1','2','3','4','5','6','7']
        },
        {
            id: 'servperf_empathy',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Empathy (Caring, individualized attention the firm provides its customers)',
            required: true,
            rows: [
                'Give customers individual attention.',
                'Have operating hours convenient to all their customers.',
                'Have employees who give customers personal attention.',
                'Have the customers’ best interests at heart.',
                'The employees understand the specific needs of their customers.'
            ],
            scale: ['1','2','3','4','5','6','7']
        }
    ] as Question[],
};
