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
  id?: string; // Firestore will generate this, so it's optional on creation
  userId: string; // To associate data with a user
  subject: string; // Added to store subject directly in the document
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

export type View = 'select_subject' | 'view_tps' | 'create_tp' | 'edit_tp';