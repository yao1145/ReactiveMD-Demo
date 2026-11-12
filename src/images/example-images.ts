import spectrum from './gallery/spectrum.svg?raw';
import structure from './gallery/structure.svg?raw';
import field from './gallery/field.svg?raw';
import wave from './gallery/wave.svg?raw';

/** Repository-owned example artwork, embedded for preview and offline export. */
export const EXAMPLE_IMAGES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries({ spectrum, structure, field, wave }).map(([name, svg]) => [
    `/images/gallery/${name}.svg`,
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  ])),
);
