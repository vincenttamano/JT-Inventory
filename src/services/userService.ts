import { supabase } from '../lib/supabaseClient';
import { User, UserRole } from '../types';

export interface LocalUser extends User {
  password: string;
}

interface UserRow {
  user_id: number;
  email: string;
  username: string | null;
  role: UserRole;
  password: string | null;
}

function mapUserRow(row: UserRow): LocalUser {
  return {
    id: row.user_id.toString(),
    name: row.username || '',
    email: row.email,
    role: row.role,
    password: row.password || '',
  };
}

export async function getUsers(): Promise<LocalUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('user_id', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as UserRow[]).map(mapUserRow);
}

export async function createUser(formData: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<LocalUser> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapUserRow(data as UserRow);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('user_id', Number(id));

  if (error) {
    throw error;
  }
}
