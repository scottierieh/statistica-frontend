'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, ArrowRight, ArrowLeft, Share2, BarChart2 } from 'lucide-react';
import { produce } from 'immer';

// Simplified question and survey types for the new tool
type Question = {
  id: string;
  type: 'text' | 'choice';
  text: string;
  options?: string[];
};

type Survey = {
  title: string;
  description: string;
  questions: Question[];
};

const STEPS = ['Setup', 'Build', 'Share & Analyze'];

// A new, distinct Survey App component
export default function SurveyApp1() {
  const [currentStep, setCurrentStep] = useState(0);
  const [survey, setSurvey] = useState<Survey>({
    title: 'New Survey',
    description: '',
    questions: [],
  });

  const addQuestion = () => {
    setSurvey(
      produce((draft) => {
        draft.questions.push({
          id: `q_${Date.now()}`,
          type: 'choice',
          text: '',
          options: ['Option 1', 'Option 2'],
        });
      })
    );
  };

  const updateQuestion = (id: string, newText: string) => {
    setSurvey(
      produce((draft) => {
        const question = draft.questions.find((q) => q.id === id);
        if (question) {
          question.text = newText;
        }
      })
    );
  };
  
  const nextStep = () => setCurrentStep(p => Math.min(p + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
      <div className="flex justify-center items-center mb-8">
        {STEPS.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep === index
                    ? 'bg-primary text-primary-foreground scale-110'
                    : currentStep > index 
                    ? 'bg-primary/50 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <p className="mt-2 text-sm text-center">{step}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 ${currentStep > index ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Survey Setup</CardTitle>
            <CardDescription>Give your survey a title and a brief description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="survey-title">Title</Label>
              <Input
                id="survey-title"
                value={survey.title}
                onChange={(e) => setSurvey(produce(draft => { draft.title = e.target.value; }))}
              />
            </div>
            <div>
              <Label htmlFor="survey-description">Description</Label>
              <Textarea
                id="survey-description"
                value={survey.description}
                onChange={(e) => setSurvey(produce(draft => { draft.description = e.target.value; }))}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={nextStep}>Next: Build Questions <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Build Your Survey</CardTitle>
            <CardDescription>Add and edit the questions for your survey.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {survey.questions.map((q, index) => (
              <Card key={q.id} className="p-4">
                <Label>Question {index + 1}</Label>
                <Input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  placeholder="Type your question here..."
                />
              </Card>
            ))}
            <Button variant="outline" onClick={addQuestion}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </CardContent>
           <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Setup</Button>
            <Button onClick={nextStep}>Next: Share & Analyze <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Share & Analyze</CardTitle>
            <CardDescription>Your survey is ready! Share the link to start collecting responses.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="p-4 border rounded-lg bg-muted">
                <p className="font-mono text-primary break-all">/survey/view/{survey.title.toLowerCase().replace(/\s+/g, '-')}</p>
            </div>
             <div className="flex justify-center gap-4">
                <Button><Share2 className="mr-2 h-4 w-4"/> Share Link</Button>
                <Button variant="secondary"><BarChart2 className="mr-2 h-4 w-4"/> View Results</Button>
            </div>
          </CardContent>
           <CardFooter className="flex justify-start">
             <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Build</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
