import { collection, doc, getDocs, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { BatchUser, Role, UserProfile } from '@/types/auth';
import { User } from 'firebase/auth';

const MAX_USERS_PER_BATCH = 200;
const MAX_BATCHES = 10;
const USER_KEY_PREFIX = 'user_';

// 🔹 Agrega cualquier usuario (admin, profe, alumno) en los batches
export const addUserToBatch = async (firebaseUser: User, role: Role = 'alumno') => {
  // Buscar batches existentes
  const batchesSnapshot = await getDocs(collection(db, 'userBatches'));

  const batches: { id: string; data: Record<string, any> }[] = [];
  batchesSnapshot.forEach(docSnap => {
    batches.push({ id: docSnap.id, data: docSnap.data() });
  });

  // Evitar duplicados
  const isUserInBatches = (uid: string) => {
    for (const batch of batches) {
      for (const key in batch.data) {
        if (key.startsWith(USER_KEY_PREFIX) && batch.data[key].uid === uid) {
          return true;
        }
      }
    }
    return false;
  };

  if (isUserInBatches(firebaseUser.uid)) {
    console.log('Usuario ya existe en batches, no se agrega.');
    return;
  }

  // Ordenar batches
  batches.sort((a, b) =>
    parseInt(a.id.replace('batch_', '')) - parseInt(b.id.replace('batch_', ''))
  );

  let targetBatchId: string | null = null;
  let nextSlot: number | null = null;

  // Buscar batch con espacio libre
  for (const batch of batches) {
    const userKeys = Object.keys(batch.data).filter(key => key.startsWith(USER_KEY_PREFIX));
    if (userKeys.length < MAX_USERS_PER_BATCH) {
      const usedSlots = userKeys
        .map(key => parseInt(key.replace(USER_KEY_PREFIX, '')))
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

  // Crear nuevo batch si no hay espacio
  if (!targetBatchId) {
    if (batches.length >= MAX_BATCHES) {
      throw new Error('Se alcanzó el límite máximo de batches.');
    }

    targetBatchId = `batch_${batches.length + 1}`;
    nextSlot = 0;
    await setDoc(doc(db, 'userBatches', targetBatchId), {});
  }

  const userKey = `${USER_KEY_PREFIX}${nextSlot}`;
  const newUser: BatchUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    role,
    batchId: targetBatchId,
  };

  // Guardar usuario (merge para no pisar otros)
  await setDoc(
    doc(db, 'userBatches', targetBatchId),
    { [userKey]: newUser },
    { merge: true }
  );
};

// 🔹 Buscar usuario por UID en todos los batches
export const fetchUserFromBatches = async (uid: string): Promise<UserProfile | null> => {
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchDoc = await getDoc(doc(db, 'userBatches', `batch_${i}`));
    if (batchDoc.exists()) {
      const data = batchDoc.data();
      for (const key in data) {
        if (key.startsWith('user_')) {
          const user = data[key];
          if (user?.uid === uid) {
            return {
              uid: user.uid,
              email: user.email,
              role: user.role,
              batchId: `batch_${i}`,
            };
          }
        }
      }
    }
  }
  return null;
};

// 🔹 Obtener todos los usuarios (para admin)
export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  const allUsers: UserProfile[] = [];

  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchDoc = await getDoc(doc(db, 'userBatches', `batch_${i}`));
    if (batchDoc.exists()) {
      const data = batchDoc.data();
      for (const key in data) {
        if (key.startsWith('user_')) {
          const user = data[key];
          if (user?.uid && user?.email && user?.role) {
            allUsers.push({
              uid: user.uid,
              email: user.email,
              role: user.role,
              batchId: `batch_${i}`,
            });
          }
        }
      }
    }
  }

  return allUsers;
};

// 🔹 Actualizar el rol de un usuario
export const updateUserRole = async (uid: string, newRole: Role) => {
  // Buscar en todos los batches
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchRef = doc(db, 'userBatches', `batch_${i}`);
    const batchDoc = await getDoc(batchRef);

    if (batchDoc.exists()) {
      const data = batchDoc.data();
      for (const key in data) {
        if (key.startsWith(USER_KEY_PREFIX)) {
          const user = data[key];
          if (user?.uid === uid) {
            // Actualizar solo el rol dentro del batch
            await updateDoc(batchRef, {
              [key]: {
                ...user,
                role: newRole,
              },
            });

            
            return;
          }
        }
      }
    }
  }

  throw new Error('Usuario no encontrado para actualizar rol.');
};
