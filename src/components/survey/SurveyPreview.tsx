'use client';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";

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
            {/* Example Question */}
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
        </div>
      </div>
    </Card>
  );
}
