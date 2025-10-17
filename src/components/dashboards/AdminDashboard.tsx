"use client";
import SidebarAdmin from "@/components/layout/SidebarAdmin";
import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "./HomeDashboard";
import UsersDashboard from "./UsersDashboard";
import AdminCoursesPage from "./AdminCoursesPage";
import ProfileInfo from "../perfil/ProfileInfo"

export default function AdminDashboard() {
  const { section } = useDashboardUI();

  const renderSection = () => {
    switch (section) {
      case "home":
        return <HomeDashboard />;
      case "cursos":
        return <AdminCoursesPage />;
      case "usuarios":
        return <UsersDashboard />;
        case "perfil":
            return <ProfileInfo />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarAdmin />
      <main className="flex-1 overflow-y-auto p-6">{renderSection()}</main>
    </div>
  );
}
