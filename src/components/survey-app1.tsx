
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, ArrowRight, ArrowLeft, Share2, BarChart2, Trash2, CaseSensitive, CircleDot, ClipboardList } from 'lucide-react';
import { produce } from 'immer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenuItem, SidebarMenu, SidebarProvider, SidebarTrigger } from './ui/sidebar';

// Simplified question and survey types for the new tool
type QuestionType = 'text' | 'choice';

type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
};

type Survey = {
  title: string;
  description: string;
  questions: Question[];
};

const STEPS = ['Setup', 'Build', 'Share & Analyze'];

// A distinct component for editing a single question
const QuestionEditor = ({ question, onUpdate, onDelete }: { question: Question; onUpdate: (id: string, newQuestion: Partial<Question>) => void; onDelete: (id: string) => void; }) => {
    
    const handleOptionChange = (optIndex: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[optIndex] = value;
        onUpdate(question.id, { options: newOptions });
    };

    const addOption = () => {
        const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
        onUpdate(question.id, { options: newOptions });
    };

    const removeOption = (optIndex: number) => {
        const newOptions = (question.options || []).filter((_, i) => i !== optIndex);
        onUpdate(question.id, { options: newOptions });
    };
    
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className='flex-1'>
            <Label>Question Text</Label>
            <Input
            value={question.text}
            onChange={(e) => onUpdate(question.id, { text: e.target.value })}
            placeholder="Type your question here..."
            />
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
            <Trash2 className="w-4 h-4 text-destructive"/>
        </Button>
      </div>

      {question.type === 'choice' && (
        <div className="space-y-2">
          <Label>Options</Label>
          {question.options?.map((opt, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              <Button variant="ghost" size="icon" onClick={() => removeOption(index)}>
                <Trash2 className="w-4 h-4 text-muted-foreground"/>
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption}><PlusCircle className="mr-2 h-4 w-4"/> Add Option</Button>
        </div>
      )}
    </Card>
  );
};


// A new, distinct Survey App component
export default function SurveyApp1() {
  const [currentStep, setCurrentStep] = useState(0);
  const [survey, setSurvey] = useState<Survey>({
    title: 'New Survey',
    description: '',
    questions: [],
  });

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: type,
      text: '',
    };
    if (type === 'choice') {
      newQuestion.options = ['Option 1', 'Option 2'];
    }
    setSurvey(
      produce((draft) => {
        draft.questions.push(newQuestion);
      })
    );
  };

  const updateQuestion = (id: string, newProps: Partial<Question>) => {
    setSurvey(
      produce((draft) => {
        const question = draft.questions.find((q) => q.id === id);
        if (question) {
          Object.assign(question, newProps);
        }
      })
    );
  };
  
  const deleteQuestion = (id: string) => {
      setSurvey(produce(draft => {
          draft.questions = draft.questions.filter(q => q.id !== id);
      }))
  }
  
  const nextStep = () => setCurrentStep(p => Math.min(p + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));

  const renderContent = () => {
    switch (currentStep) {
        case 0:
            return (
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
            );
        case 1:
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>2. Build Your Survey</CardTitle>
                        <CardDescription>Add and edit the questions for your survey.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {survey.questions.map((q) => (
                        <QuestionEditor 
                            key={q.id}
                            question={q}
                            onUpdate={updateQuestion}
                            onDelete={deleteQuestion}
                        />
                        ))}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => addQuestion('choice')}>
                                    <CircleDot className="mr-2 h-4 w-4"/> Multiple Choice
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => addQuestion('text')}>
                                    <CaseSensitive className="mr-2 h-4 w-4"/> Text Answer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Setup</Button>
                        <Button onClick={nextStep}>Next: Share & Analyze <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            );
        case 2:
            return (
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
            );
        default: return null;
    }
  }

  return (
    <SidebarProvider>
        <div className="flex min-h-screen w-full">
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                            <ClipboardList className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-xl font-headline font-bold">Survey Tool 1</h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                         {STEPS.map((step, index) => (
                             <SidebarMenuItem key={step}>
                                 <SidebarMenuButton
                                    onClick={() => setCurrentStep(index)}
                                    isActive={currentStep === index}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs ${currentStep === index ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{index + 1}</span>
                                    {step}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                         ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>

            <SidebarInset>
                 <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
                    <div className="flex justify-center items-center mb-8">
                        {STEPS.map((step, index) => (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(index)}>
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
                    {renderContent()}
                </div>
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
