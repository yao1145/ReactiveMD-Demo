import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import {
  listExportAssets,
  readExportAsset,
  resolveExportAsset,
  type ExportAssetId,
} from 'reactive-md/export-assets';

/**
 * Inline the engine's export assets through `reactive-md/export-assets`.
 *
 * `virtual:reactive-md-minimal-bundle` is served by `reactiveMd({ includeMinimal: true })`
 * so the minimal host and its bundle come from one discovery snapshot and keep
 * the same packages, preset identities and resources as the default host.
 */
const PREFIX = 'virtual:reactive-md-assets/';
const ASSET_IDS = new Set<string>(listExportAssets().assets.map(asset => asset.id));

function exportAssetId(name: string): ExportAssetId {
  if (!ASSET_IDS.has(name)) throw new Error('Unknown engine export asset: ' + name);
  return name as ExportAssetId;
}

export function exportAssets(): Plugin {
  return {
    name: 'reactive-md-demo-export-assets',
    resolveId(id) { return id.startsWith(PREFIX) ? '\0' + id : null; },
    async load(id) {
      if (!id.startsWith('\0' + PREFIX)) return null;
      const asset = id.slice(PREFIX.length + 1);
      if (asset === 'minimal-css') {
        const file = fileURLToPath(import.meta.resolve('reactive-md/styles/minimal.css'));
        this.addWatchFile(file);
        return 'export default ' + JSON.stringify(await readFile(file, 'utf8')) + ';';
      }
      const name = exportAssetId(asset);
      this.addWatchFile(fileURLToPath(resolveExportAsset(name)));
      return 'export default ' + JSON.stringify(readExportAsset(name)) + ';';
    },
  };
}
