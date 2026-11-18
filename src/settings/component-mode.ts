import type { LocalReactHost } from 'reactive-md/react';
import type { EditorComponentMode } from 'reactive-md-editor';
import { host } from 'virtual:reactive-md/host';
import { host as minimalHost } from 'virtual:reactive-md-minimal-host';

/**
 * Keep discovered project packages, preset identities and resources in either
 * component mode. Both hosts come from the same Vite discovery snapshot, so a
 * third-party preset keeps its own identity and dependency order; the mode only
 * swaps the base preset.
 */
export function getDemoHost(mode: EditorComponentMode = 'default'): LocalReactHost {
  return mode === 'minimal' ? minimalHost : host;
}
