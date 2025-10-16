"use client";
import React, { useState } from "react";
import ContextGeneral from "./contextGeneral";
import { db, storage } from "@/lib/firebase";

export default function ContextGeneralProvider({ children }: { children: React.ReactNode }) {
  const [loader, setLoader] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]); // 👈 ESTE es el estado que faltaba

  const value = {
    firestore: db,
    storage,
    setLoader,
    setCursos, // 👈 Y lo exportás acá
    loader,
    cursos,
  };

  return (
    <ContextGeneral.Provider value={value}>
      {children}
    </ContextGeneral.Provider>
  );
}
