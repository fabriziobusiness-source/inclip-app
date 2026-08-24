import { MONEDA } from '../config';

const nf = new Intl.NumberFormat(MONEDA.LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: MONEDA.DECIMALES,
});

/** 1400 → "Bs 1.400" · 69.75 → "Bs 69,75" */
export function dinero(valor, { conSimbolo = true } = {}) {
  const n = Number(valor ?? 0);
  const texto = nf.format(Number.isFinite(n) ? n : 0);
  return conSimbolo ? `${MONEDA.SIMBOLO} ${texto}` : texto;
}

/** 70 → "70 Bs" — el orden invertido que usa la landing para el precio unitario */
export function dineroUnitario(valor) {
  return `${nf.format(Number(valor ?? 0))} ${MONEDA.SIMBOLO}`;
}

export function numero(valor) {
  return nf.format(Number(valor ?? 0));
}

const df = new Intl.DateTimeFormat(MONEDA.LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dfCorto = new Intl.DateTimeFormat(MONEDA.LOCALE, { day: 'numeric', month: 'short' });

export function fecha(valor, { corto = false } = {}) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '-';
  return (corto ? dfCorto : df).format(d);
}

/** "hace 3 h" / "en 2 días" — sin librerías, con Intl.RelativeTimeFormat */
const rtf = new Intl.RelativeTimeFormat(MONEDA.LOCALE, { numeric: 'auto' });

export function tiempoRelativo(valor) {
  if (!valor) return '';
  const ms = new Date(valor).getTime() - Date.now();
  if (Number.isNaN(ms)) return '';
  const min = Math.round(ms / 60000);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  const d = Math.round(h / 24);
  if (Math.abs(d) < 30) return rtf.format(d, 'day');
  return rtf.format(Math.round(d / 30), 'month');
}

/** Días que faltan para una fecha límite. Negativo = vencido. */
export function diasRestantes(fechaLimite) {
  if (!fechaLimite) return null;
  const limite = new Date(`${String(fechaLimite).slice(0, 10)}T23:59:59`);
  return Math.ceil((limite.getTime() - Date.now()) / 86400000);
}

export function textoPlazo(fechaLimite) {
  const d = diasRestantes(fechaLimite);
  if (d === null) return '-';
  if (d < 0) return `Venció hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}`;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  return `Faltan ${d} días`;
}

export function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** Acepta "tiktok.com/@x" y devuelve una URL navegable. Devuelve null si es basura. */
export function normalizarUrl(valor) {
  const v = String(valor || '').trim();
  if (!v) return null;
  const conProtocolo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(conProtocolo);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function dominioDe(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
