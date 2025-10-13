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
export interface BatchUser extends UserProfile {} // Mismo que UserProfile
export interface UserBatch {
  users: BatchUser[];
}