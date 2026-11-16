import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const globalFlag = /** @type {{ __guruTsHooksRegistered?: boolean }} */ (globalThis);

if (!globalFlag.__guruTsHooksRegistered) {
  globalFlag.__guruTsHooksRegistered = true;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      let target = specifier;
      if (target.startsWith('@/')) {
        target = pathToFileURL(path.join(rootDir, 'src', target.slice(2))).href;
      }

      const isRelativeOrFile =
        target.startsWith('./') || target.startsWith('../') || target.startsWith('file://');

      if (isRelativeOrFile) {
        const baseDir = context.parentURL
          ? path.dirname(fileURLToPath(context.parentURL))
          : rootDir;
        const resolvedPath = target.startsWith('file://')
          ? fileURLToPath(target)
          : path.resolve(baseDir, target);

        if (!path.extname(resolvedPath)) {
          for (const ext of ['.ts', '.tsx', '.mts', '.mjs', '.js']) {
            if (fs.existsSync(resolvedPath + ext)) {
              return nextResolve(pathToFileURL(resolvedPath + ext).href, context);
            }
          }
          const indexCandidates = ['index.ts', 'index.tsx', 'index.mjs', 'index.js'];
          for (const idxFile of indexCandidates) {
            const p = path.join(resolvedPath, idxFile);
            if (fs.existsSync(p)) {
              return nextResolve(pathToFileURL(p).href, context);
            }
          }
        }
      }

      return nextResolve(target, context);
    },

    load(url, context, nextLoad) {
      if (url.endsWith('.tsx')) {
        const filePath = fileURLToPath(url);
        const sourceText = fs.readFileSync(filePath, 'utf8');
        const transpiled = ts.transpileModule(sourceText, {
          fileName: filePath,
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
          },
        });
        return {
          format: 'module',
          shortCircuit: true,
          source: transpiled.outputText,
        };
      }
      return nextLoad(url, context);
    },
  });
}
