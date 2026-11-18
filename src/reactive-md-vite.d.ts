/// <reference types="reactive-md/vite/client" />

declare module 'virtual:reactive-md-assets/*' {
  const value: string;
  export default value;
}

/*
 * `virtual:reactive-md/host`, `virtual:reactive-md/bundle`,
 * `virtual:reactive-md-minimal-host` and `virtual:reactive-md-minimal-bundle`
 * are declared by `reactive-md/vite/client`. Minimal modules need
 * `reactiveMd({ includeMinimal: true })` in the Vite configuration.
 */
