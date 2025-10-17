"use client";
import SidebarProfesor from "@/components/layout/SidebarProfesor";
import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "./HomeDashboard";
import UsersDashboard from "./UsersDashboard";
import CoursesDashboard from "./CoursesDashboard"; // o AdminCoursesPage si querés usar el mismo

export default function ProfesorDashboard() {
  const { section } = useDashboardUI();

  const renderSection = () => {
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
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarProfesor />
      <main className="flex-1 overflow-y-auto p-6">{renderSection()}</main>
    </div>
  );
}
