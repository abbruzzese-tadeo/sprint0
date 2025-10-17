"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Exercises from "@/components/Exercises"; // ajustá la ruta según tu estructura

interface ClosingSectionProps {
  initialData?: {
    closingText?: string;
    examIntro?: string;
    examExercises?: any[];
  };
  onChange?: (data: {
    closingText: string;
    examIntro: string;
    examExercises: any[];
  }) => void;
}

export default function ClosingSection({ initialData, onChange }: ClosingSectionProps) {
  const [closingText, setClosingText] = useState(initialData?.closingText || "");
  const [examIntro, setExamIntro] = useState(initialData?.examIntro || "");
  const [examExercises, setExamExercises] = useState<any[]>(initialData?.examExercises || []);

  // sincronizar con el padre
  useEffect(() => {
    onChange?.({
      closingText,
      examIntro,
      examExercises,
    });
  }, [closingText, examIntro, examExercises]);

  return (
    <div className="space-y-6">
      {/* --- Texto de cierre --- */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Closing Text for Unit (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Text displayed after all lessons in this unit are completed"
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* --- Examen final --- */}
      <Card className="shadow-sm border-t-4 border-t-sky-500">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            🧩 Final Exam
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Introductory Text for Exam
            </label>
            <Textarea
              placeholder="Instructions or introduction for the final exam"
              value={examIntro}
              onChange={(e) => setExamIntro(e.target.value)}
              rows={3}
            />
          </div>

          <div className="pt-2">
            <Exercises
              initial={examExercises}
              onChange={(updated) => setExamExercises(updated)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
