"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "../HomeDashboard";
import UsersDashboard from "../UsersDashboard";
import AdminCoursesPage from "./AdminCoursesPage";
import ProfileInfo from "../../perfil/ProfileInfo";
import AdminHome from "./AdminHome";
import AlumnosPage from "./AlumnosPage";
import ProfesoresPage from "./ProfesoresPage";

export default function AdminDashboard() {
  const { section } = useDashboardUI();

  switch (section) {
    case "home":
      return <AdminHome />;
    case "material":
      return <AdminCoursesPage />;
    case "alumnos":
      return <AlumnosPage />;
    case "profesores":
      return <ProfesoresPage />;
    case "perfil":
      return <ProfileInfo />;
    default:
      return <HomeDashboard />;
  }
}
