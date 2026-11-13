# 鉄道日を日本時間で決める（JST へのまとめ） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 端末の時刻帯が日本時間でなくても、「今日」・4 時の境目・時刻表の時刻・指定した時刻が日本時間で決まるようにする。

**Architecture:** `Date` はいつも本当の時点（エポックからのミリ秒）として扱う。日本時間の読み書きは `src/app/core/utils/railway-day.ts` の関数だけが行い、ほかの所は端末の時刻帯の `getHours()`・`startOfDay()`・`format()` で日付や時を読まない。

**Tech Stack:** Angular 22・date-fns 4・date-fns-tz 3（`toZonedTime`・`fromZonedTime`・`formatInTimeZone` がある）・jest 30。

**Spec:** spec は書かない。決めたことはこの計画に書く。元になった指摘は `.context/review-2026-11-12/fable-code.md` の上位 1・2 と「時間」の節（`(a)` の表）。

## なぜ直すか

- 端末の時刻帯が日本時間でないと、`getRailwayDate()` の `now.getHours() < 4` が端末の時で 4 時の境目を決める。UTC の端末で日本時間 10:30 は `getHours()` が 1 なので、「今日」が前日になる。
- 本番の SSR（Lambda）は時刻帯を設定していないので UTC で動く（`serverless.ts` の `environment` に `TZ` が無い）。日本時間 9:00〜12:59 にサーバーで描くページは、前日の営業日で描かれている見込み。旅行者と Firefox の `resistFingerprinting` だけの話ではない。
- 投稿の「時刻を指定」（`sighting-precheck.util.ts`）と列車位置情報の「時刻を指定」（`toDateWithTime`）は、打った `HH:mm` を端末の時刻帯の時刻として時点にする。UTC の端末で「10:00」は日本時間 19:00 の目撃として送られる。
- 同じページの中で、端末の時刻帯の式と日本時間の式が混ざっている（リアルタイムの取得は日本時間、ストアの取り直しの判定は端末）。
- 今の jest は手元（JST）でも CI（ubuntu の既定の UTC）でも全部通る。テストが端末の時刻帯で日時を組み立てていて、ずれを捕まえていないため。

## 決めたこと

1. `Date` は本当の時点として持つ。`toZonedTime` で作った「日本時間の数字を端末の時刻帯で持つ Date」は、`railway-day.ts` の中だけで使い、外へ出さない。
2. 鉄道日の関数は `railway-day.ts` に集める（下の Task 1 の一覧）。`getRailwayDate()` は消す。
3. 時刻表の時刻（`days` と `HH:mm:ss`）は、`railwayDayStart()`（その営業日の日本時間 0 時の時点）にミリ秒を足して時点にする。日本時間に夏時間は無いので、1 日は 86,400,000 ミリ秒で足してよい。
4. 画面に出す時刻（ダッシュボードの時計、列車位置情報の `clockText` と時刻の欄の初めの値）は日本時間で書く。
5. Lambda に `TZ=Asia/Tokyo` は足さない。足すと SSR では直るが、コードの誤りが本番で見えなくなる。CI は UTC で回るので、そちらで捕まえる。
6. テストは「UTC の端末でも日本時間で答えが出る」ことを確かめる。jest のワーカーの中で `process.env.TZ` を書き換えても効かなかった（2026-11-13 実測）。外から `TZ=UTC` を渡すと効く。`package.json` に `"test:utc": "TZ=UTC jest"` を足し、手元の RED はこれで見る。CI はもともと UTC。
7. api の `getBaseDate` と `.hour(4)` の直書きは別のリポジトリなので、この計画に入れない。

## 式の仕分け

洗い出した 113 行（`.context/jst-sites.txt`）を 5 つに分ける。半分は (e) で、触らない。

