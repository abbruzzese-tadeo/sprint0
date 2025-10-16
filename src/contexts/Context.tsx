"use client";
import React, { useEffect, useRef, useState } from "react";
import ContextGeneral from "./contextGeneral";
import app from "@/lib/firebase"; // ajustá la ruta a donde tengas tu config
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, getDocs, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";

function useDelayedFlag(flag: boolean, delayMs = 220) {
  const [show, setShow] = useState(() => Boolean(flag));
  const mountedRef = useRef(false);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    let t: NodeJS.Timeout;
    if (flag) t = setTimeout(() => setShow(true), delayMs);
    else setShow(false);
    return () => clearTimeout(t);
  }, [flag, delayMs]);

  return show;
}

export default function Context({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loader, setLoader] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const showLoader = useDelayedFlag(loader || checkingAuth, 220);

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => setUser(usr));
    return () => unsub();
  }, []);

  return (
    <ContextGeneral.Provider
      value={{
        firestore,
        auth,
        user,
        cursos,
        setCursos,
        loader: showLoader,
        setLoader,
        checkingAuth,
        authReady,
      }}
    >
      {children}
    </ContextGeneral.Provider>
  );
}
