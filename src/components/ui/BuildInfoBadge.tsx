/**
 * [TEMPORARY COMPONENT - EASY TO REMOVE LATER]
 * نشانگر وضعیت بیلد و آخرین کامیت گیت‌هاب
 * برای بررسی سلامت بیلد و اطمینان از اعمال تغییرات در فرانت‌اند
 */

import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  GitBranch,
  Clock,
  Copy,
  Check,
  RotateCw,
  X,
  ChevronUp,
  ChevronDown,
  Server,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  getBuildInfo,
  formatPersianDateTime,
  formatGregorianDateTime,
  formatRelativeTimePersian,
} from '../../utils/buildInfo';
import { DATA_SOURCE, isSupabaseConfigured } from '../../services/config';

export const BuildInfoBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [relativeTime, setRelativeTime] = useState('');

  const buildInfo = getBuildInfo();

  // Update relative time periodically (every 15s)
  useEffect(() => {
    const updateTime = () => {
      setRelativeTime(formatRelativeTimePersian(buildInfo.buildTime));
    };
    updateTime();
    const timer = setInterval(updateTime, 15000);
    return () => clearInterval(timer);
  }, [buildInfo.buildTime]);

  // Listen to open requests from footer or other components
  useEffect(() => {
    const handleOpenBadge = () => setIsOpen(true);
    window.addEventListener('open-build-badge', handleOpenBadge);
    return () => window.removeEventListener('open-build-badge', handleOpenBadge);
  }, []);

  const handleCopySha = () => {
    navigator.clipboard.writeText(buildInfo.fullSha || buildInfo.commitSha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHardRefresh = () => {
    setIsRefreshing(true);
    try {
      // Clear sessionStorage/localStorage cache if appropriate, then reload
      sessionStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <aside
      aria-label="نشانگر مشخصات بیلد سایت"
      className="fixed bottom-4 left-4 z-50 font-sans text-xs select-none"
      dir="rtl"
    >
      {/* Expanded Modal / Card */}
      {isOpen ? (
        <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-900 text-sm">مشخصات بیلد و گیت‌هاب</span>
              <span className="bg-amber-100 text-amber-800 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                موقت
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                title="کوچک‌سازی"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5">
            {/* Commit Hash */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">کد کامیت (Commit SHA)</div>
                  <div className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                    {buildInfo.commitSha}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopySha}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                title="کپی هش کامل"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>کپی</span>
                  </>
                )}
              </button>
            </div>

            {/* Commit Message */}
            {buildInfo.commitMessage && (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>پیام کامیت:</span>
                </div>
                <p className="text-xs text-slate-700 font-mono leading-relaxed break-words bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
                  {buildInfo.commitMessage}
                </p>
              </div>
            )}

            {/* Branch and Build Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
                <div className="text-[10px] text-slate-500 font-medium mb-0.5 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-purple-600" />
                  <span>شاخه (Branch):</span>
                </div>
                <div className="font-mono text-[11px] font-bold text-purple-900 truncate">
                  {buildInfo.branch || 'main'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2">
                <div className="text-[10px] text-slate-500 font-medium mb-0.5 flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-600" />
                  <span>منبع داده:</span>
                </div>
                <div className="font-bold text-[11px] text-slate-900 flex items-center gap-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      DATA_SOURCE === 'supabase' && isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  />
                  <span>{DATA_SOURCE === 'supabase' ? 'Supabase' : 'Mock'}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>زمان ساخت بیلد:</span>
                </span>
                <span className="font-medium text-slate-900 font-mono" dir="ltr">
                  {relativeTime || 'لحظاتی پیش'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                {formatPersianDateTime(buildInfo.buildTime)}
              </div>
              <div className="text-[10px] font-mono text-slate-400" dir="ltr">
                {formatGregorianDateTime(buildInfo.buildTime)}
              </div>
            </div>
          </div>

          {/* Action Buttons & Note */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={handleHardRefresh}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-xs transition-colors border border-blue-200"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تازه‌سازی کَش مرورگر</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-xs transition-colors"
            >
              بستن
            </button>
          </div>

          {/* Removal Hint */}
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 justify-center">
            <HelpCircle className="w-3 h-3 text-slate-300" />
            <span>نشانگر موقت تست؛ با حذف BuildInfoBadge برداشته می‌شود.</span>
          </div>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-lg border border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="مشاهده اطلاعات بیلد و کامیت گیت‌هاب (نشان موقت)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-slate-200">
            بیلد: <span className="font-mono font-bold text-amber-300">{buildInfo.commitSha}</span>
          </span>
          {relativeTime && (
            <span className="hidden sm:inline text-[10px] text-slate-400 border-r border-slate-700 pr-2 mr-0.5">
              {relativeTime}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      )}
    </aside>
  );
};
