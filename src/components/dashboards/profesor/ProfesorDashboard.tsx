"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "../HomeDashboard";
import ProfileInfo from "../../perfil/ProfileInfo";
// import ProfesorCoursesPage from "./ProfesorCoursesPage"; // si tenés algo así

export default function ProfesorDashboard() {
  const { section } = useDashboardUI();

  switch (section) {
    case "home":
      return <HomeDashboard />;
    case "cursos":
    // case "miscursos":
    //   return <ProfesorCoursesPage />;
    case "perfil":
      return <ProfileInfo />;
    default:
      return <HomeDashboard />;
  }
}
