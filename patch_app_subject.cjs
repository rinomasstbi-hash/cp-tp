const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf-8');

code = code.replace(
    `return <SubjectSelector onSelectSubject={handleSelectSubject} isAdmin={isAdmin} onViewChange={setView} />;`,
    `return <SubjectSelector 
          onSelectSubject={handleSelectSubject} 
          isAdmin={isAdmin} 
          onViewChange={setView}
          subjects={globalSettings?.mataPelajaran || [
            "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam", 
            "Bahasa Arab", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", 
            "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", "Bahasa Inggris", 
            "Pend. Jasmani, Olahraga, dan Kesehatan", "Informatika", "Seni Budaya & Prakarya", 
            "Mabadi' Fiqh", "Aswaja", "Bahasa Jawa"
          ]}
        />;`
);

fs.writeFileSync('App.tsx', code);
