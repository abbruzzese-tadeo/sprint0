"use client";

/**
 * CrearCurso — Functional parity with EditarCurso
 * - Global tabs: general | unidades | examen | capstone | cierrecurso | cursantes
 * - Units: NO video at unit level (force urlVideo=""), optional duration
 * - Lessons: title (required), text/video/pdf optional, exercises[], finalMessage
 * - Final Exam: introTexto + ejercicios[] (no video)
 * - Capstone: videoUrl + instructions + checklist[] (validate URL)
 * - Closing: textoFinalCurso + textoFinalCursoVideoUrl (validate URL)
 * - Storage uploads: course thumbnail + lesson PDFs
 * - Pricing normalized; toasts via Sonner
 * - On create: addDoc + serverTimestamp; enroll students into alumnos/{email}.cursosAdquiridos via arrayUnion
 */

import React, { useContext, useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
  arrayUnion,
  Firestore,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";
import ContextGeneral from "@/contexts/contextGeneral"; // Assuming this path is correct
import { toast } from "sonner";
import Exercises from "../cursoItem/exercises/Exercises";
// import Exercises from "../cursoItem/exercises/Exercises"; // Assuming this path is correct
import {
  FiPlus,
  FiTrash2,
  FiVideo,
  FiClock,
  FiSave,
  FiX,
  FiChevronDown,
  FiImage,
  FiLayers,
  FiTag,
  FiUpload,
  FiFileText,
  FiLink2,
  FiClipboard,
  FiUsers,
  FiSearch,
  FiCheck,
  FiBookOpen,
  FiFlag,
  FiDollarSign,
  FiGlobe,
} from "react-icons/fi";
import { storage, db } from "@/lib/firebase";

/* ----------------- Interfaces for Data Structures ----------------- */

interface Precio {
  monto: number | string; // Can be string for input, then parsed to number
  montoDescuento: number | string; // Can be string for input, then parsed to number
  descuentoActivo: boolean;
}

interface Ejercicio {
  // Define structure of an exercise
  id: string;
  pregunta: string;
  opciones: { texto: string; correcto: boolean }[];
  tipo: "multiple_choice" | "true_false" | "text_input";
  // Add other fields as needed
}

interface Leccion {
  id: string;
  titulo: string;
  texto: string;
  urlVideo: string;
  urlImagen: string;
  pdfUrl: string;
  ejercicios: Ejercicio[];
  finalMessage: string;
}

interface Unidad {
  id: string;
  titulo: string;
  descripcion: string;
  urlVideo: string; // Forced empty on save
  duracion?: number; // Optional duration in minutes
  urlImagen: string;
  ejercicios: Ejercicio[]; // Although exercises are handled at lesson level, kept for backward compat
  textoCierre: string;
  lecciones: Leccion[];
}

interface ExamenFinal {
  introTexto: string;
  ejercicios: Ejercicio[];
}

interface Capstone {
  videoUrl: string;
  instrucciones: string;
  checklist: string[];
}

interface Curso {
  titulo: string;
  descripcion: string;
  nivel: string;
  categoria: string;
  publico: boolean;
  videoPresentacion: string;
  urlImagen: string;
  precio: Precio;
  cursantes: string[]; // array of student emails
  textoFinalCurso: string;
  textoFinalCursoVideoUrl: string;
  unidades?: Unidad[]; // Will be added on save
  examenFinal?: ExamenFinal; // Will be added on save
  capstone?: Capstone; // Will be added on save
  creadoEn?: Timestamp;
}

interface Alumno {
  email: string;
  displayName?: string;
  nombre?: string;
  // Add other student-related fields if available in your context
}

// Assuming ContextGeneral provides these types
interface ContextGeneralType {
  firestore: Firestore | null;
  storage: FirebaseStorage | null;
  setLoader: React.Dispatch<React.SetStateAction<boolean>> | null;
  setCursos: React.Dispatch<React.SetStateAction<Curso[] | null>> | null;
  alumnos?: Alumno[];
  usuarios?: Alumno[];
  users?: Alumno[];
}

/* ----------------- small helpers ----------------- */
// Unique ID for units/lessons
const makeId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Basic URL validator
const isValidUrl = (s: string): boolean => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Upload a file to Storage and return its download URL

export const uploadFile = async (path: string, file: File): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};


interface CrearCursoProps {
  onClose?: () => void;
}

