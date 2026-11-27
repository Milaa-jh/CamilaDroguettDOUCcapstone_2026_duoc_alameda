'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FileText, Loader2, NotebookPen, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deleteMaterialFile } from '@/lib/supabase/storage';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { MaterialGroupFormModal, type MaterialGroupFormValues } from '@/components/material/MaterialGroupFormModal';
import { MaterialGroupCard } from '@/components/material/MaterialGroupCard';
import { SummaryFormModal, type SummaryFormValues } from '@/components/summary/SummaryFormModal';
import { SummaryCard } from '@/components/summary/SummaryCard';
import { TestFormModal, type TestFormValues } from '@/components/test/TestFormModal';
import { TestListItem } from '@/components/test/TestListItem';
import type { Unit, MaterialGroup, Summary, Test } from '@/types/database';

export default function UnitDetailPage() {
  const { subjectId, unitId } = useParams<{ subjectId: string; unitId: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const basePath = `/subjects/${subjectId}/units/${unitId}`;

  const [unit, setUnit] = useState<Unit | null>(null);
  const [groups, setGroups] = useState<MaterialGroup[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('material');

  // --- Material (bloques) ---
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MaterialGroup | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<MaterialGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // --- Resúmenes ---
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<Summary | null>(null);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState<Summary | null>(null);
  const [isDeletingSummary, setIsDeletingSummary] = useState(false);

  // --- Tests ---
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [deletingTest, setDeletingTest] = useState<Test | null>(null);
  const [isDeletingTest, setIsDeletingTest] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data: unitData, error: unitError } = await supabase
      .from('units')
      .select('*')
      .eq('id', unitId)
      .single();

    if (unitError || !unitData) {
      showToast('error', 'No se encontró la unidad.');
      router.push(`/subjects/${subjectId}`);
      return;
    }
    setUnit(unitData);

    const [groupsRes, filesRes, summariesRes, testsRes] = await Promise.all([
      supabase.from('material_groups').select('*').eq('unit_id', unitId).order('created_at', { ascending: true }),
      supabase.from('materials').select('id, group_id').eq('unit_id', unitId),
      supabase.from('summaries').select('*').eq('unit_id', unitId).order('created_at', { ascending: true }),
      supabase.from('tests').select('*').eq('unit_id', unitId).order('created_at', { ascending: true }),
    ]);

    setGroups(groupsRes.data ?? []);
    const countsByGroup: Record<string, number> = {};
    (filesRes.data ?? []).forEach((m) => {
      if (m.group_id) countsByGroup[m.group_id] = (countsByGroup[m.group_id] ?? 0) + 1;
    });
    setFileCounts(countsByGroup);
    setSummaries(summariesRes.data ?? []);
    const testsData = testsRes.data ?? [];
    setTests(testsData);

    if (testsData.length > 0) {
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, test_id')
        .in('test_id', testsData.map((t) => t.id));

      const counts: Record<string, number> = {};
      (questionsData ?? []).forEach((q) => {
        counts[q.test_id] = (counts[q.test_id] ?? 0) + 1;
      });
      setQuestionCounts(counts);
    } else {
      setQuestionCounts({});
    }

    setIsLoading(false);
  }, [unitId, subjectId, router, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------- Material (bloques) ----------------

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupModalOpen(true);
  }

  async function handleSubmitGroup(values: MaterialGroupFormValues) {
    setIsSavingGroup(true);
    const supabase = createClient();

    const { error } = editingGroup
      ? await supabase
          .from('material_groups')
          .update({ name: values.name, description: values.description || null })
          .eq('id', editingGroup.id)
      : await supabase
          .from('material_groups')
          .insert({ unit_id: unitId, name: values.name, description: values.description || null });

    setIsSavingGroup(false);
    if (error) {
      showToast('error', 'No se pudo guardar el material.');
      return;
    }
    showToast('success', editingGroup ? 'Material actualizado correctamente.' : 'Material creado correctamente.');
    setGroupModalOpen(false);
    load();
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    setIsDeletingGroup(true);
    const supabase = createClient();

    // Los archivos subidos viven en Storage: se borran antes, porque al eliminar el bloque
    // la base de datos solo elimina los registros.
    const { data: files } = await supabase.from('materials').select('file_url').eq('group_id', deletingGroup.id);
    for (const f of files ?? []) {
      if (f.file_url) await deleteMaterialFile(f.file_url);
    }

    const { error } = await supabase.from('material_groups').delete().eq('id', deletingGroup.id);
    setIsDeletingGroup(false);

    if (error) {
      showToast('error', 'No se pudo eliminar el material.');
      return;
    }
    showToast('success', 'Material eliminado.');
    setDeletingGroup(null);
    load();
  }

  // ---------------- Resúmenes ----------------

  function openCreateSummary() {
    setEditingSummary(null);
    setSummaryModalOpen(true);
  }

  async function handleSubmitSummary(values: SummaryFormValues) {
    setIsSavingSummary(true);
    const supabase = createClient();

    const { error } = editingSummary
      ? await supabase
          .from('summaries')
          .update({ title: values.title, content: values.content })
          .eq('id', editingSummary.id)
      : await supabase.from('summaries').insert({ unit_id: unitId, title: values.title, content: values.content });

    setIsSavingSummary(false);
    if (error) {
      showToast('error', 'No se pudo guardar el resumen.');
      return;
    }
    showToast('success', editingSummary ? 'Resumen actualizado correctamente.' : 'Resumen creado correctamente.');
    setSummaryModalOpen(false);
    load();
  }

  async function handleDeleteSummary() {
    if (!deletingSummary) return;
    setIsDeletingSummary(true);
    const supabase = createClient();
    const { error } = await supabase.from('summaries').delete().eq('id', deletingSummary.id);
    setIsDeletingSummary(false);

    if (error) {
      showToast('error', 'No se pudo eliminar el resumen.');
      return;
    }
    showToast('success', 'Resumen eliminado.');
    setDeletingSummary(null);
    load();
  }

  // ---------------- Tests ----------------

  function openCreateTest() {
    setEditingTest(null);
    setTestModalOpen(true);
  }

  async function handleSubmitTest(values: TestFormValues) {
    setIsSavingTest(true);
    const supabase = createClient();

    const { error } = editingTest
      ? await supabase
          .from('tests')
          .update({ title: values.title, description: values.description || null })
          .eq('id', editingTest.id)
      : await supabase
          .from('tests')
          .insert({ unit_id: unitId, title: values.title, description: values.description || null });

    setIsSavingTest(false);
    if (error) {
      showToast('error', 'No se pudo guardar el test.');
      return;
    }
    showToast('success', editingTest ? 'Test actualizado correctamente.' : 'Test creado correctamente.');
    setTestModalOpen(false);
    load();
  }

  async function handleDeleteTest() {
    if (!deletingTest) return;
    setIsDeletingTest(true);
    const supabase = createClient();
    const { error } = await supabase.from('tests').delete().eq('id', deletingTest.id);
    setIsDeletingTest(false);

    if (error) {
      showToast('error', 'No se pudo eliminar el test.');
      return;
    }
    showToast('success', 'Test eliminado.');
    setDeletingTest(null);
    load();
  }

  if (isLoading || !unit) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/subjects/${subjectId}`}
        className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la asignatura
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {unit.name}
        </h1>
        {unit.description && <p className="mt-1 text-sm text-slate-500">{unit.description}</p>}
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'material', label: 'Material' },
          { id: 'summaries', label: 'Resúmenes' },
          { id: 'tests', label: 'Tests' },
        ]}
      />

      {activeTab === 'material' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={openCreateGroup} className="gap-1.5">
              <Plus className="h-4 w-4" /> Agregar material
            </Button>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Esta unidad todavía no tiene material."
              description="Crea un material (por ejemplo, un tema de la unidad) y dentro agrega tus apuntes, textos, PDF o enlaces."
              action={
                <button onClick={openCreateGroup} className="text-sm font-medium text-brand-600 hover:underline">
                  + Agregar el primer material
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <MaterialGroupCard
                  key={group.id}
                  group={group}
                  href={`${basePath}/materials/${group.id}`}
                  fileCount={fileCounts[group.id] ?? 0}
                  onEdit={() => {
                    setEditingGroup(group);
                    setGroupModalOpen(true);
                  }}
                  onDelete={() => setDeletingGroup(group)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'summaries' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={openCreateSummary} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nuevo resumen
            </Button>
          </div>

          {summaries.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Esta unidad todavía no tiene resúmenes."
              description="Escribe resúmenes de estudio para repasar los contenidos clave."
              action={
                <button onClick={openCreateSummary} className="text-sm font-medium text-brand-600 hover:underline">
                  + Crear el primer resumen
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {summaries.map((summary) => (
                <SummaryCard
                  key={summary.id}
                  summary={summary}
                  onEdit={() => {
                    setEditingSummary(summary);
                    setSummaryModalOpen(true);
                  }}
                  onDelete={() => setDeletingSummary(summary)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={openCreateTest} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nuevo test
            </Button>
          </div>

          {tests.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Esta unidad todavía no tiene tests."
              description="Crea un test y agrégale preguntas de alternativas para autoevaluarte."
              action={
                <button onClick={openCreateTest} className="text-sm font-medium text-brand-600 hover:underline">
                  + Crear el primer test
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {tests.map((test) => (
                <TestListItem
                  key={test.id}
                  test={test}
                  questionCount={questionCounts[test.id] ?? 0}
                  basePath={basePath}
                  onEdit={() => {
                    setEditingTest(test);
                    setTestModalOpen(true);
                  }}
                  onDelete={() => setDeletingTest(test)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales y confirmaciones */}

      <MaterialGroupFormModal
        open={groupModalOpen}
        initial={editingGroup}
        isSaving={isSavingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSubmit={handleSubmitGroup}
      />
      <ConfirmDialog
        open={!!deletingGroup}
        title="Eliminar material"
        description={`Se eliminará "${deletingGroup?.name}" junto con todos los archivos que contiene. Esta acción no se puede deshacer.`}
        isLoading={isDeletingGroup}
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />

      <SummaryFormModal
        open={summaryModalOpen}
        initial={editingSummary}
        isSaving={isSavingSummary}
        onClose={() => setSummaryModalOpen(false)}
        onSubmit={handleSubmitSummary}
      />
      <ConfirmDialog
        open={!!deletingSummary}
        title="Eliminar resumen"
        description={`Se eliminará "${deletingSummary?.title}" de forma permanente.`}
        isLoading={isDeletingSummary}
        onConfirm={handleDeleteSummary}
        onCancel={() => setDeletingSummary(null)}
      />

      <TestFormModal
        open={testModalOpen}
        initial={editingTest}
        isSaving={isSavingTest}
        onClose={() => setTestModalOpen(false)}
        onSubmit={handleSubmitTest}
      />
      <ConfirmDialog
        open={!!deletingTest}
        title="Eliminar test"
        description={`Se eliminará "${deletingTest?.title}" junto con todas sus preguntas y resultados asociados. Esta acción no se puede deshacer.`}
        isLoading={isDeletingTest}
        onConfirm={handleDeleteTest}
        onCancel={() => setDeletingTest(null)}
      />
    </div>
  );
}
