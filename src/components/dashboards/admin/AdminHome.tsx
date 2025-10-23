"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  FiUsers,
  FiBookOpen,
  FiAward,
  FiTrendingUp,
  FiBell,
  FiCalendar,
  FiActivity,
  FiBarChart2
} from "react-icons/fi";

export default function AdminHome() {
  const { allCursos, alumnos, loading } = useAuth();

  // 🔹 Métricas base (mockeadas si aún no tenés los datos conectados)
  const totalCursos = allCursos?.length || 0;
  const totalAlumnos = alumnos?.length || 0;
  const totalProfesores = 6; // mock temporal
  const totalCertificados = 14; // mock temporal
  const promedioAvance = 68; // mock temporal

  const stats = [
    { label: "Alumnos activos", value: totalAlumnos, icon: <FiUsers />, color: "text-blue-600 bg-blue-50" },
    { label: "Cursos publicados", value: totalCursos, icon: <FiBookOpen />, color: "text-indigo-600 bg-indigo-50" },
    { label: "Profesores", value: totalProfesores, icon: <FiActivity />, color: "text-emerald-600 bg-emerald-50" },
    { label: "Certificados emitidos", value: totalCertificados, icon: <FiAward />, color: "text-yellow-600 bg-yellow-50" },
  ];

  const activities = [
    { action: "Nuevo alumno registrado", time: "hace 2 horas" },
    { action: "Curso 'Pitch Mastery' actualizado", time: "hace 1 día" },
    { action: "Se emitió un nuevo certificado", time: "hace 3 días" },
  ];

  const announcements = [
    {
      title: "Mantenimiento programado",
      desc: "El sistema se actualizará el domingo 27/10 entre las 02:00 y 03:00 AM.",
      date: "Oct 25, 2025",
    },
    {
      title: "Nuevo módulo disponible: Speaking Essentials",
      desc: "Ya está disponible el nuevo curso dentro de la categoría 'Business English'.",
      date: "Oct 22, 2025",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Panel del Campus 🎓
          </h1>
          <p className="text-gray-500 mt-1">
            Resumen general del estado académico e institucional.
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

      {/* MÉTRICAS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div
              className={`p-3 rounded-lg text-xl flex items-center justify-center ${s.color}`}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-800">{s.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ACTIVIDAD RECIENTE */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <FiTrendingUp className="text-blue-500" />
            Actividad reciente
          </h2>
          {activities.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay actividad registrada.</p>
          ) : (
            <ul className="space-y-4">
              {activities.map((a, i) => (
                <li
                  key={i}
                  className="border-b border-gray-100 pb-3 flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700">{a.action}</span>
                  <span className="text-gray-400">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ANUNCIOS INSTITUCIONALES */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <FiBell className="text-orange-500" />
            Anuncios institucionales
          </h2>
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay anuncios.</p>
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

      {/* ESTADÍSTICA GLOBAL */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <FiBarChart2 className="text-indigo-600" />
          Promedio general del campus
        </h2>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${promedioAvance}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2 text-right">
          Promedio global: <span className="font-semibold text-gray-700">{promedioAvance}%</span>
        </p>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-xs text-gray-400 pt-8 border-t border-gray-100">
        © {new Date().getFullYear()} Further Academy — Panel Administrativo
      </footer>
    </div>
  );
}
