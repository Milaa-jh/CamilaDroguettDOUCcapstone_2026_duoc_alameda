'use client';

import Link from 'next/link';
import { FileText, Pencil, Trash2, ChevronRight } from 'lucide-react';
import type { MaterialGroup } from '@/types/database';

interface MaterialGroupCardProps {
  group: MaterialGroup;
  href: string;
  fileCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function MaterialGroupCard({ group, href, fileCount, onEdit, onDelete }: MaterialGroupCardProps) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-brand-200">
      <div className="rounded-xl bg-brand-50 p-2">
        <FileText className="h-4 w-4 text-brand-600" />
      </div>

      <Link href={href} className="min-w-0 flex-1">
        <p className="truncate font-bold text-black">{group.name}</p>
        <p className="text-xs text-slate-500">
          {fileCount} {fileCount === 1 ? 'archivo' : 'archivos'}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
          aria-label="Editar material"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          aria-label="Eliminar material"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <Link
          href={href}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Abrir material"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
