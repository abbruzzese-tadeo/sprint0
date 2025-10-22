"use client";

import { FiClock, FiBookOpen } from "react-icons/fi";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface CursoCardAlumno {
  id: string;
  title: string;
  description: string;
  image: string;
  level: string;
  category?: string;
  lessonsCount: number;
  duration?: string;
  progress?: number; // 0-100
  completedLessons?: number;
}

export default function CursoCardAlumno({
  id,
  title,
  description,
  image,
  level,
  category,
  lessonsCount,
  duration,
  progress = 0,
  completedLessons = 0,
}: CursoCardAlumno) {
  const router = useRouter();
  const progressLabel = progress >= 100 ? "Completed" : "In progress";

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200 hover:shadow-lg transition-all duration-300">
      {/* HEADER IMAGE */}
      <div className="relative">
        <img
          src={image || "/images/default-course.jpg"}
          alt={title}
          className="w-full h-48 object-cover"
        />

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {category && (
            <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {category}
            </span>
          )}
          {level && (
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {level}
            </span>
          )}
        </div>

        {/* Progress bubble */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow">
          {progress}% <span className="text-slate-500">{progressLabel}</span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800 leading-tight">
          {title}
        </h2>
        <p className="text-slate-500 text-sm line-clamp-3">
          {description || "No description available."}
        </p>

        <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
          <div className="flex items-center gap-1.5">
            <FiBookOpen size={14} /> {lessonsCount} lessons
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <FiClock size={14} /> {duration}
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="pt-3">
          <div className="flex justify-between items-center text-xs mb-1 text-slate-500">
            <span>
              {completedLessons}/{lessonsCount} lessons completed
            </span>
            <span>{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-blue-500"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-4">
          <Button
            onClick={() => router.push(`/material-academico/${id}`)}
            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl px-6 py-2"
          >
            {progress >= 100 ? "Review" : "Continue"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/material-academico/${id}`)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-6 py-2"
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
