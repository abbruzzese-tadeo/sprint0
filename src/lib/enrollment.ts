// src/lib/enrollment.ts
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";

const USER_KEY_PREFIX = "user_";

/**
 * 🔹 Enroll alumno al curso dentro de su batch correspondiente
 */
export async function enrollAlumnoToCourse(uid: string, email: string, courseId: string) {
  console.log("🎯 [enrollAlumnoToCourse] Enrolling:", email, "→", courseId);

  const alumnosRef = collection(db, "alumnos");
  const snapshot = await getDocs(alumnosRef);

  for (const batchDoc of snapshot.docs) {
    const data = batchDoc.data();

    for (const key in data) {
      if (key.startsWith(USER_KEY_PREFIX) && data[key]?.uid === uid) {
        const userPath = `${key}.cursosAdquiridos`;
        console.log(`📦 Updating ${batchDoc.id}/${userPath} with ${courseId}`);

        await updateDoc(doc(db, "alumnos", batchDoc.id), {
          [userPath]: arrayUnion(courseId),
        });

        console.log(`✅ Added course ${courseId} to ${batchDoc.id}/${key}`);
        return; // Stop once found
      }
    }
  }

  console.warn(`⚠️ [enrollAlumnoToCourse] No batch found for ${email}`);
}
