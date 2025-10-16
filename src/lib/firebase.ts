import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDMPp6DhY2tKlErErMRIe8ngSp3za_Kjrc",
  authDomain: "sprint0-59273.firebaseapp.com",
  projectId: "sprint0-59273",
  storageBucket: "sprint0-59273.appspot.com",
  messagingSenderId: "572095465161",
  appId: "1:572095465161:web:ba963b7053f0b16c912f18",
  measurementId: "G-CRS2C5B6XS"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 