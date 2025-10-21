"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FiBookOpen, FiPlay } from "react-icons/fi";

interface CourseCardAlumnoProps {
  course: any;
}

export default function CourseCardAlumno({ course }: CourseCardAlumnoProps) {
  const router = useRouter();

  const handleOpenCourse = () => {
    router.push(`/dashboard/curso/${course.id}`);
  };

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col"
    >
      {/* Imagen */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {course.urlImagen ? (
          <img
            src={course.urlImagen}
            alt={course.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <FiBookOpen size={40} />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {course.titulo}
        </h3>
        <p className="text-gray-600 text-sm flex-1 line-clamp-3">
          {course.descripcion || "Sin descripción disponible."}
        </p>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span className="capitalize bg-gray-100 px-2 py-1 rounded-lg text-gray-600">
            {course.nivel || "Nivel desconocido"}
          </span>
          <span className="text-gray-500">{course.categoria || "General"}</span>
        </div>

        {/* Botón */}
        <button
          onClick={handleOpenCourse}
          className="mt-4 inline-flex items-center justify-center w-full gap-2 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md"
        >
          <FiPlay size={16} />
          Ver curso
        </button>
      </div>
    </div>
  );
}
