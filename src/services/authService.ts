import { supabase } from '../lib/supabaseClient';
import { User, UserRole } from '../types';
import { STORAGE_KEYS } from '../utils/storageKeys';

interface LoginParams {
  identifier: string;
  password: string;
  role: UserRole;
}

interface SupabaseUserRow {
  user_id: number;
  auth_user_id: string;
  username: string;
  email: string;
  role: UserRole;
}

export function getCurrentUser(): User | null {
  const userData = localStorage.getItem(STORAGE_KEYS.currentUser);
  return userData ? JSON.parse(userData) : null;
}

export function saveCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

export async function loginWithCredentials({ identifier, password, role }: LoginParams): Promise<User> {
  const loginIdentifier = identifier.trim();
  const loginPassword = password.trim();

  if (!loginIdentifier || !loginPassword) {
    throw new Error('Please enter both your email/username and password.');
  }

  const loginEmail = loginIdentifier.includes('@')
    ? loginIdentifier
    : await getEmailForUsername(loginIdentifier);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: loginPassword,
  });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('User not found.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('user_id, auth_user_id, username, email, role')
    .eq('auth_user_id', authData.user.id)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error('Login succeeded, but no matching user profile was found. Link this Auth user to public.users.auth_user_id.');
  }

  const user = profile as SupabaseUserRow;

  if (user.role !== role) {
    throw new Error('Invalid role selection for this user.');
  }

  const sessionUser: User = {
    id: user.user_id.toString(),
    name: user.username || user.email,
    email: user.email,
    role: user.role,
  };

  saveCurrentUser(sessionUser);
  return sessionUser;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const resetEmail = email.trim();

  if (!resetEmail || !resetEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
    redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}#/reset-password`,
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const password = newPassword.trim();

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

async function getEmailForUsername(username: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .ilike('username', username)
    .limit(1)
    .maybeSingle();

  if (error || !data?.email) {
    throw new Error('User not found.');
  }

  return data.email;
}
