export interface SubMateriGroup {
  subMateri: string;
  tps: string[];
}

export interface TPGroup {
  semester: 'Ganjil' | 'Genap';
  materi: string;
  subMateriGroups: SubMateriGroup[];
}

export interface TPData {
  id: string;
  cpElements: { element: string; cp: string; }[];
  grade: string;
  creatorEmail: string;
  creatorName: string; // Added
  cpSourceVersion: string; // Added
  additionalNotes: string;
  tpGroups: TPGroup[];
  createdAt: string;
  updatedAt: string;
}

export type View = 'select_subject' | 'view_tps' | 'create_tp' | 'edit_tp';