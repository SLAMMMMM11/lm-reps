import { supabase } from './supabase-client.js';

// Estos guards son solo UX (evitar parpadeo de contenido protegido y dar un
// redirect limpio). La seguridad real la da RLS en Supabase: cualquiera
// puede saltarse esto desactivando JS o llamando la API directamente.

export async function requireAuth(loginPath = '/login') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // next= permite que el login te devuelva a la pagina que intentabas abrir.
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${loginPath}?next=${next}`;
    return null;
  }
  return session;
}

// Un error en la consulta del perfil NO significa "no es admin": puede ser
// un fallo transitorio (token venciendo justo al cargar la pagina, red).
// Se reintenta una vez con la sesion renovada antes de decidir; sin esto,
// el guard expulsaba admins legitimos y provocaba rebotes entre paginas.
async function fetchOwnProfile(userId, columns) {
  let { data: profile, error } = await supabase
    .from('profiles')
    .select(columns)
    .eq('id', userId)
    .single();

  if (error) {
    await supabase.auth.refreshSession();
    ({ data: profile, error } = await supabase
      .from('profiles')
      .select(columns)
      .eq('id', userId)
      .single());
  }
  return { profile, error };
}

export async function requireAdmin(dashboardPath = '/cuenta', loginPath = '/login') {
  const session = await requireAuth(loginPath);
  if (!session) return null;

  const { profile, error } = await fetchOwnProfile(session.user.id, 'is_admin');
  if (error || !profile?.is_admin) {
    window.location.href = dashboardPath;
    return null;
  }
  return session;
}

export async function requireSuperAdmin(dashboardPath = '/cuenta', loginPath = '/login') {
  const session = await requireAuth(loginPath);
  if (!session) return null;

  const { profile, error } = await fetchOwnProfile(session.user.id, 'is_admin, admin_role');
  if (error || !profile?.is_admin || profile.admin_role !== 'super_admin') {
    // Un admin sin rango super_admin pertenece al panel admin, no a /cuenta:
    // mandarlo a /cuenta lo devuelve aqui en bucle (dashboard.js redirige
    // admins a /admin).
    window.location.href = profile?.is_admin ? '/admin' : dashboardPath;
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
