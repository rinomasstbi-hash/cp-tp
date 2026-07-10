

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
  userId: string;
  subject: string; 
  cpElements: { element: string; cp: string; }[];
  grade: string;
  creatorEmail: string;
  creatorName: string; 
  cpSourceVersion: string;
  additionalNotes: string;
  tpGroups: TPGroup[];
  createdAt: number;
  updatedAt: number;
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
  userId: string;
  tpId: string;
  subject: string;
  content: ATPTableRow[];
  creatorName: string;
  creatorEmail: string;
  createdAt: number;
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
  userId: string;
  tpId: string;
  subject: string;
  jamPertemuan: number; // Store the JP used for generation
  content: PROTARow[];
  creatorName: string;
  createdAt: number;
}

export interface KKTPKriteria {
  sangatMahir: string;
  mahir: string;
  cukupMahir: string;
  perluBimbingan: string;
}

export interface KKTPRow {
  no: number | string;
  materiPokok: string;
  tp: string;
  kriteria: KKTPKriteria;
  targetKktp: 'sangatMahir' | 'mahir' | 'cukupMahir' | 'perluBimbingan';
}

export interface KKTPData {
  id: string;
  userId: string;
  atpId: string;
  subject: string;
  grade: string;
  semester: 'Ganjil' | 'Genap';
  content: KKTPRow[];
  createdAt: number;
}

export interface PROSEMHeader {
  month: string;
  weeks: number;
  weekNumbers?: number[];
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
  userId: string;
  protaId: string;
  subject: string;
  grade: string;
  semester: 'Ganjil' | 'Genap';
  headers: PROSEMHeader[];
  content: PROSEMRow[];
  createdAt: number;
}


export interface ApiKeyItem {
  id: string;
  key: string;
  name: string;
  status: 'Aktif' | 'Limit Tercapai' | 'Error';
  errorMessage?: string;
  lastUsed?: number;
}

export type View = 'select_subject' | 'subject_dashboard' | 'tp_menu' | 'view_tp_list' | 'view_tp_detail' | 'create_tp' | 'edit_tp' | 'view_atp_list' | 'view_atp_detail' | 'edit_atp' | 'view_prota_list' | 'view_kktp' | 'view_prosem' | 'view_admin_settings';