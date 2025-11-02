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
  id?: string; 
  userId?: string; // Menjadi opsional karena tidak ada login
  subject: string; 
  cpElements: { element: string; cp: string; }[];
  grade: string;
  creatorEmail: string;
  creatorName: string; 
  cpSourceVersion: string;
  additionalNotes: string;
  tpGroups: TPGroup[];
  createdAt: string;
  updatedAt: string;
}

export type View = 'select_subject' | 'view_tp_list' | 'view_tp_detail' | 'create_tp' | 'edit_tp';