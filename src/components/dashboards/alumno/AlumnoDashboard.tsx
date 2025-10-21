"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "../HomeDashboard";
import ProfileInfo from "../../perfil/ProfileInfo";
import AlumnoCoursesPage from "./AlumnoCoursesPage";

export default function AlumnoDashboard() {
  const { section } = useDashboardUI();

  switch (section) {
    case "home":
      return <HomeDashboard />;
    case "miscursos":
    return <AlumnoCoursesPage />;
    case "perfil":
      return <ProfileInfo />;
    default:
      return <HomeDashboard />;
  }
}
