"use client";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import CursoCardAlumno from "./CursoCardAlumno";

export default function AlumnoCoursesPage() {
  const { misCursos, loadingCursos } = useAuth();

  if (loadingCursos)
    return <div className="p-8 text-center text-gray-500">Cargando tus cursos...</div>;

  if (!misCursos || misCursos.length === 0)
    return <div className="p-8 text-center text-gray-500">Aún no estás inscripto en ningún curso.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Mis Cursos</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {misCursos.map((course) => (
          <CursoCardAlumno key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}
