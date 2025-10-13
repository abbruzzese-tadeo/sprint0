import { collection, doc, getDocs, setDoc, updateDoc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { BatchUser, Role } from '@/types/auth';
import { User } from 'firebase/auth';

const MAX_USERS_PER_BATCH = 200;
const MAX_BATCHES = 10;
const USER_KEY_PREFIX = 'user_';

export const addUserToBatch = async (firebaseUser: User, role: Role = 'alumno') => {
  if (role !== 'alumno') {
    await setDoc(doc(db, 'specialUsers', firebaseUser.uid), {
      email: firebaseUser.email,
      role,
    });
    return;
  }

  // Buscar batches existentes
  const batchesSnapshot = await getDocs(collection(db, 'userBatches'));
  let targetBatchId: string | null = null;
  let nextSlot: number | null = null;

  const batches: { id: string; data: Record<string, any> }[] = [];
  batchesSnapshot.forEach(docSnap => {
    batches.push({ id: docSnap.id, data: docSnap.data() });
  });

  // Ordenar por número de batch (batch_1, batch_2...)
  batches.sort((a, b) =>
    parseInt(a.id.replace('batch_', '')) - parseInt(b.id.replace('batch_', ''))
  );

  for (const batch of batches) {
    const userKeys = Object.keys(batch.data).filter(key => key.startsWith(USER_KEY_PREFIX));
    if (userKeys.length < MAX_USERS_PER_BATCH) {
      // Encontrar el siguiente slot vacío
      const usedSlots = userKeys.map(key => parseInt(key.replace(USER_KEY_PREFIX, ''))).sort((a, b) => a - b);
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

  // Si no hay batch disponible, crea uno nuevo
  if (!targetBatchId) {
    if (batches.length >= MAX_BATCHES) {
      throw new Error('Se alcanzó el límite máximo de batches.');
    }

    const newBatchId = `batch_${batches.length + 1}`;
    targetBatchId = newBatchId;
    nextSlot = 0;

    // Crear el documento vacío
    await setDoc(doc(db, 'userBatches', newBatchId), {});
  }

  const userKey = `${USER_KEY_PREFIX}${nextSlot}`;
  const newUser: BatchUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    role,
  };

  await updateDoc(doc(db, 'userBatches', targetBatchId), {
    [userKey]: newUser,
  });
};


// Fetch rol para un UID específico (busca en hasta MAX_BATCHES)
export const fetchUserFromBatches = async (uid: string): Promise<UserProfile | null> => {
  // Primero, chequea en 'specialUsers' (admin/profesor)
  const specialDoc = await getDoc(doc(db, 'specialUsers', uid));
  if (specialDoc.exists()) {
    const data = specialDoc.data();
    return {
      uid,
      email: data.email,
      role: data.role,
    };
  }

  // Luego busca en los batches (user_0, user_1, ...)
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
            };
          }
        }
      }
    }
  }

  return null; // No encontrado
};

// Fetch todos los users para Admin (flatten batches + specialUsers)
export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  const allUsers: UserProfile[] = [];

  // Special users (admin / profesor)
  const specialSnapshot = await getDocs(collection(db, 'specialUsers'));
  specialSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    allUsers.push({
      uid: docSnap.id,
      email: data.email,
      role: data.role,
    });
  });

  // Batches con user_0, user_1, ...
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
            });
          }
        }
      }
    }
  }

  return allUsers;
};



// Update rol para un UID (busca en batch o special y actualiza)
export const updateUserRole = async (uid: string, newRole: Role) => {
  // Primero, verifica si está en 'specialUsers'
  const specialDoc = await getDoc(doc(db, 'specialUsers', uid));
  if (specialDoc.exists()) {
    await updateDoc(doc(db, 'specialUsers', uid), { role: newRole });
    return;
  }

  // Luego busca en los batches
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchRef = doc(db, 'userBatches', `batch_${i}`);
    const batchDoc = await getDoc(batchRef);

    if (batchDoc.exists()) {
      const data = batchDoc.data();
      for (const key in data) {
        if (key.startsWith('user_')) {
          const user = data[key];
          if (user?.uid === uid) {
            // Si el nuevo rol es admin/profesor, mover a specialUsers
            if (newRole !== 'alumno') {
              // Eliminar del batch
              const { [key]: removed, ...remainingData } = data;
              await updateDoc(batchRef, remainingData);

              // Crear en specialUsers
              await setDoc(doc(db, 'specialUsers', uid), {
                email: user.email,
                role: newRole,
              });
            } else {
              // Solo actualizar el rol dentro del batch
              await updateDoc(batchRef, {
                [key]: {
                  ...user,
                  role: newRole,
                }
              });
            }

            return;
          }
        }
      }
    }
  }

  throw new Error('Usuario no encontrado para actualizar rol.');
};