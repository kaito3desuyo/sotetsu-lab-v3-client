export function collectComponentRoutes(
    readSource: (file: string) => string | undefined,
): [string, string][];

export function buildRouteTable(
    metafile: { outputs: Record<string, { entryPoint?: string }> },
    readSource: (file: string) => string | undefined,
): Record<string, string>;
