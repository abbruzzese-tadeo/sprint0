"use client";

import { useAuth } from "@/contexts/AuthContext";
import CursoCardAlumno from "./CursoCardAlumno";

export default function AlumnoHome() {
  const { user, misCursos, loadingCursos } = useAuth();

  if (loadingCursos)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 bg-gray-50">
        Cargando tus cursos...
      </div>
    );

  // 📊 Calcular métricas globales
  const totalCourses = misCursos.length;
  const totalLessons = misCursos.reduce(
    (acc, c) => acc + (c.totalLessons || 0),
    0
  );
  const completedLessons = misCursos.reduce(
    (acc, c) => acc + (c.completedCount || 0),
    0
  );
  const averageProgress =
    totalCourses > 0
      ? Math.round(
          misCursos.reduce((acc, c) => acc + (c.progressPercent || 0), 0) /
            totalCourses
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-10">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bienvenido, {user?.email?.split("@")[0] || "Usuario"}!
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Miembro desde{" "}
            <span className="font-semibold text-white">
              {new Date().toLocaleDateString("es-AR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-8 text-sm">
          <div className="text-center">
            <p className="font-semibold text-white">CURSOS EN PROGRESO</p>
            <span className="text-xl font-bold text-yellow-400">
              {totalCourses}
            </span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">CURSOS COMPLETADOS</p>
            <span className="text-xl font-bold text-green-400">
              {
                misCursos.filter((c) => c.progressPercent >= 100).length
              }
            </span>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-2">
            Average completion
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Average percent completed across enrolled courses.
          </p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${averageProgress}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">
            {averageProgress}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-2">
            Lessons completed
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Total finished lessons across all courses.
          </p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">
            {completedLessons}/{totalLessons}
          </p>
        </div>
      </section>

      {/* CURSOS */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>▶️ Continue learning</span>
          </h2>
          <button className="text-blue-600 text-sm font-medium hover:underline">
            View all
          </button>
        </div>

        {misCursos.length === 0 ? (
          <p className="text-gray-500 text-center py-10">
            No estás inscripto en ningún curso aún.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {misCursos.map((c) => (
              <CursoCardAlumno
                key={c.id}
                id={c.id}
                title={c.titulo}
                description={c.descripcion}
                image={c.urlImagen}
                level={c.nivel}
                category={c.categoria}
                lessonsCount={c.totalLessons}
                duration={`${c.unidades?.reduce(
                  (acc: number, u: any) => acc + (u.duracion || 0),
                  0
                )} min`}
                progress={c.progressPercent}
                completedLessons={c.completedCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
