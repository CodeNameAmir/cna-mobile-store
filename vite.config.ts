import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

function getGitInfo() {
  const safeExec = (cmd: string): string => {
    try {
      return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return '';
    }
  };

  const sha = process.env.VITE_COMMIT_SHA || process.env.GITHUB_SHA || safeExec('git rev-parse HEAD');
  const shortSha = sha ? sha.slice(0, 7) : (safeExec('git rev-parse --short HEAD') || 'dev');
  const commitMsg = safeExec('git log -1 --pretty=%s') || 'Working tree build';
  const commitDate = safeExec('git log -1 --format=%cd') || '';
  const branch = process.env.VITE_COMMIT_REF || process.env.GITHUB_REF_NAME || safeExec('git rev-parse --abbrev-ref HEAD') || 'main';

  return {
    commitSha: shortSha,
    fullSha: sha || shortSha,
    commitMessage: commitMsg,
    commitDate: commitDate,
    branch: branch,
    buildTime: new Date().toISOString(),
  };
}

export default defineConfig(() => {
  const buildInfo = getGitInfo();

  return {
    base: './',
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
