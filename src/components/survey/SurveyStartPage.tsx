'use client';
import { Button } from "@/components/ui/button";
import type { Survey } from "@/entities/Survey";

const SurveyStartPage = ({ survey, onStart }: { survey: Survey, onStart: () => void }) => {
    const { startPage = {}, styles = {} } = survey;
    const { title, description, buttonText, logo, imageUrl } = startPage;

    return (
        <div className="flex flex-col h-full text-center p-6 bg-background rounded-lg shadow-md min-h-[55vh]">
            <div className="flex-1 overflow-y-auto">
                {logo?.src && (
                    <div className="mb-4">
                        <img src={logo.src} alt={logo.alt || 'Survey Logo'} className="max-h-20 mx-auto" />
                    </div>
                )}
                <h2 className="text-2xl font-bold">
                    {title || survey.title}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    {description || survey.description}
                </p>
                {imageUrl && (
                     <div className="mt-6">
                        <img src={imageUrl} alt="Survey introduction" className="rounded-lg shadow-md max-w-full h-auto mx-auto" />
                    </div>
                )}
            </div>
             <div className="flex-shrink-0 mt-8">
                <Button 
                    onClick={onStart} 
                    className="w-full" 
                    style={{ backgroundColor: styles.primaryColor }}
                >
                    {buttonText || 'Start Survey'}
                </Button>
            </div>
        </div>
    );
};

export default SurveyStartPage;