| 仕分け | 中身 | 直し方 | 所 |
| --- | --- | --- | --- |
| (a) 日付の鍵 | 営業日の `yyyy-MM-dd` | `railwayDateKey(at)` | todays-calendar-list・todays-formation-list・dashboard.service（2）・timetable-station（2）・train-location（2）・train-diagram（2）・timetable-formation の `today`・past-time-cache-hints・real-time.service の `generateBaseDate`（3）・past-time-table の `onDefaultSearch` |
| (b) 計算の起点 | 営業日の 0 時 | `railwayDayStart(at)` と `toAbsoluteTime()` | train-position・build-pickable-trains・build-station-arrivals・train-diagram の `#rawDiagramLines`・real-time.store の `currentPositionsThatShouldUpdate` |
| (c) 時と分 | 日本時間の時・分 | `railwayClock(at)` | diagram-timeline の `railwayMinuteOfDay`・train-location の `onModeChange` |
| (d) 打った時刻を時点に | `HH:mm` → 時点 | `railwayTimeToInstant()`・`jstDateTimeOf()` | sighting-precheck・train-location の `at`（時刻指定） |
| (e) 時刻帯と関係ない | 期限・経過時間・日付の文字列の読み直し | 触らない | token・query-cache・offline の `savedAt`・app-update・`parse(x, 'yyyy-MM-dd', new Date())` の基準日・`format(parse(time, 'HH:mm:ss'))`・timetable-edit-form（時刻だけを扱う）・format-saved-at（端末の時計で保存した時刻を出す） |

表示に使う所（ダッシュボードの日付ラベル・`calculateDayCountFromToday`・過去の運用情報の `maxDate`）は、鍵を `parseISO(key)` で端末の 0 時にしてから `format` と `differenceInCalendarDays` に渡す。`format(railwayDayStart(x), …)` は UTC の端末で前日になるので使わない。

もう正しいので触らない所: `formation-display.util`・`moderation/format-tokyo-date-time.util`・`formation-day`・`formation-progress`・`formation-station-filter`（`+09:00` の時点どうしで比べている）・`timetable-formation.service` の `T12:00:00+09:00`。

## Global Constraints

- 日本時間の名前は `RAILWAY_TIME_ZONE = 'Asia/Tokyo'`、境目は `RAILWAY_DAY_BOUNDARY_HOUR = 4`。どちらも `railway-day.ts` から export し、ほかで `'Asia/Tokyo'` と `4` を書かない（`moderation/format-tokyo-date-time.util` は既存のまま）。
- `DIAGRAM_START_HOUR` は `RAILWAY_DAY_BOUNDARY_HOUR` を参照する。
- 見た目は変えない。日本時間の端末では、どの画面も今と同じ値を出す。
- 新しいテストは `npx jest`（JST）と `npm run test:utc`（UTC）の両方で通る。

## Review Focus

1. 日本時間 3:59 と 4:00 の境目（UTC では 18:59 と 19:00）。営業日が切り替わる。
2. 日本時間 0:00〜3:59 に「時刻を指定」で 23:30 や 1:00 を打つ。投稿は同じ営業日の時点、列車位置情報は同じ暦の日の時点になる（今の決まりのまま）。
3. 時刻表の `days = 2`（24 時を過ぎた分）と、`days` が無い時刻（day 1 とみなす）。
4. SSR（UTC）の日本時間 9:00〜12:59 に描く「今日」。
5. 日本時間の端末で、今の画面と値が変わらないこと（全テストの JST 実行で見る）。

---

### Task 1: railway-day.ts に日本時間の関数を集める

**Files:**
- Modify: `src/app/core/utils/railway-day.ts`
- Modify: `src/app/core/utils/railway-day.spec.ts`
- Modify: `package.json`（`test:utc` を足す）

