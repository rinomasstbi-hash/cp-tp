import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TPData, RPMData, RPMInput, IntegrationOption, ATPData } from '../types';
import { generateRPMStream } from '../services/geminiService';
import { BackIcon, SparklesIcon, SaveIcon, TrashIcon, EditIcon } from './icons';

interface RPMDetailProps {
  tp: TPData;
  rpm: RPMData | null;
  atp?: ATPData | null;
  teacherName: string;
  teacherNip: string;
  onSave: (data: Omit<RPMData, 'id' | 'createdAt' | 'userId'>) => Promise<RPMData>;
  onUpdate: (id: string, data: Partial<RPMData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

const PREDEFINED_PRACTICES = [
  'Problem-Based Learning (PBL)',
  'Project-Based Learning (PjBL)',
  'Inquiry-Discovery Learning',
  'Differentiated Instruction (Pembelajaran Berdiferensiasi)',
  'Cooperative Learning (STAD / Jigsaw)',
  'Game-Based Learning',
  'Pembelajaran Interaktif / Diskusi Kelompok',
  'Praktikum / Eksperimen Langsung',
  'Studi Kasus & Debat Terbimbing'
];

const GRADUATE_DIMENSIONS_LIST = [
  'Bernalar Kritis',
  'Kreatif',
  'Gotong Royong',
  'Mandiri',
  'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia',
  'Berkebinekaan Global'
];

export const RPMDetail: React.FC<RPMDetailProps> = ({
  tp,
  rpm,
  atp,
  teacherName,
  teacherNip,
  onSave,
  onUpdate,
  onDelete,
  onBack
}) => {
  // Extract Materi options from TPData
  const materiOptions = useMemo(() => {
    if (!tp?.tpGroups || tp.tpGroups.length === 0) return [];
    return Array.from(new Set(tp.tpGroups.map(g => g.materi)));
  }, [tp]);

  const [selectedMateriDropdown, setSelectedMateriDropdown] = useState<string>(
    materiOptions[0] || ''
  );

  // List of TPs for selectedMateriDropdown
  const currentMateriTPs = useMemo(() => {
    if (!selectedMateriDropdown || !tp?.tpGroups) return [];
    const matchingGroups = tp.tpGroups.filter(g => g.materi === selectedMateriDropdown);
    const list: { subMateri: string; tpText: string }[] = [];
    matchingGroups.forEach(g => {
      g.subMateriGroups.forEach(sm => {
        sm.tps.forEach(t => {
          list.push({ subMateri: sm.subMateri, tpText: t });
        });
      });
    });
    return list;
  }, [tp, selectedMateriDropdown]);

  // Extract default TP objectives and subject matter
  const initialTPs = tp.tpGroups
    ? tp.tpGroups.flatMap(g => g.subMateriGroups.flatMap(sm => sm.tps)).join(';\n')
    : '';
  const initialMateris = tp.tpGroups
    ? tp.tpGroups.map(g => g.materi).join(', ')
    : '';

  const initialMateriFirstTPs = useMemo(() => {
    if (!materiOptions[0] || !tp?.tpGroups) return '';
    const matchingGroups = tp.tpGroups.filter(g => g.materi === materiOptions[0]);
    const list: string[] = [];
    matchingGroups.forEach(g => {
      g.subMateriGroups.forEach(sm => {
        sm.tps.forEach(t => list.push(t));
      });
    });
    return list.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
  }, [tp, materiOptions]);

  // Checked TPs state for the selected Materi
  const [checkedTPsMap, setCheckedTPsMap] = useState<Record<string, boolean>>({});

  // When selectedMateriDropdown changes, default check all TPs for that materi
  useEffect(() => {
    if (currentMateriTPs.length > 0) {
      const initialMap: Record<string, boolean> = {};
      currentMateriTPs.forEach(item => {
        initialMap[item.tpText] = true;
      });
      setCheckedTPsMap(initialMap);
      if (!rpm?.inputData) {
        setFormLearningObjectives(currentMateriTPs.map((item, idx) => `${idx + 1}. ${item.tpText}`).join('\n'));
        if (selectedMateriDropdown) {
          setFormSubjectMatter(selectedMateriDropdown);
        }
      }
    }
  }, [selectedMateriDropdown, currentMateriTPs]);

  // Extract ATP Panca Cinta matches
  const atpPancaCintaMatches = useMemo(() => {
    if (!atp?.content || atp.content.length === 0) return [];
    const matched = atp.content.filter(row => row.integrasiPancaCinta || row.aktivitasCinta);
    return matched;
  }, [atp]);

  const initialKbcFromATP = useMemo(() => {
    if (rpm?.inputData?.kbcPancaCintaFromATP) {
      return rpm.inputData.kbcPancaCintaFromATP;
    }
    if (atpPancaCintaMatches.length > 0) {
      return atpPancaCintaMatches
        .map(row => `- Topik/Materi: ${row.topikMateri}\n  Integrasi Panca Cinta: ${row.integrasiPancaCinta || '-'}\n  Aktivitas Cinta: ${row.aktivitasCinta || '-'}`)
        .join('\n\n');
    }
    return '';
  }, [atpPancaCintaMatches, rpm]);

  const [formKbcPancaCintaFromATP, setFormKbcPancaCintaFromATP] = useState<string>(initialKbcFromATP);

  useEffect(() => {
    if (initialKbcFromATP && !formKbcPancaCintaFromATP) {
      setFormKbcPancaCintaFromATP(initialKbcFromATP);
    }
  }, [initialKbcFromATP]);

  // Form State
  const [formTeacherName, setFormTeacherName] = useState(
    rpm?.inputData?.teacherName || tp.creatorName || teacherName || ''
  );
  const [formTeacherNip, setFormTeacherNip] = useState(
    rpm?.inputData?.teacherNip || teacherNip || ''
  );
  const [formClassName, setFormClassName] = useState(
    rpm?.inputData?.className || tp.grade || 'VII'
  );
  const [formSemester, setFormSemester] = useState<'Ganjil' | 'Genap'>(
    rpm?.inputData?.semester || 'Ganjil'
  );
  const [formSubject, setFormSubject] = useState(
    rpm?.inputData?.subject || tp.subject || ''
  );
  const [formLearningObjectives, setFormLearningObjectives] = useState(
    rpm?.inputData?.learningObjectives || initialMateriFirstTPs || initialTPs
  );
  const [formSubjectMatter, setFormSubjectMatter] = useState(
    rpm?.inputData?.subjectMatter || materiOptions[0] || initialMateris
  );
  const [formStudentTarget, setFormStudentTarget] = useState(
    rpm?.inputData?.studentTarget || ''
  );
  const [formLanguage, setFormLanguage] = useState<'Bahasa Indonesia' | 'Bahasa Arab' | 'Bahasa Inggris'>(
    rpm?.inputData?.language || 'Bahasa Indonesia'
  );
  const [formMeetings, setFormMeetings] = useState<number>(
    rpm?.inputData?.meetings || 2
  );
  const [formPractices, setFormPractices] = useState<string[]>(
    rpm?.inputData?.pedagogicalPractices && rpm.inputData.pedagogicalPractices.length > 0
      ? rpm.inputData.pedagogicalPractices
      : ['Problem-Based Learning (PBL)', 'Project-Based Learning (PjBL)']
  );
  const [formDimensions, setFormDimensions] = useState<string[]>(
    rpm?.inputData?.graduateDimensions && rpm.inputData.graduateDimensions.length > 0
      ? rpm.inputData.graduateDimensions
      : ['Bernalar Kritis', 'Kreatif', 'Gotong Royong']
  );
  const [formIntegration, setFormIntegration] = useState<string>(
    rpm?.inputData?.integrationOption || IntegrationOption.NONE
  );

  // Active view mode: 'form' or 'preview'
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>(
    rpm?.htmlContent ? 'preview' : 'form'
  );

  // Content state
  const [htmlContent, setHtmlContent] = useState<string>(rpm?.htmlContent || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedRpmId, setSavedRpmId] = useState<string | null>(rpm?.id || null);

  // In-App Toast Notification & Delete Confirm Modal
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // Calculate total JP from ATP matching selected Materi and strictly checked TPs
  const atpJpInfo = useMemo(() => {
    if (!atp?.content || atp.content.length === 0) return null;

    const activeTpTexts = currentMateriTPs
      .filter(item => checkedTPsMap[item.tpText] !== false)
      .map(item => item.tpText);

    if (currentMateriTPs.length === 0 || activeTpTexts.length === 0) {
      return { totalJp: 0, suggestedMeetings: 1 };
    }

    // Filter candidate rows in ATP matching selected materi
    const materiRows = atp.content.filter(row => {
      if (!selectedMateriDropdown || !row.topikMateri) return false;
      return (
        row.topikMateri.toLowerCase().includes(selectedMateriDropdown.toLowerCase()) ||
        selectedMateriDropdown.toLowerCase().includes(row.topikMateri.toLowerCase())
      );
    });

    const candidateRows = materiRows.length > 0 ? materiRows : atp.content;

    // Filter candidateRows strictly matching the active checked TPs
    const matchedRows = candidateRows.filter(row => {
      if (!row.tp) return false;
      const rowTpLower = row.tp.toLowerCase();
      return activeTpTexts.some(tpText => {
        const tpLower = tpText.toLowerCase();
        return rowTpLower.includes(tpLower) || tpLower.includes(rowTpLower);
      });
    });

    let totalJp = 0;
    if (matchedRows.length > 0) {
      matchedRows.forEach(row => {
        if (row.alokasiWaktu) {
          const match = row.alokasiWaktu.match(/(\d+)/);
          if (match) {
            totalJp += parseInt(match[1], 10);
          }
        }
      });
    } else {
      // Fallback ratio: total candidate JP * (checked TPs / total TPs)
      let candidateJp = 0;
      candidateRows.forEach(row => {
        if (row.alokasiWaktu) {
          const match = row.alokasiWaktu.match(/(\d+)/);
          if (match) {
            candidateJp += parseInt(match[1], 10);
          }
        }
      });
      const ratio = activeTpTexts.length / currentMateriTPs.length;
      totalJp = Math.round(candidateJp * ratio);
    }

    const suggestedMeetings = Math.max(1, Math.min(8, Math.round(totalJp / 2)));

    return {
      totalJp,
      suggestedMeetings
    };
  }, [atp, selectedMateriDropdown, checkedTPsMap, currentMateriTPs]);

  // Dynamically sync formMeetings with suggestedMeetings whenever TP selection or atpJpInfo updates
  useEffect(() => {
    if (atpJpInfo && atpJpInfo.suggestedMeetings > 0) {
      setFormMeetings(atpJpInfo.suggestedMeetings);
    }
  }, [atpJpInfo?.suggestedMeetings, atpJpInfo?.totalJp]);

  // Ensure practices array matches meetings count
  useEffect(() => {
    if (formPractices.length < formMeetings) {
      const updated = [...formPractices];
      while (updated.length < formMeetings) {
        updated.push(PREDEFINED_PRACTICES[updated.length % PREDEFINED_PRACTICES.length]);
      }
      setFormPractices(updated);
    } else if (formPractices.length > formMeetings) {
      setFormPractices(formPractices.slice(0, formMeetings));
    }
  }, [formMeetings]);

  const handlePracticeChange = (index: number, val: string) => {
    const updated = [...formPractices];
    updated[index] = val;
    setFormPractices(updated);
  };

  const toggleDimension = (dim: string) => {
    if (formDimensions.includes(dim)) {
      setFormDimensions(formDimensions.filter(d => d !== dim));
    } else {
      setFormDimensions([...formDimensions, dim]);
    }
  };

  // Toggle single TP checkbox
  const handleToggleTP = (tpText: string) => {
    const isCurrentlyChecked = checkedTPsMap[tpText] !== false;
    const nextMap = { ...checkedTPsMap, [tpText]: !isCurrentlyChecked };
    setCheckedTPsMap(nextMap);

    const activeList = currentMateriTPs
      .filter(item => nextMap[item.tpText] !== false)
      .map(item => item.tpText);

    if (activeList.length > 0) {
      setFormLearningObjectives(activeList.map((t, idx) => `${idx + 1}. ${t}`).join('\n'));
      setFormSubjectMatter(selectedMateriDropdown);
    } else {
      setFormLearningObjectives('');
    }
  };

  const handleSelectAllTPs = () => {
    const allChecked: Record<string, boolean> = {};
    currentMateriTPs.forEach(item => {
      allChecked[item.tpText] = true;
    });
    setCheckedTPsMap(allChecked);
    setFormLearningObjectives(currentMateriTPs.map((item, idx) => `${idx + 1}. ${item.tpText}`).join('\n'));
    setFormSubjectMatter(selectedMateriDropdown);
  };

  const handleDeselectAllTPs = () => {
    const allUnchecked: Record<string, boolean> = {};
    currentMateriTPs.forEach(item => {
      allUnchecked[item.tpText] = false;
    });
    setCheckedTPsMap(allUnchecked);
    setFormLearningObjectives('');
  };

  const handleGenerateRPM = async () => {
    setErrorMessage(null);
    setIsGenerating(true);
    setActiveTab('preview');
    setHtmlContent('');

    const inputData: RPMInput = {
      teacherName: formTeacherName,
      teacherNip: formTeacherNip,
      className: formClassName,
      semester: formSemester,
      subject: formSubject,
      learningObjectives: formLearningObjectives,
      subjectMatter: formSubjectMatter,
      studentTarget: formStudentTarget,
      language: formLanguage,
      meetings: formMeetings,
      pedagogicalPractices: formPractices,
      graduateDimensions: formDimensions,
      integrationOption: formIntegration,
      kbcPancaCintaFromATP: formKbcPancaCintaFromATP
    };

    try {
      let accumulated = '';
      const finalResult = await generateRPMStream(inputData, (chunkHtml) => {
        accumulated = chunkHtml;
        setHtmlContent(chunkHtml);
      });

      const cleanHtml = finalResult || accumulated;
      setHtmlContent(cleanHtml);

      // Auto save after generation complete if possible
      try {
        setIsSaving(true);
        if (savedRpmId) {
          await onUpdate(savedRpmId, {
            inputData,
            htmlContent: cleanHtml,
            subject: formSubject,
            grade: formClassName,
            semester: formSemester
          });
        } else {
          const newRpm = await onSave({
            tpId: tp.id || '',
            subject: formSubject,
            grade: formClassName,
            semester: formSemester,
            inputData,
            htmlContent: cleanHtml,
            creatorName: formTeacherName
          });
          if (newRpm?.id) {
            setSavedRpmId(newRpm.id);
          }
        }
      } catch (saveErr) {
        console.warn("Auto save failed:", saveErr);
      } finally {
        setIsSaving(false);
      }

    } catch (err: any) {
      console.error("Error generating RPM:", err);
      setErrorMessage(err.message || 'Gagal membuat RPM. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSave = async () => {
    if (!htmlContent) return;
    setIsSaving(true);
    setErrorMessage(null);

    const inputData: RPMInput = {
      teacherName: formTeacherName,
      teacherNip: formTeacherNip,
      className: formClassName,
      semester: formSemester,
      subject: formSubject,
      learningObjectives: formLearningObjectives,
      subjectMatter: formSubjectMatter,
      studentTarget: formStudentTarget,
      language: formLanguage,
      meetings: formMeetings,
      pedagogicalPractices: formPractices,
      graduateDimensions: formDimensions,
      integrationOption: formIntegration,
      kbcPancaCintaFromATP: formKbcPancaCintaFromATP
    };

    try {
      if (savedRpmId) {
        await onUpdate(savedRpmId, {
          inputData,
          htmlContent,
          subject: formSubject,
          grade: formClassName,
          semester: formSemester
        });
      } else {
        const newRpm = await onSave({
          tpId: tp.id || '',
          subject: formSubject,
          grade: formClassName,
          semester: formSemester,
          inputData,
          htmlContent,
          creatorName: formTeacherName
        });
        if (newRpm?.id) {
          setSavedRpmId(newRpm.id);
        }
      }
      setToast({ type: 'success', text: 'RPM berhasil disimpan ke database!' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan RPM ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRPMPrompt = () => {
    if (!savedRpmId) return;
    setShowDeleteConfirm(true);
  };

  const executeDeleteRPM = async () => {
    if (!savedRpmId) return;
    try {
      await onDelete(savedRpmId);
      setSavedRpmId(null);
      setHtmlContent('');
      setActiveTab('form');
      setShowDeleteConfirm(false);
      setToast({ type: 'info', text: 'RPM berhasil dihapus.' });
    } catch (err: any) {
      setShowDeleteConfirm(false);
      setErrorMessage('Gagal menghapus RPM: ' + (err.message || String(err)));
    }
  };

  const handleExportWord = () => {
    if (!htmlContent) return;

    const fullDoc = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>RPM - ${formSubject}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 21.0cm 29.7cm;
      margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      mso-page-orientation: portrait;
    }
    @page Section1 {
      size: 595.3pt 841.9pt;
      margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 6pt; text-align: justify; vertical-align: top; }
    h1, h2, h3, h4, h5 { color: #000; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
    h2 { font-size: 16pt; text-align: center; }
    h3 { font-size: 13pt; text-align: left; }
    p { margin-top: 0; margin-bottom: 6pt; text-align: justify; }
    ul, ol { margin-left: 0.63cm; text-indent: -0.63cm; padding-left: 0; margin-top: 0; margin-bottom: 6pt; text-align: left; }
    
    /* PERATAAN RATA KIRI KHUSUS UNTUK SELURUH SEKSI LAMPIRAN */
    .lampiran-section, .lampiran-section *,
    [data-lampiran], [data-lampiran] *,
    h4, h5 {
      text-align: left !important;
    }

    .signature-table { border: none !important; width: 100% !important; margin-top: 24pt !important; table-layout: fixed !important; }
    .signature-table td { border: none !important; text-align: left !important; vertical-align: top !important; }
    .col-left { width: 566.9pt !important; }
    .col-right { width: 226.77pt !important; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <div class="Section1">
    ${htmlContent}
  </div>
</body>
</html>`;

    const cleanClass = (formClassName || 'Kelas').replace(/[\/\\?%*:|"<>]/g, '').trim();
    const cleanMateri = (selectedMateriDropdown || formSubjectMatter || 'Materi').replace(/[\/\\?%*:|"<>]/g, '').trim();
    const fileName = `RPM_${cleanClass}_${cleanMateri}.doc`;

    const blob = new Blob(['\ufeff', fullDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`mb-4 p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            {toast.type === 'success' && <span>✅</span>}
            {toast.type === 'error' && <span>⚠️</span>}
            {toast.type === 'info' && <span>ℹ️</span>}
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-lg">
                🗑️
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Konfirmasi Hapus RPM</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus dokumen Rencana Pembelajaran Mendalam (RPM) ini dari database?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteRPM}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Ya, Hapus RPM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 no-print">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 font-semibold"
          >
            <BackIcon className="w-5 h-5" />
            Kembali ke Menu Perangkat Ajar
          </button>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            Rencana Pembelajaran Mendalam (RPM)
            <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-full shadow-sm">
              KBC / SRA / Literasi / Numerasi
            </span>
          </h1>
          <p className="text-slate-500 mt-1">
            Mata Pelajaran: <span className="font-semibold">{formSubject}</span> | Kelas:{' '}
            <span className="font-semibold">{formClassName}</span> | Semester:{' '}
            <span className="font-semibold">{formSemester}</span>
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between no-print">
          <div>
            <p className="font-semibold">Terjadi Kesalahan</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 no-print">
        <button
          onClick={() => setActiveTab('form')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'form'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <EditIcon className="w-4 h-4" />
          Pengaturan Parameter RPM
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          disabled={!htmlContent && !isGenerating}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          Dokumen & Hasil RPM {isGenerating && '(Sedang Dibuat...)'}
        </button>
      </div>

      {/* TAB 1: FORM PARAMETERS */}
      {activeTab === 'form' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 space-y-6 no-print">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Formulir Penyusunan RPM</h2>
              <p className="text-sm text-slate-500 mt-1">
                Lengkapi data dan preferensi pembelajaran di bawah ini. AI akan merancang dokumen RPM secara terstruktur.
              </p>
            </div>
            <button
              onClick={handleGenerateRPM}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-base shadow-lg shadow-teal-500/20 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <SparklesIcon className="w-5 h-5" />
              {isGenerating ? 'Memproses AI...' : 'Buat RPM dengan AI'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* KOLOM KIRI: Identitas & Modul Integrasi */}
            <div className="space-y-6 flex flex-col">
              {/* 1. Identitas Pembelajaran */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700 border-b border-slate-200 pb-2 flex items-center gap-2">
                  1. Identitas Pembelajaran
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Guru Pengampu (Lengkap dengan Gelar Akademik)
                  </label>
                  <input
                    type="text"
                    value={formTeacherName}
                    onChange={(e) => setFormTeacherName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    placeholder="Contoh: Dr. H. Ahmad Fulan, M.Pd."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gelar akademik/keagamaan akan ditampilkan utuh pada dokumen RPM dan tanda tangan.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP Guru
                  </label>
                  <input
                    type="text"
                    value={formTeacherNip}
                    onChange={(e) => setFormTeacherNip(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    placeholder="Nomor Induk Pegawai / -"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={formClassName}
                      onChange={(e) => setFormClassName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                      placeholder="misal: VII / VII A"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={formSemester}
                      onChange={(e) => setFormSemester(e.target.value as 'Ganjil' | 'Genap')}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bahasa Pembuka & Penutup
                  </label>
                  <select
                    value={formLanguage}
                    onChange={(e) =>
                      setFormLanguage(e.target.value as 'Bahasa Indonesia' | 'Bahasa Arab' | 'Bahasa Inggris')
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                  >
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                    <option value="Bahasa Arab">Bahasa Arab (Disertai Aksara & Transliterasi)</option>
                    <option value="Bahasa Inggris">Bahasa Inggris</option>
                  </select>
                </div>
              </div>

              {/* 2. Karakteristik & Modul Integrasi */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700 border-b border-slate-200 pb-2">
                  2. Karakteristik Murid & Modul Integrasi
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi Target / Karakteristik Murid (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={formStudentTarget}
                    onChange={(e) => setFormStudentTarget(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    placeholder="Kosongkan jika ingin di-generate otomatis oleh AI..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opsi Integrasi Utama
                  </label>
                  <select
                    value={formIntegration}
                    onChange={(e) => setFormIntegration(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium bg-white"
                  >
                    <option value={IntegrationOption.NONE}>Standar (Kurikulum Berbasis Cinta / KBC)</option>
                    <option value={IntegrationOption.SRA}>
                      Satuan Pendidikan Ramah Anak (SRA) (Disiplin Positif & Inklusif)
                    </option>
                    <option value={IntegrationOption.LITERASI}>
                      Penguatan Literasi (Stimulus Teks & Penalaran HOTS)
                    </option>
                    <option value={IntegrationOption.NUMERASI}>
                      Penguatan Numerasi (Data/Grafik & Penalaran Matematis)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Materi & TP */}
            <div className="space-y-6 flex flex-col h-full">
              {/* 3. Materi & Pilihan TP */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700 border-b border-slate-200 pb-2">
                  3. Materi & Pilihan Tujuan Pembelajaran (TP)
                </h3>

                {/* Pilih Materi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Materi Pelajaran
                  </label>
                  {materiOptions.length > 0 ? (
                    <select
                      value={selectedMateriDropdown}
                      onChange={(e) => {
                        const newMateri = e.target.value;
                        setSelectedMateriDropdown(newMateri);
                        setFormSubjectMatter(newMateri);
                      }}
                      className="w-full px-3.5 py-2 border border-teal-300 bg-teal-50/60 font-semibold rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-teal-900"
                    >
                      {materiOptions.map((materi, idx) => (
                        <option key={idx} value={materi}>
                          {materi}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formSubjectMatter}
                      onChange={(e) => setFormSubjectMatter(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                      placeholder="Topik / Pokok Bahasan Utama"
                    />
                  )}
                </div>

                {/* Checklist TP */}
                <div className="flex-1 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Pilih TP yang Di-generate dalam RPM ini:
                    </label>
                    {currentMateriTPs.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllTPs}
                          className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold underline"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllTPs}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline"
                        >
                          Hapus Semua
                        </button>
                      </div>
                    )}
                  </div>

                  {currentMateriTPs.length > 0 ? (
                    <div className="flex-1 min-h-[200px] max-h-[500px] overflow-y-auto p-2.5 border border-slate-200 bg-white rounded-xl space-y-1.5">
                      {currentMateriTPs.map((item, idx) => {
                        const isChecked = checkedTPsMap[item.tpText] !== false;
                        return (
                          <label
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isChecked ? 'bg-teal-50/60 border border-teal-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTP(item.tpText)}
                              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0"
                            />
                            <span className="leading-relaxed">{item.tpText}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada list TP terpisah untuk materi ini.</p>
                  )}
                </div>

                {/* Textarea TP Terpilih */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rincian TP Terpilih (Dapat Diedit Manual)
                  </label>
                  <textarea
                    rows={4}
                    value={formLearningObjectives}
                    onChange={(e) => setFormLearningObjectives(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                    placeholder="Rincian Tujuan Pembelajaran..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dimensi Lulusan & Pertemuan */}
          <div className="pt-4 border-t border-slate-100 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700 mb-3">
                5. Capaian Dimensi Lulusan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GRADUATE_DIMENSIONS_LIST.map((dim) => {
                  const isChecked = formDimensions.includes(dim);
                  return (
                    <label
                      key={dim}
                      onClick={() => toggleDimension(dim)}
                      className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 select-none ${
                        isChecked
                          ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      {dim}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-700">
                  6. Alokasi Pertemuan & Praktik Pedagogis
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Jumlah Pertemuan:</span>
                  <select
                    value={formMeetings}
                    onChange={(e) => setFormMeetings(Number(e.target.value))}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-xs font-bold text-teal-700 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        {num} Pertemuan
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ATP JP Recommendation Info Card */}
              {atpJpInfo && (
                <div className="mb-4 p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      ⏱️ Alokasi Waktu ATP: {atpJpInfo.totalJp} JP
                    </span>
                    <span className="text-[11px] text-teal-700 mt-0.5 block">
                      Total alokasi waktu pada ATP untuk materi/TP terpilih ini adalah {atpJpInfo.totalJp} JP ({atpJpInfo.suggestedMeetings} Pertemuan @ 2 JP).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormMeetings(atpJpInfo.suggestedMeetings)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    Gunakan {atpJpInfo.suggestedMeetings} Pertemuan
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: formMeetings }).map((_, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pertemuan Ke-{idx + 1}:
                    </label>
                    <select
                      value={formPractices[idx] || PREDEFINED_PRACTICES[0]}
                      onChange={(e) => handlePracticeChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-teal-500"
                    >
                      {PREDEFINED_PRACTICES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleGenerateRPM}
                disabled={isGenerating}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <SparklesIcon className="w-6 h-6" />
                {isGenerating ? 'Memproses AI...' : 'Buat RPM Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREVIEW & DOCUMENT RESULT */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Status & Actions Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isGenerating ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-sm font-semibold text-slate-700">
                {isGenerating ? 'AI sedang menyusun Rencana Pembelajaran Mendalam...' : 'Dokumen RPM Siap Disimpan & Diekspor'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {savedRpmId && (
                <button
                  onClick={handleDeleteRPMPrompt}
                  className="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Hapus RPM dari Database"
                >
                  <TrashIcon className="w-4 h-4" />
                  Hapus RPM
                </button>
              )}

              <button
                onClick={handleManualSave}
                disabled={isSaving || !htmlContent}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <SaveIcon className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan RPM'}
              </button>

              <button
                onClick={handleExportWord}
                disabled={!htmlContent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z" />
                </svg>
                Ekspor Word (.doc)
              </button>
            </div>
          </div>

          {/* Printable Container */}
          <div
            id="printable-rpm-area"
            ref={printContainerRef}
            className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 min-h-[800px] text-slate-900 font-serif leading-relaxed"
          >
            <style>{`
              .rpm-document-body .lampiran-section,
              .rpm-document-body .lampiran-section *,
              .rpm-document-body [data-lampiran],
              .rpm-document-body [data-lampiran] * {
                text-align: left !important;
              }
            `}</style>
            {htmlContent ? (
              <div
                className="rpm-document-body"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <SparklesIcon className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                <p className="font-sans font-semibold text-base text-slate-600">
                  Menghasilkan Rencana Pembelajaran Mendalam...
                </p>
                <p className="font-sans text-xs text-slate-400 mt-1">
                  Harap tunggu beberapa saat hingga AI selesai membuat dokumen.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
