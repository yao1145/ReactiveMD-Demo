import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import {
  listExportAssets,
  readExportAsset,
  resolveExportAsset,
  type ExportAssetId,
} from 'reactive-md/export-assets';

/** Inline the engine's export assets through `reactive-md/export-assets`. */
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
    load(id) {
      if (!id.startsWith('\0' + PREFIX)) return null;
      const name = exportAssetId(id.slice(PREFIX.length + 1));
      this.addWatchFile(fileURLToPath(resolveExportAsset(name)));
      return 'export default ' + JSON.stringify(readExportAsset(name)) + ';';
    },
  };
}
