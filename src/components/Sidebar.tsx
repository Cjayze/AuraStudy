import React from 'react';
import { BrandMark } from './BrandMark';
import { LayoutDashboard, FileText, MessageSquareQuote, CheckSquare, FolderSync, Layers3 } from 'lucide-react';
import { Language, translate } from '../i18n';

type AppTab = 'dashboard' | 'documents' | 'chat' | 'quizzes' | 'flashcards';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  documentCount?: number;
  quizCount?: number;
  flashcardCount?: number;
  language?: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  documentCount = 0,
  quizCount = 0,
  flashcardCount = 0,
  language = 'vi' as Language
}) => {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const navItems = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'documents',
      label: t('documents'),
      icon: FileText,
      badge: documentCount > 0 ? documentCount : null
    },
    {
      id: 'chat',
      label: t('chat'),
      icon: MessageSquareQuote,
      badge: 'RAG'
    },
    {
      id: 'quizzes',
      label: t('quizzes'),
      icon: CheckSquare,
      badge: quizCount > 0 ? quizCount : null
    },
    {
      id: 'flashcards',
      label: t('flashcards'),
      icon: Layers3,
      badge: flashcardCount > 0 ? flashcardCount : null
    }
  ] as const;

  return (
    <aside id="app-sidebar" className="w-full lg:w-64 bg-slate-50/70 lg:min-h-[calc(100vh-61px)] border-b border-slate-200/80 lg:border-b-0 lg:border-r p-2 sm:p-3 lg:p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1 lg:space-y-1.5">
        <div className="hidden lg:block px-3 py-2 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
          {t('workspace')}
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex shrink-0 items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      isActive
                        ? 'bg-blue-700/80 text-white'
                        : item.badge === 'RAG'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mini Feature Card in Sidebar */}
      <div className="hidden lg:block mt-6 p-3.5 bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100/80 rounded-2xl">
        <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs mb-1">
          <BrandMark className="w-3.5 h-3.5 text-blue-600" />
          <span>{t('copilot')}</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
          {t('copilotDesc')}
        </p>
        <button
          id="sidebar-quick-upload-btn"
          onClick={() => setActiveTab('documents')}
          className="w-full py-1.5 px-2.5 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>{t('manageDocs')}</span>
        </button>
      </div>
    </aside>
  );
};
