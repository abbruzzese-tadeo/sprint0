"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardUI } from "@/stores/useDashboardUI";

import AdminDashboard from "@/components/dashboards/AdminDashboard";

import ProfesorDashboard from "@/components/dashboards/ProfesorDashboard";
import AlumnoDashboard from "@/components/dashboards/AlumnoDashboard";

import HomeDashboard from "@/components/dashboards/HomeDashboard";
import UsersDashboard from "@/components/dashboards/UsersDashboard";
import CoursesDashboard from "@/components/dashboards/AdminCoursesPage";

export default function DashboardPage() {
  const { user, role, authReady, loading } = useAuth();
  const { section } = useDashboardUI();
  const router = useRouter();

  // 🔹 Redirige al login si no hay sesión
  useEffect(() => {
    if (authReady && !user) router.push("/");
  }, [authReady, user, router]);

  // 🔹 Pantalla de carga mientras se resuelve auth
  if (!authReady || loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando sesión...
      </div>
    );

  // 🔹 Si Firebase ya cargó pero no hay usuario
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No hay usuario autenticado.
      </div>
    );

  // ======================================
  // 1️⃣ Según el rol → elegimos "contexto" de dashboard
  // ======================================
  switch (role) {
    case "admin":
      return (
        <AdminDashboard>
          <DashboardSection section={section} />
        </AdminDashboard>
      );
    case "profesor":
      return (
        <ProfesorDashboard>
          <DashboardSection section={section} />
        </ProfesorDashboard>
      );
    case "alumno":
      return (
        <AlumnoDashboard>
          <DashboardSection section={section} />
        </AlumnoDashboard>
      );
    default:
      return (
        <div className="min-h-screen flex items-center justify-center text-red-400">
          Rol no reconocido
        </div>
      );
  }
}

// ======================================
// 2️⃣ Según la sección → qué mostrar dentro del dashboard
// ======================================
function DashboardSection({ section }: { section: string }) {
  switch (section) {
    case "home":
      return <HomeDashboard />;
    case "cursos":
    case "miscursos":
      return <CoursesDashboard />;
    case "usuarios":
      return <UsersDashboard />;
    default:
      return <HomeDashboard />;
  }
}
