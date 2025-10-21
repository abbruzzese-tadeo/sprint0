"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { fetchUserFromBatchesByUid } from "@/lib/userBatches";
import { toast } from "sonner";
import { signOut } from "firebase/auth";

/* ==========================================================
   🔹 Contexto de Autenticación Global
   ========================================================== */

interface AuthContextType {
  user: User | null;
  role: "admin" | "profesor" | "alumno" | null;
  authReady: boolean;
  loading: boolean;

  alumnos: any[];
  misCursos: any[];
  allCursos?: any[];           // 👈 todos los cursos (para admin y profesor)

  loadingCursos: boolean;
  loadingAllCursos?: boolean;  // 👈 indica si se están cargando todos los cursos

  reloadData?: () => Promise<void>;
  loadMisCursos?: (uid: string) => Promise<void>;
  loadAllCursos?: () => Promise<void>;
  logout?: () => Promise<void>;
  firestore?: any;   // ✅ <--- agregá esto
  storage?: any; 
  
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  authReady: false,
  loading: true,
  alumnos: [],
  misCursos: [],
  loadingCursos: false,
  

});

/* ==========================================================
   🔹 Proveedor del Contexto
   ========================================================== */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "profesor" | "alumno" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allCursos, setAllCursos] = useState<any[]>([]);
  const [loadingAllCursos, setLoadingAllCursos] = useState(false);

  // 🔹 Datos globales (alumnos y cursos del alumno)
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [misCursos, setMisCursos] = useState<any[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const logout = async () => {
  try {
    await signOut(auth);
    // console.log("👋 Usuario deslogueado correctamente");
    setUser(null);
    setRole(null);
    setMisCursos([]);
  } catch (err) {
    console.error("❌ Error al cerrar sesión:", err);
    toast.error("Error al cerrar sesión");
  }
};

  /* ==========================================================
     🔹 Fetch global de alumnos (para asignación y selección)
     ========================================================== */
  const loadAlumnos = async () => {
    try {
      // console.log("📚 [AuthContext] Cargando lista de alumnos...");
      const alumnosRef = collection(db, "alumnos");
      const snap = await getDocs(alumnosRef);

      const allUsers: any[] = [];
      snap.forEach((batchDoc) => {
        const data = batchDoc.data();
        for (const key in data) {
          if (key.startsWith("user_")) {
            allUsers.push({
              uid: data[key].uid,
              email: data[key].email,
              role: data[key].role,
              batchId: batchDoc.id,
            });
          }
        }
      });

      setAlumnos(allUsers);
      // console.log("✅ [AuthContext] Alumnos cargados:", allUsers.length);
    } catch (err) {
      console.error("❌ [AuthContext] Error cargando alumnos:", err);
    }
  };

  /* ==========================================================
     🔹 Fetch de cursos del alumno logueado
     ========================================================== */
  const loadMisCursos = async (uid: string) => {
    console.count("🔁 loadMisCursos ejecutado");

    setLoadingCursos(true);
    try {
      console.log("🎓 [AuthContext] Cargando cursos del alumno...");

      const profile = await fetchUserFromBatchesByUid(uid);
      if (!profile) {
        // console.warn("⚠️ [AuthContext] No se encontró perfil en batches");
        setMisCursos([]);
        return;
      }

      const batchRef = doc(db, "alumnos", profile.batchId);
      const snap = await getDoc(batchRef);
      if (!snap.exists()) {
        console.warn("⚠️ [AuthContext] No existe el batch", profile.batchId);
        setMisCursos([]);
        return;
      }

      const data = snap.data();
      const userKey = Object.keys(data).find(
        (k) => k.startsWith("user_") && data[k]?.uid === uid
      );

      if (!userKey) {
        console.warn("⚠️ [AuthContext] No se encontró el user_X dentro del batch");
        setMisCursos([]);
        return;
      }

      const cursosIds = data[userKey]?.cursosAdquiridos || [];
      // console.log("🎓 Cursos adquiridos:", cursosIds);

      if (!Array.isArray(cursosIds) || cursosIds.length === 0) {
        setMisCursos([]);
        return;
      }

      const snapCursos = await getDocs(collection(db, "cursos"));
      const allCursos = snapCursos.docs.map((d) => ({ id: d.id, ...d.data() }));
      const cursosAlumno = allCursos.filter((c) => cursosIds.includes(c.id));

      setMisCursos(cursosAlumno);
      // console.log("✅ [AuthContext] Cursos cargados:", cursosAlumno);
    } catch (err) {
      console.error("❌ [AuthContext] Error cargando cursos del alumno:", err);
      toast.error("Error cargando tus cursos");
    } finally {
      setLoadingCursos(false);
    }
  };
const loadAllCursos = async () => {
  setLoadingAllCursos(true);
  try {
    // console.log("📚 [AuthContext] Cargando todos los cursos...");
    const snap = await getDocs(collection(db, "cursos"));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setAllCursos(all);
    // console.log(`✅ [AuthContext] Cursos totales cargados: ${all.length}`);
  } catch (err) {
    console.error("❌ [AuthContext] Error cargando todos los cursos:", err);
    toast.error("Error cargando lista de cursos");
  } finally {
    setLoadingAllCursos(false);
  }
};
  /* ==========================================================
     🔹 Reload global (alumnos + cursos del alumno)
     ========================================================== */
  const reloadData = async () => {
    await Promise.all([
      loadAlumnos(),
      user?.uid ? loadMisCursos(user.uid) : Promise.resolve(),
    ]);
  };

  /* ==========================================================
     🔹 Listener de Auth (Firebase)
     ========================================================== */
  useEffect(() => {
    console.log("[AuthContext] Montando listener onAuthStateChanged...");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // console.log("👤 onAuthStateChanged disparado:", firebaseUser.email);
        setUser(firebaseUser);

        // 🔹 Buscar rol en batches
        const profile = await fetchUserFromBatchesByUid(firebaseUser.uid);
        const resolvedRole = profile?.role || "alumno";
        setRole(resolvedRole);
        // console.log(`🎭 Rol detectado: ${resolvedRole}`);

        // 🔹 Cargar datos globales
        await loadAlumnos();
        if (resolvedRole === "alumno") {
  await loadMisCursos(firebaseUser.uid);
} else if (resolvedRole === "admin" || resolvedRole === "profesor") {
  await loadAllCursos();
}

      } else {
        // console.log("🚫 No hay usuario logueado");
        setUser(null);
        setRole(null);
        setMisCursos([]);
      }

      setLoading(false);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  /* ==========================================================
     🔹 Valor del contexto
     ========================================================== */
 const value: AuthContextType = {
  user,
  role,
  authReady,
  loading,
  alumnos,
  misCursos,
  allCursos,           // 👈 agregado
  loadingCursos,
  loadingAllCursos,    // 👈 agregado
  reloadData,
  loadMisCursos,
  loadAllCursos,
  logout,
  firestore: db,
};


  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

/* ==========================================================
   🔹 Hook personalizado
   ========================================================== */
export const useAuth = () => useContext(AuthContext);
