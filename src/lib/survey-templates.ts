
import type { Question, Criterion, ScaleItem, CvmBidSet } from '@/entities/Survey';

const defaultLikertScale: ScaleItem[] = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' },
];

const kanoFunctionalScale: ScaleItem[] = [
    { value: 1, label: 'I like it that way' },
    { value: 2, label: 'I expect it to be that way' },
    { value: 3, label: 'I am neutral' },
    { value: 4, label: 'I can live with it that way' },
    { value: 5, label: 'I dislike it that way' },
];

export const kanoTemplate = {
    title: "New Feature Satisfaction (Kano Model)",
    description: "Please share your feelings about the following features to help us improve our product.",
    questions: [
        {
            id: 'kano_intro',
            type: 'description',
            title: 'Kano Model Introduction',
            content: 'We will ask you two questions for each feature. \n1. **Functional:** How do you feel if the feature is **present**? \n2. **Dysfunctional:** How do you feel if the feature is **absent**?'
        },
        {
            id: 'kano_functional_1',
            type: 'matrix',
            kanoDimension: 'functional',
            title: 'If you have this feature, how do you feel?',
            required: true,
            rows: [
                'Dark Mode',
                'AI Assistant',
                'Offline Access'
            ],
            scale: kanoFunctionalScale,
        },
        {
            id: 'kano_dysfunctional_1',
            type: 'matrix',
            kanoDimension: 'dysfunctional',
            title: 'If you do NOT have this feature, how do you feel?',
            required: true,
            rows: [
                'Dark Mode',
                'AI Assistant',
                'Offline Access'
            ],
            scale: kanoFunctionalScale,
        },
    ] as Question[],
};


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
    description: "Please rate your satisfaction with our restaurant on the following attributes. Your feedback will help us improve.",
    questions: [
        {
            id: 'ipa_desc',
            type: 'description',
            title: 'Instructions',
            content: 'Please rate your satisfaction with the following aspects of your visit on a scale from 1 (Very Dissatisfied) to 7 (Very Satisfied).'
        },
        {
            id: 'ipa_attributes',
            type: 'matrix',
            title: 'Attribute Satisfaction',
            required: true,
            rows: [
                'Food Quality',
                'Service Speed',
                'Ambiance',
                'Value for Money',
                'Location Convenience'
            ],
            scale: [
                {value: 1, label: 'Very Dissatisfied'},
                {value: 2, label: 'Dissatisfied'},
                {value: 3, label: 'Slightly Dissatisfied'},
                {value: 4, label: 'Neutral'},
                {value: 5, label: 'Slightly Satisfied'},
                {value: 6, label: 'Satisfied'},
                {value: 7, label: 'Very Satisfied'}
            ],
        },
        {
            id: 'ipa_overall_satisfaction',
            type: 'matrix',
            title: 'Overall Satisfaction',
            description: 'Overall, how satisfied were you with your experience?',
            required: true,
            rows: ['Overall_Satisfaction'],
            scale: [
                {value: 1, label: 'Very Dissatisfied'},
                {value: 2, label: 'Dissatisfied'},
                {value: 3, label: 'Slightly Dissatisfied'},
                {value: 4, label: 'Neutral'},
                {value: 5, label: 'Slightly Satisfied'},
                {value: 6, label: 'Satisfied'},
                {value: 7, label: 'Very Satisfied'}
            ],
        }
    ] as Question[],
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
    ] as Question[],
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
            scale: [
                {value: 1, label: '1'},
                {value: 2, label: '2'},
                {value: 3, label: '3'},
                {value: 4, label: '4'},
                {value: 5, label: '5'}
            ],
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
            scale: [
                {value: 1, label: 'Dislike'},
                {value: 2, label: 'Neutral'},
                {value: 3, label: 'Like'}
            ],
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
                { id: 'c1', name: 'Performance', subCriteria: [{id: `sc-${Date.now()}-1`, name: 'CPU Speed'}, {id: `sc-${Date.now()}-2`, name: 'GPU Performance'}] },
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
            id: 'csat_overall',
            type: 'likert',
            title: '1. Overall, how satisfied are you with our product/service?',
            required: true,
            scale: [
                { value: 1, label: 'Very Dissatisfied' },
                { value: 2, label: 'Dissatisfied' },
                { value: 3, label: 'Neutral' },
                { value: 4, label: 'Satisfied' },
                { value: 5, label: 'Very Satisfied' }
            ],
        },
        {
            id: 'csat_drivers',
            type: 'matrix',
            title: '2. Please rate your satisfaction with the following aspects:',
            required: true,
            rows: [
                'Product Quality',
                'Value for Money',
                'Customer Support',
                'Ease of Use'
            ],
            scale: [
                 { value: 1, label: 'Very Dissatisfied' },
                 { value: 2, label: 'Dissatisfied' },
                 { value: 3, label: 'Neutral' },
                 { value: 4, label: 'Satisfied' },
                 { value: 5, label: 'Very Satisfied' }
            ],
        },
        {
            id: 'csat_open_positive',
            type: 'text',
            title: '3. What did you like most about the product/service?',
            required: false,
        },
        {
            id: 'csat_open_negative',
            type: 'text',
            title: '4. What could be improved?',
            required: false,
        }
    ] as Question[],
};

