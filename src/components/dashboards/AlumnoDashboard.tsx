"use client";
import SidebarAlumno from "@/components/layout/SidebarAlumno";
import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "./HomeDashboard";
import AlumnoCoursesPage from "../AlumnoCoursesPage"; // nuevo componente

export default function AlumnoDashboard() {
  const { section } = useDashboardUI();

  const renderSection = () => {
    switch (section) {
      case "home":
        return <HomeDashboard />;
      case "miscursos":
      case "cursos":
        return <AlumnoCoursesPage />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarAlumno />
      <main className="flex-1 overflow-y-auto p-6">{renderSection()}</main>
    </div>
  );
}
