// src/types/course.ts
export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  type: string;
  students: number;
  units: number;
  lessons: number;
  exercises: number;
  pdfs: number;
  duration: string;
  created: string;
  price: number;
  oldPrice: number;
  image: string;
  visible: boolean;
  featured: boolean;
}
