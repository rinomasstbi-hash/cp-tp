const fs = require('fs');
let code = fs.readFileSync('components/AdminSettings.tsx', 'utf-8');

code = code.replace(
    `const [settings, setSettings] = useState<SettingsType>({
        geminiApiKey: '',
        tahunPelajaran: '2025/2026',
        kepalaMadrasah: 'Sulthon Sulaiman, M.Pd.I',
        nipKepalaMadrasah: '198106162005011003',`,
    `const [settings, setSettings] = useState<SettingsType>({
        geminiApiKey: '',
        tahunPelajaran: '2025/2026',
        namaAplikasi: 'Asisten Guru (AGRU)',
        kepalaMadrasah: 'Sulthon Sulaiman, M.Pd.I',
        nipKepalaMadrasah: '198106162005011003',`
);

code = code.replace(
    `<h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Konfigurasi Umum (Export Word)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tahun Pelajaran</label>`,
    `<h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Konfigurasi Umum</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Aplikasi</label>
                        <input 
                            type="text"
                            value={settings.namaAplikasi || 'Asisten Guru (AGRU)'}
                            onChange={(e) => setSettings({...settings, namaAplikasi: e.target.value})}
                            className="w-full border border-slate-300 rounded-md p-2.5 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tahun Pelajaran</label>`
);

// We need to keep the empty div for spacing or replace it? The original has:
// <div> (Tahun Pelajaran) </div>
// <div></div>
// <div> (Nama Kepala) </div>
// <div> (NIP) </div>
code = code.replace(
    `<div></div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kepala Madrasah</label>`,
    `<div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kepala Madrasah</label>`
);

fs.writeFileSync('components/AdminSettings.tsx', code);
