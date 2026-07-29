/**
 * Test-only resolver for the extensionless TypeScript imports used by Vite.
 * Node strips TypeScript syntax natively, but its ESM resolver does not append
 * `.ts`; production code continues to be resolved and bundled by Vite.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    const alreadyHasExtension = /\.[a-z0-9]+$/i.test(specifier);
    if (!isRelative || alreadyHasExtension || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return nextResolve(`${specifier}.ts`, context);
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.json')) return nextLoad(url, context);
  const response = await nextLoad(url, { ...context, importAttributes: { type: 'json' } });
  const text = Buffer.isBuffer(response.source) ? response.source.toString('utf8') : String(response.source);
  return { format: 'module', shortCircuit: true, source: `export default ${text};` };
}
