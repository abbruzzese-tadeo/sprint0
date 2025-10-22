"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import {
  fetchUserFromBatchesByUid,
  addUserToBatch,
} from "@/lib/userBatches";
import { toast } from "sonner";

/* ==========================================================
   🔹 Contexto de Autenticación Global
   ========================================================== */

interface AuthContextType {
  user: User | null;
  role: "admin" | "profesor" | "alumno" | null;
  authReady: boolean;
  loading: boolean;
  userProfile: any | null;

  alumnos: any[];
  misCursos: any[];
  allCursos?: any[];

  loadingCursos: boolean;
  loadingAllCursos?: boolean;

  reloadData?: () => Promise<void>;
  loadMisCursos?: (uid: string) => Promise<void>;
  loadAllCursos?: () => Promise<void>;
  saveCourseProgress?: (uid: string, courseId: string, data: any) => Promise<void>;
  logout?: () => Promise<void>;
  firestore?: any;
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
  userProfile: null,
});

/* ==========================================================
   🔹 Proveedor del Contexto
   ========================================================== */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "profesor" | "alumno" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [misCursos, setMisCursos] = useState<any[]>([]);
  const [allCursos, setAllCursos] = useState<any[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [loadingAllCursos, setLoadingAllCursos] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  /* ==========================================================
     🔹 Logout
     ========================================================== */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setMisCursos([]);
      setUserProfile(null);
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
      toast.error("Error al cerrar sesión");
    }
  };

  /* ==========================================================
     🔹 Cargar alumnos (para admin o profesor)
     ========================================================== */
  const loadAlumnos = async () => {
    try {
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
    } catch (err) {
      console.error("❌ [AuthContext] Error cargando alumnos:", err);
    }
  };

  /* ==========================================================
     🔹 Cargar cursos del alumno logueado
     ========================================================== */
  /* ==========================================================
   🔹 Cargar cursos + progreso real del alumno
   ========================================================== */
