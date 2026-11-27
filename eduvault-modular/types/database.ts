/**
 * Tipos de la base de datos de EduVault.
 *
 * IMPORTANTE (por qué se escribe así): para que VS Code y `npm run build` sepan qué campos
 * trae cada consulta de Supabase (por ejemplo `subject.id` o `attempt.percentage`), este archivo
 * debe tener la misma forma que los tipos que genera Supabase:
 *   - Cada fila (Row) se declara con `type`, NO con `interface` (las interfaces no se aceptan).
 *   - Cada tabla lleva su lista `Relationships` (las claves foráneas).
 *   - El esquema incluye `Views`, `Functions`, `Enums` y `CompositeTypes`, aunque estén vacíos.
 * Si más adelante cambias la base de datos, lo más seguro es regenerar este archivo con:
 *   npx supabase gen types typescript --project-id TU_ID > types/database.ts
 */

export type MaterialType = 'apunte' | 'texto' | 'pdf' | 'enlace' | 'documento';

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type Unit = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  unit_order: number;
  created_at: string;
  updated_at: string;
};

export type Material = {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  file_url: string | null;
  external_url: string | null;
  color: string | null;
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Bloque de material dentro de una unidad (ej.: "1.1 Hablemos de Big Data"). Contiene archivos. */
export type MaterialGroup = {
  id: string;
  unit_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Summary = {
  id: string;
  unit_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export type Test = {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  test_id: string;
  question_text: string;
  created_at: string;
  updated_at: string;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
};

export type TestAttempt = {
  id: string;
  test_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
};

/** Test con sus preguntas y alternativas anidadas, tal como se consulta para "Realizar test" */
export interface TestWithQuestions extends Test {
  questions: (Question & { options: QuestionOption[] })[];
}

/** Estadísticas agregadas mostradas en el Dashboard (sección 9) */
export interface DashboardStats {
  subjectsCount: number;
  unitsCount: number;
  materialsCount: number;
  testsCount: number;
  averageScore: number;
}

/** Progreso por asignatura (sección 17) */
export interface SubjectProgress {
  subject: Subject;
  unitsCount: number;
  testsCompleted: number;
  averagePercentage: number;
}

/**
 * Esquema completo de la base de datos, tipado para el cliente de Supabase
 * (createBrowserClient<Database>() / createServerClient<Database>()).
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Subject, 'id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'subjects_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      units: {
        Row: Unit;
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Unit, 'id' | 'subject_id'>>;
        Relationships: [
          {
            foreignKeyName: 'units_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      materials: {
        Row: Material;
        Insert: Omit<Material, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Material, 'id' | 'unit_id'>>;
        Relationships: [
          {
            foreignKeyName: 'materials_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'materials_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'material_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      material_groups: {
        Row: MaterialGroup;
        Insert: Omit<MaterialGroup, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<MaterialGroup, 'id' | 'unit_id'>>;
        Relationships: [
          {
            foreignKeyName: 'material_groups_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
      summaries: {
        Row: Summary;
        Insert: Omit<Summary, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Summary, 'id' | 'unit_id'>>;
        Relationships: [
          {
            foreignKeyName: 'summaries_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
      tests: {
        Row: Test;
        Insert: Omit<Test, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Test, 'id' | 'unit_id'>>;
        Relationships: [
          {
            foreignKeyName: 'tests_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Question, 'id' | 'test_id'>>;
        Relationships: [
          {
            foreignKeyName: 'questions_test_id_fkey';
            columns: ['test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['id'];
          },
        ];
      };
      options: {
        Row: QuestionOption;
        Insert: Omit<QuestionOption, 'id'> & { id?: string };
        Update: Partial<Omit<QuestionOption, 'id' | 'question_id'>>;
        Relationships: [
          {
            foreignKeyName: 'options_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      test_attempts: {
        Row: TestAttempt;
        Insert: Omit<TestAttempt, 'id' | 'completed_at'> & { id?: string; completed_at?: string };
        // Los intentos son un historial: no se editan (las políticas RLS tampoco lo permiten).
        Update: Partial<Omit<TestAttempt, 'id' | 'test_id' | 'user_id'>>;
        Relationships: [
          {
            foreignKeyName: 'test_attempts_test_id_fkey';
            columns: ['test_id'];
            isOneToOne: false;
            referencedRelation: 'tests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'test_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
