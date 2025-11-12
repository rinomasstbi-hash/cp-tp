

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

export interface ATPTableRow {
  topikMateri: string;
  tp: string;
  kodeTp: string;
  atpSequence: number;
  semester: 'Ganjil' | 'Genap';
}


export interface ATPData {
  id: string;
  tpId: string;
  subject: string;
  content: ATPTableRow[];
  creatorName: string;
  creatorEmail: string;
  createdAt: string;
}

export interface PROTARow {
  no: number | string;
  topikMateri: string;
  alurTujuanPembelajaran: string; // ATP codes like "1.1, 1.2"
  tujuanPembelajaran: string; // The full TP text
  alokasiWaktu: string; // e.g., "4 JP" or "120 Menit"
  semester: 'Ganjil' | 'Genap';
}

export interface PROTAData {
  id: string;
  tpId: string;
  subject: string;
  jamPertemuan: number; // Store the JP used for generation
  content: PROTARow[];
  creatorName: string;
  createdAt: string;
}

export interface KKTPKriteria {
  sangatMahir: string;
  mahir: string;
  cukupMahir: string;
  perluBimbingan: string;
}

export interface KKTPRow {
  no: number;
  materiPokok: string;
  tp: string;
  kriteria: KKTPKriteria;
  targetKktp: 'sangatMahir' | 'mahir' | 'cukupMahir' | 'perluBimbingan';
}

export interface KKTPData {
  id: string;
  atpId: string;
  subject: string;
  grade: string;
  semester: 'Ganjil' | 'Genap';
  content: KKTPRow[];
  createdAt: string;
}

export interface PROSEMHeader {
  month: string;
  weeks: number;
}

export interface PROSEMRow {
  no: number | string;
  tujuanPembelajaran: string;
  alokasiWaktu: string;
  bulan: Record<string, (string | null)[]>; 
  keterangan: string;
}

export interface PROSEMData {
  id: string;
  protaId: string;
  subject: string;
  grade: string;
  semester: 'Ganjil' | 'Genap';
  headers: PROSEMHeader[];
  content: PROSEMRow[];
  createdAt: string;
}


export type View = 'select_subject' | 'subject_dashboard' | 'tp_menu' | 'view_tp_list' | 'view_tp_detail' | 'create_tp' | 'edit_tp' | 'view_atp_list' | 'view_atp_detail' | 'edit_atp' | 'view_prota_list' | 'view_kktp' | 'view_prosem';