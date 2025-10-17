"use client";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeDashboard({ children }: { children?: React.ReactNode }) {
  const { role, user } = useAuth();

  const renderMessage = () => {
    switch (role) {
      case "admin":
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Bienvenido, Administrador 👋!
            </h1>
            <p className="text-gray-500 mb-6">
              Desde aquí podés gestionar cursos, usuarios y toda la plataforma.
            </p>
          </>
        );
      case "profesor":
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Bienvenido, Profesor 👋!
            </h1>
            <p className="text-gray-500 mb-6">
              Administrá tus cursos, alumnos y materiales educativos.
            </p>
          </>
        );
      case "alumno":
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              ¡Hola {user?.email?.split("@")[0]} 👋!
            </h1>
            <p className="text-gray-500 mb-6">
              Bienvenido a tu panel de aprendizaje.  
              Aquí verás tus cursos activos y próximos desafíos.
            </p>
          </>
        );
      default:
        return (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido 👋</h1>
            <p className="text-gray-500 mb-6">
              Accedé a tus cursos o gestioná tu espacio según tu rol.
            </p>
          </>
        );
    }
  };

  return (
    <div className="p-8">
      {renderMessage()}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