**Interfaces:**
- Produces:
  - `export const RAILWAY_TIME_ZONE = 'Asia/Tokyo'`
  - `export const RAILWAY_DAY_BOUNDARY_HOUR = 4`
  - `railwayDateKey(at?: Date): string` — 既定は `new Date()`。営業日の `yyyy-MM-dd`
  - `railwayDayStart(at: Date): Date` — その営業日の日本時間 0 時の時点
  - `railwayClock(at: Date): { hours: number; minutes: number }` — 日本時間の時（0〜23）と分
  - `railwayTimeToInstant(at: Date, hours: number, minutes: number): Date` — `at` の営業日の中で、打った時刻の時点（0〜3 時は翌日の暦の日）
  - `jstDateTimeOf(anchor: Date, hours: number, minutes: number): Date` — `anchor` の日本時間の暦の日に、打った時刻を付けた時点
  - `formatJst(at: Date, pattern: string): string` — `formatInTimeZone` を日本時間で包んだもの
  - `toAbsoluteTime(base: Date, days: number, time: string): Date` — 引数はそのまま。`base` は `railwayDayStart()` の値とし、`base + days 日 + time` をミリ秒で足す
  - `toRailwayDateKey(isoTime: string): string` — 名前を残し、`railwayDateKey(parseISO(isoTime))` にする
  - `getRailwayDate()` は消す（Task 2〜4 で呼び出しを全部替えたあと、Task 4 の最後に消す）

- [ ] **Step 1: テストを書く**（`railway-day.spec.ts` に足す。時点は `Z` 付きの ISO で作り、端末の時刻帯に頼らない）

```ts
describe('日本時間で決める（端末の時刻帯に頼らない）', () => {
    it.each([
        ['2026-11-13T01:30:00Z', '2026-11-13'], // JST 10:30
        ['2026-11-12T18:59:00Z', '2026-11-12'], // JST 03:59 は前日の営業日
        ['2026-11-12T19:00:00Z', '2026-11-13'], // JST 04:00 から当日
    ])('railwayDateKey(%s) は %s', (iso, key) => {
        expect(railwayDateKey(new Date(iso))).toBe(key);
    });

    it('railwayDayStart は営業日の日本時間 0 時', () => {
        expect(railwayDayStart(new Date('2026-11-12T18:59:00Z')).toISOString()).toBe('2026-11-11T15:00:00.000Z');
        expect(railwayDayStart(new Date('2026-11-13T01:30:00Z')).toISOString()).toBe('2026-11-12T15:00:00.000Z');
    });

    it('railwayClock は日本時間の時と分', () => {
        expect(railwayClock(new Date('2026-11-13T01:30:00Z'))).toEqual({ hours: 10, minutes: 30 });
    });

    it('toAbsoluteTime は営業日の 0 時に days と時刻を足した時点', () => {
        const base = railwayDayStart(new Date('2026-11-13T01:30:00Z'));
        expect(toAbsoluteTime(base, 0, '09:05:00').toISOString()).toBe('2026-11-13T00:05:00.000Z');
        expect(toAbsoluteTime(base, 1, '00:30:00').toISOString()).toBe('2026-11-13T15:30:00.000Z');
    });

    it.each([
        ['2026-11-13T01:30:00Z', 10, 0, '2026-11-13T01:00:00.000Z'], // JST 10:30 に 10:00
        ['2026-11-13T01:30:00Z', 1, 0, '2026-11-13T16:00:00.000Z'], // JST 10:30 に 1:00 は翌日の 1:00
        ['2026-11-12T17:00:00Z', 23, 30, '2026-11-12T14:30:00.000Z'], // JST 2:00 に 23:30 は前日の 23:30
    ])('railwayTimeToInstant(%s, %i:%i) は %s', (now, h, m, iso) => {
        expect(railwayTimeToInstant(new Date(now), h, m).toISOString()).toBe(iso);
    });

    it('jstDateTimeOf は日本時間の暦の日に時刻を付ける', () => {
        expect(jstDateTimeOf(new Date('2026-11-12T17:00:00Z'), 1, 0).toISOString()).toBe('2026-11-12T16:00:00.000Z');
    });

    it('formatJst は日本時間で書く', () => {
        expect(formatJst(new Date('2026-11-13T01:30:00Z'), 'HH:mm')).toBe('10:30');
    });
});
```

既存の `getRailwayDate` と `toAbsoluteTime` のテストは、上の形（`Z` 付きの時点）に書き直す。

- [ ] **Step 2: `package.json` に `"test:utc": "TZ=UTC jest"` を足し、`npm run test:utc -- src/app/core/utils/railway-day.spec.ts` で失敗を見る**

Expected: 関数が無いので失敗する。

- [ ] **Step 3: 上の Interfaces の関数を書く**

