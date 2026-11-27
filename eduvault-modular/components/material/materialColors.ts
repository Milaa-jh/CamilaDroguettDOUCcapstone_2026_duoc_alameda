import type { MaterialType } from '@/types/database';

/** Paleta que se ofrece al elegir el color de la etiqueta de un material. */
export const MATERIAL_COLORS = [
  '#2563eb', // azul
  '#16a34a', // verde
  '#dc2626', // rojo
  '#b45309', // ámbar
  '#7c3aed', // violeta
  '#0891b2', // turquesa
  '#db2777', // rosado
  '#475569', // gris azulado
];

/** Color que se usa cuando no se eligió ninguno (uno distinto por tipo). */
export const DEFAULT_TYPE_COLORS: Record<MaterialType, string> = {
  apunte: '#16a34a',
  texto: '#2563eb',
  pdf: '#dc2626',
  documento: '#b45309',
  enlace: '#7c3aed',
};

export function getMaterialColor(type: MaterialType, color?: string | null): string {
  return color || DEFAULT_TYPE_COLORS[type] || '#2563eb';
}
