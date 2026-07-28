import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Sun, 
  Moon, 
  Globe, 
  Lock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Language } from '../types';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loading, authError, clearAuthError } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Top Brand Accent Line */}
      <div className="h-1.5 w-full bg-[#FF0066] shadow-sm z-30" />

      {/* Ambient Blurred Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-[#FF0066]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF0066] to-pink-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#FF0066]/20">
            H
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none">
              COMPANY <span className="text-[#FF0066]">HERO</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mt-0.5">
              {t('brand.dashboardTitle')}
            </span>
          </div>
        </div>

        {/* Header Controls: Theme & Language */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-2.5 mr-1" />
            {(['pt', 'en', 'es'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all uppercase ${
                  language === lang
                    ? 'bg-[#FF0066] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#FF0066] dark:hover:text-[#FF0066] rounded-full shadow-sm transition-all"
            title={theme === 'light' ? t('common.themeDark') : t('common.themeLight')}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content / Central Card */}
      <main className="flex-1 flex items-center justify-center p-6 z-20">
        <div className="w-full max-w-md">
          {/* Central Card */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 relative overflow-hidden">
            {/* Header Brand Line inside Card */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF0066] via-pink-500 to-rose-400" />

            {/* Top Pill Tag */}
            <div className="flex justify-between items-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black tracking-widest uppercase shadow-sm">
                <Lock className="w-3 h-3 text-[#FF0066]" />
                {t('login.loginPill')}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FF0066]" /> SSO Workspace
              </span>
            </div>

            {/* Hero Brand Title */}
            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#FF0066]/10 text-[#FF0066] flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {t('login.title')}
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('login.subtitle')}
              </p>
            </div>

            {/* Error Notification Box */}
            {authError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-medium relative animate-shake">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-900 dark:text-rose-100 mb-1">
                      {t('login.unauthorizedDomainError') ? t(authError) : t('login.generalError')}
                    </p>
                    <p className="text-[11px] opacity-90 leading-normal">
                      {t('login.domainRestrictionNotice')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={clearAuthError}
                  className="mt-2 text-[10px] font-bold underline text-rose-600 dark:text-rose-400 hover:text-rose-800"
                >
                  OK
                </button>
              </div>
            )}

            {/* Google Sign-In Action Button */}
            <div className="space-y-4">
              <button
                onClick={loginWithGoogle}
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 group relative overflow-hidden active:scale-[0.99] disabled:opacity-50"
              >
                {/* Google Icon SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? t('login.authenticating') : t('login.googleButton')}</span>
                <ArrowRight className="w-4 h-4 text-[#FF0066] group-hover:translate-x-1 transition-transform ml-auto" />
              </button>

              {/* Domain restriction helper text */}
              <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 flex items-start gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#FF0066] shrink-0 mt-0.5" />
                <span>{t('login.domainRestrictionNotice')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Corporate Minimalist Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 z-20 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF0066]" />
          <span>© {new Date().getFullYear()} {t('login.footerCopyright')}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            {t('login.heroTagline')}
          </span>
        </div>
      </footer>
    </div>
  );
};