日本時間の数字は `toZonedTime` で読み、時点に戻すときは `fromZonedTime` を使う。`railwayDayStart` は「日本時間の暦の日（4 時より前は前日）の 0 時」を `fromZonedTime(\`${key}T00:00:00\`, RAILWAY_TIME_ZONE)` で時点にする。

- [ ] **Step 4: `npx jest src/app/core/utils/railway-day.spec.ts` と `npm run test:utc -- src/app/core/utils/railway-day.spec.ts` の両方で通ることを見る**

- [ ] **Step 5: コミット** `refactor: :recycle: 鉄道日を日本時間で決める関数を railway-day.ts に集める`

### Task 2: 日付の鍵を railwayDateKey にする（仕分け (a)）

**Files:**
- Modify: 仕分けの表 (a) の所。`format(getRailwayDate(x), 'yyyy-MM-dd')` は `railwayDateKey(x)` に、real-time.service の `generateBaseDate` の `flow`（3 か所）は `railwayDateKey()` に、past-time-table の `subHours(new Date(), 4)` は `parseISO(railwayDateKey())` に替える
- Modify: ダッシュボードの日付ラベル（`dashboard-status-card`）は `format(parseISO(railwayDateKey(now)), 'yyyy年M月d日（E）', { locale: ja })`、時計は `formatJst(now, 'HH:mm')`
- Modify: `calculate-day-count-from-today.ts` は 2 つの鍵を `parseISO` して `differenceInCalendarDays`
- Modify: `getRailwayDate` を使っている spec（timetable-station.sightings・train-diagram・train-location.offline・timetable-formation）の「今日」を `railwayDateKey()` にする
- Test: `src/app/core/utils/calculate-day-count-from-today.spec.ts`・`src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.spec.ts`・`dashboard-status-card` の spec

**Interfaces:**
- Consumes: `railwayDateKey`・`formatJst`（Task 1）

- [ ] **Step 1: テストを書く**: `calculateDayCountFromToday` は `jest.useFakeTimers().setSystemTime(new Date('2026-11-13T01:30:00Z'))` のもとで `'2026-11-12T18:59:00Z'` を 1、`'2026-11-12T19:00:00Z'` を 0 と数える。`pastTimeCacheHints` は同じ今で「今日」を `'2026-11-13'` と見る。ダッシュボードの日付ラベルは同じ今で `'2026年11月13日（金）'`、時計は `'10:30'`
- [ ] **Step 2: `npm run test:utc --` に上の 3 つの spec を渡し、失敗を見る**
- [ ] **Step 3: 上の Files のとおり替える**
- [ ] **Step 4: `npx jest` と `npm run test:utc` の両方で、触ったファイルの spec が通ることを見る**
- [ ] **Step 5: コミット** `refactor: :recycle: 営業日の日付を日本時間の railwayDateKey で決める`

### Task 3: 時刻表の時刻を日本時間の 0 時から数える（仕分け (b)・(c)）

**Files:**
- Modify: `src/app/shared/train-position.util.ts`・`src/app/shared/train-picker/build-pickable-trains.util.ts`・`src/app/pages/train-location/utils/build-station-arrivals.util.ts`・`src/app/pages/train-diagram/train-diagram.component.ts`（`#rawDiagramLines`）の `getRailwayDate(at)` を `railwayDayStart(at)` に
- Modify: `src/app/pages/operation/operation-real-time/stores/operation-real-time.store.ts` の `currentPositionsThatShouldUpdate` の `target(days, time)` を `toAbsoluteTime(railwayDayStart(now), days - 1, time)` に
- Modify: `src/app/pages/train-diagram/utils/diagram-timeline.util.ts` の `railwayMinuteOfDay` を `railwayClock` で、`DIAGRAM_START_HOUR` を `RAILWAY_DAY_BOUNDARY_HOUR` で
- Modify: `src/app/pages/train-location/train-location.component.ts` の `onModeChange` の `this.at().getHours()`・`getMinutes()` を `railwayClock(this.at())` に、`clockText` を `formatJst(this.at(), 'HH:mm:ss')` に、`timeInputValue` の初めの値を `formatJst(new Date(), 'HH:mm')` に
- Test: `train-position.util.spec.ts`・`build-station-arrivals.util.spec.ts`・`diagram-timeline.util.spec.ts`・`operation-real-time.store.spec.ts`

