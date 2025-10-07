
'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";
import { Question } from "@/entities/Survey";

// A simplified AHP preview component
const AHPPreview = ({ question, styles }: { question: Question; styles: any }) => {
    return (
        <div className="p-4 bg-white rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
            <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor }}>
                {question.title}
            </h3>
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-6">
                    <span className="font-semibold text-blue-700 text-lg">Example A</span>
                    <span className="text-gray-400 text-sm">vs</span>
                    <span className="font-semibold text-indigo-700 text-lg">Example B</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                    {[9, 7, 5, 3, 1, 3, 5, 7, 9].map((scale, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <button
                                className={`w-12 h-12 rounded-full border-2 transition-all ${
                                    scale === 1 ? 'bg-blue-600 border-blue-600 shadow-lg scale-110' : 'bg-white border-gray-300'
                                }`}
                            >
                                <span className={`text-sm font-semibold ${scale === 1 ? 'text-white' : 'text-gray-600'}`}>
                                    {scale}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SurveyPreview({ styles }: { styles: any }) {

  const questionStyle = {
    fontSize: `${styles.questionTextSize}px`,
    color: styles.primaryColor,
  };
  const choiceStyle = {
    fontSize: `${styles.answerTextSize}px`,
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
        <CardDescription>Changes to the styling will be reflected here.</CardDescription>
      </CardHeader>
      <div className="p-4 h-[70vh] overflow-y-auto rounded-b-lg" style={{ backgroundColor: styles.secondaryColor, color: styles.primaryColor }}>
        <h2 className="text-2xl font-bold mb-2">Example Survey Title</h2>
        <p className="text-sm mb-6">This is an example description for the survey.</p>

        <div className="space-y-6">
            {/* Example Single Choice Question */}
            <div className="p-4 bg-white rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
                <h3 className="font-semibold mb-4" style={questionStyle}>Example Single Choice Question</h3>
                <RadioGroup className="space-y-3">
                    <Label className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent" style={choiceStyle}>
                        <RadioGroupItem value="option1" />
                        <span>Option 1</span>
                    </Label>
                    <Label className="flex items-center space-x-3 p-3 rounded-lg border bg-background/50 hover:bg-accent" style={choiceStyle}>
                        <RadioGroupItem value="option2" />
                        <span>Option 2</span>
                    </Label>
                </RadioGroup>
            </div>
             {/* Example AHP Question */}
            <AHPPreview question={{id: 'ahp-preview', type: 'ahp', title: 'Example AHP Question'}} styles={styles} />
        </div>
      </div>
    </Card>
  );
}
