import { collection, doc, getDocs, setDoc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { BatchUser, Role, UserProfile } from "@/types/auth";
import { User } from "firebase/auth";

const MAX_USERS_PER_BATCH = 200;
const MAX_BATCHES = 10;
const USER_KEY_PREFIX = "user_";

/* =========================================================
   🔹 addUserToBatch — guarda usuario en batches de alumnos
   ========================================================= */
export const addUserToBatch = async (firebaseUser: User, role: Role = "alumno") => {
  console.log("🚀 [addUserToBatch] Iniciando...");
  console.log("📧 Email:", firebaseUser.email, "🆔 UID:", firebaseUser.uid, "🎭 Role:", role);

  if (!firebaseUser.email) {
    console.error("❌ [addUserToBatch] El usuario no tiene un email válido");
    return;
  }

  try {
    console.log("📦 Obteniendo lista de batches en colección 'alumnos'...");
    const batchesSnapshot = await getDocs(collection(db, "alumnos"));
    const batches: { id: string; data: Record<string, any> }[] = [];
    batchesSnapshot.forEach((docSnap) => {
      batches.push({ id: docSnap.id, data: docSnap.data() });
    });

    console.log(`📊 Cantidad de batches encontrados: ${batches.length}`);

    // Buscar si ya existe el usuario
    const isUserInBatches = (uid: string) => {
      for (const batch of batches) {
        for (const key in batch.data) {
          if (key.startsWith(USER_KEY_PREFIX) && batch.data[key].uid === uid) {
            console.log(`⚠️ Usuario encontrado en ${batch.id}/${key}`);
            return true;
          }
        }
      }
      return false;
    };

    if (isUserInBatches(firebaseUser.uid)) {
      console.log("⚠️ Usuario ya existe en alumnos, no se agrega.");
      return;
    }

    // Buscar un batch con espacio libre
    batches.sort(
      (a, b) =>
        parseInt(a.id.replace("batch_", "")) - parseInt(b.id.replace("batch_", ""))
    );

    let targetBatchId: string | null = null;
    let nextSlot: number | null = null;

    for (const batch of batches) {
      const userKeys = Object.keys(batch.data).filter((key) =>
        key.startsWith(USER_KEY_PREFIX)
      );
      if (userKeys.length < MAX_USERS_PER_BATCH) {
        const usedSlots = userKeys
          .map((key) => parseInt(key.replace(USER_KEY_PREFIX, "")))
          .sort((a, b) => a - b);

        nextSlot = 0;
        for (let i = 0; i <= usedSlots.length; i++) {
          if (!usedSlots.includes(i)) {
            nextSlot = i;
            break;
          }
        }
        targetBatchId = batch.id;
        break;
      }
    }

    // Crear un nuevo batch si no hay espacio
    if (!targetBatchId) {
      if (batches.length >= MAX_BATCHES) {
        throw new Error("❌ Se alcanzó el límite máximo de batches.");
      }

      targetBatchId = `batch_${batches.length + 1}`;
      nextSlot = 0;
      console.log(`🆕 Creando nuevo batch: ${targetBatchId}`);
      await setDoc(doc(db, "alumnos", targetBatchId), {});
    }

    const userKey = `${USER_KEY_PREFIX}${nextSlot}`;
    const newUser: BatchUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      role,
      batchId: targetBatchId!,
    };

    console.log("🧩 Datos del nuevo usuario:", newUser);

    await setDoc(
      doc(db, "alumnos", targetBatchId!),
      { [userKey]: newUser },
      { merge: true }
    );

    console.log(`✅ Usuario agregado correctamente a alumnos/${targetBatchId}/${userKey}`);
  } catch (err: any) {
    console.error("🔥 [addUserToBatch] Error:", err);
  }
};

/* =========================================================
   🔹 fetchUserFromBatchesByUid — busca usuario por UID (login)
   ========================================================= */
