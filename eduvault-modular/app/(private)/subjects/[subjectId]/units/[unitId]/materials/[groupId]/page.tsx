'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FileText, Loader2, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadMaterialFile, deleteMaterialFile } from '@/lib/supabase/storage';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { MaterialFormModal, type MaterialFormValues } from '@/components/material/MaterialFormModal';
import { MaterialGroupFormModal, type MaterialGroupFormValues } from '@/components/material/MaterialGroupFormModal';
import { MaterialCard } from '@/components/material/MaterialCard';
import type { MaterialGroup, Material } from '@/types/database';

export default function MaterialGroupPage() {
  const { subjectId, unitId, groupId } = useParams<{ subjectId: string; unitId: string; groupId: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const unitPath = `/subjects/${subjectId}/units/${unitId}`;

  const [group, setGroup] = useState<MaterialGroup | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: groupData, error: groupError } = await supabase
      .from('material_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !groupData) {
      showToast('error', 'No se encontró el material.');
      router.push(unitPath);
      return;
    }
    setGroup(groupData);

    const { data: materialsData } = await supabase
      .from('materials')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    setMaterials(materialsData ?? []);
    setIsLoading(false);
  }, [groupId, unitPath, router, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------- Editar el bloque (nombre y descripción) ----------------

  async function handleEditGroup(values: MaterialGroupFormValues) {
    if (!group) return;
    setIsSavingGroup(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('material_groups')
      .update({ name: values.name, description: values.description || null })
      .eq('id', group.id);
    setIsSavingGroup(false);

    if (error) {
      showToast('error', 'No se pudo guardar el material.');
      return;
    }
    showToast('success', 'Material actualizado correctamente.');
    setGroupModalOpen(false);
    load();
  }

  // ---------------- Archivos del bloque ----------------

  function openCreateFile() {
    setEditingMaterial(null);
    setFileModalOpen(true);
  }

  async function handleSubmitMaterial(values: MaterialFormValues) {
    setIsSavingMaterial(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsSavingMaterial(false);
      return;
    }

    let filePath: string | null = editingMaterial?.file_url ?? null;

    if (values.file) {
      const { path, error: uploadError } = await uploadMaterialFile(user.id, unitId, values.file);
      if (uploadError || !path) {
        setIsSavingMaterial(false);
        showToast('error', 'No se pudo subir el archivo. Inténtalo nuevamente.');
        return;
      }
      if (editingMaterial?.file_url) await deleteMaterialFile(editingMaterial.file_url);
      filePath = path;
    } else if (values.removeExistingFile && editingMaterial?.file_url) {
      await deleteMaterialFile(editingMaterial.file_url);
      filePath = null;
    }

    const payload = {
      title: values.title,
      description: values.description || null,
      type: values.type,
      external_url: values.externalUrl || null,
      file_url: values.removeExistingFile ? null : filePath,
      color: values.color,
    };

    const { error } = editingMaterial
      ? await supabase.from('materials').update(payload).eq('id', editingMaterial.id)
      : await supabase.from('materials').insert({ ...payload, unit_id: unitId, group_id: groupId });

    setIsSavingMaterial(false);
    if (error) {
      showToast('error', 'No se pudo guardar el archivo.');
      return;
    }
    showToast('success', editingMaterial ? 'Archivo actualizado correctamente.' : 'Archivo agregado correctamente.');
    setFileModalOpen(false);
    load();
  }

  async function handleDeleteMaterial() {
    if (!deletingMaterial) return;
    setIsDeletingMaterial(true);
    const supabase = createClient();
    if (deletingMaterial.file_url) await deleteMaterialFile(deletingMaterial.file_url);
    const { error } = await supabase.from('materials').delete().eq('id', deletingMaterial.id);
    setIsDeletingMaterial(false);

    if (error) {
      showToast('error', 'No se pudo eliminar el archivo.');
      return;
    }
    showToast('success', 'Archivo eliminado.');
    setDeletingMaterial(null);
    load();
  }

  if (isLoading || !group) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href={unitPath} className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la unidad
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-black">{group.name}</h1>
          {group.description && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-black">{group.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setGroupModalOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button onClick={openCreateFile} className="gap-1.5">
            <Plus className="h-4 w-4" /> Agregar archivo
          </Button>
        </div>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Este material todavía no tiene archivos."
          description="Sube tus apuntes, textos, PDF, documentos o enlaces."
          action={
            <button onClick={openCreateFile} className="text-sm font-medium text-brand-600 hover:underline">
              + Agrega el primer archivo
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={() => {
                setEditingMaterial(material);
                setFileModalOpen(true);
              }}
              onDelete={() => setDeletingMaterial(material)}
            />
          ))}
        </div>
      )}

      <MaterialGroupFormModal
        open={groupModalOpen}
        initial={group}
        isSaving={isSavingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSubmit={handleEditGroup}
      />

      <MaterialFormModal
        open={fileModalOpen}
        initial={editingMaterial}
        isSaving={isSavingMaterial}
        onClose={() => setFileModalOpen(false)}
        onSubmit={handleSubmitMaterial}
      />

      <ConfirmDialog
        open={!!deletingMaterial}
        title="Eliminar archivo"
        description={`Se eliminará "${deletingMaterial?.title}" de forma permanente.`}
        isLoading={isDeletingMaterial}
        onConfirm={handleDeleteMaterial}
        onCancel={() => setDeletingMaterial(null)}
      />
    </div>
  );
}
