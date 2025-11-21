
import React, { useState, useEffect, useCallback } from 'react';
import { View, TPData, TPGroup, ATPData, ATPTableRow, PROTAData, KKTPData, PROSEMData } from './types';
import * as apiService from './services/dbService';
import * as geminiService from './services/geminiService';
import SubjectSelector from './components/SubjectSelector';
import SubjectDashboard from './components/SubjectDashboard';
import TPMenu from './components/TPMenu';
import TPEditor from './components/TPEditor';
import ATPEditor from './components/ATPEditor';
import LoadingOverlay from './components/LoadingOverlay';
import { PlusIcon, EditIcon, TrashIcon, BackIcon, ClipboardIcon, AlertIcon, CloseIcon, FlowChartIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, DownloadIcon, BookOpenIcon, ChecklistIcon, CalendarIcon, ListIcon } from './components/icons';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-lg w-full sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
               <img 
                 src="https://id.ppdb.mtsn4jombang.org/assets/img/logo/logo_ppdb695