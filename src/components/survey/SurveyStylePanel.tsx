
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import { Minus, Plus } from "lucide-react";

interface SurveyStylePanelProps {
    styles: any;
    setStyles: (styles: any) => void;
}

export default function SurveyStylePanel({ styles, setStyles }: SurveyStylePanelProps) {
    const handleStyleChange = (key: string, value: any) => {
        setStyles({ ...styles, [key]: value });
    };

    const handleFontSizeChange = (key: 'questionTextSize' | 'answerTextSize', delta: number) => {
        setStyles({ ...styles, [key]: Math.max(10, styles[key] + delta) });
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Survey Styling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                        <Input type="color" value={styles.primaryColor} onChange={e => handleStyleChange('primaryColor', e.target.value)} className="p-1 h-10"/>
                        <Input value={styles.primaryColor} onChange={e => handleStyleChange('primaryColor', e.target.value)} />
                    </div>
                </div>
                <div>
                    <Label>Secondary Color</Label>
                     <div className="flex items-center gap-2">
                        <Input type="color" value={styles.secondaryColor} onChange={e => handleStyleChange('secondaryColor', e.target.value)} className="p-1 h-10"/>
                        <Input value={styles.secondaryColor} onChange={e => handleStyleChange('secondaryColor', e.target.value)} />
                    </div>
                </div>
                <div>
                    <Label>Font</Label>
                    <Select value={styles.font} onValueChange={v => handleStyleChange('font', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Default">Default</SelectItem>
                            <SelectItem value="Serif">Serif</SelectItem>
                            <SelectItem value="Mono">Monospace</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label>Foreground Contrast</Label>
                    <Select value={styles.foregroundColor} onValueChange={v => handleStyleChange('foregroundColor', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Question Spacing</Label>
                    <Select value={styles.questionSpacing} onValueChange={v => handleStyleChange('questionSpacing', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Compact">Compact</SelectItem>
                            <SelectItem value="Comfortable">Comfortable</SelectItem>
                            <SelectItem value="Spacious">Spacious</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Question Text (px)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('questionTextSize', -1)}><Minus/></Button>
                        <Input type="number" value={styles.questionTextSize} onChange={e => handleStyleChange('questionTextSize', parseInt(e.target.value, 10))} className="w-20 text-center"/>
                        <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('questionTextSize', 1)}><Plus/></Button>
                    </div>
                </div>
                 <div>
                    <Label>Answer Text (px)</Label>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('answerTextSize', -1)}><Minus/></Button>
                        <Input type="number" value={styles.answerTextSize} onChange={e => handleStyleChange('answerTextSize', parseInt(e.target.value, 10))} className="w-20 text-center"/>
                        <Button variant="outline" size="icon" onClick={() => handleFontSizeChange('answerTextSize', 1)}><Plus/></Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
