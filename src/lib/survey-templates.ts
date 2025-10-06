
import type { Question } from '@/entities/Survey';

const generateRatingProfiles = (): Question[] => {
    const brands = ['Apple', 'Samsung', 'Google'];
    const prices = ['$999', '$799', '159,000원'];
    const screens = ['6.1"', '6.7"'];
    const batteries = ['4000mAh', '5000mAh'];

    // This is a simplified full factorial design. Real conjoint uses fractional factorial.
    const profiles: { [key: string]: string }[] = [];
    for (const brand of brands) {
        for (const price of prices) {
            for (const screen of screens) {
                for (const battery of batteries) {
                    profiles.push({ brand, price, screen, battery });
                }
            }
        }
    }

    // Shuffle and pick a few profiles
    const shuffled = profiles.sort(() => 0.5 - Math.random());
    const selectedProfiles = shuffled.slice(0, 8); // Let's create 8 rating questions

    return selectedProfiles.map((profile, index) => ({
        id: `conjoint_q_${index}`,
        type: 'rating',
        title: `Profile ${index + 1}: How likely are you to purchase this phone?`,
        description: `Brand: ${profile.brand}, Price: ${profile.price}, Screen: ${profile.screen}, Battery: ${profile.battery}`,
        required: true,
        scale: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    }));
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
    description: "Please rate the following smartphone profiles based on your likelihood to purchase.",
    questions: [
        {
            id: 'rating_desc',
            type: 'description',
            title: 'Instructions',
            content: 'On the following screens, you will be presented with several different smartphone concepts. Please rate each one on a scale of 1 (Very Unlikely to Buy) to 10 (Very Likely to Buy).'
        },
        ...generateRatingProfiles(),
    ],
};
