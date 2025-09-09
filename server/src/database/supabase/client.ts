import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export class SupabaseClient {
  private readonly supabaseUrl: string;
  private readonly supabaseRoleKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseRoleKey = process.env.SUPABASE_ROLE_KEY || '';
  }

  public checkClient() {
    if (!this.supabaseUrl || !this.supabaseRoleKey) {
      throw new Error('Missing Supabase URL or role key');
    }

    const supabase = createClient(this.supabaseUrl, this.supabaseRoleKey);
    return supabase;
  }
}
