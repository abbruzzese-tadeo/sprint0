"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Entrega {
  id: string;
  alumno: string;
  cursoId: string;
  archivoUrl?: string;
  respuestaTexto?: string;
  fechaEntrega?: { seconds: number };
  estado: "pendiente" | "calificado";
  calificacion?: string;
  feedback?: string;
}

export default function CorreccionesDashboard() {
  const { role } = useAuth();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selected, setSelected] = useState<Entrega | null>(null);
  const [nota, setNota] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (role !== "profesor") return;
    const unsub = onSnapshot(collection(db, "entregas"), (snap) => {
      const list: Entrega[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Entrega));
      setEntregas(list);
    });
    return () => unsub();
  }, [role]);

  const handleCalificar = async () => {
    if (!selected) return;
    try {
      await updateDoc(doc(db, "entregas", selected.id), {
        calificacion: nota,
        feedback,
        estado: "calificado",
      });
      toast.success("✅ Entrega calificada");
      setSelected(null);
      setNota("");
      setFeedback("");
    } catch (err) {
      console.error(err);
      toast.error("❌ Error al calificar");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        📚 Bandeja de corrección
      </h1>

      {selected ? (
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Calificar entrega de {selected.alumno}
          </h2>

          {selected.archivoUrl && (
            <a
              href={selected.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              📎 Ver archivo adjunto
            </a>
          )}

          {selected.respuestaTexto && (
            <p className="mt-4 text-gray-700 border p-3 rounded-lg bg-gray-50">
              {selected.respuestaTexto}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <input
              type="text"
              placeholder="Nota (ej: 9/10)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            <textarea
              placeholder="Feedback para el alumno"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full p-3 border rounded-lg resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCalificar}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {entregas.length === 0 ? (
            <p className="text-gray-500 text-center">No hay entregas pendientes.</p>
          ) : (
            entregas.map((e) => (
              <div
                key={e.id}
                className="bg-white border rounded-lg p-4 flex justify-between items-center hover:shadow transition"
              >
                <div>
                  <p className="font-medium text-gray-800">{e.alumno}</p>
                  <p className="text-sm text-gray-500">
                    {e.cursoId} · {e.estado}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(e)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Revisar
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