**Interfaces:**
- Consumes: `railwayDayStart`・`toAbsoluteTime`・`railwayClock`・`formatJst`・`RAILWAY_DAY_BOUNDARY_HOUR`（Task 1）

- [ ] **Step 1: テストを書く**:
  - `estimatePositions` に `at = new Date('2026-11-13T01:30:00Z')`（JST 10:30）を渡すと、JST 10:25 発 10:35 着の区間の列車が走行中に出る
  - `railwayMinuteOfDay(new Date('2026-11-12T17:00:00Z'))`（JST 2:00）は `(26 - 4) * 60 = 1320`
  - `currentPositionsThatShouldUpdate` は今を JST 10:30 にして、次の発車が JST 10:29 の運用を返し、10:31 の運用を返さない
- [ ] **Step 2: `npm run test:utc --` に上の spec を渡し、失敗を見る**
- [ ] **Step 3: 上の Files のとおり替える**。既存の spec で `new Date(2026, 10, 13, 10, 30)` のように端末の時刻帯で今を作っている所は、`Z` 付きの時点に直す
- [ ] **Step 4: `npx jest` と `npm run test:utc` の両方で、触ったファイルの spec が通ることを見る**
- [ ] **Step 5: コミット** `fix: :bug: 時刻表の時刻と今の位置を日本時間で数える`

### Task 4: 打った時刻を日本時間の時点にする（仕分け (d)）と getRailwayDate を消す

**Files:**
- Modify: `src/app/shared/operation-post-card/sighting-precheck.util.ts` の `toSightingTimeIso` の指定時刻を `railwayTimeToInstant(now, h, m).toISOString()` に
- Modify: `src/app/pages/train-location/utils/parse-time-param.util.ts` の `toDateWithTime(anchor, time)` を `jstDateTimeOf(anchor, time.hours, time.minutes)` に（関数の名前と呼び出しは残す）。ファイル冒頭の `getRailwayDate` への言及を `railwayDayStart` に
- Modify: `src/app/core/utils/railway-day.ts` から `getRailwayDate` を消す。`grep -rn "getRailwayDate" src` が 0 件になること
- Test: `sighting-precheck.util.spec.ts`・`parse-time-param.util.spec.ts`

**Interfaces:**
- Consumes: `railwayTimeToInstant`・`jstDateTimeOf`（Task 1）

- [ ] **Step 1: テストを書く**:
  - `toSightingTimeIso({ timeSetting: 'specifiedTime', sightingTime: '10:00', now: new Date('2026-11-13T01:30:00Z') })` は `'2026-11-13T01:00:00.000Z'`
  - 同じく `now` が JST 2:00（`'2026-11-12T17:00:00Z'`）で `'23:30'` は `'2026-11-12T14:30:00.000Z'`、`'01:00'` は `'2026-11-12T16:00:00.000Z'`
  - `toDateWithTime(new Date('2026-11-12T17:00:00Z'), { hours: 1, minutes: 0 })` は `'2026-11-12T16:00:00.000Z'`
- [ ] **Step 2: `npm run test:utc --` に上の spec を渡し、失敗を見る**
- [ ] **Step 3: 上の Files のとおり替える**
- [ ] **Step 4: 全体を両方の時刻帯で回す**: `npx jest > .context/jest-out.txt` と `npm run test:utc > .context/jest-utc-out.txt`、`npx ng lint`。全部通ること
- [ ] **Step 5: 実物で確かめる**: 手元の `ng serve` を、ブラウザの時刻帯を UTC にした Playwright（`browser.newContext({ timezoneId: 'UTC' })`）で開き、トップの日付・列車位置情報の時計・ダイヤグラムの今の線・投稿の「時刻を指定」で送る時点（ネットワークの本文）が日本時間で出ることを見る。`timezoneId: 'Asia/Tokyo'` でも同じ値になること
- [ ] **Step 6: コミット** `fix: :bug: 指定した時刻を日本時間の時点として送る`
