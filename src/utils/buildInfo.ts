/**
 * [TEMPORARY BUILD / DEPLOY DIAGNOSTICS UTILITY]
 * Utility to retrieve build timestamp, Git commit SHA, branch, and deploy metadata.
 * Designed to be easily removed once testing/troubleshooting is completed.
 */

export interface AppBuildInfo {
  commitSha: string;
  fullSha: string;
  commitMessage: string;
  commitDate: string;
  branch: string;
  buildTime: string;
}

declare global {
  const __APP_BUILD_INFO__: AppBuildInfo | undefined;
}

const fallbackBuildInfo: AppBuildInfo = {
  commitSha: '5a250dd',
  fullSha: '5a250dd',
  commitMessage: 'fix: relocate user_has_role and user_has_permission to public schema',
  commitDate: 'Sun Nov 8 17:44:11 2026 +0000',
  branch: 'main',
  buildTime: new Date().toISOString(),
};

export const getBuildInfo = (): AppBuildInfo => {
  if (typeof __APP_BUILD_INFO__ !== 'undefined' && __APP_BUILD_INFO__?.commitSha) {
    return __APP_BUILD_INFO__;
  }
  return fallbackBuildInfo;
};

export const formatPersianDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
};

export const formatGregorianDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return dateStr;
  }
};

export const formatRelativeTimePersian = (dateStr: string): string => {
  try {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    if (isNaN(d)) return '';
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 30) return 'هم‌اکنون (لحظاتی پیش)';
    if (diffSec < 60) return `${diffSec} ثانیه پیش`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} ساعت پیش`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} روز پیش`;
  } catch {
    return '';
  }
};