const loadMisCursos = async (uid: string) => {
  setLoadingCursos(true);
  try {
    const profile = await fetchUserFromBatchesByUid(uid);
    if (!profile) {
      console.warn("⚠️ No se encontró perfil en batches");
      setMisCursos([]);
      return;
    }

    const batchRef = doc(db, "alumnos", profile.batchId);
    const snap = await getDoc(batchRef);
    if (!snap.exists()) {
      setMisCursos([]);
      return;
    }

    const data = snap.data();
    const userKey = Object.keys(data).find(
      (k) => k.startsWith("user_") && data[k]?.uid === uid
    );
    if (!userKey) return;

    const alumno = data[userKey];
    const cursosIds = alumno?.cursosAdquiridos || [];
    const progreso = alumno?.progreso || {};

    if (!Array.isArray(cursosIds) || cursosIds.length === 0) {
      setMisCursos([]);
      return;
    }

    const snapCursos = await getDocs(collection(db, "cursos"));
    const allCursos = snapCursos.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Calcular progreso real por curso
    const cursosAlumno = allCursos
      .filter((c) => cursosIds.includes(c.id))
      .map((curso) => {
        const prog = progreso?.[curso.id]?.byLesson || {};
        const totalLessons = curso.unidades?.reduce(
          (acc: number, u: any) => acc + (u.lecciones?.length || 0),
          0
        ) || 0;

        const completedCount = Object.values(prog).filter(
          (p: any) => p?.videoEnded || p?.exSubmitted
        ).length;

        const progressPercent =
          totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : 0;

        return {
          ...curso,
          progressPercent,
          completedCount,
          totalLessons,
        };
      });

    setMisCursos(cursosAlumno);
  } catch (err) {
    console.error("❌ Error cargando cursos del alumno:", err);
    toast.error("Error cargando tus cursos");
  } finally {
    setLoadingCursos(false);
  }
};


  /* ==========================================================
     🔹 Cargar todos los cursos (admin/profesor)
     ========================================================== */
  const loadAllCursos = async () => {
    setLoadingAllCursos(true);
    try {
      const snap = await getDocs(collection(db, "cursos"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllCursos(all);
    } catch (err) {
      console.error("❌ Error cargando todos los cursos:", err);
      toast.error("Error cargando lista de cursos");
    } finally {
      setLoadingAllCursos(false);
    }
  };

  /* ==========================================================
     🔹 Guardar progreso de curso
     ========================================================== */
  /* ==========================================================
   🔹 Guardar progreso de curso (admin o alumno)
   ========================================================== */
const saveCourseProgress = async (
  uid: string,
  courseId: string,
  data: Record<string, any>
) => {
  try {
    const profile = await fetchUserFromBatchesByUid(uid);
    if (!profile) throw new Error("Usuario no encontrado en batches");

    const batchRef = doc(db, "alumnos", profile.batchId);
    const snap = await getDoc(batchRef);
    if (!snap.exists()) throw new Error("Batch no existe");

    const batchData = snap.data();
    const userKey = Object.keys(batchData).find(
      (k) => k.startsWith("user_") && batchData[k]?.uid === uid
    );
    if (!userKey) throw new Error("No se encontró el user_X correspondiente");

    const userData = batchData[userKey] || {};
    const prevProgreso =
      userData.progreso || userData.progress || {}; // compatibilidad
    const prevByLesson = prevProgreso[courseId]?.byLesson || {};

    // 🔹 Mergea datos a nivel byLesson
    const updatedProgreso = {
      ...prevProgreso,
      [courseId]: {
        ...(prevProgreso[courseId] || {}),
        byLesson: {
          ...prevByLesson,
          ...data, // 👈 data = { [lessonKey]: {...} }
        },
      },
    };

    // 🔹 Update anidado completo
    await setDoc(
      batchRef,
      {
        [userKey]: {
          ...userData,
          progreso: updatedProgreso,
        },
      },
      { merge: true }
    );

    console.log(
      `✅ Progreso guardado correctamente en ${profile.batchId}/${userKey}`,
      updatedProgreso
    );
  } catch (err: any) {
    console.error("🔥 Error guardando progreso:", err);
    toast.error("Error guardando progreso del curso");
  }
};


/* ==========================================================
   🔹 Leer progreso de curso (por UID)
   ========================================================== */
const getCourseProgress = async (uid: string, courseId: string) => {
  try {
    const profile = await fetchUserFromBatchesByUid(uid);
    if (!profile) throw new Error("Usuario no encontrado en batches");

    const batchRef = doc(db, "alumnos", profile.batchId);
    const snap = await getDoc(batchRef);
    if (!snap.exists()) throw new Error("Batch no existe");

    const data = snap.data();
    const userKey = Object.keys(data).find(
      (k) => k.startsWith("user_") && data[k]?.uid === uid
    );

    if (!userKey) throw new Error("No se encontró user_X");

    const progress = data[userKey]?.progreso?.[courseId] || {};
    console.log(`📊 Progreso cargado (${uid} / ${courseId}):`, progress);
    return progress;
  } catch (err) {
    console.error("❌ Error al leer progreso:", err);
    return {};
  }
};

  /* ==========================================================
     🔹 Reload global (alumnos + cursos)
     ========================================================== */
  const reloadData = async () => {
    await Promise.all([
      loadAlumnos(),
      user?.uid ? loadMisCursos(user.uid) : Promise.resolve(),
    ]);
  };

  /* ==========================================================
     🔹 Listener de Auth
     ========================================================== */
  useEffect(() => {
    console.log("[AuthContext] Montando listener...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        console.log("👤 Usuario detectado:", firebaseUser.email);
        setUser(firebaseUser);

        let profile = await fetchUserFromBatchesByUid(firebaseUser.uid);

        if (!profile) {
          console.warn("⚠️ Usuario no encontrado en batches, creando...");
          await addUserToBatch(firebaseUser, "alumno");
          profile = await fetchUserFromBatchesByUid(firebaseUser.uid);
        }

        const resolvedRole = profile?.role || "alumno";
        setRole(resolvedRole);
        setUserProfile(profile);

        await loadAlumnos();
        if (resolvedRole === "alumno") await loadMisCursos(firebaseUser.uid);
        else await loadAllCursos();
      } else {
        setUser(null);
        setRole(null);
        setMisCursos([]);
        setUserProfile(null);
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
    userProfile,
    authReady,
    loading,
    alumnos,
    misCursos,
    allCursos,
    loadingCursos,
    loadingAllCursos,
    reloadData,
    loadMisCursos,
    loadAllCursos,
    saveCourseProgress,
    getCourseProgress,
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
