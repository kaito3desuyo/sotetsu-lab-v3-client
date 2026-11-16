// ルート → ページ本体の chunk の表を作る。
// `ng build --stats-json` が出力先の直下に書く browser-stats.json（esbuild の metafile）から、
// src/app/app.route.ts をたどって見つけた loadComponent の部品を entryPoint に持つ出力を引き、
// <出力先>/server/route-preloads.json に `{ "/timetable/station": "chunk-XXXX.js", ... }` を書く。
// server.ts が起動時に読み、head の先読みに 1 本足す。
// 使い方: node scripts/build-route-preloads.mjs [出力先（既定 dist/sotetsu-lab-v3-client）]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import ts from 'typescript';

const ROOT_FILE = 'src/app/app.route.ts';
const ROOT_EXPORT = 'APP_ROUTES';
const MAX_DEPTH = 8;

function literalText(node) {
    return node &&
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        ? node.text
        : undefined;
}

function unwrap(node) {
    let current = node;
    while (
        current &&
        (ts.isAsExpression(current) ||
            ts.isSatisfiesExpression(current) ||
            ts.isParenthesizedExpression(current))
    ) {
        current = current.expression;
    }
    return current;
}

/** `() => import('./x').then((mod) => mod.NAME)` から { specifier, name } を取る */
function lazyTarget(initializer) {
    let specifier;
    let name;
    const visit = (node) => {
        if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
            specifier ??= literalText(node.arguments[0]);
        }
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'then'
        ) {
            const callback = node.arguments[0];
            const body =
                callback && ts.isArrowFunction(callback)
                    ? unwrap(callback.body)
                    : undefined;
            if (body && ts.isPropertyAccessExpression(body)) {
                name ??= body.name.text;
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(initializer);
    return specifier === undefined ? undefined : { specifier, name };
}

/** import の指定を、プロジェクトのルートからの .ts のパスにする。解けなければ undefined */
function resolveSpecifier(fromFile, specifier) {
    let base;
    if (specifier.startsWith('.')) {
        base = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
    } else if (specifier.startsWith('src/')) {
        base = specifier;
    } else {
        return undefined;
    }
    return base.endsWith('.ts') ? base : `${base}.ts`;
}

function findRoutesArray(sourceFile, exportName) {
    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === exportName
            ) {
                const array = unwrap(declaration.initializer);
                return array && ts.isArrayLiteralExpression(array)
                    ? array
                    : undefined;
            }
        }
    }
    return undefined;
}

/**
 * ルートの木をたどり、loadComponent を持つルートの [URL の path, 部品のファイル] を集める。
 * 読めない・解けないものは黙って飛ばす（その path は表に載らず、今の動きのまま）。
 * @param {(file: string) => string | undefined} readSource
 */
export function collectComponentRoutes(readSource) {
    const found = [];
    const walk = (file, exportName, prefix, depth) => {
        if (depth > MAX_DEPTH) {
            return;
        }
        const source = readSource(file);
        if (source === undefined) {
            return;
        }
        const sourceFile = ts.createSourceFile(
            file,
            source,
            ts.ScriptTarget.Latest,
            true,
        );
        const array = findRoutesArray(sourceFile, exportName);
        if (!array) {
            return;
        }
        walkRoutes(array, file, prefix, depth);
    };
    const walkRoutes = (array, file, prefix, depth) => {
        for (const element of array.elements) {
            const route = unwrap(element);
            if (!route || !ts.isObjectLiteralExpression(route)) {
                continue;
            }
            const props = new Map();
            for (const property of route.properties) {
                if (
                    ts.isPropertyAssignment(property) &&
                    ts.isIdentifier(property.name)
                ) {
                    props.set(property.name.text, property.initializer);
                }
            }
            const path = props.has('path')
                ? literalText(props.get('path'))
                : undefined;
            if (path === undefined) {
                continue; // path が定数などで読めないルート（読み込み失敗の画面）
            }
            const here = [...prefix, ...path.split('/').filter(Boolean)];
            if (here.includes('**')) {
                continue;
            }
            const component = props.has('loadComponent')
                ? lazyTarget(props.get('loadComponent'))
                : undefined;
            if (component) {
                const target = resolveSpecifier(file, component.specifier);
                if (target) {
                    found.push([`/${here.join('/')}`, target]);
                }
            }
            const children = props.has('children')
                ? unwrap(props.get('children'))
                : undefined;
            if (children && ts.isArrayLiteralExpression(children)) {
                walkRoutes(children, file, here, depth + 1);
            }
            const lazy = props.has('loadChildren')
                ? lazyTarget(props.get('loadChildren'))
                : undefined;
            if (lazy?.name) {
                const target = resolveSpecifier(file, lazy.specifier);
                if (target) {
                    walk(target, lazy.name, here, depth + 1);
                }
            }
        }
    };
    walk(ROOT_FILE, ROOT_EXPORT, [], 0);
    return found;
}

/**
 * @param {{ outputs: Record<string, { entryPoint?: string }> }} metafile
 * @param {(file: string) => string | undefined} readSource
 * @returns {Record<string, string>}
 */
export function buildRouteTable(metafile, readSource) {
    const chunkByEntry = new Map();
    for (const [output, info] of Object.entries(metafile.outputs)) {
        if (info.entryPoint && output.endsWith('.js')) {
            chunkByEntry.set(info.entryPoint, posix.basename(output));
        }
    }
    const table = {};
    for (const [route, file] of collectComponentRoutes(readSource)) {
        const chunk = chunkByEntry.get(file);
        if (chunk) {
            table[route] = chunk;
        }
    }
    return table;
}

function main() {
    const outDir = resolve(process.argv[2] ?? 'dist/sotetsu-lab-v3-client');
    const statsFile = resolve(outDir, 'browser-stats.json');
    if (!existsSync(statsFile)) {
        console.error(
            `${statsFile} がありません。ng build に --stats-json を付けてください`,
        );
        process.exit(1);
    }
    const metafile = JSON.parse(readFileSync(statsFile, 'utf-8'));
    const table = buildRouteTable(metafile, (file) => {
        try {
            return readFileSync(resolve(file), 'utf-8');
        } catch {
            return undefined;
        }
    });
    if (Object.keys(table).length === 0) {
        console.error(
            'ルートの表が空です（app.route.ts の形が変わった可能性）',
        );
        process.exit(1);
    }
    const out = resolve(outDir, 'server', 'route-preloads.json');
    writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`);
    console.log(`${out} に ${Object.keys(table).length} 件を書きました`);
}

// jest の spec が import したときは動かさない（import.meta は CJS 変換で使えないので argv で見る）
if (process.argv[1] && /build-route-preloads\.mjs$/.test(process.argv[1])) {
    main();
}
