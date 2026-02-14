
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import { Minus, Plus } from "lucide-react";
import { Switch } from "../ui/switch";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Textarea } from "../ui/textarea";
import { Survey } from "@/entities/Survey";

interface SurveyStylePanelProps {
    survey: Survey;
    setSurvey: (survey: any) => void;
    styles: any;
    setStyles: (styles: any) => void;
}

const solidColorPalettes = [
    { name: 'Default', primary: '#52708E', accent: '#F1F5F9' },
    { name: 'Serene', primary: '#3C5462', accent: '#F3F4F6' },
    { name: 'Mint', primary: '#4CAF50', accent: '#E8F5E9' },
];

const gradientColorPalettes = [
    { name: 'Sky', primary: '#3B82F6', accent: 'linear-gradient(to bottom, #EFF6FF, #BFDBFE)' },
    { name: 'Dusk', primary: '#8b5cf6', accent: 'linear-gradient(to bottom right, #fdebf7, #e9d5ff, #d1e5ff)' },
    { name: 'Sunset', primary: '#D4B35D', accent: '#FBF9F3' },
    { name: 'Rose', primary: '#F09AA1', accent: '#F8E8EE' },
    { name: 'Stone', primary: '#9E9898', accent: 'linear-gradient(to bottom, #f5f5f5, #e0e0e0)' },
    { name: 'Apple', primary: '#333333', accent: 'linear-gradient(to bottom, #ffffff, #e5e5e5)' },
];


export default function SurveyStylePanel({ survey, setSurvey, styles, setStyles }: SurveyStylePanelProps) {
    const handleStyleChange = (key: string, value: any) => {
        setStyles({ ...styles, [key]: value });
    };

    const handleThemeChange = (themeName: string) => {
        const allPalettes = [...solidColorPalettes, ...gradientColorPalettes];
        const selectedPalette = allPalettes.find(p => p.name.toLowerCase() === themeName);
        if (selectedPalette) {
            setStyles({
                ...styles,
                theme: themeName.toLowerCase(),
                primaryColor: selectedPalette.primary,
                secondaryColor: selectedPalette.accent,
                iconColor: selectedPalette.primary,
                ringColor: selectedPalette.primary, // Also update ring color
            });
        }
    };
    
    const handleStartPageChange = (field: string, value: any) => {
        setSurvey({
            ...survey,
            startPage: {
                ...(survey.startPage || {}),
                [field]: value
            }
        });
    };
    
    const handleShowStartPageChange = (checked: boolean) => {
        setSurvey({
            ...survey,
            showStartPage: checked
        });
    }

    const handleFontSizeChange = (key: 'questionTextSize' | 'answerTextSize', delta: number) => {
        setStyles({ ...styles, [key]: Math.max(10, styles[key] + delta) });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Survey Design</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div>
                        <Label>Color Palette</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {solidColorPalettes.map(palette => (
                                <button
                                    key={palette.name}
                                    title={palette.name}
                                    onClick={() => handleThemeChange(palette.name.toLowerCase())}
                                    className={`w-8 h-8 rounded-full border-4 ${styles.theme === palette.name.toLowerCase() ? 'border-primary' : 'border-slate-200'}`}
                                    style={{ background: palette.accent }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {gradientColorPalettes.map(palette => (
                                <button
                                    key={palette.name}
                                    title={palette.name}
                                    onClick={() => handleThemeChange(palette.name.toLowerCase())}
                                    className={`w-8 h-8 rounded-full border-4 ${styles.theme === palette.name.toLowerCase() ? 'border-primary' : 'border-slate-200'}`}
                                    style={{ background: palette.accent }}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label>Title Font Size</Label>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('questionTextSize', -1)}><Minus/></Button>
                            <Input type="number" value={styles.questionTextSize} onChange={e => handleStyleChange('questionTextSize', parseInt(e.target.value, 10))} className="w-20 text-center"/>
                            <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('questionTextSize', 1)}><Plus/></Button>
                        </div>
                    </div>
                     <div>
                        <Label>Option Font Size</Label>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('answerTextSize', -1)}><Minus/></Button>
                            <Input type="number" value={styles.answerTextSize} onChange={e => handleStyleChange('answerTextSize', parseInt(e.target.value, 10))} className="w-20 text-center"/>
                            <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('answerTextSize', 1)}><Plus/></Button>
                        </div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch
                            id="transparent-options"
                            checked={styles.transparentOptionBg}
                            onCheckedChange={(checked) => handleStyleChange('transparentOptionBg', checked)}
                        />
                        <Label htmlFor="transparent-options">Transparent Options</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
