// 手元で SSR を起動し、主なページをサーバーで描けるか確かめる。
// 先に `npm run build:ssr-check`。サーバーは本番の API を読む（読むだけ）。
// 見ること: 状態コード・サーバーで描いたか（ng-server-context）・CDN に置く長さ・キャッシュタグ・題名・サーバーのエラー
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// 「今日」を鉄道の日付で数えるので、本番（Lambda）と同じ時刻帯で動かす
process.env.TZ = 'Asia/Tokyo';

const PORT = 4300;
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_MS = 20_000;

const CALENDAR = 'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb'; // 平日ダイヤ 2026-03-14
const STATION = 'fb799a2e-c96c-4629-8a7d-e8b57f8e6930'; // 二俣川
const OPERATION = '8553e26c-38c0-4895-9ff5-b4f02572df99'; // 01K
const ROUTE = '2e22124f-04eb-475f-929a-7dba25561638'; // 本線

const LONG =
    'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800';
const SHORT =
    'public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400';
const NO_STORE = 'no-store';

function ymd(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
}
// 鉄道の日付（4 時までは前日）の 6 日前から 7 日間 = 今日を含む
const railwayToday = new Date(Date.now() - 4 * 3600 * 1000);
const RECENT_START = ymd(
    new Date(
        railwayToday.getFullYear(),
        railwayToday.getMonth(),
        railwayToday.getDate() - 6,
    ),
);

const PATHS = [
    { path: '/', kind: 'server', cache: LONG },
    { path: '/operation/real-time', kind: 'server', cache: LONG },
    { path: '/operation/past-time', kind: 'server', cache: LONG },
    {
        path: '/operation/past-time;reference_date=2026-10-01;days=3',
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/operation/past-time;reference_date=${RECENT_START};days=7`,
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/operation/table;calendar_id=${CALENDAR}`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/operation/table', kind: 'server', cache: LONG },
    {
        path: `/operation/route-diagram;operation_id=${OPERATION}`,
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/timetable/station;calendar_id=${CALENDAR};station_id=${STATION};trip_direction=0`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/timetable/station', kind: 'server', cache: LONG },
    {
        path: `/timetable/all-line;calendar_id=${CALENDAR};trip_direction=0`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/timetable/all-line', kind: 'server', cache: LONG },
    {
        path: `/train-diagram;calendar_id=${CALENDAR};route_ids=${ROUTE};time=0600`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/train-diagram', kind: 'server', cache: LONG },
    { path: `/train-location;route_id=${ROUTE}`, kind: 'server', cache: LONG },
    { path: '/train-location', kind: 'server', cache: LONG },
    { path: '/library/vehicle', kind: 'server', cache: LONG },
    { path: '/login', kind: 'client', cache: NO_STORE },
    { path: '/register', kind: 'client', cache: NO_STORE },
    { path: '/maintenance', kind: 'client', cache: NO_STORE },
    {
        path: `/timetable/add;calendar_id=${CALENDAR};trip_direction=0`,
        kind: 'client',
        cache: NO_STORE,
    },
    { path: '/no-such-page', kind: 'not-found', cache: SHORT },
    { path: '/operation', kind: 'not-found', cache: SHORT },
];

const server = spawn(
    process.execPath,
    ['dist/sotetsu-lab-v3-client/server/server.mjs'],
    {
        env: { ...process.env, PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
    },
);
let log = '';
server.stdout.on('data', (chunk) => (log += chunk));
server.stderr.on('data', (chunk) => (log += chunk));

async function waitReady() {
    for (let i = 0; i < 100; i++) {
        try {
            await fetch(`${BASE}/favicon.ico`);
            return;
        } catch {
            await sleep(200);
        }
    }
    throw new Error(`server did not start\n${log}`);
}

function judge(entry, res, html) {
    const problems = [];
    const rendered = html.includes('ng-server-context');
    if (entry.kind === 'server' && !(res.status === 200 && rendered)) {
        problems.push(
            `expected 200 rendered, got ${res.status} rendered=${rendered}`,
        );
    }
    if (
        entry.kind === 'client' &&
        !(res.status === 200 && !rendered && html.includes('<app-root'))
    ) {
        problems.push(
            `expected 200 client shell, got ${res.status} rendered=${rendered}`,
        );
    }
    if (entry.kind === 'not-found' && !(res.status === 404 && rendered)) {
        problems.push(
            `expected 404 rendered, got ${res.status} rendered=${rendered}`,
        );
    }
    const cache = res.headers.get('cache-control');
    if (cache !== entry.cache) {
        problems.push(`cache-control: ${cache}`);
    }
    if (entry.tag) {
        const tags = (res.headers.get('cache-tag') ?? '').split(',');
        if (!tags.includes(entry.tag)) {
            problems.push(`cache-tag lacks ${entry.tag}: ${tags.join(',')}`);
        }
    }
    if (entry.title) {
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
        if (!title.includes(entry.title)) {
            problems.push(`title: ${title}`);
        }
    }
    return problems;
}

async function check(entry) {
    const logStart = log.length;
    const started = performance.now();
    const res = await fetch(BASE + entry.path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text();
    const ms = Math.round(performance.now() - started);
    // 描き終えたあとに出る ERROR も拾うため、少し待ってからログを見る
    await sleep(300);
    const errors = log.slice(logStart).match(/ERROR[^\n]*/g) ?? [];
    const problems = [...judge(entry, res, html), ...errors];
    const ok = problems.length === 0;
    console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${res.status} ${ms}ms ${html.length}B ${entry.path}`,
    );
    for (const problem of problems) {
        console.log(`     ${problem}`);
    }
    return ok;
}

let failed = 0;
try {
    await waitReady();
    // 2 周する。2 周目は同じ実行環境が前のリクエストの後に描く場合を真似る
    for (const round of [1, 2]) {
        console.log(`--- round ${round}`);
        for (const entry of PATHS) {
            try {
                if (!(await check(entry))) {
                    failed++;
                }
            } catch (error) {
                failed++;
                console.log(`FAIL ---       ${entry.path} ${error.message}`);
            }
        }
    }
} finally {
    server.kill();
}
process.exit(failed > 0 ? 1 : 0);
