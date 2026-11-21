import { Children, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { MaximizeIcon, MinimizeIcon } from '../ui/icons';
import './preview-fullscreen.css';

export interface PreviewFullscreenState {
  /** The pane that becomes fullscreen; it is never remounted. */
  paneRef: RefObject<HTMLElement | null>;
  /** Native fullscreen or the CSS fallback overlay is active. */
  fullscreen: boolean;
  /** The CSS fixed overlay is active because the Fullscreen API failed. */
  fallback: boolean;
  toggle(): void;
  exit(): void;
}

function nativeFullscreenActive(pane: HTMLElement | null): boolean {
  return pane !== null && document.fullscreenElement === pane;
}

function exitNativeFullscreen(pane: HTMLElement | null) {
  if (!nativeFullscreenActive(pane) || typeof document.exitFullscreen !== 'function') return;
  void document.exitFullscreen().catch(() => { /* already left fullscreen */ });
}

/**
 * Turn the live preview pane into a fullscreen surface without remounting it,
 * so the interactive document keeps its runtime and control state.
 *
 * The native Fullscreen API is preferred. When it is missing or rejects (for
 * example inside an iframe without permission), the same element receives the
 * `is-preview-fullscreen` class and CSS pins it to the viewport instead.
 */
export function usePreviewFullscreen(enabled = true): PreviewFullscreenState {
  const paneRef = useRef<HTMLElement | null>(null);
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  // Esc in native fullscreen is handled by the browser; mirror whatever it
  // decides so the toggle label and icon return to the enter state.
  useEffect(() => {
    const sync = () => {
      const active = nativeFullscreenActive(paneRef.current);
      setNative(active);
      if (active) setFallback(false);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // The fallback overlay cannot rely on the browser, so it owns Escape. Native
  // fullscreen normally exits on Escape too; mirror that explicitly for
  // embedded contexts where the browser shortcut is unavailable.
  useEffect(() => {
    if (!fallback && !native) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (fallback) setFallback(false);
      else exitNativeFullscreen(paneRef.current);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fallback, native]);

  // Losing the live document (compile error, edit-only view) must not leave a
  // fullscreen surface with nothing in it.
  useEffect(() => {
    if (enabled) return;
    setFallback(false);
    exitNativeFullscreen(paneRef.current);
  }, [enabled]);

  useEffect(() => {
    const pane = paneRef.current;
    return () => exitNativeFullscreen(pane);
  }, []);

  const exit = useCallback(() => {
    setFallback(false);
    exitNativeFullscreen(paneRef.current);
  }, []);

  const toggle = useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (fallback) {
      setFallback(false);
      return;
    }
    if (nativeFullscreenActive(pane)) {
      exitNativeFullscreen(pane);
      return;
    }
    if (typeof pane.requestFullscreen !== 'function') {
      setFallback(true);
      return;
    }
    try {
      void Promise.resolve(pane.requestFullscreen()).then(
        () => {
          setNative(true);
          setFallback(false);
        },
        () => setFallback(true),
      );
    } catch {
      setFallback(true);
    }
  }, [fallback]);

  return {
    paneRef,
    fullscreen: native || fallback,
    fallback,
    toggle,
    exit,
  };
}

export interface PreviewFullscreenToggleProps {
  state: PreviewFullscreenState;
  enterLabel: string;
  exitLabel: string;
}

/** A transparent corner target lets touch users reveal or hide the actions. */
export function PreviewOverlayControls({ children, showLabel, hideLabel }: {
  children: ReactNode;
  showLabel: string;
  hideLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const actionsId = useId();
  // The group overlays the document through a negative margin sized for the
  // action buttons; without them it would pull the content above the pane.
  if (Children.toArray(children).length === 0) return null;
  return (
    <div className="preview-overlay-controls" data-open={open}>
      <button
        type="button"
        className="preview-controls-reveal"
        aria-label={open ? hideLabel : showLabel}
        aria-expanded={open}
        aria-controls={actionsId}
        onClick={() => setOpen(value => !value)}
      />
      <div id={actionsId} className="preview-overlay-actions">{children}</div>
    </div>
  );
}

/** Fullscreen action inside the preview's floating controls. */
export function PreviewFullscreenToggle({ state, enterLabel, exitLabel }: PreviewFullscreenToggleProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasFallback = useRef(false);

  // Esc closes the fallback overlay from inside the document; bring keyboard
  // focus back to the control that opened it.
  useEffect(() => {
    if (wasFallback.current && !state.fallback) buttonRef.current?.focus({ preventScroll: true });
    wasFallback.current = state.fallback;
  }, [state.fallback]);

  const label = state.fullscreen ? exitLabel : enterLabel;
  return (
    <button
      ref={buttonRef}
      type="button"
      className="preview-fullscreen-toggle"
      aria-label={label}
      title={label}
      onClick={state.toggle}
    >
      {state.fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
    </button>
  );
}
