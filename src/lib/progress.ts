import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Guarda progreso del alumno DENTRO del objeto user_X (no como campo separado).
 * Estructura final:
 * alumnos/batch_1:
 *   user_1: {
 *     uid, email, role, ...
 *     progress: { cursoId: { byLesson: {...} } }
 *   }
 */
export async function saveLessonProgress(
  batchId: string,
  userKey: string,
  courseId: string,
  lessonKey: string,
  data: any
) {
  if (!batchId || !userKey || !courseId || !lessonKey) {
    console.error("❌ saveLessonProgress: argumentos inválidos", {
      batchId,
      userKey,
      courseId,
      lessonKey,
    });
    return;
  }

  try {
    const batchRef = doc(db, "alumnos", batchId);
    const snap = await getDoc(batchRef);

    if (!snap.exists()) {
      console.error(`❌ El batch ${batchId} no existe`);
      return;
    }

    const batchData = snap.data() || {};
    const userData = batchData[userKey] || {};
    const prevProgress = userData.progress || {};

    // 🔹 Actualizar estructura embebida
    const updatedProgress = {
      ...prevProgress,
      [courseId]: {
        ...(prevProgress[courseId] || {}),
        byLesson: {
          ...(prevProgress[courseId]?.byLesson || {}),
          [lessonKey]: {
            ...(prevProgress[courseId]?.byLesson?.[lessonKey] || {}),
            ...data,
            updatedAt: Date.now(),
          },
        },
      },
    };

    const updatedUser = {
      ...userData,
      progress: updatedProgress,
    };

    // 🔹 Guardar el usuario completo dentro del batch (mergeando)
    await setDoc(
      batchRef,
      {
        [userKey]: updatedUser, // ✅ esto guarda DENTRO del user
      },
      { merge: true }
    );

    console.log(`✅ Progreso guardado correctamente en ${batchId}/${userKey}`);
  } catch (err) {
    console.error("🔥 Error en saveLessonProgress:", err);
  }
}
