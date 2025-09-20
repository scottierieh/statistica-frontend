
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paintbrush, Settings, BarChart3, Plus, Trash2, Link } from "lucide-react";
import { Switch } from '@/components/ui/switch';

interface Question {
  id: number;
  text: string;
  type: 'rating' | 'text' | 'multiple-choice';
}

export default function SurveyApp() {
  const [questions, setQuestions] = useState<Question[]>([
    { id: 1, text: 'How satisfied are you with our service?', type: 'rating' },
    { id: 2, text: 'What is your favorite feature?', type: 'text' },
  ]);

  const addQuestion = () => {
    const newId = (questions.at(-1)?.id || 0) + 1;
    setQuestions([...questions, { id: newId, text: '', type: 'text' }]);
  };

  const removeQuestion = (id: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };


  return (
    <div className="container mx-auto p-0 md:p-4">
        <Tabs defaultValue="design" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design"><Paintbrush className="mr-2 h-4 w-4" />Survey Design</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings & Distribution</TabsTrigger>
                <TabsTrigger value="analysis"><BarChart3 className="mr-2 h-4 w-4" />Analysis & Results</TabsTrigger>
            </TabsList>
            <TabsContent value="design" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Build Your Survey</CardTitle>
                        <CardDescription>Add, edit, and arrange your survey questions below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {questions.map((question, index) => (
                           <Card key={question.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor={`q-text-${question.id}`}>Question {index + 1}</Label>
                                        <Input
                                            id={`q-text-${question.id}`}
                                            value={question.text}
                                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                            placeholder="Enter your question"
                                        />
                                         <Select value={question.type} onValueChange={(value) => updateQuestion(question.id, 'type', value)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="rating">Rating (1-5)</SelectItem>
                                                <SelectItem value="text">Open Text</SelectItem>
                                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(question.id)} disabled={questions.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                           </Card>
                        ))}
                         <Button variant="outline" onClick={addQuestion}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Survey Settings & Distribution</CardTitle>
                        <CardDescription>Configure how your survey behaves and share it with your audience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="survey-title">Survey Title</Label>
                            <Input id="survey-title" placeholder="e.g., Customer Satisfaction Survey" />
                        </div>
                         <div className="flex items-center space-x-2">
                            <Switch id="anonymous-responses" />
                            <Label htmlFor="anonymous-responses">Allow Anonymous Responses</Label>
                        </div>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Share Your Survey</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <Input value="https://example.com/survey/xyz-123" readOnly />
                                <Button><Link className="mr-2 h-4 w-4" /> Copy Link</Button>
                            </CardContent>
                        </Card>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button>Save Settings</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
             <TabsContent value="analysis" className="mt-4">
                 <Card className="text-center">
                    <CardHeader>
                        <CardTitle>Analysis & Results</CardTitle>
                        <CardDescription>This section is under construction. Response analysis will be available here.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-64">
                       <BarChart3 className="w-16 h-16 text-muted-foreground mb-4"/>
                       <p className="text-muted-foreground">Responses will be analyzed and visualized here.</p>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
