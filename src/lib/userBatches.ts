import { collection, doc, getDocs, setDoc, updateDoc, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { UserBatch, BatchUser, Role } from '@/types/auth';
import { User } from 'firebase/auth';

const MAX_USERS_PER_BATCH = 200;
const MAX_BATCHES = 10; // Como pediste

// Encontrar o crear batch para agregar un nuevo usuario (solo para 'alumno')
export const addUserToBatch = async (firebaseUser: User, role: Role = 'alumno') => {
  if (role !== 'alumno') {
    // Para admin/profesor, usa specialUsers
    await setDoc(doc(db, 'specialUsers', firebaseUser.uid), {
      email: firebaseUser.email,
      role,
    });
    return;
  }

  // Para alumno: Busca batches
  const batchesCollection = collection(db, 'userBatches');
  const batchesSnapshot = await getDocs(batchesCollection);
  
  let targetBatchId: string | null = null;
  let targetBatchDoc: DocumentSnapshot | null = null;

  // Busca el último batch con <200 users
  let batches: { id: string; data: UserBatch }[] = [];
  batchesSnapshot.forEach((batchDoc) => {
    const data = batchDoc.data() as UserBatch;
    batches.push({ id: batchDoc.id, data });
  });

  // Ordena por ID numérico (batch_1, batch_2...)
  batches.sort((a, b) => parseInt(a.id.replace('batch_', '')) - parseInt(b.id.replace('batch_', '')));

  for (const batch of batches) {
    if (batch.data.users.length < MAX_USERS_PER_BATCH) {
      targetBatchId = batch.id;
      targetBatchDoc = batchesSnapshot.docs.find(d => d.id === batch.id) || null;
      break;
    }
  }

  // Si no hay espacio, crea nuevo (si < MAX_BATCHES)
  if (!targetBatchId && batches.length < MAX_BATCHES) {
    const nextBatchNum = batches.length + 1;
    targetBatchId = `batch_${nextBatchNum}`;
    await setDoc(doc(db, 'userBatches', targetBatchId), {
      users: [],
    });
  } else if (!targetBatchId) {
    throw new Error('Máximo de batches alcanzado. Contacta al admin.');
  }

  // Agrega el usuario al array
  const newUser: BatchUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    role,
  };

  if (targetBatchDoc?.exists()) {
    // Update array existente
    const currentData = targetBatchDoc.data() as UserBatch;
    const updatedUsers = [...currentData.users, newUser];
    await updateDoc(doc(db, 'userBatches', targetBatchId), {
      users: updatedUsers,
    });
  } else {
    // Nuevo batch
    await updateDoc(doc(db, 'userBatches', targetBatchId), {
      users: [newUser],
    });
  }
};

// Fetch rol para un UID específico (busca en hasta MAX_BATCHES)
export const fetchUserFromBatches = async (uid: string): Promise<UserProfile | null> => {
  // Primero, chequea specialUsers (para admin/profesor)
  const specialDoc = await getDoc(doc(db, 'specialUsers', uid));
  if (specialDoc.exists()) {
    const data = specialDoc.data();
    return {
      uid,
      email: data.email,
      role: data.role,
    };
  }

  // Sino, busca en batches (hasta 10)
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchDoc = await getDoc(doc(db, 'userBatches', `batch_${i}`));
    if (batchDoc.exists()) {
      const data = batchDoc.data() as UserBatch;
      const userInBatch = data.users.find(u => u.uid === uid);
      if (userInBatch) {
        return {
          uid: userInBatch.uid,
          email: userInBatch.email,
          role: userInBatch.role,
        };
      }
    }
  }

  return null; // No encontrado
};

// Fetch todos los users para Admin (flatten batches + specialUsers)
export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  const allUsers: UserProfile[] = [];

  // Special users
  const specialSnapshot = await getDocs(collection(db, 'specialUsers'));
  specialSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    allUsers.push({
      uid: docSnap.id,
      email: data.email,
      role: data.role,
    });
  });

  // Batches
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchDoc = await getDoc(doc(db, 'userBatches', `batch_${i}`));
    if (batchDoc.exists()) {
      const data = batchDoc.data() as UserBatch;
      allUsers.push(...data.users);
    }
  }

  return allUsers;
};

// Update rol para un UID (busca en batch o special y actualiza)
export const updateUserRole = async (uid: string, newRole: Role) => {
  // Primero, specialUsers
  const specialDoc = await getDoc(doc(db, 'specialUsers', uid));
  if (specialDoc.exists()) {
    await updateDoc(doc(db, 'specialUsers', uid), { role: newRole });
    return;
  }

  // Sino, busca en batches
  for (let i = 1; i <= MAX_BATCHES; i++) {
    const batchDoc = await getDoc(doc(db, 'userBatches', `batch_${i}`));
    if (batchDoc.exists()) {
      const data = batchDoc.data() as UserBatch;
      const userIndex = data.users.findIndex(u => u.uid === uid);
      if (userIndex !== -1) {
        const updatedUsers = [...data.users];
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], role: newRole };
        
        // Si cambia a admin/profesor, mueve a specialUsers
        if (newRole !== 'alumno') {
          await updateDoc(doc(db, 'userBatches', `batch_${i}`), {
            users: data.users.filter(u => u.uid !== uid), // Remueve del batch
          });
          await setDoc(doc(db, 'specialUsers', uid), {
            email: updatedUsers[userIndex].email,
            role: newRole,
          });
        } else {
          // Solo update en batch
          await updateDoc(doc(db, 'userBatches', `batch_${i}`), {
            users: updatedUsers,
          });
        }
        return;
      }
    }
  }

  throw new Error('Usuario no encontrado para actualizar rol.');
};