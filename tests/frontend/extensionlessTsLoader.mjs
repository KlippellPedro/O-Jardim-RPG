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
