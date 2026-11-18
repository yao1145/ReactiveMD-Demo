import { describe, expect, it } from 'vitest';
import { compileLocal, createLocalRuntime } from 'reactive-md';
import { EXAMPLES, DEFAULT_EXAMPLE_ID, localizedExample, localizedExamples } from '../src/content/examples';
import { host, examples as extensionExamples } from '../extensions';

const BUILTIN_COUNT = 8;

function exampleSource(id: string) {
  const example = EXAMPLES.find((item) => item.id === id);
  if (!example) throw new Error(`Missing example ${id}`);
  return example.source;
}

function flatten<T extends { children?: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

describe('playground local documents consumed through the public package', () => {
  it('ships the built-in examples and registered plugin examples', () => {
    expect(EXAMPLES).toHaveLength(BUILTIN_COUNT + extensionExamples.length);
    expect(new Set(EXAMPLES.map((example) => example.id)).size).toBe(EXAMPLES.length);
    const contributedIds = new Set(extensionExamples.map(example => example.id));
    const builtins = EXAMPLES.filter(example => !contributedIds.has(example.id));
    expect(builtins.filter(example => example.section === 'scenario').map(example => example.id)).toEqual(['classroom', 'proposal', 'minimal-budget', 'survey', 'blog']);
    expect(builtins.filter((example) => example.section === 'feature').map((example) => example.id))
      .toEqual(['features']);
    expect(builtins.filter((example) => example.section === 'reference').map((example) => example.id)).toEqual(['sci-fi-theme']);
    expect(builtins.filter((example) => example.section === 'debug').map((example) => example.id)).toEqual(['diagnostics']);
    expect(EXAMPLES.some((example) => example.id === DEFAULT_EXAMPLE_ID)).toBe(true);
    for (const example of EXAMPLES) {
      expect(example.source.trim().length).toBeGreaterThan(0);
      expect(example.source).not.toContain('```reactive-md');
      expect(example.source).not.toContain(':::');
    }
  });

  for (const example of EXAMPLES) {
    it(`${example.id}: ${example.id === 'diagnostics' ? 'reports intentional errors' : 'compiles and starts'}`, () => {
      const result = compileLocal(example.source, { config: host.config });
      if (example.id === 'diagnostics') {
        expect(result.ok).toBe(false);
        expect(result.diagnostics.length).toBeGreaterThanOrEqual(8);
        expect(result.diagnostics.every((item) => item.line > 0 && item.column > 0)).toBe(true);
        return;
      }
      if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
      const runtime = createLocalRuntime(result.document);
      const snapshot = runtime.snapshot();
      expect(snapshot.revision).toBe(0);
      expect(snapshot.state).toBeTypeOf('object');
      expect(runtime.validate()).toEqual([]);
      for (const name of Object.keys(result.document.computations ?? {})) expect(() => runtime.evaluate(name)).not.toThrow();
      runtime.dispose();
    });
  }

  it('runs the sci-fi theme example through its public bindings', () => {
    const result = compileLocal(exampleSource('sci-fi-theme'), { config: host.config });
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const runtime = createLocalRuntime(result.document);
    const nodes = flatten(result.document.nodes);
    const people = nodes.find((node) => node.attrs?.bind === 'people');
    const annual = nodes.find((node) => node.attrs?.bind === 'annual');
    expect(people?.name).toBe('slider');
    expect(annual?.name).toBe('toggle');
    expect(runtime.get(people!)).toBe(2);
    expect(runtime.get(annual!)).toBe(false);
    expect(runtime.set(people!, 5)).toEqual([]);
    expect(runtime.set(annual!, true)).toEqual([]);
    expect(runtime.evaluate('people * (annual ? 80 : 100)')).toBe(400);
    expect(runtime.evaluate('crewMonthly')).toBe(400);
    expect(runtime.evaluate('crewAnnual')).toBe(4800);
    expect(runtime.text('Monthly total: {{ crewMonthly }} USD.')).toBe('Monthly total: 400 USD.');
    runtime.dispose();
  });
});

describe('localized playground examples', () => {
  it('ships English and Chinese metadata and sources for every example', () => {
    expect(EXAMPLES).toHaveLength(BUILTIN_COUNT + extensionExamples.length);
    for (const example of EXAMPLES) {
      expect(example.title.trim().length, example.id).toBeGreaterThan(0);
      expect(example.hint.trim().length, example.id).toBeGreaterThan(0);
      expect(example.source.trim().length, example.id).toBeGreaterThan(0);
      expect(example.titleZh.trim().length, example.id).toBeGreaterThan(0);
      expect(example.hintZh.trim().length, example.id).toBeGreaterThan(0);
      expect(example.sourceZh.trim().length, example.id).toBeGreaterThan(0);
      expect(example.sourceZh, example.id).not.toBe(example.source);
      expect(example.titleZh, example.id).not.toBe(example.title);
      expect(example.sourceZh, example.id).not.toContain('```reactive-md');
      expect(example.sourceZh, example.id).not.toContain(':::');
    }
  });

  it('resolves English metadata and sources unchanged', () => {
    const localized = localizedExamples('en');
    expect(localized).toHaveLength(EXAMPLES.length);
    localized.forEach((example, index) => {
      const source = EXAMPLES[index];
      expect(example).toEqual({
        id: source.id,
        section: source.section,
        title: source.title,
        hint: source.hint,
        source: source.source,
      });
      expect(localizedExample(source, 'en')).toEqual(example);
    });
  });

  it('resolves Chinese metadata and sources from the same ids', () => {
    const localized = localizedExamples('zh');
    expect(localized).toHaveLength(EXAMPLES.length);
    localized.forEach((example, index) => {
      const source = EXAMPLES[index];
      expect(example).toEqual({
        id: source.id,
        section: source.section,
        title: source.titleZh,
        hint: source.hintZh,
        source: source.sourceZh,
      });
      expect(localizedExample(source, 'zh')).toEqual(example);
    });
  });

  for (const example of EXAMPLES) {
    it(`zh ${example.id}: ${example.id === 'diagnostics' ? 'reports intentional errors' : 'compiles and starts'}`, () => {
      const result = compileLocal(example.sourceZh, { config: host.config });
      if (example.id === 'diagnostics') {
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.diagnostics.length).toBeGreaterThanOrEqual(9);
        expect(result.diagnostics.every((item) => item.line > 0 && item.column > 0)).toBe(true);
        // Compiler diagnostics stay English even for Chinese documents.
        const messages = result.diagnostics.map((item) => item.message).join('\n');
        expect(messages).toMatch(/undeclared parameter seat\b/);
        return;
      }
      if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
      const runtime = createLocalRuntime(result.document);
      const snapshot = runtime.snapshot();
      expect(snapshot.revision).toBe(0);
      expect(snapshot.state).toBeTypeOf('object');
      expect(runtime.validate()).toEqual([]);
      for (const name of Object.keys(result.document.computations ?? {})) expect(() => runtime.evaluate(name)).not.toThrow();
      runtime.dispose();
    });
  }
});

describe.each(['en', 'zh'] as const)('%s feature tour outcomes', (language) => {
  it('keeps the expandable key source runnable as a small standalone example', () => {
    for (const example of EXAMPLES.filter(example => example.section === 'feature')) {
      const source = localizedExample(example, language).source.match(/```markdown\r?\n([\s\S]*?)\r?\n```/)?.[1];
      expect(source, example.id).toBeTruthy();
      const result = compileLocal(source!);
      expect(result.diagnostics, example.id).toEqual([]);
      if (!result.ok) throw new Error(example.id);
      const runtime = createLocalRuntime(result.document);
      try {
        expect(runtime.validate(), example.id).toEqual([]);
        for (const name of Object.keys(result.document.computations ?? {})) expect(() => runtime.evaluate(name), example.id).not.toThrow();
      } finally { runtime.dispose(); }
    }
  });
});
