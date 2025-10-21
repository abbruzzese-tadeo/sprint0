"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardUI } from "@/stores/useDashboardUI";

import AdminDashboard from "@/components/dashboards/admin/AdminDashboard";
import ProfesorDashboard from "@/components/dashboards/profesor/ProfesorDashboard";
import AlumnoDashboard from "@/components/dashboards/alumno/AlumnoDashboard";

import HomeDashboard from "@/components/dashboards/HomeDashboard";
import UsersDashboard from "@/components/dashboards/UsersDashboard";
import CoursesDashboard from "@/components/dashboards/admin/AdminCoursesPage";

export default function DashboardPage() {
  const { user, role, authReady, loading } = useAuth();
  const { section } = useDashboardUI();
  const router = useRouter();

  // 🔒 Redirige al login si no hay sesión
  useEffect(() => {
    if (authReady && !user) router.replace("/login");
  }, [authReady, user, router]);

  if (!authReady || loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Cargando sesión...
      </div>
    );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No hay usuario autenticado.
      </div>
    );

  // 🔹 Según el rol, renderiza el dashboard adecuado
  if (role === "admin") return <AdminDashboardContent section={section} />;
  if (role === "profesor") return <ProfesorDashboardContent section={section} />;
  if (role === "alumno") return <AlumnoDashboardContent section={section} />;

  return (
    <div className="min-h-screen flex items-center justify-center text-red-400">
      Rol no reconocido.
    </div>
  );
}

/* ==========================================================
   Subcomponentes según rol
   ========================================================== */

function AdminDashboardContent({ section }: { section: string }) {
  return (
    <AdminDashboard>
      <DashboardSection section={section} />
    </AdminDashboard>
  );
}

function ProfesorDashboardContent({ section }: { section: string }) {
  return (
    <ProfesorDashboard>
      <DashboardSection section={section} />
    </ProfesorDashboard>
  );
}

function AlumnoDashboardContent({ section }: { section: string }) {
  return (
    <AlumnoDashboard>
      <DashboardSection section={section} />
    </AlumnoDashboard>
  );
}

/* ==========================================================
   Secciones internas comunes
   ========================================================== */
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
