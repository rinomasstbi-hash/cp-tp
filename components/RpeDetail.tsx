import React from 'react';
import { AdminSettings as GlobalSettings } from '../services/dbService';
import { Calendar, HelpCircle, Check, Info, AlertTriangle } from 'lucide-react';

interface RpeDetailProps {
  globalSettings: GlobalSettings | null;
  grade: string;
  subject: string;
  jamWeekly: number;
  getSemesterWeeksList: (semester: 'Ganjil' | 'Genap', grade: string) => Record<string, number[]>;
  getWeekInactiveLabel: (semester: 'Ganjil' | 'Genap', grade: string, month: string, weekNum: number) => string;
}

const MONTH_MAX_WEEKS: Record<string, number> = {
  'Juli': 5,
  'Agustus': 5,
  'September': 5,
  'Oktober': 5,
  'November': 5,
  'Desember': 5,
  'Januari': 5,
  'Februari': 5,
  'Maret': 5,
  'April': 5,
  'Mei': 5,
  'Juni': 5
};

const CODE_DESCRIPTIONS: Record<string, string> = {
  'LS2': 'Libur Semester 2',
  'MTM': 'Masa Ta\'aruf Siswa Madrasah (MATSAMA)',
  'PHBN': 'Peringatan Hari Besar Nasional',
  'SAS': 'Sumatif Akhir Semester',
  'UP': 'Ujian Praktik / Penilaian Akhir',
  'LS1': 'Libur Semester 1',
  'LHR': 'Libur Hari Raya / Keagamaan'
};

