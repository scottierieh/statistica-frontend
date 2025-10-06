
import type { Question } from '@/entities/Survey';

const generateProfiles = (): Question[] => {
    const brands = ['Apple', 'Samsung', 'Google'];
    const prices = ['$999', '$799'];
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
        title: `How likely are you to purchase this phone? (Profile ${index + 1})`,
        description: `Brand: ${profile.brand}, Price: ${profile.price}, Screen: ${profile.screen}, Battery: ${profile.battery}`,
        required: true,
        scale: ['1', '2', '3', '4', '5', '6', '7'], // Using a 7-point scale
    }));
};

export const conjointTemplate = {
    title: "Smartphone Preference Survey (Conjoint)",
    description: "Please rate the following smartphone profiles based on your likelihood to purchase.",
    questions: [
        {
            id: 'desc1',
            type: 'description',
            title: 'Instructions',
            content: 'On the following screens, you will be presented with several different smartphone concepts. Please rate each one on a scale of 1 (Very Unlikely to Buy) to 7 (Very Likely to Buy).'
        },
        ...generateProfiles(),
    ],
};
