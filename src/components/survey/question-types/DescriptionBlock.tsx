
'use client';

import { Question } from "@/entities/Survey";
import QuestionHeader from "../QuestionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

interface DescriptionBlockProps {
    question: Question;
    onUpdate?: (question: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    onImageUpload?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    styles: any;
    questionNumber: number;
    isPreview?: boolean;
}

export default function DescriptionBlock({ 
    question, 
    onUpdate,
    onDelete,
    onImageUpload,
    onDuplicate,
    styles,
    questionNumber,
    isPreview 
}: DescriptionBlockProps) {
    if (isPreview) {
        return (
            <div>
                <h3 className="font-semibold mb-2" style={{ fontSize: `${styles.questionTextSize}px` }}>{question.title}</h3>
                {question.imageUrl && (
                    <div className="my-4">
                        <Image src={question.imageUrl} alt="Question image" width={400} height={300} className="rounded-md max-h-60 w-auto" />
                    </div>
                )}
                <p className="text-sm" style={{ fontSize: `${styles.answerTextSize}px` }}>{question.content}</p>
            </div>
        );
    }
    
    return (
        <Card className="bg-white">
            <CardContent className="p-6">
                <QuestionHeader 
                    question={question}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onImageUpload={onImageUpload}
                    onDuplicate={onDuplicate}
                    styles={styles}
                    questionNumber={questionNumber}
                />
                <div className="mt-4">
                    <Textarea 
                        placeholder="Enter your description content here..."
                        value={question.content || ''}
                        onChange={(e) => onUpdate?.({...question, content: e.target.value})}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
