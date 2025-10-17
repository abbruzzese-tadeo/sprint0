"use client";
import { create } from "zustand";

type Section = "home" | "miscursos" | "cursos" | "usuarios" | "perfil";

type State = {
  section: Section;
  setSection: (s: Section) => void;
};

export const useDashboardUI = create<State>((set) => ({
  section: "home",
  setSection: (section) => set({ section }),
}));
