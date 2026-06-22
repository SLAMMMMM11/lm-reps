import { supabase } from './supabase-client.js';

// Estos guards son solo UX (evitar parpadeo de contenido protegido y dar un
// redirect limpio). La seguridad real la da RLS en Supabase: cualquiera
// puede saltarse esto desactivando JS o llamando la API directamente.

export async function requireAuth(loginPath = '/login') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = loginPath;
    return null;
  }
  return session;
}

export async function requireAdmin(dashboardPath = '/cuenta', loginPath = '/login') {
  const session = await requireAuth(loginPath);
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();

  if (error || !profile?.is_admin) {
    window.location.href = dashboardPath;
    return null;
  }
  return session;
}

export async function requireSuperAdmin(dashboardPath = '/cuenta', loginPath = '/login') {
  const session = await requireAuth(loginPath);
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', session.user.id)
    .single();

  if (error || !profile?.is_admin || profile.admin_role !== 'super_admin') {
    window.location.href = dashboardPath;
    return null;
  }
  return session;
}

export async function getAdminRole(session) {
  if (!session) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('admin_role')
    .eq('id', session.user.id)
    .single();
  return profile?.admin_role || null;
}

export function watchSessionLoss(onLost) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') onLost();
  });
}
