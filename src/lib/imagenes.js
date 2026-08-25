import { IMAGENES } from '../config';
import { supabase } from './supabase';

/* Comprimir en el navegador antes de subir.
   Una foto de celular pesa 4 MB. Subirla tal cual multiplica por ocho la
   factura de almacenamiento y hace esperar al editor con datos móviles,
   que es exactamente el usuario que no puede esperar. */
export async function comprimirImagen(archivo) {
  if (!IMAGENES.TIPOS.includes(archivo.type)) {
    throw new Error('Sube una imagen JPG, PNG o WebP.');
  }

  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, IMAGENES.MAX_LADO_PX / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close?.();

  let calidad = IMAGENES.CALIDAD_JPEG;
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', calidad));

  // Si sigue pasada de peso, bajamos calidad en pasos. Tres intentos bastan
  // para cualquier foto de celular.
  while (blob && blob.size > IMAGENES.MAX_BYTES && calidad > 0.4) {
    calidad -= 0.15;
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', calidad));
  }

  if (!blob) throw new Error('No pudimos procesar esa imagen.');
  if (blob.size > IMAGENES.MAX_BYTES) {
    throw new Error('Esa imagen pesa demasiado incluso comprimida. Prueba con otra.');
  }
  return blob;
}

/** Sube a `bucket/<uid>/<archivo>` — la política de Storage exige esa carpeta. */
export async function subirImagen(bucket, usuarioId, archivo) {
  const blob = await comprimirImagen(archivo);
  const ruta = `${usuarioId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(ruta);
  return data.publicUrl;
}
