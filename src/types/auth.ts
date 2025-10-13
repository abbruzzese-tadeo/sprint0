import { User } from 'firebase/auth';

export type Role = 'alumno' | 'profesor' | 'admin';

export interface AuthUser extends User {
  role?: Role;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
}

// Nuevo: Para batches
export interface BatchUser {
  uid: string;
  email: string;
  role: Role;
  batchId: string; 
}
export interface UserBatch {
  users: BatchUser[];
}

export interface StudentData {
    student: string;
    email: string;
    level: string;
    language: string;
    teacher: string;
    format: string;
    delivery: string;
    schedule: string;
}