export const fetchUserFromBatchesByUid = async (uid: string): Promise<UserProfile | null> => {
  console.log(`🔍 Buscando usuario con UID ${uid} en batches...`);
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const ref = doc(db, "alumnos", `batch_${i}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;

    const data = snap.data();
    for (const key in data) {
      const user = data[key];
      if (key.startsWith(USER_KEY_PREFIX) && user?.uid === uid) {
        console.log(`✅ Usuario encontrado en alumnos/batch_${i}/${key}`);
        return {
          uid: user.uid,
          email: user.email,
          role: user.role,
          batchId: `batch_${i}`,
        };
      }
    }
  }

  console.warn("⚠️ Usuario no encontrado en ningún batch (UID).");
  return null;
};


/* =========================================================
   🔹 fetchUserFromBatches — busca usuario por EMAIL (enrolamiento)
   ========================================================= */
export const fetchUserFromBatches = async (email: string): Promise<UserProfile | null> => {
  console.log(`🔍 Buscando usuario con EMAIL ${email} en batches...`);
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const ref = doc(db, "alumnos", `batch_${i}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;

    const data = snap.data();
    for (const key in data) {
      const user = data[key];
      if (key.startsWith(USER_KEY_PREFIX) && user?.email === email) {
        console.log(`✅ Usuario encontrado en alumnos/batch_${i}/${key}`);
        return {
          uid: user.uid,
          email: user.email,
          role: user.role,
          batchId: `batch_${i}`,
        };
      }
    }
  }

  console.warn("⚠️ Usuario no encontrado en ningún batch (EMAIL).");
  return null;
};

/* =========================================================
   🔹 fetchAllUsers — lista todos los usuarios de batches
   ========================================================= */
export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  console.log("📦 [fetchAllUsers] Cargando todos los usuarios desde batches...");
  const alumnosRef = collection(db, "alumnos");
  const snap = await getDocs(alumnosRef);

  const allUsers: UserProfile[] = [];
  snap.forEach((batchDoc) => {
    const data = batchDoc.data();
    for (const key in data) {
      if (key.startsWith(USER_KEY_PREFIX)) {
        const u = data[key];
        allUsers.push({
          uid: u.uid,
          email: u.email,
          role: u.role,
          batchId: u.batchId ?? batchDoc.id,
        });
      }
    }
  });

  console.log(`✅ [fetchAllUsers] Total usuarios: ${allUsers.length}`);
  return allUsers;
};

/* =========================================================
   🔹 updateUserRole — actualiza rol dentro de su batch
   ========================================================= */
export const updateUserRole = async (uid: string, newRole: Role) => {
  console.log(`🎭 [updateUserRole] Buscando UID ${uid} para rol ${newRole}`);
  const alumnosRef = collection(db, "alumnos");
  const snap = await getDocs(alumnosRef);

  for (const batchDoc of snap.docs) {
    const data = batchDoc.data();
    for (const key in data) {
      if (key.startsWith(USER_KEY_PREFIX) && data[key].uid === uid) {
        const userPath = `${key}.role`;
        await updateDoc(doc(db, "alumnos", batchDoc.id), {
          [userPath]: newRole,
        });
        console.log(`✅ [updateUserRole] Rol actualizado para ${uid}`);
        return;
      }
    }
  }

  console.warn("⚠️ [updateUserRole] Usuario no encontrado en ningún batch.");
};

export const enrollUserInCourse = async (email: string, courseId: string) => {
  console.log(`🎓 Enrolando usuario ${email} en curso ${courseId}`);
  try {
    // Buscar al usuario por email
    const userProfile = await fetchUserFromBatches(email);
    if (!userProfile) {
      console.warn(`⚠️ No se encontró el usuario ${email} en ningún batch`);
      return;
    }

    const batchRef = doc(db, "alumnos", userProfile.batchId);
    const snap = await getDoc(batchRef);
    if (!snap.exists()) {
      console.warn(`⚠️ El batch ${userProfile.batchId} no existe`);
      return;
    }

    const data = snap.data();
    // Encontrar la key (user_0, user_1, etc.) que corresponde a este email
    const userKey = Object.keys(data).find(
      (key) => key.startsWith("user_") && data[key]?.email === email
    );

    if (!userKey) {
      console.warn(`⚠️ No se encontró la key para ${email}`);
      return;
    }

    // Agregar el curso al array cursosAdquiridos (lo crea si no existe)
    const path = `${userKey}.cursosAdquiridos`;
    await updateDoc(batchRef, {
      [path]: arrayUnion(courseId),
    });

    console.log(`✅ Curso ${courseId} asignado a ${email} (${userKey} en ${userProfile.batchId})`);
  } catch (err) {
    console.error("🔥 [enrollUserInCourse] Error:", err);
  }
};