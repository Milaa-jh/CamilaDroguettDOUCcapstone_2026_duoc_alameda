'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { isNonEmpty } from '@/lib/utils/validation';
import type { MaterialGroup } from '@/types/database';

export interface MaterialGroupFormValues {
  name: string;
  description: string;
}

interface MaterialGroupFormModalProps {
  open: boolean;
  initial?: MaterialGroup | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: MaterialGroupFormValues) => void;
}

export function MaterialGroupFormModal({ open, initial, isSaving, onClose, onSubmit }: MaterialGroupFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isNonEmpty(name)) {
      setError('Debes ingresar un nombre para el material.');
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{initial ? 'Editar material' : 'Agregar nuevo material'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">⚠ {error}</p>}

          <Input
            label="Nombre"
            placeholder="Escribe el nombre del material"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <TextArea
            label="Descripción (opcional)"
            placeholder="¿De qué trata este material?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {initial ? 'Guardar cambios' : 'Crear material'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
