"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext"; // ajustá el path

interface ProtectedCourseProps {
  children: React.ReactNode;
  courseId: string;
}

export default function ProtectedCourse({ children, courseId }: ProtectedCourseProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return setAuthorized(false);

    // 🔹 Si es admin o profesor → acceso total
    if (user.role === "admin" || user.role === "profesor") {
      setAuthorized(true);
      return;
    }

    // 🔹 Si es alumno → validar acceso (por ahora mock simple)
    const hasAccess = true; // simulamos acceso (puede ser false para probar)
    setAuthorized(hasAccess);
  }, [user]);

  // 🔸 loading
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Checking access...
      </div>
    );
  }

  // 🔸 no autorizado
  if (!authorized) {
    router.push("/dashboard"); // o mostrar mensaje
    return null;
  }

  // 🔸 autorizado
  return <>{children}</>;
}