export const RpeDetail: React.FC<RpeDetailProps> = ({
  globalSettings,
  grade,
  subject,
  jamWeekly,
  getSemesterWeeksList,
  getWeekInactiveLabel
}) => {
  const getMonthKeterangan = (
    semester: 'Ganjil' | 'Genap',
    month: string,
    activeWeeks: number[]
  ): string => {
    const maxWeeks = MONTH_MAX_WEEKS[month] || 5;
    const inactiveWeeks = Array.from({ length: maxWeeks }, (_, i) => i + 1).filter(w => !activeWeeks.includes(w));
    
    const realInactiveWeeks = inactiveWeeks.filter(w => {
      const label = getWeekInactiveLabel(semester, grade, month, w);
      return !label || label.trim().toLowerCase() !== 'x';
    });

    if (realInactiveWeeks.length === 0) {
      return 'Semua pekan efektif';
    }
    
    // Group by code
    const codeGroups: Record<string, number[]> = {};
    realInactiveWeeks.forEach(w => {
      const code = getWeekInactiveLabel(semester, grade, month, w) || 'N/E';
      if (!codeGroups[code]) {
        codeGroups[code] = [];
      }
      codeGroups[code].push(w);
    });
    
    const parts = Object.entries(codeGroups).map(([code, weeks]) => {
      const weekStr = weeks.map(w => `Pekan ${w}`).join(', ');
      const desc = CODE_DESCRIPTIONS[code] ? ` (${CODE_DESCRIPTIONS[code]})` : '';
      return `${weekStr}: ${code}${desc}`;
    });
    
    return parts.join('; ');
  };

  const renderSemesterRpe = (semester: 'Ganjil' | 'Genap') => {
    const months = semester === 'Ganjil'
      ? ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

    const weeksList = getSemesterWeeksList(semester, grade);
    
    let totalPekan = 0;
    let totalPekanEfektif = 0;
    let totalPekanTidakEfektif = 0;

    const rowsData = months.map(m => {
      const activeWeeks = weeksList[m] || [];
      const maxWeeks = MONTH_MAX_WEEKS[m] || 5;
      
      let xWeeksCount = 0;
      for (let w = 1; w <= maxWeeks; w++) {
        if (!activeWeeks.includes(w)) {
          const label = getWeekInactiveLabel(semester, grade, m, w);
          if (label && label.trim().toLowerCase() === 'x') {
            xWeeksCount++;
          }
        }
      }

      const actualMaxWeeks = maxWeeks - xWeeksCount;
      const efektif = activeWeeks.length;
      const tidakEfektif = Math.max(0, actualMaxWeeks - efektif);

      totalPekan += actualMaxWeeks;
      totalPekanEfektif += efektif;
      totalPekanTidakEfektif += tidakEfektif;

      return {
        bulan: m,
        jumlahPekan: actualMaxWeeks,
        pekanEfektif: efektif,
        pekanTidakEfektif: tidakEfektif,
        keterangan: getMonthKeterangan(semester, m, activeWeeks)
      };
    });

    const totalJp = totalPekanEfektif * jamWeekly;

    return (
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8" id={`rpe-semester-${semester.toLowerCase()}`}>
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">Semester {semester}</h3>
            <p className="text-xs text-teal-100 mt-0.5">Tahun Pelajaran {globalSettings?.tahunPelajaran || '2025/2026'}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black">{totalPekanEfektif}</span>
            <span className="text-xs text-teal-100 block">Pekan Efektif</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Distribution Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border border-slate-200 text-sm">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3 border-b text-center w-12">No</th>
                  <th className="px-4 py-3 border-b text-left w-36">Nama Bulan</th>
                  <th className="px-4 py-3 border-b text-center w-28">Jumlah Pekan</th>
                  <th className="px-4 py-3 border-b text-center w-36">Pekan Efektif</th>
                  <th className="px-4 py-3 border-b text-center w-40">Pekan Tidak Efektif</th>
                  <th className="px-4 py-3 border-b text-left">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {rowsData.map((row, idx) => (
                  <tr key={row.bulan} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.bulan}</td>
                    <td className="px-4 py-3 text-center">{row.jumlahPekan}</td>
                    <td className="px-4 py-3 text-center bg-emerald-50/30 text-emerald-800 font-medium">{row.pekanEfektif}</td>
                    <td className="px-4 py-3 text-center bg-rose-50/30 text-rose-800 font-medium">{row.pekanTidakEfektif}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">{row.keterangan}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={2} className="px-4 py-3 text-right">Jumlah Total</td>
                  <td className="px-4 py-3 text-center">{totalPekan}</td>
                  <td className="px-4 py-3 text-center bg-emerald-100/60 text-emerald-900">{totalPekanEfektif}</td>
                  <td className="px-4 py-3 text-center bg-rose-100/60 text-rose-900">{totalPekanTidakEfektif}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-normal italic">Pekan Efektif = {totalPekanEfektif} Minggu</td>
                </tr>
              </tbody>
            </table>
          </div>


          {/* Allocation Analysis Card */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-3 items-start">
              <div className="bg-teal-600 text-white p-2 rounded-lg mt-0.5 shadow">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-teal-900 text-sm">Distribusi Alokasi Jam Pelajaran (JP)</h4>
                <p className="text-teal-700 text-xs mt-0.5 max-w-xl">
                  Berdasarkan Pekan Efektif yang terhitung, total ketersediaan alokasi jam pelajaran untuk mata pelajaran ini adalah:
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-teal-900 bg-teal-100/50 px-3 py-1.5 rounded-md border border-teal-200/50 self-start">
                  <span>Rumus: Pekan Efektif ({totalPekanEfektif}) × Jam per Pekan ({jamWeekly} JP)</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-teal-300 rounded-lg px-6 py-3.5 text-center shadow-sm w-full sm:w-auto self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:justify-center">
              <span className="text-xs text-slate-500 font-medium">Total JP Efektif</span>
              <span className="text-3xl font-black text-teal-700">{totalJp} JP</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-12 border-t-2 border-slate-200 pt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            Rincian Pekan Efektif (RPE)
          </h2>
          <p className="text-sm text-slate-500">Analisis dan rincian alokasi waktu efektif pembelajaran per semester.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-slate-100 border text-slate-600 px-3 py-1.5 rounded-full font-medium">Mapel: <strong className="text-slate-800">{subject}</strong></span>
          <span className="bg-slate-100 border text-slate-600 px-3 py-1.5 rounded-full font-medium">Kelas: <strong className="text-slate-800">{grade}</strong></span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-xs flex gap-2.5 mb-6">
        <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
        <div>
          Perhatian! Jumlah Pekan, pekan efektif dan tidak adalah ditentukan oleh Tim Pengembang Kurikulum (TPK) dengan merujuk kalender pendidikan MTsN 4 Jombang.
        </div>
      </div>

      {renderSemesterRpe('Ganjil')}
      {renderSemesterRpe('Genap')}
    </div>
  );
};
