"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";
import { FiSearch, FiUser, FiBookOpen, FiCalendar, FiMail } from "react-icons/fi";

export default function AlumnosPage() {
  const { alumnos, loading } = useAuth();
  const [search, setSearch] = useState("");

  // 🔹 Filtrado dinámico
  const filteredAlumnos = useMemo(() => {
    if (!Array.isArray(alumnos)) return [];
    return alumnos.filter((a) =>
      a?.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [alumnos, search]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-8 space-y-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FiUser className="text-blue-600" />
            Alumnos
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona todos los alumnos registrados en el campus.
          </p>
        </div>
      </header>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <FiSearch
          size={18}
          className="absolute left-3 top-3 text-gray-400"
        />
        <input
          type="text"
          placeholder="Buscar alumno por email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white shadow-sm"
        />
      </div>

      {/* LISTADO */}
      {loading ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200 shadow-sm">
          Cargando alumnos...
        </div>
      ) : filteredAlumnos.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-gray-200 shadow-sm">
          No se encontraron alumnos.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="text-left px-5 py-3">Alumno</th>
                <th className="text-left px-5 py-3">UID</th>
                <th className="text-left px-5 py-3">Fecha de creación</th>
                <th className="text-left px-5 py-3">Cursos inscritos</th>
                <th className="text-left px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlumnos.map((a, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {a.email?.charAt(0).toUpperCase() ?? "A"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">
                          {a.email?.split("@")[0] || "Usuario"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <FiMail size={12} />
                          {a.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{a.uid || "-"}</td>
                  <td className="px-5 py-4 text-gray-600 flex items-center gap-1">
                    <FiCalendar size={12} className="text-gray-400" />
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleDateString("es-AR")
                      : "N/A"}
                  </td>
                  <td className="px-5 py-4 text-gray-600 flex items-center gap-1">
                    <FiBookOpen size={12} className="text-gray-400" />
                    {a.cursos?.length ?? 0}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                      Activo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
