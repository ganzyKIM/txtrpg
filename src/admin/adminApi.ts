import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  credits: number;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface LedgerEntry {
  id: number;
  delta: number;
  balance_after: number;
  type: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface ConfigRow {
  key: string;
  value: unknown;
}

async function readError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return body.error as string;
    } catch {
      /* ignore */
    }
  }
  return (error as Error)?.message ?? '알 수 없는 오류가 발생했습니다.';
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin', {
    body: { action, ...payload },
  });
  if (error) throw new Error(await readError(error));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function listUsers() {
  return call<{ users: AdminUser[] }>('list_users').then((d) => d.users);
}

export function topupCredits(userId: string, amount: number, note?: string) {
  return call<{ balance: number }>('topup', { user_id: userId, amount, note }).then(
    (d) => d.balance,
  );
}

export function adjustCredits(userId: string, amount: number, note?: string) {
  return call<{ balance: number }>('adjust', { user_id: userId, amount, note }).then(
    (d) => d.balance,
  );
}

export function listLedger(userId: string) {
  return call<{ ledger: LedgerEntry[] }>('list_ledger', { user_id: userId }).then(
    (d) => d.ledger,
  );
}

export function setAdmin(userId: string, isAdmin: boolean) {
  return call<{ ok: true }>('set_admin', { user_id: userId, is_admin: isAdmin });
}

export function getConfig() {
  return call<{ config: ConfigRow[] }>('get_config').then((d) => d.config);
}

export function setConfig(key: string, value: unknown) {
  return call<{ ok: true }>('set_config', { key, value });
}
