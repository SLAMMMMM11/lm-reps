// Proxy serverless al autocompletado de ciudades del motor e-agencias.
// El endpoint /suggestions del motor NO permite CORS desde el navegador, asi
// que el buscador del hero llama a /api/suggest (esta funcion) y aqui se hace
// la llamada del lado del servidor y se devuelve con CORS permitido.
export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();

  const json = (body, status = 200) =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=86400',
      },
    });

  if (q.length < 2) return json({ items: [] });

  const upstream =
    'https://viajeslmreps.e-agencias.com/suggestions?locale=es_PE&profile=sbox-hotels-facet&hint=' +
    encodeURIComponent(q);

  try {
    const r = await fetch(upstream, { headers: { accept: 'application/json' } });
    return json(await r.text(), r.ok ? 200 : r.status);
  } catch (e) {
    return json({ items: [] }, 502);
  }
};
