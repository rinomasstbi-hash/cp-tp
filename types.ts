

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
  alokasiWaktu: string;
  integrasiPancaCinta: string;
  aktivitasCinta: string;
}


export interface ATPData {
  id: string;
  userId: string;
  tpId: string;
  subject: string;
  jamPertemuan?: number;
  content: ATPTableRow[];
  creatorName: string;
  creatorEmail: string;
  createdAt: number;
}

export interface PROTARow {
  no: number | string;
  semester: 'Ganjil' | 'Genap';
  kodeTp: string;
  topikMateri: string;
  tp: string;
  integrasiPancaCinta: string;
  aktivitasCinta: string;
  alokasiWaktu: string;
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
  mahir: string;
  cakap: string;
  layak: string;
  baruBerkembang: string;
}

export interface KKTPRow {
  no: number | string;
  materiPokok: string;
  tp: string;
  integrasiPancaCinta: string;
  aktivitasCinta: string;
  kriteria: KKTPKriteria;
  targetKktp: 'mahir' | 'cakap' | 'layak' | 'baruBerkembang';
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

export type View = 'select_subject' | 'subject_dashboard' | 'tp_menu' | 'view_tp_list' | 'view_tp_detail' | 'create_tp' | 'edit_tp' | 'view_atp_list' | 'view_atp_detail' | 'edit_atp' | 'view_prota_list' | 'view_kktp' | 'view_prosem' | 'view_admin_settings' | 'view_rpe';