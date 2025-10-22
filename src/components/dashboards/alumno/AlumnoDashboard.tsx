"use client";

import { useDashboardUI } from "@/stores/useDashboardUI";
import HomeDashboard from "../HomeDashboard";
import AlumnoCoursesPage from "./AlumnoCoursesPage";
import AlumnoHome from "./AlumnoHome";
import AlumnoCertificatesPage from "./AlumnoCertificatePage";
import AlumnoProfilePage from "./AlumnoProfilePage";

export default function AlumnoDashboard() {
  const { section } = useDashboardUI();

  switch (section) {
    case "home":
      return <AlumnoHome />;
    case "miscursos":
      return <AlumnoCoursesPage />;
    case "certificados":
      return <AlumnoCertificatesPage />;
    case "perfil":
      return <AlumnoProfilePage />;
    default:
      return <HomeDashboard />;
  }
}