function CrearCurso({ onClose }: CrearCursoProps) {
  // Context: Firestore/Storage, loaders, global courses state
  const firestore = db;

  // Full context (to read students list)
  const ctx = useContext(ContextGeneral) as ContextGeneralType;
  const { firestore: firestoreCtx, storage: storageCtx, setLoader, setCursos } = ctx || {};
  const safeSetLoader = typeof setLoader === "function" ? setLoader : () => {};
const safeSetCursos = typeof setCursos === "function" ? setCursos : () => {};



  /* =========================
     Students from Context
     ========================= */
  const alumnos: Alumno[] = useMemo(
    () => (ctx?.alumnos || ctx?.usuarios || ctx?.users || []).filter(Boolean),
    [ctx]
  );

  /* =========================
     Main Tabs (parity)
     ========================= */
  const MAIN_TABS = [
    { id: "general", label: "General", icon: <FiBookOpen /> },
    { id: "unidades", label: "Content", icon: <FiLayers /> },
    { id: "examen", label: "Exam", icon: <FiClipboard /> },
    { id: "capstone", label: "Project", icon: <FiClipboard /> },
    { id: "cierrecurso", label: "Closing", icon: <FiFlag /> },
    { id: "cursantes", label: "Students", icon: <FiUsers /> },
  ];
  const [activeMainTab, setActiveMainTab] = useState<string>("general");

  /* =========================
     Course state (level course)
     ========================= */
  const [curso, setCurso] = useState<Curso>({
    titulo: "",
    descripcion: "",
    nivel: "",
    categoria: "",
    publico: true,
    videoPresentacion: "",
    urlImagen: "",
    precio: { monto: "", montoDescuento: "", descuentoActivo: false },
    cursantes: [], // selected emails
    textoFinalCurso: "",
    textoFinalCursoVideoUrl: "", // NEW: optional closing video
  });

  /* =========================
     Units / Lessons
     ========================= */
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [activeUnidad, setActiveUnidad] = useState<number>(0);
  const [activeUnitTab, setActiveUnitTab] = useState<"datos" | "lecciones" | "cierre">("datos"); // 'datos' | 'lecciones' | 'cierre'
  const [activeLeccion, setActiveLeccion] = useState<number>(0);

  /* =========================
     Exam & Capstone (parity)
     ========================= */
  const [examenFinal, setExamenFinal] = useState<ExamenFinal>({
    introTexto: "",
    ejercicios: [], // parity: Exercises at course level
  });

  const [capstone, setCapstone] = useState<Capstone>({
    videoUrl: "", // NEW: own video for project
    instrucciones: "",
    checklist: [],
  });

  const [uploading, setUploading] = useState<boolean>(false);

  /* =========================
     Students (UI)
     ========================= */
  const [searchAlumno, setSearchAlumno] = useState<string>("");

  /* =========================
     Handlers - Course
     ========================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setCurso((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePrecioChange = (field: keyof Precio, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setCurso((p) => ({ ...p, precio: { ...p.precio, [field]: v } }));
  };

  /* =========================
     Units
     ========================= */
  const agregarUnidad = () => {
    // NOTE: urlVideo kept for backward-compat but WILL be forced "" on save
    const nueva: Unidad = {
      id: makeId(),
      titulo: "",
      descripcion: "",
      urlVideo: "", // 🧹 removed from UI usage
      duracion: undefined, // optional
      urlImagen: "",
      ejercicios: [],
      textoCierre: "",
      lecciones: [],
    };
    setUnidades((p) => [...p, nueva]);
    setTimeout(() => {
      setActiveMainTab("unidades");
      setActiveUnidad(unidades.length);
      setActiveUnitTab("datos");
      setActiveLeccion(0);
    }, 0);
  };

  const borrarUnidad = (idx: number) => {
    setUnidades((p) => p.filter((_, i) => i !== idx));
    setActiveUnidad((i) => (i > 0 ? i - 1 : 0));
    setActiveUnitTab("datos");
    setActiveLeccion(0);
  };

  const updateUnidad = (idx: number, patch: Partial<Unidad>) => {
    setUnidades((p) => p.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };

  /* =========================
     Lessons
     ========================= */
  const agregarLeccion = (unidadIdx: number) => {
    const nueva: Leccion = {
      id: makeId(),
      titulo: "",
      texto: "",
      urlVideo: "",
      urlImagen: "",
      pdfUrl: "",
      ejercicios: [],
      finalMessage: "", // NEW: message after finishing exercises
    };
    setUnidades((p) =>
      p.map((u, i) =>
        i === unidadIdx ? { ...u, lecciones: [...u.lecciones, nueva] } : u
      )
    );
    setTimeout(
      () => setActiveLeccion(unidades[unidadIdx]?.lecciones?.length || 0),
      0
    );
  };

  const borrarLeccion = (unidadIdx: number, leccionIdx: number) => {
    setUnidades((p) =>
      p.map((u, i) =>
        i === unidadIdx
          ? { ...u, lecciones: u.lecciones.filter((_, j) => j !== leccionIdx) }
          : u
      )
    );
    setActiveLeccion((i) => (i > 0 ? i - 1 : 0));
  };

  const updateLeccion = (unidadIdx: number, leccionIdx: number, patch: Partial<Leccion>) => {
    setUnidades((p) =>
      p.map((u, i) =>
        i === unidadIdx
          ? {
              ...u,
              lecciones: u.lecciones.map((l, j) =>
                j === leccionIdx ? { ...l, ...patch } : l
              ),
            }
          : u
      )
    );
  };


  // === Subida a Imgur ===
async function uploadToImgur(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: "Client-ID TU_CLIENT_ID_AQUI", // 👈 reemplazá por tu Client ID
      },
      body: formData,
    });

    const data = await res.json();
    if (data.success) return data.data.link;
    console.error("Imgur upload failed:", data);
    toast.error("Upload failed");
    return null;
  } catch (err) {
    console.error("Error uploading to Imgur:", err);
    toast.error("Error uploading image");
    return null;
  }
}

  /* =========================
     Uploads
     ========================= */
  const onUploadMiniaturaCurso = async (file: File | undefined) => {
  if (!file) return;
  if (!file.type.startsWith("image/"))
    return toast.error("Upload a valid image");
  try {
    setUploading(true);
    // 🔹 Subir a Imgur en lugar de Firebase Storage
    const url = await uploadToImgur(file);
    if (!url) return toast.error("Could not upload image");
    setCurso((p) => ({ ...p, urlImagen: url }));
    toast.success("Thumbnail uploaded successfully");
  } catch (e: any) {
    console.error(e);
    toast.error("Couldn't upload thumbnail");
  } finally {
    setUploading(false);
  }
};


  const onUploadPdfLeccion = async (unidadIdx: number, leccionIdx: number, file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf")
      return toast.error("The file must be a PDF");
    try {
      setUploading(true);
      const url = await uploadFile(
        `cursos/lecciones/pdf/${Date.now()}_${file.name}`,
        file
      );
      updateLeccion(unidadIdx, leccionIdx, { pdfUrl: url });
      toast.success("PDF uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error("Couldn't upload the PDF");
    } finally {
      setUploading(false);
    }
  };

  /* =========================
     Students helpers
     ========================= */
  const toggleCursante = (email: string) => {
    setCurso((p) => {
      const set = new Set(p.cursantes || []);
      if (set.has(email)) set.delete(email);
      else set.add(email);
      return { ...p, cursantes: Array.from(set) };
    });
  };

  const addAllFiltered = (emails: string[]) => {
    setCurso((p) => {
      const set = new Set(p.cursantes || []);
      emails.forEach((e) => set.add(e));
      return { ...p, cursantes: Array.from(set) };
    });
  };

  const removeAllSelected = () => {
    setCurso((p) => ({ ...p, cursantes: [] }));
  };

  const filteredAlumnos: Alumno[] = useMemo(() => {
    const q = (searchAlumno || "").toLowerCase().trim();
    const list = Array.isArray(alumnos) ? alumnos : [];
    if (!q) return list;
    return list.filter((a) => {
      const name = (a?.displayName || a?.nombre || "").toLowerCase();
      const mail = (a?.email || "").toLowerCase();
      return name.includes(q) || mail.includes(q);
    });
  }, [alumnos, searchAlumno]);

  /* =========================
     Save
     ========================= */
    //  const safeSetLoader = setLoader || (() => {});
    console.log("🧩 ContextGeneral desde CrearCurso:", { firestore, storage, setLoader, setCursos });


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  console.log("🔹 [DEBUG] Iniciando handleSubmit...");

  // Verificamos Firestore
  console.log("🔹 [DEBUG] firestore:", firestore);
  console.log("🔹 [DEBUG] db:", db);

  if (!firestore && !db) {
    toast.error("Firestore no inicializado");
    console.error("❌ [ERROR] Ninguna instancia de Firestore disponible.");
    return;
  }

  const dbToUse = firestore || db; // usa lo que esté disponible

  // Validaciones básicas
  if (!curso.titulo?.trim()) {
    console.warn("⚠️ Falta título de curso");
    return toast.error("The course needs a title");
  }
  if (!Array.isArray(unidades) || unidades.length === 0) {
    console.warn("⚠️ Falta unidad");
    return toast.error("Add at least one unit");
  }

  console.log("🔹 [DEBUG] Pasó validaciones iniciales");

  // Normalizamos datos
  const unidadesToSave: Unidad[] = unidades.map((u) => ({
    id: u.id || makeId(),
    titulo: u.titulo || "",
    descripcion: u.descripcion || "",
    urlVideo: "",
    urlImagen: u.urlImagen || "",
    duracion: u.duracion ? Number(u.duracion) : undefined,
    ejercicios: [],
    textoCierre: u.textoCierre || "",
    lecciones: (u.lecciones || []).map((l) => ({
      id: l.id || makeId(),
      titulo: l.titulo || "",
      texto: l.texto || "",
      urlVideo: l.urlVideo || "",
      urlImagen: l.urlImagen || "",
      pdfUrl: l.pdfUrl || "",
      ejercicios: Array.isArray(l.ejercicios) ? l.ejercicios : [],
      finalMessage: l.finalMessage || "",
    })),
  }));

  const payload = {
    ...curso,
    unidades: unidadesToSave,
    examenFinal,
    capstone,
    creadoEn: serverTimestamp(),
  };

  console.log("📦 [DEBUG] Payload final a guardar:", payload);

 safeSetLoader(true);
  try {
    // 🔥 Paso 1: Guardar curso
    console.log("🚀 [DEBUG] Intentando guardar curso...");
    const refCurso = await addDoc(collection(dbToUse, "cursos"), payload);
    console.log("✅ [DEBUG] Curso creado con ID:", refCurso.id);

    // 🔥 Paso 2: Enrolar estudiantes
    const emailsSel = Array.isArray(payload.cursantes)
      ? payload.cursantes
      : [];

    console.log("📧 [DEBUG] Estudiantes a enrolar:", emailsSel);

    if (emailsSel.length > 0) {
      const batch = writeBatch(dbToUse);
      emailsSel
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e && e.includes("@"))
        .forEach((emailLc) => {
          const alumnoRef = doc(dbToUse, "alumnos", emailLc);
          batch.set(
            alumnoRef,
            { cursosAdquiridos: arrayUnion(refCurso.id) },
            { merge: true }
          );
        });
      await batch.commit();
      console.log("✅ [DEBUG] Batch de alumnos actualizado");
    }

    // 🔥 Paso 3: Actualizar estado local
    const newCursoForState: Curso & { id: string } = {
      id: refCurso.id,
      ...payload,
      creadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    };
    console.log("🔹 [DEBUG] Actualizando estado local...", newCursoForState);
   safeSetCursos((prev) => {

      if (!Array.isArray(prev)) return [newCursoForState];
      if (prev.some((c) => (c as any).id === newCursoForState.id)) return prev;
      return [newCursoForState, ...prev];
    });

    toast.success("✅ Course created successfully");
    onClose?.();
  } catch (err: any) {
    console.error("❌ [ERROR] Error creando curso:", err);
    toast.error("Error creating the course");
  } finally {
    console.log("🔹 [DEBUG] handleSubmit finalizado");
    safeSetLoader(false);
  }
};


  /* =========================
     UX: ESC to close + body scroll lock
     ========================= */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev || "auto";
    };
  }, [onClose]);

  const niveles = [
    { value: "principiante", label: "Beginner" },
    { value: "intermedio", label: "Intermediate" },
    { value: "avanzado", label: "Advanced" },
  ];

  /* =========================
     RENDER
     ========================= */
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Shell */}
      <div className="bg-white text-black max-w-7xl w-full mx-auto rounded-2xl shadow-2xl relative max-h-[95vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 hover:scale-105 rounded-full p-2 transition-all duration-200 z-50"
            aria-label="Close"
            type="button"
          >
            <FiX size={18} />
          </button>

          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-1">Create Course</h2>
            <p className="text-blue-100 text-sm mb-4">
              Define your course structure, content, and settings
            </p>

            {/* NAV */}
            <div className="flex flex-wrap gap-2">
              {MAIN_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveMainTab(t.id)}
                  className={`group px-3 py-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${
                    activeMainTab === t.id
                      ? "bg-white text-blue-600 border-white shadow-lg"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {t.icon}
                    <span className="font-medium text-xs">{t.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BODY (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* TAB: General */}
            {activeMainTab === "general" && (
              <div className="space-y-8">
                {/* Course info */}
                <section className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiBookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Course Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basics */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Course title
                        </label>
                        <input
                          type="text"
                          name="titulo"
                          placeholder="e.g., Introduction to Modern Web Development"
                          value={curso.titulo}
                          onChange={handleChange}
                          className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Description
                        </label>
                        <textarea
                          name="descripcion"
                          placeholder="Describe what students will learn in this course..."
                          value={curso.descripcion}
                          onChange={handleChange}
                          className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          rows={4}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Level
                          </label>
                          <div className="relative">
                            <select
                              name="nivel"
                              value={curso.nivel}
                              onChange={handleChange}
                              required
                              className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="" disabled>
                                Select level
                              </option>
                              {niveles.map((n) => (
                                <option key={n.value} value={n.value}>
                                  {n.label}
                                </option>
                              ))}
                            </select>
                            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Category
                          </label>
                          <div className="relative">
                            <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              name="categoria"
                              placeholder="e.g., Programming, Design..."
                              value={curso.categoria}
                              onChange={handleChange}
                              className="w-full p-4 pl-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          name="publico"
                          checked={!!curso.publico}
                          onChange={handleChange}
                          className="h-5 w-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <FiGlobe className="w-4 h-4 text-slate-600" />
                          <label className="text-sm font-medium text-slate-700">
                            Public course
                          </label>
                        </div>
                        <span className="text-xs text-slate-500">
                          Users will be able to see and access the course
                        </span>
                      </div>
                    </div>

                    {/* Media */}
                    <div className="space-y-6">
                      {/* Intro video (optional) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <FiVideo className="w-4 h-4" /> Intro video (optional)
                        </label>
                        <div className="relative">
                          <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            name="videoPresentacion"
                            placeholder="https://youtube.com/watch?v=..."
                            value={curso.videoPresentacion}
                            onChange={handleChange}
                            className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {curso.videoPresentacion &&
                          isValidUrl(curso.videoPresentacion) && (
                            <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
                              <iframe
                                src={curso.videoPresentacion}
                                title="Intro video"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                      </div>

                      {/* Thumbnail */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <FiImage className="w-4 h-4" /> Course thumbnail
                        </label>

                        <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all">
  <FiUpload className="w-4 h-4 text-slate-500" />
  <span className="text-sm text-slate-600">
    {uploading ? "Uploading..." : "Upload image"}
  </span>
  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => onUploadMiniaturaCurso(e.target.files?.[0])}
    disabled={uploading}
  />
</label>

                        <div className="relative">
                          <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            placeholder="or paste an image URL https://"
                            value={curso.urlImagen}
                            onChange={(e) =>
                              setCurso((p) => ({
                                ...p,
                                urlImagen: e.target.value,
                              }))
                            }
                            className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {curso.urlImagen && isValidUrl(curso.urlImagen) && (
                          <img
                            src={curso.urlImagen}
                            alt="Course thumbnail"
                            className="w-full rounded-xl border object-cover max-h-48"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Pricing */}
                <section className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <FiDollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Pricing Settings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Regular price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="49.99"
                        value={curso.precio.monto}
                        onChange={(e) => handlePrecioChange("monto", e)}
                        className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Discounted price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="29.99"
                        value={curso.precio.montoDescuento}
                        onChange={(e) =>
                          handlePrecioChange("montoDescuento", e)
                        }
                        className="w-full p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-emerald-200 cursor-pointer hover:bg-emerald-50 transition-all">
                      <input
                        type="checkbox"
                        checked={!!curso.precio.descuentoActivo}
                        onChange={(e) =>
                          handlePrecioChange("descuentoActivo", e)
                        }
                        className="h-5 w-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <div className="text-sm">
                        <div className="font-medium text-slate-700">
                          Discount active
                        </div>
                        <div className="text-xs text-slate-500">
                          Apply a reduced price
                        </div>
                      </div>
                    </label>
                  </div>
                </section>
              </div>
            )}

            {/* TAB: Unidades */}
            {activeMainTab === "unidades" && (
              <div className="space-y-8">
                <section className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-6 border border-indigo-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FiLayers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Course Content: Units & Lessons
                    </h3>
                  </div>

                  {unidades.length === 0 ? (
                    <div className="p-8 text-center bg-indigo-50 rounded-xl border border-dashed border-indigo-200 text-indigo-600">
                      <p className="mb-4 text-lg font-medium">No units added yet</p>
                      <button
                        type="button"
                        onClick={agregarUnidad}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors gap-2"
                      >
                        <FiPlus size={18} /> Add First Unit
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Unit List */}
                      <div className="md:col-span-1 space-y-3">
                        {unidades.map((u, idx) => (
                          <div
                            key={u.id}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                              activeUnidad === idx
                                ? "bg-indigo-100 border-indigo-400 border text-indigo-800 shadow-md"
                                : "bg-white border border-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => setActiveUnidad(idx)}
                          >
                            <span className="font-medium text-sm">
                              Unit {idx + 1}: {u.titulo || "Untitled Unit"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                borrarUnidad(idx);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                              aria-label="Delete unit"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={agregarUnidad}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-dashed border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          <FiPlus size={16} /> Add New Unit
                        </button>
                      </div>

                      {/* Unit Details */}
                      <div className="md:col-span-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                        {unidades[activeUnidad] && (
                          <>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                              <h4 className="text-lg font-semibold text-slate-800">
                                Editing Unit {activeUnidad + 1}
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveUnitTab("datos")}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeUnitTab === "datos"
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveUnitTab("lecciones")}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeUnitTab === "lecciones"
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Lessons ({unidades[activeUnidad]?.lecciones?.length || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveUnitTab("cierre")}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeUnitTab === "cierre"
                                      ? "bg-indigo-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Closing
                                </button>
                              </div>
                            </div>

                            {/* Unit Data Tab */}
                            {activeUnitTab === "datos" && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700">
                                    Unit title
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Introduction to JavaScript Basics"
                                    value={unidades[activeUnidad]?.titulo || ""}
                                    onChange={(e) =>
                                      updateUnidad(activeUnidad, {
                                        titulo: e.target.value,
                                      })
                                    }
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700">
                                    Description (optional)
                                  </label>
                                  <textarea
                                    placeholder="Brief description of this unit"
                                    value={unidades[activeUnidad]?.descripcion || ""}
                                    onChange={(e) =>
                                      updateUnidad(activeUnidad, {
                                        descripcion: e.target.value,
                                      })
                                    }
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    rows={3}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <FiClock className="w-4 h-4" /> Estimated duration (minutes, optional)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g., 60"
                                    value={unidades[activeUnidad]?.duracion || ""}
                                    onChange={(e) =>
                                      updateUnidad(activeUnidad, {
                                        duracion: parseInt(e.target.value, 10) || undefined,
                                      })
                                    }
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <FiImage className="w-4 h-4" /> Unit thumbnail (optional URL)
                                  </label>
                                  <div className="relative">
                                    <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="url"
                                      placeholder="https://example.com/unit-image.jpg"
                                      value={unidades[activeUnidad]?.urlImagen || ""}
                                      onChange={(e) =>
                                        updateUnidad(activeUnidad, {
                                          urlImagen: e.target.value,
                                        })
                                      }
                                      className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                  </div>
                                  {unidades[activeUnidad]?.urlImagen &&
                                    isValidUrl(unidades[activeUnidad]?.urlImagen || "") && (
                                      <img
                                        src={unidades[activeUnidad]?.urlImagen}
                                        alt="Unit thumbnail"
                                        className="w-full rounded-xl border object-cover max-h-36"
                                      />
                                    )}
                                </div>
                              </div>
                            )}

                            {/* Unit Lessons Tab */}
                            {activeUnitTab === "lecciones" && (
                              <div className="space-y-4">
                                {(unidades[activeUnidad]?.lecciones?.length || 0) === 0 ? (
                                  <div className="p-6 text-center bg-indigo-50 rounded-xl border border-dashed border-indigo-200 text-indigo-600">
                                    <p className="mb-3 text-base font-medium">No lessons added yet for this unit</p>
                                    <button
                                      type="button"
                                      onClick={() => agregarLeccion(activeUnidad)}
                                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors gap-2"
                                    >
                                      <FiPlus size={16} /> Add First Lesson
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {unidades[activeUnidad].lecciones.map((l, lIdx) => (
                                      <div
                                        key={l.id}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                          activeLeccion === lIdx
                                            ? "bg-blue-50 border-blue-400 shadow-md"
                                            : "bg-white border-slate-200 hover:bg-slate-50"
                                        }`}
                                        onClick={() => setActiveLeccion(lIdx)}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-slate-800">
                                            Lesson {lIdx + 1}: {l.titulo || "Untitled Lesson"}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              borrarLeccion(activeUnidad, lIdx);
                                            }}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                            aria-label="Delete lesson"
                                          >
                                            <FiTrash2 size={16} />
                                          </button>
                                        </div>
                                        {activeLeccion === lIdx && (
                                          <div className="space-y-3 pt-3 border-t border-slate-100 mt-3">
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700">
                                                Lesson title
                                              </label>
                                              <input
                                                type="text"
                                                placeholder="e.g., Variables and Data Types"
                                                value={l.titulo}
                                                onChange={(e) =>
                                                  updateLeccion(activeUnidad, lIdx, {
                                                    titulo: e.target.value,
                                                  })
                                                }
                                                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700">
                                                Text Content (optional)
                                              </label>
                                              <textarea
                                                placeholder="Detailed text for the lesson"
                                                value={l.texto}
                                                onChange={(e) =>
                                                  updateLeccion(activeUnidad, lIdx, {
                                                    texto: e.target.value,
                                                  })
                                                }
                                                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows={4}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <FiVideo className="w-4 h-4" /> Video URL (optional)
                                              </label>
                                              <div className="relative">
                                                <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                  type="url"
                                                  placeholder="https://youtube.com/watch?v=..."
                                                  value={l.urlVideo}
                                                  onChange={(e) =>
                                                    updateLeccion(activeUnidad, lIdx, {
                                                      urlVideo: e.target.value,
                                                    })
                                                  }
                                                  className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                              </div>
                                              {l.urlVideo && isValidUrl(l.urlVideo) && (
                                                <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
                                                  <iframe
                                                    src={l.urlVideo}
                                                    title="Lesson video"
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <FiFileText className="w-4 h-4" /> PDF Attachment (optional)
                                              </label>
                                              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all">
                                                <FiUpload className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm text-slate-600">
                                                  {uploading ? "Uploading PDF..." : "Upload PDF"}
                                                </span>
                                                <input
                                                  type="file"
                                                  accept="application/pdf"
                                                  className="hidden"
                                                  onChange={(e) =>
                                                    onUploadPdfLeccion(
                                                      activeUnidad,
                                                      lIdx,
                                                      e.target.files?.[0]
                                                    )
                                                  }
                                                  disabled={uploading}
                                                />
                                              </label>
                                              {l.pdfUrl && (
                                                <a
                                                  href={l.pdfUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                                >
                                                  <FiLink2 size={16} /> View PDF
                                                </a>
                                              )}
                                            </div>

                                            {/* Lesson Exercises (using Exercises component) */}
                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700">
                                                Exercises (optional)
                                              </label>
                                              <Exercises
                                                exercises={l.ejercicios}
                                                setExercises={(newExercises: Ejercicio[]) =>
                                                  updateLeccion(activeUnidad, lIdx, {
                                                    ejercicios: newExercises,
                                                  })
                                                }
                                              />
                                            </div>

                                            <div className="space-y-2">
                                              <label className="text-sm font-medium text-slate-700">
                                                Final Message (optional, after exercises)
                                              </label>
                                              <textarea
                                                placeholder="Message to show after completing exercises"
                                                value={l.finalMessage}
                                                onChange={(e) =>
                                                  updateLeccion(activeUnidad, lIdx, {
                                                    finalMessage: e.target.value,
                                                  })
                                                }
                                                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows={2}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => agregarLeccion(activeUnidad)}
                                      className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl border border-dashed border-blue-200 hover:bg-blue-100 transition-colors mt-4"
                                    >
                                      <FiPlus size={16} /> Add New Lesson
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Unit Closing Tab */}
{activeUnitTab === "cierre" && (
  <div className="space-y-6">
    {/* 🧩 Examen final */}
    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">
        End Of Unit Summary Quiz
      </h3>

      {/* Introducción del examen */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-slate-700">
          Introductory Text for Exam (optional)
        </label>
        <textarea
          placeholder="Instructions or introduction for the final exam"
          value={unidades[activeUnidad]?.closing?.examIntro || ""}
          onChange={(e) =>
            updateUnidad(activeUnidad, {
              closing: {
                ...unidades[activeUnidad]?.closing,
                examIntro: e.target.value,
              },
            })
          }
          className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* Ejercicios del examen */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Exam Exercises
        </label>
        <Exercises
          initial={unidades[activeUnidad]?.closing?.examExercises || []}
          onChange={(updatedExercises) =>
            updateUnidad(activeUnidad, {
              closing: {
                ...unidades[activeUnidad]?.closing,
                examExercises: updatedExercises,
              },
            })
          }
        />
      </div>
    </div>

    {/* 🟣 Texto de cierre */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        Closing Text for Unit (optional)
      </label>
      <textarea
        placeholder="Text displayed after all lessons and exams in this unit are completed"
        value={unidades[activeUnidad]?.closing?.closingText || ""}
        onChange={(e) =>
          updateUnidad(activeUnidad, {
            closing: {
              ...unidades[activeUnidad]?.closing,
              closingText: e.target.value,
            },
          })
        }
        className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        rows={4}
      />
    </div>
  </div>
)}

                          </>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB: Examen */}
            {activeMainTab === "examen" && (
              <section className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FiClipboard className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Final Exam
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Introductory Text for Exam
                    </label>
                    <textarea
                      placeholder="Instructions or introduction for the final exam"
                      value={examenFinal.introTexto}
                      onChange={(e) =>
                        setExamenFinal((p) => ({ ...p, introTexto: e.target.value }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Exam Exercises
                    </label>
                    <Exercises
                      exercises={examenFinal.ejercicios}
                      setExercises={(newExercises: Ejercicio[]) =>
                        setExamenFinal((p) => ({ ...p, ejercicios: newExercises }))
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {/* TAB: Capstone */}
            {activeMainTab === "capstone" && (
              <section className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl p-6 border border-pink-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <FiLayers className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Capstone Project
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <FiVideo className="w-4 h-4" /> Project Video URL (optional)
                    </label>
                    <div className="relative">
                      <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={capstone.videoUrl}
                        onChange={(e) =>
                          setCapstone((p) => ({ ...p, videoUrl: e.target.value }))
                        }
                        className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    </div>
                    {capstone.videoUrl && isValidUrl(capstone.videoUrl) && (
                      <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
                        <iframe
                          src={capstone.videoUrl}
                          title="Capstone video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Project Instructions
                    </label>
                    <textarea
                      placeholder="Detailed instructions for the capstone project"
                      value={capstone.instrucciones}
                      onChange={(e) =>
                        setCapstone((p) => ({ ...p, instrucciones: e.target.value }))
                      }
                      className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Project Checklist Items
                    </label>
                    {capstone.checklist.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) =>
                            setCapstone((p) => {
                              const newList = [...p.checklist];
                              newList[idx] = e.target.value;
                              return { ...p, checklist: newList };
                            })
                          }
                          className="flex-1 p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder={`Checklist item ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCapstone((p) => ({
                              ...p,
                              checklist: p.checklist.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                          aria-label="Remove checklist item"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCapstone((p) => ({ ...p, checklist: [...p.checklist, ""] }))
                      }
                      className="flex items-center gap-2 p-3 bg-pink-50 text-pink-600 rounded-xl border border-dashed border-pink-200 hover:bg-pink-100 transition-colors w-full justify-center mt-2"
                    >
                      <FiPlus size={16} /> Add Checklist Item
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: Cierre Curso */}
            {activeMainTab === "cierrecurso" && (
              <section className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FiFlag className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Course Closing
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Final Course Message
                    </label>
                    <textarea
                      placeholder="A message shown to students upon completing the entire course."
                      value={curso.textoFinalCurso}
                      onChange={handleChange}
                      name="textoFinalCurso"
                      className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <FiVideo className="w-4 h-4" /> Final Course Video URL (optional)
                    </label>
                    <div className="relative">
                      <FiLink2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={curso.textoFinalCursoVideoUrl}
                        onChange={handleChange}
                        name="textoFinalCursoVideoUrl"
                        className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    {curso.textoFinalCursoVideoUrl && isValidUrl(curso.textoFinalCursoVideoUrl) && (
                      <div className="aspect-video bg-black/5 rounded-xl overflow-hidden">
                        <iframe
                          src={curso.textoFinalCursoVideoUrl}
                          title="Final course video"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* TAB: Cursantes */}
            {activeMainTab === "cursantes" && (
              <section className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Manage Course Students
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Available Students */}
                  <div className="space-y-4">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student by name or email"
                        value={searchAlumno}
                        onChange={(e) => setSearchAlumno(e.target.value)}
                        className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white">
                      {filteredAlumnos.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No students found or available.</p>
                      ) : (
                        filteredAlumnos.map((a) => (
                          <div
                            key={a.email}
                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                            onClick={() => toggleCursante(a.email)}
                          >
                            <span className="text-sm font-medium text-slate-800">
                              {a.displayName || a.nombre || a.email}
                            </span>
                            <input
                              type="checkbox"
                              checked={curso.cursantes.includes(a.email)}
                              readOnly
                              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addAllFiltered(filteredAlumnos.map(a => a.email))}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl border border-dashed border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <FiPlus size={16} /> Add All Filtered Students
                    </button>
                  </div>

                  {/* Selected Students */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <FiCheck size={20} className="text-blue-600" /> Selected Students ({curso.cursantes.length})
                    </h4>
                    <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-white">
                      {curso.cursantes.length === 0 ? (
                        <p className="text-center text-slate-500 py-4">No students selected.</p>
                      ) : (
                        curso.cursantes.map((email) => (
                          <div
                            key={email}
                            className="flex items-center justify-between p-2 hover:bg-red-50 rounded-lg cursor-pointer"
                            onClick={() => toggleCursante(email)}
                          >
                            <span className="text-sm text-slate-800">{email}</span>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                              aria-label="Remove student"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={removeAllSelected}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-dashed border-red-200 hover:bg-red-100 transition-colors"
                    >
                      <FiTrash2 size={16} /> Remove All Selected
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* SAVE BUTTON */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                disabled={uploading}
              >
                <FiSave size={18} />
                {uploading ? "Saving..." : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CrearCurso;