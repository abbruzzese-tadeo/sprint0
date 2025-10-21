"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "../HomeDashboard";
import UsersDashboard from "../UsersDashboard";
import AdminCoursesPage from "./AdminCoursesPage";
import ProfileInfo from "../../perfil/ProfileInfo";

export default function AdminDashboard() {
  const { section } = useDashboardUI();

  switch (section) {
    case "home":
      return <HomeDashboard />;
    case "usuarios":
      return <UsersDashboard />;
    case "cursos":
      return <AdminCoursesPage />;
    case "perfil":
      return <ProfileInfo />;
    default:
      return <HomeDashboard />;
  }
}
