import { doc, getDoc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_PROFES_PER_BATCH = 200;

/**
 * Agrega un profesor al batch correspondiente.
 * Estructura: profesores/{batch_X}/profesor_N
 */
export const addProfesorToBatch = async (profesorData: any) => {
  try {
    console.log("🚀 [addProfesorToBatch] Iniciando...");

    // 1️⃣ Buscar batch existente
    const profesoresRef = doc(db, "profesores", "batch_1");
    const snap = await getDoc(profesoresRef);

    let nextIndex = 0;
    let existingData = {};

    if (snap.exists()) {
      existingData = snap.data();
      const keys = Object.keys(existingData).filter((k) => k.startsWith("profesor_"));
      nextIndex = keys.length;
    }

    const profesorKey = `profesor_${nextIndex}`;
    const dataToSave = {
      ...profesorData,
      batchId: "batch_1",
      createdAt: new Date().toISOString(),
    };

    // 2️⃣ Guardar dentro del documento
    await setDoc(
      profesoresRef,
      {
        [profesorKey]: dataToSave,
      },
      { merge: true }
    );

    console.log("✅ Profesor guardado correctamente:", profesorKey);
    return dataToSave;
  } catch (err) {
    console.error("❌ [addProfesorToBatch] Error:", err);
    throw err;
  }
};
