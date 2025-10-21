"use client";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

interface EntregaFormProps {
  courseId: string;
}

export default function EntregaForm({ courseId }: EntregaFormProps) {
  const { user } = useAuth();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return toast.error("Debes iniciar sesión.");

    try {
      setLoading(true);
      let archivoUrl = "";

      // 🔹 Subir archivo si hay
      if (archivo) {
        const fileRef = ref(
          storage,
          `entregas/${courseId}/${user.email}/${Date.now()}_${archivo.name}`
        );
        await uploadBytes(fileRef, archivo);
        archivoUrl = await getDownloadURL(fileRef);
      }

      // 🔹 Guardar en Firestore
      await addDoc(collection(db, "entregas"), {
        cursoId: courseId,
        alumno: user.email,
        archivoUrl,
        respuestaTexto: texto.trim(),
        estado: "pendiente",
        fechaEntrega: serverTimestamp(),
      });

      toast.success("✅ Entrega enviada correctamente");
      setArchivo(null);
      setTexto("");
    } catch (err) {
      console.error(err);
      toast.error("❌ Error al enviar la entrega");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-6 space-y-6 shadow-lg"
    >
      <h3 className="text-xl font-semibold text-gray-800">
        📘 Entregar ejercicio
      </h3>

      <textarea
        placeholder="Escribe tus respuestas aquí..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
        rows={4}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Adjuntar archivo (opcional)
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.png"
          onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-xl font-semibold text-white transition ${
          loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "Enviando..." : "Enviar entrega"}
      </button>
    </form>
  );
}
