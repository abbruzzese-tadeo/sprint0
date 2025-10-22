"use client";
import { useAuth } from "@/contexts/AuthContext";
import CursoCardAlumno from "./CursoCardAlumno";

export default function AlumnoCoursesPage() {
  const { misCursos, loadingCursos } = useAuth();

  if (loadingCursos)
    return <div className="p-8 text-slate-500">Cargando tus cursos...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Mis cursos</h1>
      <p className="text-gray-500 mb-8">
        Aquí verás los cursos en los que estás inscripto. 🚀
      </p>

      {misCursos.length === 0 ? (
        <div className="border border-dashed border-gray-300 p-6 rounded-lg text-gray-400 text-center">
          <p>No estás inscripto en ningún curso.</p>
        </div>
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
    </div>
  );
}
