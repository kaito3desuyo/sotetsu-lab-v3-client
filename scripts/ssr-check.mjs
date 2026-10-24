// 手元で SSR を起動し、主なページをサーバーで描けるか確かめる。
// 先に `npm run build:ssr-check`。サーバーは本番の API を読む（読むだけ）。
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4300;
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_MS = 20_000;

const CALENDAR = 'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb'; // 平日ダイヤ 2026-03-14
const STATION = 'fb799a2e-c96c-4629-8a7d-e8b57f8e6930'; // 二俣川
const OPERATION = '8553e26c-38c0-4895-9ff5-b4f02572df99'; // 01K
const ROUTE = '2e22124f-04eb-475f-929a-7dba25561638'; // 本線

const PATHS = [
    '/',
    '/operation/real-time',
    '/operation/past-time',
    `/operation/table;calendar_id=${CALENDAR}`,
    `/operation/route-diagram;operation_id=${OPERATION}`,
    `/timetable/station;calendar_id=${CALENDAR};station_id=${STATION};trip_direction=0`,
    `/timetable/all-line;calendar_id=${CALENDAR};trip_direction=0`,
    `/train-diagram;calendar_id=${CALENDAR}`,
    `/train-location;route_id=${ROUTE}`,
    '/library/vehicle',
    '/login',
    '/register',
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

async function check(path) {
    const logStart = log.length;
    const started = performance.now();
    const res = await fetch(BASE + path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text();
    const ms = Math.round(performance.now() - started);
    // 描き終えたあとに出る ERROR も拾うため、少し待ってからログを見る
    await sleep(300);
    const errors = log.slice(logStart).match(/ERROR[^\n]*/g) ?? [];
    const redirected =
        res.status >= 300 && res.status < 400 && res.headers.has('location');
    const rendered = res.status === 200 && html.includes('ng-server-context');
    const ok = (redirected || rendered) && errors.length === 0;
    const note = redirected ? ` -> ${res.headers.get('location')}` : '';
    console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${res.status} ${ms}ms ${html.length}B ${path}${note}`,
    );
    for (const error of errors) {
        console.log(`     ${error}`);
    }
    return ok;
}

let failed = 0;
try {
    await waitReady();
    // 2 周する。2 周目は同じ実行環境が前のリクエストの後に描く場合を真似る
    for (const round of [1, 2]) {
        console.log(`--- round ${round}`);
        for (const path of PATHS) {
            try {
                if (!(await check(path))) {
                    failed++;
                }
            } catch (error) {
                failed++;
                console.log(`FAIL ---       ${path} ${error.message}`);
            }
        }
    }
} finally {
    server.kill();
}
process.exit(failed > 0 ? 1 : 0);