export const employeeEngagementTemplate = {
    title: "Employee Engagement Survey",
    description: "Measure employee satisfaction, motivation, and alignment with company goals.",
    questions: [
        {
            id: 'engagement_job_satisfaction',
            type: 'matrix',
            title: '1. Job Satisfaction',
            required: true,
            rows: [
                'I find my work interesting and meaningful.',
                'I believe my current workload is appropriate.',
                'I feel my work contributes to the company\'s goals.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_leadership',
            type: 'matrix',
            title: '2. Leadership',
            required: true,
            rows: [
                'My supervisor provides clear direction.',
                'My supervisor respects my opinions.',
                'I believe my supervisor leads the team fairly.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_compensation',
            type: 'matrix',
            title: '3. Compensation & Recognition',
            required: true,
            rows: [
                'My job performance is rewarded fairly.',
                'I receive appropriate recognition for my job performance.',
                'I believe the company\'s compensation system is fair.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_growth',
            type: 'matrix',
            title: '4. Growth & Development',
            required: true,
            rows: [
                'The company provides me with opportunities for growth.',
                'My supervisor supports my career development.',
                'My current work helps me achieve my career goals.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_teamwork',
            type: 'matrix',
            title: '5. Teamwork & Collaboration',
            required: true,
            rows: [
                'My relationships with my colleagues are positive.',
                'Collaboration within the team is working well.',
                'My colleagues respect each other.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_culture',
            type: 'matrix',
            title: '6. Culture & Values',
            required: true,
            rows: [
                'The company\'s core values are actually practiced within the organization.',
                'The company\'s culture is open and inclusive.',
                'I identify with the company\'s vision.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_communication',
            type: 'matrix',
            title: '7. Communication',
            required: true,
            rows: [
                'The company shares important information clearly.',
                'I believe communication from management is transparent.',
                'I have enough opportunities to express my opinions.'
            ],
            scale: defaultLikertScale,
        },
        {
            id: 'engagement_retention',
            type: 'matrix',
            title: '8. Engagement & Retention Intent',
            required: true,
            rows: [
                'I am proud to work for this company.',
                'I see myself still working at this company in two years\' time.',
                'I feel a strong sense of belonging to the company.'
            ],
            scale: defaultLikertScale,
        }
    ] as Question[],
};


export const employeeRetentionTemplate = {
    title: "Employee Retention Survey",
    description: "Identify key drivers of employee turnover and understand what makes employees stay.",
    questions: [
        {
            id: 'satisfaction_overall',
            type: 'likert',
            title: 'How satisfied are you with your current job?',
            required: true,
            scale: [
                { value: 1, label: 'Very Dissatisfied' },
                { value: 2, label: 'Dissatisfied' },
                { value: 3, label: 'Neutral' },
                { value: 4, label: 'Satisfied' },
                { value: 5, label: 'Very Satisfied' }
            ],
        },
        {
            id: 'satisfaction_workload',
            type: 'likert',
            title: 'How do you feel about the intensity of your current job responsibilities?',
            required: true,
            scale: [
                { value: 1, label: 'Very Overwhelming' },
                { value: 2, label: 'Overwhelming' },
                { value: 3, label: 'Manageable' },
                { value: 4, label: 'Appropriate' },
                { value: 5, label: 'Very Appropriate' }
            ],
        },
        {
            id: 'support_adequacy',
            type: 'single',
            title: 'Do you feel you receive adequate support for your work?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'culture_collaboration',
            type: 'likert',
            title: 'Do you feel that collaboration and teamwork are well-established within the company?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'culture_values',
            type: 'single',
            title: 'Do you think our organizational culture aligns well with your personal values?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'culture_vision_agreement',
            type: 'likert',
            title: 'How much do you agree with the company\'s values and vision?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'career_growth_opportunity',
            type: 'single',
            title: 'Do you believe the company provides you with opportunities for career growth and development?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'career_resources',
            type: 'likert',
            title: 'Does the company provide sufficient training or resources for your career development?',
            required: true,
            scale: [
                { value: 1, label: 'Not at all' },
                { value: 2, label: 'Rarely' },
                { value: 3, label: 'Sometimes' },
                { value: 4, label: 'Often' },
                { value: 5, label: 'Very often' }
            ],
        },
        {
            id: 'career_promotion_fairness',
            type: 'single',
            title: 'Do you feel that promotion opportunities are provided fairly?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'compensation_satisfaction',
            type: 'single',
            title: 'Do you feel your current salary and benefits meet your expectations?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'compensation_competitiveness',
            type: 'single',
            title: 'Do you think the compensation (salary, benefits, etc.) is competitive compared to other companies?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'compensation_appropriateness',
            type: 'likert',
            title: 'Do you believe the company provides appropriate compensation for your contributions?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'leadership_manager_support',
            type: 'single',
            title: 'Do you believe your manager provides you with sufficient support?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'leadership_communication',
            type: 'likert',
            title: 'Does your manager encourage open communication and respect your opinions?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'leadership_guidance',
            type: 'likert',
            title: 'Does your team leader provide clear guidance on tasks and recognize your performance?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'work_life_balance',
            type: 'single',
            title: 'Do you think the company supports a good balance between your personal and work life?',
            required: true,
            options: ['Yes', 'No'],
        },
        {
            id: 'leadership_voice',
            type: 'likert',
            title: 'Do you feel the leadership team values employee opinions?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'role_importance',
            type: 'likert',
            title: 'Do you feel you play an important role in the organization\'s goals and vision?',
            required: true,
            scale: defaultLikertScale,
        },
        {
            id: 'turnover_intent_plan',
            type: 'single',
            title: 'Do you plan to leave your job within the next year?',
            required: true,
            options: ['Yes', 'No', 'Not sure'],
        },
        {
            id: 'turnover_reason_multiple',
            type: 'multiple',
            title: 'What are your main reasons for considering leaving? (Select all that apply)',
            required: false,
            options: [
                'Salary and Compensation',
                'Work Stress',
                'Lack of Growth Opportunities',
                'Workplace Culture',
                'Personal Reasons',
                'Other (please specify)',
            ],
        },
        {
            id: 'turnover_reason_main',
            type: 'text',
            title: 'If you were to leave the company, what would be the most important reason?',
            required: false,
        },
        {
            id: 'feedback_improvement',
            type: 'text',
            title: 'What additional improvements should the company make to increase employee satisfaction?',
            required: false,
        },
        {
            id: 'feedback_retention',
            type: 'text',
            title: 'If you intend to stay with the company longer, what changes or improvements would you like to see?',
            required: false,
        },
        {
            id: 'feedback_benefits',
            type: 'single',
            title: 'Would you like better welfare benefits from the company?',
            required: false,
            options: ['Yes', 'No'],
        }
    ] as Question[],
};


export const cesTemplate = {
    title: "Customer Effort Score (CES) Survey",
    description: "Please let us know how easy it was to interact with us. Your feedback helps us simplify our processes.",
    questions: [
        {
            id: 'ces_q_1',
            type: 'likert',
            title: 'How much effort did you personally have to put forth to handle your request?',
            required: true,
            scale: [
                { value: 1, label: 'Very Low Effort' },
                { value: 2, label: 'Low Effort' },
                { value: 3, label: 'Slightly Low Effort' },
                { value: 4, label: 'Neutral' },
                { value: 5, label: 'Slightly High Effort' },
                { value: 6, label: 'High Effort' },
                { value: 7, label: 'Very High Effort' }
            ],
            description: 'Please rate the effort on a scale of 1 to 7.'
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
                {left: 'Low Quality', right: 'High Quality'},
                {left: 'Unreliable', right: 'Reliable'},
                {left: 'Not Innovative', right: 'Innovative'},
                {left: 'Poor Value', right: 'Good Value'},
                {left: 'Difficult to Use', right: 'Easy to Use'},
            ],
            numScalePoints: 7,
            scale: [
                {value: 1, label: 'Very Negative'},
                {value: 2, label: ''},
                {value: 3, label: ''},
                {value: 4, label: 'Neutral'},
                {value: 5, label: ''},
                {value: 6, label: ''},
                {value: 7, label: 'Very Positive'}
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

const servqualScale: ScaleItem[] = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));

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
            title: 'Tangibles',
            required: true,
            rows: [
                'Have up-to-date equipment.',
                'Physical facilities are visually appealing.',
                'Employees are well-dressed and appear neat.',
                'Materials associated with the service (such as pamphlets or statements) are visually appealing.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servqual_reliability',
            type: 'servqual',
            title: 'Reliability',
            required: true,
            rows: [
                'When they promise to do something by a certain time, they do so.',
                'When you have a problem, they show a sincere interest in solving it.',
                'They perform the service right the first time.',
                'They provide their services at the time they promise to do so.',
                'They insist on error-free records.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servqual_responsiveness',
            type: 'servqual',
            title: 'Responsiveness',
            required: true,
            rows: [
                'They tell you exactly when services will be performed.',
                'They give you prompt service.',
                'They are always willing to help you.',
                'They are never too busy to respond to your requests.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servqual_assurance',
            type: 'servqual',
            title: 'Assurance',
            required: true,
            rows: [
                'The behavior of employees instills confidence in you.',
                'You feel safe in your transactions with them.',
                'Their employees are consistently courteous with you.',
                'Their employees have the knowledge to answer your questions.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servqual_empathy',
            type: 'servqual',
            title: 'Empathy',
            required: true,
            rows: [
                'They give you individual attention.',
                'They have operating hours convenient to all their customers.',
                'They have employees who give you personal attention.',
                'They have your best interests at heart.',
                'Their employees understand your specific needs.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
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
            title: 'Tangibles',
            required: true,
            rows: [
                'Has up-to-date equipment.',
                'Physical facilities are visually appealing.',
                'Employees are well-dressed and appear neat.',
                'Materials associated with the service are visually appealing.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servperf_reliability',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Reliability',
            required: true,
            rows: [
                'When it promises to do something by a certain time, it does so.',
                'Shows a sincere interest in solving problems.',
                'Performs the service right the first time.',
                'Provides its services at the time it promises to do so.',
                'Insists on error-free records.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servperf_responsiveness',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Responsiveness',
            required: true,
            rows: [
                'Tells customers exactly when services will be performed.',
                'Gives prompt service to customers.',
                'Is always willing to help customers.',
                'Is never too busy to respond to customer requests.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servperf_assurance',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Assurance',
            required: true,
            rows: [
                'The behavior of employees instills confidence in customers.',
                'Customers feel safe in their transactions.',
                'Employees are consistently courteous with customers.',
                'Employees have the knowledge to answer customer questions.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        },
        {
            id: 'servperf_empathy',
            type: 'servqual',
            servqualType: 'Perception',
            title: 'Empathy',
            required: true,
            rows: [
                'Gives customers individual attention.',
                'Has operating hours convenient to all its customers.',
                'Has employees who give customers personal attention.',
                'Has the customers\' best interests at heart.',
                'Employees understand the specific needs of their customers.'
            ],
            scale: servqualScale,
            numScalePoints: 7,
        }
    ] as Question[],
};

export const clusteringTemplate = {
    title: "Customer Segmentation Survey (Clustering)",
    description: "Help us understand your preferences and behaviors to improve our products and services.",
    questions: [
        {
            id: 'behavior_title',
            type: 'description',
            title: 'Section 1: Your Behavior',
            content: 'Please tell us about your recent interactions with our product.',
        },
        {
            id: 'usage_frequency',
            type: 'number',
            title: 'On average, how many times per week do you use our product?',
            required: true,
        },
        {
            id: 'monthly_spend',
            type: 'single',
            title: 'How much do you typically spend on products like ours per month?',
            required: true,
            options: ['Less than $10', '$10 - $29', '$30 - $49', '$50 - $99', '$100 or more'],
        },
        {
            id: 'main_purpose',
            type: 'multiple',
            title: 'What are your main reasons for using our product? (Select all that apply)',
            required: true,
            options: ['For work/professional use', 'For personal hobbies', 'For learning/education', 'For entertainment', 'To save time/efficiency'],
        },
        {
            id: 'attitude_title',
            type: 'description',
            title: 'Section 2: Your Attitudes & Values',
            content: 'Please rate your agreement with the following statements.',
        },
        {
            id: 'attitude_likert',
            type: 'likert',
            title: 'Please indicate your agreement with the following:',
            required: true,
            rows: [
                'Price is the most important factor when I make a purchase.',
                'I prefer well-known brands over new ones.',
                'I am always looking for the latest and most innovative products.',
                'High quality is more important than low price.',
                'I consider myself to be environmentally conscious.'
            ],
            scale: [
                { value: 1, label: 'Strongly Disagree' },
                { value: 2, label: 'Disagree' },
                { value: 3, label: 'Neutral' },
                { value: 4, label: 'Agree' },
                { value: 5, label: 'Strongly Agree' }
            ],
        },
        {
            id: 'demographics_title',
            type: 'description',
            title: 'Section 3: About You (Optional)',
            content: 'This information helps us understand our customer groups better. It is optional.',
        },
        {
            id: 'age_demo',
            type: 'dropdown',
            title: 'What is your age group?',
            required: false,
            options: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65 or older'],
        },
        {
            id: 'income_demo',
            type: 'single',
            title: 'What is your approximate annual household income?',
            required: false,
            options: ['Less than $30,000', '$30,000 - $59,999', '$60,000 - $99,999', '$100,000 - $149,999', '$150,000 or more', 'Prefer not to say'],
        },
        {
            id: 'occupation_demo',
            type: 'text',
            title: 'What is your occupation?',
            required: false,
        }
    ] as Question[],
};


export const mdsTemplate = {
  title: "Brand Positioning (MDS)",
  description: "Please rate each brand on the following attributes to help us understand their market position.",
  questions: [
    {
      id: 'mds_matrix_1',
      type: 'matrix',
      title: 'Please rate each brand on how "Sporty" you perceive them to be.',
      required: true,
      rows: ['Nike', 'Adidas', 'Puma'],
      scale: Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
      columns: ['Rating']
    },
    {
      id: 'mds_matrix_2',
      type: 'matrix',
      title: 'Please rate each brand on how "Fashionable" you perceive them to be.',
      required: true,
      rows: ['Nike', 'Adidas', 'Puma'],
      scale: Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
      columns: ['Rating']
    },
    {
      id: 'mds_matrix_3',
      type: 'matrix',
      title: 'Please rate each brand on how "High Quality" you perceive them to be.',
      required: true,
      rows: ['Nike', 'Adidas', 'Puma'],
      scale: Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
      columns: ['Rating']
    },
  ] as Question[],
};
