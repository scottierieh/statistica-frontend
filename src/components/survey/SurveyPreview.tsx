
'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";
import { Question } from "@/entities/Survey";

// A simplified Semantic Differential preview component based on the user's image
const SemanticDifferentialPreview = ({ question, styles }: { question: Question; styles: any }) => {
    const selectedValue = 6; // Example selected value from the image

    const scalePoints = [
        { value: 1, label: '매우' },
        { value: 2, label: '다소' },
        { value: 3, label: '약간' },
        { value: 4, label: '중립' },
        { value: 5, label: '약간' },
        { value: 6, label: '다소' },
        { value: 7, label: '매우' },
    ];
    
    const [leftLabel, rightLabel] = (question.rows?.[0] || '낮은 품질 vs 높은 품질').split('vs').map(s => s.trim());

    return (
        <div className="p-4 bg-background rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
            <h3 className="font-semibold mb-4" style={{ fontSize: `${styles.questionTextSize}px`, color: styles.primaryColor }}>
                {question.title || "Example Semantic Differential"}
            </h3>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-800 mb-4 px-2">
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                    {scalePoints.map(({ value, label }) => (
                        <div key={value} className="flex flex-col items-center space-y-2">
                            <button
                                className={`w-12 h-12 rounded-full border-2 transition-all flex items-center justify-center font-bold text-lg
                                    ${value === selectedValue
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-110'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-purple-400'
                                    }`}
                            >
                                {value}
                            </button>
                            <span className="text-xs text-gray-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
            <div className="p-4 bg-background rounded-lg" style={{ marginBottom: styles.questionSpacing }}>
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
             {/* Example Semantic Differential Question */}
            <SemanticDifferentialPreview question={{id: 'sd-preview', type: 'semantic-differential', title: 'Example Semantic Differential Question', rows: ['낮은 품질 vs 높은 품질']}} styles={styles} />
        </div>
      </div>
    </Card>
  );
}
