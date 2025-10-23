"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  FiBookOpen,
  FiTrendingUp,
  FiAward,
  FiClock,
  FiBell,
  FiCalendar,
} from "react-icons/fi";

export default function AlumnoHome() {
  const { user, misCursos, loadingCursos } = useAuth();

  if (loadingCursos)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Cargando tu información...
      </div>
    );

  // 📊 Calculamos métricas reales desde los cursos
  const totalCourses = misCursos.length;
  const totalLessons = misCursos.reduce(
    (acc, c) => acc + (c.totalLessons || 0),
    0
  );
  const completedLessons = misCursos.reduce(
    (acc, c) => acc + (c.completedCount || 0),
    0
  );
  const avgProgress =
    totalCourses > 0
      ? Math.round(
          misCursos.reduce((acc, c) => acc + (c.progressPercent || 0), 0) /
            totalCourses
        )
      : 0;

  // 🧠 Datos simulados (luego vendrán del contexto o Firestore)
  const announcements = [
    {
      title: "Nuevo curso disponible: Comunicación efectiva",
      desc: "Ya puedes inscribirte al nuevo módulo impartido por la profesora García.",
      date: "Oct 20, 2025",
    },
    {
      title: "Recordatorio: cierre de inscripciones",
      desc: "El periodo de inscripción finaliza el 30 de octubre.",
      date: "Oct 18, 2025",
    },
  ];

  const activities = [
    { label: "Completaste la lección 3 de Pitch Mastery", time: "hace 1 día" },
    { label: "Subiste una entrega del Módulo 2", time: "hace 3 días" },
    { label: "Iniciaste el curso English for Professionals", time: "hace 5 días" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-8">
      {/* ENCABEZADO */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Hola {user?.email?.split("@")[0] || "Alumno"}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Bienvenido a tu campus virtual. Aquí puedes ver tus avances,
            novedades y próximos pasos.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <FiCalendar size={16} />
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
      </header>

      {/* TARJETAS DE RESUMEN */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardCard
          icon={<FiBookOpen />}
          label="Cursos activos"
          value={totalCourses}
          color="text-blue-600 bg-blue-50"
        />
        <DashboardCard
          icon={<FiTrendingUp />}
          label="Promedio de avance"
          value={`${avgProgress}%`}
          color="text-emerald-600 bg-emerald-50"
        />
        <DashboardCard
          icon={<FiAward />}
          label="Certificados obtenidos"
          value={0}
          color="text-yellow-600 bg-yellow-50"
        />
        <DashboardCard
          icon={<FiClock />}
          label="Lecciones completadas"
          value={`${completedLessons}/${totalLessons}`}
          color="text-purple-600 bg-purple-50"
        />
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ACTIVIDAD */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <FiTrendingUp className="text-blue-500" />
            Actividad reciente
          </h2>

          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No hay actividad registrada todavía.
            </p>
          ) : (
            <ul className="space-y-4">
              {activities.map((a, i) => (
                <li
                  key={i}
                  className="border-b border-gray-100 pb-3 flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700">{a.label}</span>
                  <span className="text-gray-400">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ANUNCIOS */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <FiBell className="text-orange-500" />
            Noticias y anuncios
          </h2>

          {announcements.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay anuncios por ahora.</p>
          ) : (
            <ul className="space-y-5">
              {announcements.map((n, i) => (
                <li key={i} className="border-b border-gray-100 pb-3">
                  <p className="font-medium text-gray-800">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{n.desc}</p>
                  <p className="text-xs text-gray-400 mt-2">{n.date}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-400 pt-8 border-t border-gray-100">
        © {new Date().getFullYear()} Further Academy — Campus Virtual
      </footer>
    </div>
  );
}

/* ----------------------------------------------------
   🔹 COMPONENTE AUXILIAR — Card de resumen
---------------------------------------------------- */
function DashboardCard({ icon, label, value, color }: any) {
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div
        className={`p-3 rounded-lg text-xl flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
