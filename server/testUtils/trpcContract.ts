/**
 * Test utility — contract (schema-only) validation for tRPC v11 routers.
 *
 * tRPC v11 callers are lazy proxies: reaching into `caller.router.proc._def`
 * throws NOT_FOUND because `_def` is interpreted as a path segment. Instead we
 * read the router definition graph directly (`_def.record`) and grab the
 * procedure's input parser (`inputs["0"].parseAsync`) which validates with Zod
 * without executing the procedure or touching the database.
 */

type AnyRouter = { _def: { record: Record<string, any> } };

export function getInputParser(router: AnyRouter, path: string[]) {
  let node: any = router._def.record;
  for (const seg of path) {
    node = node?.[seg];
    if (!node) return undefined;
  }
  return node._def?.inputs?.["0"]?.parseAsync as
    | ((input: unknown) => Promise<unknown>)
    | undefined;
}

export function procedureExists(router: AnyRouter, path: string[]): boolean {
  let node: any = router._def.record;
  for (const seg of path) {
    node = node?.[seg];
    if (!node) return false;
  }
  return !!node && !!node._def;
}

export async function parseInput<T = unknown>(
  router: AnyRouter,
  path: string[],
  input: unknown
): Promise<T> {
  const parse = getInputParser(router, path);
  if (!parse) throw new Error(`no input parser for ${path.join(".")}`);
  return (await parse(input)) as T;
}

export async function expectValidInput(
  router: AnyRouter,
  path: string[],
  input: unknown
): Promise<void> {
  await parseInput(router, path, input);
}

export async function expectInvalidInput(
  router: AnyRouter,
  path: string[],
  input: unknown
): Promise<void> {
  const parse = getInputParser(router, path);
  if (!parse) throw new Error(`no input parser for ${path.join(".")}`);
  let rejected = false;
  try {
    await parse(input);
  } catch {
    rejected = true;
  }
  if (!rejected)
    throw new Error(
      `expected ${path.join(".")} to reject ${JSON.stringify(input)}`
    );
}
