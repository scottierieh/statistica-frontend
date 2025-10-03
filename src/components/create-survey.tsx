'use client';

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SurveyEntity as Survey } from "@/entities/Survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { motion } from "framer-motion";

import QuestionTypePalette from "./survey/QuestionTypePalette";
import QuestionList from "./survey/QuestionList";
import SurveyPreview from "./survey/SurveyPreview";
import QuestionEditor from "./survey/QuestionEditor";
import { type Question } from "@/entities/Survey";


export default function CreateSurvey() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const loadSurvey = async () => {
      const surveys = await Survey.list();
      const survey = surveys.find(s => s.id === surveyId);
      if (survey) {
        setTitle(survey.title);
        setDescription(survey.description || "");
        setQuestions(survey.questions || []);
      }
    };

    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const handleSelectQuestionType = (type: any) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type,
      text: "",
      title: "",
      description: "",
      options: type === "single" || type === "multiple" || type === "dropdown" || type === "best_worst" ? ["", ""] : [],
      required: type !== "description"
    };
    setEditingQuestion(newQuestion);
  };

  const handleSaveQuestion = (questionData: Question) => {
    if (questionData.id && questions.find(q => q.id === questionData.id)) {
      setQuestions(questions.map(q => q.id === questionData.id ? questionData : q));
    } else {
      setQuestions([...questions, { ...questionData, id: questionData.id || Date.now().toString() }]);
    }
    setEditingQuestion(null);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const reorderQuestions = (startIndex: number, endIndex: number) => {
    const result = Array.from(questions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setQuestions(result);
  };

  const saveSurvey = async (status = "draft") => {
    if (!title.trim()) {
      alert("Please enter a survey title");
      return;
    }
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    setIsSaving(true);
    const surveyData = {
      title,
      description,
      questions,
      status,
      response_count: 0
    };

    if (surveyId) {
      await Survey.update(surveyId, surveyData);
    } else {
      await Survey.create(surveyData);
    }

    setIsSaving(false);
    router.push("/dashboard/survey2");
  };

  if (showPreview) {
    return (
      <SurveyPreview
        title={title}
        description={description}
        questions={questions}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/dashboard/survey2")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">
                {surveyId ? "Edit Survey" : "Create New Survey"}
              </h1>
              <p className="text-slate-600 mt-1">Add questions and design your survey</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[320px,1fr] gap-6">
            {/* Left Sidebar - Question Type Palette */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <QuestionTypePalette onSelectType={handleSelectQuestionType} />
            </div>

            {/* Right Content - Survey Builder */}
            <div className="space-y-6">
              {/* Survey Info */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Survey Title *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Customer Satisfaction Survey"
                      className="text-lg h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Survey Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide a brief description of your survey"
                      rows={3}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Inline Question Editor */}
              {editingQuestion && (
                <QuestionEditor
                  question={editingQuestion}
                  onSave={handleSaveQuestion}
                  onCancel={() => setEditingQuestion(null)}
                />
              )}

              {/* Questions List */}
              {questions.length > 0 && (
                <QuestionList
                  questions={questions}
                  onEdit={handleEditQuestion}
                  onDelete={deleteQuestion}
                  onReorder={reorderQuestions}
                />
              )}

              {/* Empty State */}
              {questions.length === 0 && !editingQuestion && (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowLeft className="w-8 h-8 text-cyan-600 transform rotate-180" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Select a question type
                  </h3>
                  <p className="text-slate-600">
                    Choose a question type from the left sidebar to get started
                  </p>
                </div>
              )}

              {/* Actions */}
              {questions.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 sticky bottom-6 bg-white rounded-2xl p-4 shadow-lg border border-slate-200">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowPreview(true)}
                    className="flex-1 rounded-xl border-slate-200 gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => saveSurvey("draft")}
                    disabled={isSaving}
                    className="flex-1 rounded-xl border-slate-200 gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Save as Draft
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => saveSurvey("active")}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-xl shadow-lg shadow-cyan-500/30 gap-2"
                  >
                    {isSaving ? "Publishing..." : "Publish Survey"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
