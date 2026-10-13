# DTO/Model のクラスと class-transformer の廃止 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** client の DTO/Model を interface にし、class-transformer と reflect-metadata を消す。変換は `id` ↔ `xxxId` の手書きの付け替えだけにする。

**Architecture:** 読み取りの builder は「`id` と入れ子だけ直し、残りはスプレッドで写す」。書き込みの builder は送る項目を明示して並べる。builder は `XxxDtoBuilder.buildFromModel` / `buildFromModels` と `XxxModelBuilder.buildFromXxxDto` の形にそろえる。順番は「形をそろえる → 新旧比較の正解を取る → 読み取り → 書き込み → 不具合の修正 → クラスと依存の撤去」。各コミットの時点でビルドと jest が通る状態を保つ。

**Tech Stack:** Angular 22 / TypeScript（`strict: false`）/ Jest 30 / esbuild（比較スクリプトの束ね）/ puppeteer-core・Lighthouse（計測）

**Spec:** `docs/superpowers/specs/2026-10-13-remove-class-transformer-design.md`

## Global Constraints

- 作業ブランチは `refactor/remove-class-transformer`。master にはコミットしない。
- 型の名前・置き場所は変えない（`usecase/dtos/*.dto.ts`・`infrastructure/models/*.model.ts`）。
- Model interface の任意（`?`）は、対応する DTO の任意に合わせる。`strict: false` でも「Model で任意・DTO で必須」は TS2322 になる（2026-10-13 に確認済み）。
- 読み取りの builder は `({ id, 入れ子…, ...rest }) => ({ ...rest, xxxId: id, 入れ子: 入れ子 && XxxDtoBuilder.buildFromModel(s)(入れ子) })` の形にする。キャスト（`as`）で型を黙らせない。
- 書き込みの builder と `toTripDtos` はスプレッドを使わず、送る項目を並べる。Create には ID を一切載せない。
- builder の import は、同じ lib の中なら相対パス、別の lib なら `src/app/libs/...` にする（今のファイルの流儀に合わせる）。
- jest は `npx jest --testPathPatterns=<パス>` で回す。サンドボックス内で `npm test` を使うと全 spec が落ちる。全件の結果は `npx jest > .context/jest.log 2>&1` のようにファイルに出し、`Tests:` 行を読む。
- `npm run lint` と、署名つきの `git commit` はサンドボックスの外で動かす。
- prettier はファイル単位で `npx prettier --write <ファイル>` とする。ディレクトリ単位は禁止（未整形の既存ファイルで差分が汚れる）。
- コミットは Conventional Commits＋絵文字テキストで書く。コミットの前に `git diff --cached --stat` で中身を確かめる。末尾に次の 2 行を付ける。
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC
  ```
- 一時ファイルは client の `.context/`（gitignore 済み）に置く。`/tmp` は使わない。
- jest（jest-preset-angular）は spec も型検査する。spec で一部の項目だけを渡して必須項目の不足が型エラーになるときは、その引数に `as never` を付ける（spec に限る。本体のコードでは使わない）。

## Review Focus

1. **コピーで作る列車**：フォームにコピー元の `tripId`・`timeId`・区間の `id` が残っていても、Create の本文にはどの階層にも ID が載らないこと。→ Task 6 の spec「コピー元の ID を載せない」
2. **更新で区間の `id` が届くこと**（Task 7 の fix の後）。新しい区間（`id` なし）は `id` を載せず、既存の区間は `id` を載せる。→ Task 7 の spec
3. **API が入れ子に `null` を返す**（`prev: null`・`invalidation: null`・`sightedAsOperation: null`・区間の `operation: null`）。落ちずに `null` のまま返すこと。→ Task 5 の spec「null の入れ子」
4. **`fields` で絞った応答**（時刻に `id` が無い、`createdAt` が無いなど）。落ちずに、無い項目は `undefined` になること。→ Task 5 の spec「fields で絞った trip-blocks」
5. **目撃の時刻断面の `expectedSighting`**（`id` も入れ子も欠けた部分的な目撃）。落ちずに、あるものだけ付け替えること。→ Task 5 の spec「部分的な expectedSighting」

---

## ファイルの地図

| 区分 | ファイル | 役目 |
|---|---|---|
| 新設 | `src/app/libs/trip/infrastructure/builders/time.dto.builder.ts` | `TimeDtoBuilder`（time の読み取り） |
| 新設 | `src/app/libs/station/infrastructure/builders/stop.dto.builder.ts` | `StopDtoBuilder` |
| 新設 | `src/app/libs/station/infrastructure/models/stop.model.ts` | `StopModel`（今は `TimeModel.stop: any`） |
| 新設 | `src/app/libs/route/infrastructure/builders/route-station-list.dto.builder.ts` | `RouteStationListDtoBuilder` |
| 新設 | `src/app/libs/trip/infrastructure/builders/trip.model.builder.ts` | `TripModelBuilder`（列車の書き込み） |
| 新設 | `src/app/libs/trip/infrastructure/builders/time.model.builder.ts` | `TimeModelBuilder` |
| 新設 | `src/app/libs/trip/infrastructure/builders/trip-operation-list.model.builder.ts` | `TripOperationListModelBuilder` |
| 新設 | 各 builder の `*.spec.ts` | 付け替えと入れ子の spec |
| 新設 | `docs/adr/0006-remove-class-transformer.md` | 方針の記録 |
| 変更 | `src/app/libs/*/infrastructure/builders/*.ts`（既存 23 個） | 形をそろえ、中身を手書きにする |
| 変更 | `src/app/libs/*/usecase/dtos/*.ts`・`src/app/libs/*/infrastructure/models/*.ts` | class → interface |
| 変更 | `src/app/libs/*/infrastructure/queries/*.ts`・`commands/*.ts` | 複数形 builder とメソッド名の張り替え |
| 変更 | `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util.ts`（＋spec）・`services/timetable-edit-form.service.ts` | 書き込みの項目を明示する |
| 削除 | `src/app/libs/trip/usecase/dtos/trip-block-details.dto.ts` | 重複 |
| 削除 | `src/app/core/configs/class-transformer.ts`・`src/app/core/utils/class-transformer.ts` | 補助 |
| 変更 | `setup-jest.ts`・`package.json`・`package-lock.json` | reflect-metadata と依存の撤去 |
| 一時 | `.context/golden/`・`.context/measure/` | 新旧比較と計測（コミットしない） |

---

### Task 1: builder の形をそろえる（中身は今のまま）

挙動は変えない。名前と形だけをそろえる。

**Files:**
- Modify: 既存の DTO builder 20 個（下の表）
- Create: `src/app/libs/trip/infrastructure/builders/time.dto.builder.ts`、`src/app/libs/station/infrastructure/builders/stop.dto.builder.ts`、`src/app/libs/station/infrastructure/models/stop.model.ts`、`src/app/libs/route/infrastructure/builders/route-station-list.dto.builder.ts`
- Modify: `src/app/libs/trip/infrastructure/models/time.model.ts`（`stop?: any` → `stop?: StopModel`）
- Modify: `src/app/libs/calendar/infrastructure/builders/calendar.dto.builder.ts`、`src/app/libs/calendar/infrastructure/queries/calendar.query.ts`
- Modify: `src/app/libs/auth/infrastructure/builders/login.model.builder.ts`、`src/app/libs/auth/infrastructure/commands/login.command.ts`、`src/app/libs/user/infrastructure/builders/user.model.builder.ts`、`src/app/libs/user/infrastructure/commands/user.command.ts`
- Modify: 複数形 builder の呼び出し元（`formation.query.ts`・`operation-sighting.query.ts`・`operation.query.ts`・`trip-class.query.ts`）

**Interfaces:**
- Produces: すべての DTO builder が `buildFromModel(model)` と `buildFromModels(models)` を持つ。`TimeDtoBuilder`・`StopDtoBuilder`・`RouteStationListDtoBuilder` が使える。`LoginModelBuilder.buildFromLoginDto`・`UserModelBuilder.buildFromRegisterUserDto`。`FormationsDtoBuilder`・`OperationSightingsDtoBuilder`・`OperationGroupsDtoBuilder`・`OperationsDtoBuilder`・`TripClassesDtoBuilder`・`buildCalendarDetailsDto` は無くなる。

- [ ] **Step 1: 単数の builder に `buildFromModels` を足す**

次の表の各 builder のオブジェクトに、`buildFromModel` の直後へ `buildFromModels` を足す。形は全部同じで、`<B>`・`<M>`・`<D>` を表の値に置き換える。

```ts
    buildFromModels: (models: <M>[]): <D>[] =>
        models.map((model) => <B>.buildFromModel(model)),
```

| ファイル（`src/app/libs/` から） | `<B>` | `<M>` | `<D>` |
|---|---|---|---|
| `agency/infrastructure/builders/agency.dto.builder.ts` | `AgencyDtoBuilder` | `AgencyModel` | `AgencyDetailsDto` |
| `calendar/infrastructure/builders/calendar-date.dto.builder.ts` | `CalendarDateDtoBuilder` | `CalendarDateModel` | `CalendarDateDetailsDto` |
| `calendar/infrastructure/builders/calendar.dto.builder.ts` | `CalendarDtoBuilder` | `CalendarModel` | `CalendarDetailsDto` |
| `formation/infrastructure/builders/formation.dto.builder.ts` | `FormationDtoBuilder` | `FormationModel` | `FormationDetailsDto` |
| `operation-sighting/infrastructure/builders/operation-sighting-time-cross-section.dto.builder.ts` | `OperationSightingTimeCrossSectionDtoBuilder` | `OperationSightingTimeCrossSectionModel` | `OperationSightingTimeCrossSectionDto` |
| `operation-sighting/infrastructure/builders/operation-sighting.dto.builder.ts` | `OperationSightingDtoBuilder` | `OperationSightingModel` | `OperationSightingDetailsDto` |
| `operation/infrastructure/builders/operation-current-position.dto.builder.ts` | `OperationCurrentPositionDtoBuilder` | `OperationCurrentPositionModel` | `OperationCurrentPositionDto` |
| `operation/infrastructure/builders/operation-group.dto.builder.ts` | `OperationGroupDtoBuilder` | `OperationGroupModel` | `OperationGroupDto` |
| `operation/infrastructure/builders/operation.dto.builder.ts` | `OperationDtoBuilder` | `OperationModel` | `OperationDetailsDto` |
| `route/infrastructure/builders/route-stations.dto.builder.ts` | `RouteStationsDtoBuilder` | `RouteStationsModel` | `RouteStationsDto` |
| `route/infrastructure/builders/route.dto.builder.ts` | `RouteDtoBuilder` | `RouteModel` | `RouteDetailsDto` |
| `service/infrastructure/builders/service-agencies.dto.builder.ts` | `ServiceAgenciesDtoBuilder` | `ServiceAgenciesModel` | `ServiceAgenciesDto` |
| `service/infrastructure/builders/service-routes.dto.builder.ts` | `ServiceRoutesDtoBuilder` | `ServiceRoutesModel` | `ServiceRoutesDto` |
| `service/infrastructure/builders/service.dto.builder.ts` | `ServiceDtoBuilder` | `ServiceModel` | `ServiceDetailsDto` |
| `station/infrastructure/builders/station.dto.builder.ts` | `StationDtoBuilder` | `StationModel` | `StationDetailsDto` |
| `trip-block/infrastructure/builders/trip-block.dto.builder.ts` | `TripBlockDtoBuilder` | `TripBlockModel` | `TripBlockDetailsDto` |
| `trip-class/infrastructure/builders/trip-class.dto.builder.ts` | `TripClassDtoBuilder` | `TripClassModel` | `TripClassDetailsDto` |
| `trip/infrastructure/builders/trip-operation-list.dto.builder.ts` | `TripOperationListDtoBuilder` | `TripOperationListModel` | `TripOperationListDetailsDto` |
| `trip/infrastructure/builders/trip.dto.builder.ts` | `TripDtoBuilder` | `TripModel` | `TripDetailsDto` |
| `user/infrastructure/builders/user.dto.builder.ts` | `UserDtoBuilder` | `UserModel` | `UserDetailsDto` |

`OperationCurrentPositionDtoBuilder.buildFromModel` と `UserDtoBuilder.buildFromModel` には戻り値の型が書かれていない。この 2 つは `: OperationCurrentPositionDto` / `: UserDetailsDto` を `buildFromModel` に付ける。

- [ ] **Step 2: 別オブジェクトの複数形 builder を消し、呼び出しを張り替える**

次の 5 つの `export const XxxsDtoBuilder = { … } as const;` ブロックを、それぞれのファイルから丸ごと消す。

- `formation.dto.builder.ts` の `FormationsDtoBuilder`
- `operation-sighting.dto.builder.ts` の `OperationSightingsDtoBuilder`
- `operation-group.dto.builder.ts` の `OperationGroupsDtoBuilder`
- `operation.dto.builder.ts` の `OperationsDtoBuilder`
- `trip-class.dto.builder.ts` の `TripClassesDtoBuilder`

呼び出しを張り替える（7 か所）。import の名前も単数に直す。

| ファイル | 旧 | 新 |
|---|---|---|
| `formation/infrastructure/queries/formation.query.ts`（2 か所） | `FormationsDtoBuilder.buildFromModels(` | `FormationDtoBuilder.buildFromModels(` |
| `operation-sighting/infrastructure/queries/operation-sighting.query.ts` | `OperationSightingsDtoBuilder.buildFromModels(` | `OperationSightingDtoBuilder.buildFromModels(` |
| `operation/infrastructure/queries/operation.query.ts`（2 か所） | `OperationsDtoBuilder.buildFromModels(` | `OperationDtoBuilder.buildFromModels(` |
| `operation/infrastructure/queries/operation.query.ts` | `OperationGroupsDtoBuilder.buildFromModels(` | `OperationGroupDtoBuilder.buildFromModels(` |
| `trip-class/infrastructure/queries/trip-class.query.ts` | `TripClassesDtoBuilder.buildFromModels(` | `TripClassDtoBuilder.buildFromModels(` |

確認のため次を実行する。何も出なければよい。

Run: `grep -rnE "FormationsDtoBuilder|OperationSightingsDtoBuilder|OperationGroupsDtoBuilder|OperationsDtoBuilder|TripClassesDtoBuilder" src`
Expected: 出力なし

- [ ] **Step 3: `buildCalendarDetailsDto` を `CalendarDtoBuilder` に吸収する**

`calendar.dto.builder.ts` から `export function buildCalendarDetailsDto(…) { … }` を消す（使わなくなる `classToPlain`・`plainToClass`・`classTransformerOptions` の import も消す）。`calendar.query.ts` の import を `CalendarDtoBuilder` だけにし、43 行目を次に変える。

```ts
                map((res) => CalendarDtoBuilder.buildFromModels(res.body)),
```

旧 `buildCalendarDetailsDto`（`classToPlain` → `plainToClass`）と `CalendarDtoBuilder.buildFromModel`（`instanceToPlain` → `plainToClass`）は、素の JSON に対しては同じ結果になる。

- [ ] **Step 4: 書き込みのメソッド名を入力の型名にする**

`login.model.builder.ts` の `buildFromDto` を `buildFromLoginDto` に、`user.model.builder.ts` の `buildFromDto` を `buildFromRegisterUserDto` に改名する。呼び出し元の `login.command.ts`（14 行目）と `user.command.ts`（14 行目）も直す。

Run: `grep -rn "buildFromDto\b" src`
Expected: 出力なし

- [ ] **Step 5: `StopModel` と、入れ子にしか出てこない 3 つの builder を作る（中身は今の方式）**

`src/app/libs/station/infrastructure/models/stop.model.ts`:

```ts
export interface StopModel {
    id: string;
    stationId: string;
    stopName: string;
    stopDescription: string;
    stopLatlng: string;
    zoneId: string;
    createdAt: string;
    updatedAt: string;
}
```

`src/app/libs/trip/infrastructure/models/time.model.ts` の `stop?: any;` を `stop?: StopModel;` にし、`import { StopModel } from 'src/app/libs/station/infrastructure/models/stop.model';` を足す。

`src/app/libs/station/infrastructure/builders/stop.dto.builder.ts`:

```ts
import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { StopDetailsDto } from '../../usecase/dtos/stop-details.dto';
import { StopModel } from '../models/stop.model';

export const StopDtoBuilder = {
    buildFromModel: (model: StopModel): StopDetailsDto =>
        plainToClass(StopDetailsDto, model, classTransformerOptions),
    buildFromModels: (models: StopModel[]): StopDetailsDto[] =>
        models.map((model) => StopDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/trip/infrastructure/builders/time.dto.builder.ts`:

```ts
import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';

export const TimeDtoBuilder = {
    buildFromModel: (model: TimeModel): TimeDetailsDto =>
        plainToClass(TimeDetailsDto, model, classTransformerOptions),
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/route/infrastructure/builders/route-station-list.dto.builder.ts`:

```ts
import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { RouteStationListDetailsDto } from '../../usecase/dtos/route-station-list-details.dto';
import { RouteStationListModel } from '../models/route-station-list.model';

export const RouteStationListDtoBuilder = {
    buildFromModel: (model: RouteStationListModel): RouteStationListDetailsDto =>
        plainToClass(RouteStationListDetailsDto, model, classTransformerOptions),
    buildFromModels: (
        models: RouteStationListModel[],
    ): RouteStationListDetailsDto[] =>
        models.map((model) => RouteStationListDtoBuilder.buildFromModel(model)),
} as const;
```

- [ ] **Step 6: 型とテストを通す**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: `Tests:` 行に failed が無い（作業前と同じ件数が passed）

- [ ] **Step 7: 整形してコミットする**

変更・新設したファイルを 1 つずつ `npx prettier --write <ファイル>` で整形する。

```bash
git add -A src/app/libs
git diff --cached --stat
git commit -m "refactor: :recycle: builder の形を buildFromModel / buildFromModels にそろえる"
```

---

### Task 2: 重複した `TripBlockDetailsDto` を libs/trip-block に寄せる

**Files:**
- Delete: `src/app/libs/trip/usecase/dtos/trip-block-details.dto.ts`
- Modify: `src/app/libs/trip/usecase/dtos/trip-block-details.dto` を import しているファイル（約 20 個）と、`libs/trip/usecase/dtos/` 内の相対 import（`./trip-block-details.dto`）

**Interfaces:**
- Produces: `TripBlockDetailsDto` は `src/app/libs/trip-block/usecase/dtos/trip-block-details.dto` だけになる。

- [ ] **Step 1: import を張り替える**

Run: `grep -rlE "libs/trip/usecase/dtos/trip-block-details\.dto|from '\./trip-block-details\.dto'" src`

出たファイルごとに、import のパスを `src/app/libs/trip-block/usecase/dtos/trip-block-details.dto` に直す。`src/app/libs/trip/usecase/dtos/trip-details.dto.ts` の `import { TripBlockDetailsDto } from './trip-block-details.dto';` も同じパスに直す。

- [ ] **Step 2: 重複ファイルを消す**

```bash
rm src/app/libs/trip/usecase/dtos/trip-block-details.dto.ts
```

Run: `grep -rnE "libs/trip/usecase/dtos/trip-block-details|'\./trip-block-details\.dto'" src`
Expected: `src/app/libs/trip-block/` の中の相対 import 以外は出ない

- [ ] **Step 3: 型とテストを通す**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: failed なし

- [ ] **Step 4: コミットする**

```bash
git add -A src
git diff --cached --stat
git commit -m "refactor: :recycle: 重複した TripBlockDetailsDto を libs/trip-block に寄せる"
```

---

### Task 3: 新旧比較の正解と、計測の基準のビルドを取る（コミットしない）

Task 1・2 は挙動を変えていない。だからこの時点の builder の出力が「今の正解」になる。

**Files:**
- Create: `.context/golden/capture.mjs`・`.context/golden/read-runner.ts`・`.context/golden/write-runner.ts`・`.context/golden/compare.mjs`
- Create: `.context/measure/master-tree/`（git worktree）・`.context/measure/dist-master/`

**Interfaces:**
- Produces: `.context/golden/responses/*.json`（API の応答）、`.context/golden/read.master.json`、`.context/golden/write.master.json`、`.context/golden/compare.mjs`、`.context/measure/dist-master/`。Task 4〜7 と Task 10 がこれを使う。

- [ ] **Step 1: 手元の環境が動いているか確かめる**

Run: `docker ps --format '{{.Names}} {{.Ports}}'`
Expected: `…-client-1`（4200）・`…-api-1`（3000）・`…-backend-1`（3011）が並ぶ。無ければユーザーに起動を頼む。

- [ ] **Step 2: 手元の画面を巡回して API の応答を保存するスクリプトを作る**

`.context/golden/capture.mjs`:

```js
// 手元の画面（localhost:4200）を巡回し、手元の API（localhost:3000）の JSON 応答を保存する
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE);
const base = 'http://localhost:4200';
const pages = [
    '/',
    '/operation/real-time',
    '/operation/past-time',
    '/operation/table',
    '/operation/route-diagram',
    '/timetable/all-line',
    '/timetable/station',
    '/train-diagram',
    '/train-location',
    '/library/vehicle',
];
fs.mkdirSync('.context/golden/responses', { recursive: true });
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333' });
const page = await browser.newPage();
const seen = new Set();
page.on('response', async (res) => {
    const url = new URL(res.url());
    if (url.host !== 'localhost:3000' || res.request().method() !== 'GET' || res.status() !== 200) return;
    const key = url.pathname + url.search;
    if (seen.has(key)) return;
    seen.add(key);
    const body = await res.text().catch(() => null);
    if (!body) return;
    const name = crypto.createHash('md5').update(key).digest('hex');
    fs.writeFileSync(`.context/golden/responses/${name}.json`, JSON.stringify({ path: url.pathname, search: url.search, body: JSON.parse(body) }));
});
for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle0', timeout: 120000 });
    console.log('visited', p);
}
console.log('saved', seen.size);
await page.close();
await browser.disconnect();
```

- [ ] **Step 3: 巡回する（サンドボックスの外で）**

lighthouse の npx キャッシュにある puppeteer-core を使う。無ければ `npm_config_cache=/tmp/claude-1000/npm-cache npx -y lighthouse@latest --version` で一度取ってくる。

```bash
google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333 --user-data-dir=.context/golden/chrome-profile about:blank >/dev/null 2>&1 &
echo $! > .context/golden/chrome.pid; sleep 3
PUPPETEER_CORE=$(ls -d /tmp/claude-1000/npm-cache/_npx/*/node_modules/puppeteer-core | head -1) node .context/golden/capture.mjs
kill $(cat .context/golden/chrome.pid)
```

Expected: `visited` が 10 行、`saved` が 30 以上

- [ ] **Step 4: 応答を builder に通すスクリプトを作る**

`.context/golden/read-runner.ts`（Task 4・5 でもそのまま使う。builder の公開名は Task 1 で固まっている）:

```ts
// 保存した API の応答を、今の src の builder に通して JSON で出す
import 'reflect-metadata';
import * as fs from 'node:fs';
import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { CalendarDateDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar-date.dto.builder';
import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { FormationDtoBuilder } from 'src/app/libs/formation/infrastructure/builders/formation.dto.builder';
import { OperationSightingTimeCrossSectionDtoBuilder } from 'src/app/libs/operation-sighting/infrastructure/builders/operation-sighting-time-cross-section.dto.builder';
import { OperationSightingDtoBuilder } from 'src/app/libs/operation-sighting/infrastructure/builders/operation-sighting.dto.builder';
import { OperationCurrentPositionDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation-current-position.dto.builder';
import { OperationGroupDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation-group.dto.builder';
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { RouteStationsDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route-stations.dto.builder';
import { RouteDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route.dto.builder';
import { ServiceAgenciesDtoBuilder } from 'src/app/libs/service/infrastructure/builders/service-agencies.dto.builder';
import { ServiceRoutesDtoBuilder } from 'src/app/libs/service/infrastructure/builders/service-routes.dto.builder';
import { ServiceDtoBuilder } from 'src/app/libs/service/infrastructure/builders/service.dto.builder';
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { TripBlockDtoBuilder } from 'src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder';
import { TripClassDtoBuilder } from 'src/app/libs/trip-class/infrastructure/builders/trip-class.dto.builder';
import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';

type Builder = { buildFromModel: (m: any) => unknown; buildFromModels: (m: any[]) => unknown };
const one = (b: Builder) => (body: any) => b.buildFromModel(body);
const many = (b: Builder) => (body: any) => b.buildFromModels(body);
const operationTrips = (o: any) => ({
    operation: OperationDtoBuilder.buildFromModel(o.operation),
    trips: TripOperationListDtoBuilder.buildFromModels(o.trips),
});
// query の pipe と同じ組み立て。上から順に照合する
const rules: [RegExp, (body: any) => unknown][] = [
    [/^\/v3\/agencies$/, many(AgencyDtoBuilder)],
    [/^\/v3\/calendar-dates$/, many(CalendarDateDtoBuilder)],
    [/^\/v3\/calendars$/, many(CalendarDtoBuilder)],
    [/^\/v3\/calendars\/.+$/, one(CalendarDtoBuilder)],
    [/^\/v3\/formations\/.+$/, many(FormationDtoBuilder)],
    [/^\/v3\/operation-sightings\/from\/[^/]+\/to\/[^/]+$/, many(OperationSightingDtoBuilder)],
    [/^\/v3\/operation-sightings\/time-cross-section\/(operation|formation)-numbers$/, (b) => Object.fromEntries(Object.entries(b ?? {}).map(([k, v]) => [k, OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(v)]))],
    [/^\/v3\/operation-sightings\/time-cross-section\/(operation|formation)-number\/[^/]+$/, one(OperationSightingTimeCrossSectionDtoBuilder)],
    [/^\/v3\/operations\/calendar\/[^/]+\/trips$/, (b) => b.map(operationTrips)],
    [/^\/v3\/operations\/current-positions$/, many(OperationCurrentPositionDtoBuilder)],
    [/^\/v3\/operations\/groups$/, many(OperationGroupDtoBuilder)],
    [/^\/v3\/operations\/(calendar\/[^/]+|from\/[^/]+\/to\/[^/]+)$/, many(OperationDtoBuilder)],
    [/^\/v3\/operations\/[^/]+\/current-position$/, one(OperationCurrentPositionDtoBuilder)],
    [/^\/v3\/operations\/[^/]+\/trips$/, operationTrips],
    [/^\/v3\/routes$/, many(RouteDtoBuilder)],
    [/^\/v3\/routes\/[^/]+\/stations$/, one(RouteStationsDtoBuilder)],
    [/^\/v3\/services$/, many(ServiceDtoBuilder)],
    [/^\/v3\/services\/[^/]+\/stations$/, (b) => ({ service: ServiceDtoBuilder.buildFromModel(b.service), stations: StationDtoBuilder.buildFromModels(b.stations) })],
    [/^\/v3\/services\/[^/]+\/agencies$/, one(ServiceAgenciesDtoBuilder)],
    [/^\/v3\/services\/[^/]+\/routes$/, one(ServiceRoutesDtoBuilder)],
    [/^\/v3\/stations$/, many(StationDtoBuilder)],
    [/^\/v3\/trip-blocks$/, many(TripBlockDtoBuilder)],
    [/^\/v3\/trip-blocks\/[^/]+$/, one(TripBlockDtoBuilder)],
    [/^\/v3\/trip-classes$/, many(TripClassDtoBuilder)],
];
const dir = '.context/golden/responses';
const out: Record<string, unknown> = {};
const hits: Record<string, number> = {};
for (const f of fs.readdirSync(dir).sort()) {
    const { path, search, body } = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
    const rule = rules.find(([re]) => re.test(path));
    if (!rule) continue;
    hits[String(rule[0])] = (hits[String(rule[0])] ?? 0) + 1;
    out[path + search] = JSON.parse(JSON.stringify(rule[1](body)));
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.error('件数:', Object.keys(out).length);
for (const [re] of rules) console.error(`${hits[String(re)] ?? 0}\t${re}`);
```

Run（束ねて実行）:

```bash
node_modules/.bin/esbuild .context/golden/read-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/read-runner.js --log-level=error
node .context/golden/read-runner.js .context/golden/read.master.json
```

Expected: `件数:` が 30 以上。各ルールの件数が出る。0 件のルールは、巡回では通らなかった口なので、Task 4・5 の spec で守る（件数 0 のルールをメモしておく）。

- [ ] **Step 5: 書き込みの正解を取る**

`.context/golden/write-runner.ts`（Task 6・7 でも使う。メソッド名は Task 1 の後の名前）:

```ts
// 今の書き込み経路（toTripDtos → TripBlockModelBuilder）が API に送る本文を JSON で出す
import 'reflect-metadata';
import * as fs from 'node:fs';
import { TripBlockModelBuilder } from 'src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder';
import { toTripDtos } from 'src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util';

const time = (stationId: string, stopType: string, arrivalTime: string | null, departureTime: string | null, timeId: string | null = null, tripId: string | null = null) =>
    ({ timeId, tripId, stationId, stopId: null, stopType, arrivalTime, departureTime });
const base = (o: object) => ({
    tripId: null, serviceId: 'service', tripNumber: '1001', tripClassId: 'local', tripName: '', tripDirection: 0,
    tripBlockId: null, depotIn: false, depotOut: false, calendarId: 'calendar', extraCalendarId: null,
    times: [time('a', 'stop', null, '05:01'), time('b', 'pass', null, '05:05'), time('c', 'not-going-through', null, null), time('d', 'stop', '05:10', null)],
    operationId: '', tripOperationLists: [], nextTripOperationListId: null, ...o,
});
const withIds = (o: object) => base({
    tripId: 'trip-1', tripBlockId: 'block-1',
    times: [time('a', 'stop', null, '05:01', 'time-a', 'trip-1'), time('b', 'pass', null, '05:05', 'time-b', 'trip-1'), time('d', 'stop', '05:10', null, 'time-d', 'trip-1')],
    ...o,
});
const cases: Record<string, { mode: 'add' | 'copy' | 'update'; trips: object[] }> = {
    'add-運用なし': { mode: 'add', trips: [base({})] },
    'add-運用あり': { mode: 'add', trips: [base({ operationId: 'op-1', nextTripOperationListId: 'tol-next' })] },
    'copy-元のIDが残っている': { mode: 'copy', trips: [withIds({ operationId: 'op-1', tripOperationLists: [{ id: 'tol-src', operationId: 'op-1', startStationId: 'a', endStationId: 'd', nextTripOperationListId: null }] })] },
    'update-区間1つ': { mode: 'update', trips: [withIds({ operationId: 'op-2', tripOperationLists: [{ id: 'tol-1', operationId: 'op-1', startStationId: 'a', endStationId: 'd', nextTripOperationListId: 'tol-next' }], nextTripOperationListId: 'tol-next' })] },
    'update-区間2つ': { mode: 'update', trips: [withIds({ operationId: 'op-1', tripOperationLists: [{ id: 'tol-1', operationId: 'op-1', startStationId: 'a', endStationId: 'b', nextTripOperationListId: null }, { id: 'tol-2', operationId: 'op-3', startStationId: 'b', endStationId: 'd', nextTripOperationListId: 'tol-next' }] })] },
};
const out: Record<string, unknown> = {};
for (const [name, c] of Object.entries(cases)) {
    const trips = toTripDtos(c.trips as never, c.mode) as never[];
    // 送信と同じく JSON にする（undefined のキーは消える）。登録は TimetableEditFormService と同じく 1 ブロックにまとめる
    out[name] = JSON.parse(JSON.stringify(
        c.mode === 'update'
            ? TripBlockModelBuilder.buildFromReplaceDto({ tripBlockId: 'block-1', trips } as never)
            : [{ trips }].map((b) => TripBlockModelBuilder.buildFromCreateDto(b as never)),
    ));
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
```

```bash
node_modules/.bin/esbuild .context/golden/write-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/write-runner.js --log-level=error
node .context/golden/write-runner.js .context/golden/write.master.json
```

Expected: `write.master.json` に 5 つのケースが入る。`update-区間1つ` の `trips[0].tripOperationLists[0]` に `id` が**無い**（Task 7 で直す不具合）。

- [ ] **Step 6: 比較スクリプトを作る**

`.context/golden/compare.mjs`:

```js
// 使い方: node compare.mjs <旧> <新> [--exact]
// 既定は包含（旧にある値が新に全部ある）。--exact は完全一致。違いをパスつきで出す
import fs from 'node:fs';

const [oldPath, newPath, flag] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const b = JSON.parse(fs.readFileSync(newPath, 'utf8'));
const exact = flag === '--exact';
const diffs = [];
const walk = (x, y, path) => {
    if (diffs.length > 50) return;
    if (x === null || typeof x !== 'object') {
        if (x !== y) diffs.push(`${path}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
        return;
    }
    if (y === null || typeof y !== 'object' || Array.isArray(x) !== Array.isArray(y)) {
        diffs.push(`${path}: 型が違う`);
        return;
    }
    if (Array.isArray(x) && x.length !== y.length) {
        diffs.push(`${path}: 長さ ${x.length} → ${y.length}`);
        return;
    }
    for (const k of Object.keys(x)) walk(x[k], y[k], `${path}.${k}`);
    if (exact) for (const k of Object.keys(y)) if (!(k in x)) diffs.push(`${path}.${k}: 新にだけある`);
};
walk(a, b, '$');
console.log(diffs.length ? diffs.join('\n') : 'OK');
process.exit(diffs.length ? 1 : 0);
```

Run: `node .context/golden/compare.mjs .context/golden/read.master.json .context/golden/read.master.json`
Expected: `OK`

- [ ] **Step 7: 計測の基準になる master のビルドを作る**

master の worktree を `.context/` の下に作り、node_modules は本体のものを使う。ビルドは「本番と同じ最適化・API は手元向け（`environment.ts`）」にする。

```bash
git worktree add .context/measure/master-tree master
ln -s ../../../node_modules .context/measure/master-tree/node_modules
(cd .context/measure/master-tree && npx ng build --configuration development --optimization --source-map=false --named-chunks=false --output-path=../dist-master)
```

Run: `ls .context/measure/dist-master/browser | head; ls .context/measure/dist-master/browser/*.map 2>/dev/null | wc -l`
Expected: `index.html` と `main-<ハッシュ>.js` がある。`.map` は 0 件

Run: `head -c 300 .context/measure/dist-master/browser/main-*.js`
Expected: 改行の無い圧縮されたコード（最適化が効いている）

- [ ] **Step 8: 取ったものを書き留める**

`.context/golden/README.txt` に、取った日時・応答の件数・0 件だったルールを書く（コミットしない）。

---

### Task 4: 読み取りの builder を手書きにする（マスタ系）

対象：agency・calendar・calendar-date・formation・service・service-agencies・service-routes・station・stop・route・route-station-list・route-stations・trip-class・user。入れ子の相手がまだ旧方式の builder でも、同じ名前で呼べるので順番は気にしなくてよい。

**Files:**
- Modify: 上の 14 個の builder と、それぞれの Model（下の Step 1）
- Create: 各 builder の spec（下の Step 2）

**Interfaces:**
- Consumes: Task 1 の builder の形。`TimeDtoBuilder.buildFromModels`・`TripDtoBuilder.buildFromModels`（中身はまだ旧方式でよい）
- Produces: 上の 14 個が手書きの付け替えになる。`FormationModel.agency`・`RouteModel.routeStationLists`・`StationModel.stops`/`times` を足す。

- [ ] **Step 1: Model を interface にし、入れ子と任意をそろえる**

このタスクで触る Model はどれも書き込みに使われない。だから、ここで interface にしてよい（デコレーターがあれば消す）。

`agency.model.ts`・`calendar.model.ts`・`calendar-date.model.ts`・`operation-group.model.ts` は `export class` を `export interface` にするだけ。

`src/app/libs/formation/infrastructure/models/formation.model.ts`:

```ts
import { AgencyModel } from 'src/app/libs/agency/infrastructure/models/agency.model';

export interface FormationModel {
    id: string;
    agencyId?: string;
    vehicleType?: string;
    formationNumber?: string;
    formationDescription?: string;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    updatedAt?: string;
    agency?: AgencyModel;
}
```

`src/app/libs/service/infrastructure/models/service.model.ts`（DTO が必須なので必須にそろえる）:

```ts
export interface ServiceModel {
    id: string;
    serviceName: string;
    serviceDescription: string;
    createdAt: string;
    updatedAt: string;
}
```

`src/app/libs/station/infrastructure/models/station.model.ts`:

```ts
import { RouteStationListModel } from 'src/app/libs/route/infrastructure/models/route-station-list.model';
import { TimeModel } from 'src/app/libs/trip/infrastructure/models/time.model';
import { StopModel } from './stop.model';

export interface StationModel {
    id: string;
    stationName: string;
    stationSubname: string;
    stationType: number;
    stationDescription: string;
    stationLatlng: string;
    stationUrl: string;
    wheelchairBoarding: boolean;
    createdAt: string;
    updatedAt: string;
    routeStationLists?: RouteStationListModel[];
    stops?: StopModel[];
    times?: TimeModel[];
}
```

`src/app/libs/route/infrastructure/models/route.model.ts`:

```ts
import { RouteStationListModel } from './route-station-list.model';

export interface RouteModel {
    id: string;
    agencyId?: string;
    routeNumber?: string;
    routeName?: string;
    routeNickName?: string;
    routeDescription?: string;
    routeType?: number;
    routeUrl?: string;
    routeColor?: string;
    routeTextColor?: string;
    createdAt?: string;
    updatedAt?: string;
    routeStationLists?: RouteStationListModel[];
}
```

`route-station-list.model.ts`・`route-stations.model.ts`（`RouteStationModel extends StationModel` も）・`trip-class.model.ts`・`user.model.ts` は `export class` を `export interface` にする。中身は今のまま。

- [ ] **Step 2: spec を書く（失敗することを確かめる）**

各 builder の隣に spec を置く。`toEqual` は値が `undefined` のキーを無いものと同じに扱う。

`src/app/libs/formation/infrastructure/builders/formation.dto.builder.spec.ts`:

```ts
import { FormationDtoBuilder } from './formation.dto.builder';

describe('FormationDtoBuilder', () => {
    it('id を formationId に、入れ子の会社の id を agencyId にする', () => {
        const dto = FormationDtoBuilder.buildFromModel({
            id: 'f-1',
            formationNumber: '10701',
            agency: { id: 'a-1', agencyName: '相鉄' },
        });

        expect(dto).toEqual({
            formationId: 'f-1',
            formationNumber: '10701',
            agency: { agencyId: 'a-1', agencyName: '相鉄' },
        });
        expect(dto).not.toHaveProperty('id');
    });

    it('buildFromModels は 1 件ずつ変換する', () => {
        expect(
            FormationDtoBuilder.buildFromModels([{ id: 'f-1' }, { id: 'f-2' }]),
        ).toEqual([{ formationId: 'f-1' }, { formationId: 'f-2' }]);
    });
});
```

`src/app/libs/station/infrastructure/builders/station.dto.builder.spec.ts`:

```ts
import { StationModel } from '../models/station.model';
import { StationDtoBuilder } from './station.dto.builder';

const station = (o: Partial<StationModel>): StationModel => ({
    id: 'st-1',
    stationName: '横浜',
    stationSubname: '',
    stationType: 0,
    stationDescription: '',
    stationLatlng: '',
    stationUrl: '',
    wheelchairBoarding: false,
    createdAt: '',
    updatedAt: '',
    ...o,
});

describe('StationDtoBuilder', () => {
    it('id と、路線の駅・のりば・時刻の入れ子の id を付け替える', () => {
        const dto = StationDtoBuilder.buildFromModel(
            station({
                routeStationLists: [
                    { id: 'rsl-1', routeId: 'r-1', route: { id: 'r-1', routeName: '本線' } },
                ],
                stops: [
                    { id: 'stop-1', stationId: 'st-1', stopName: '1番線', stopDescription: '', stopLatlng: '', zoneId: '', createdAt: '', updatedAt: '' },
                ],
                times: [{ id: 'time-1', stationId: 'st-1' }],
            }),
        );

        expect(dto.stationId).toBe('st-1');
        expect(dto.routeStationLists).toEqual([
            { routeStationListId: 'rsl-1', routeId: 'r-1', route: { routeId: 'r-1', routeName: '本線' } },
        ]);
        expect(dto.stops[0].stopId).toBe('stop-1');
        expect(dto.times[0].timeId).toBe('time-1');
    });

    it('入れ子が無いときは undefined のまま', () => {
        const dto = StationDtoBuilder.buildFromModel(station({}));

        expect(dto.routeStationLists).toBeUndefined();
        expect(dto.stops).toBeUndefined();
        expect(dto.times).toBeUndefined();
    });
});
```

`src/app/libs/route/infrastructure/builders/route-stations.dto.builder.spec.ts`:

```ts
import { RouteStationsDtoBuilder } from './route-stations.dto.builder';

describe('RouteStationsDtoBuilder', () => {
    it('路線と駅の id を付け替え、駅の並び順と駅番号を残す', () => {
        const dto = RouteStationsDtoBuilder.buildFromModel({
            route: { id: 'r-1', routeName: '本線' },
            stations: [
                {
                    id: 'st-1', stationName: '横浜', stationSubname: '', stationType: 0, stationDescription: '',
                    stationLatlng: '', stationUrl: '', wheelchairBoarding: false, createdAt: '', updatedAt: '',
                    stationSequence: 1, stationNumbering: 'SO01',
                },
            ],
        });

        expect(dto.route).toEqual({ routeId: 'r-1', routeName: '本線' });
        expect(dto.stations[0]).toMatchObject({ stationId: 'st-1', stationSequence: 1, stationNumbering: 'SO01' });
        expect(dto.stations[0]).not.toHaveProperty('id');
    });
});
```

`src/app/libs/service/infrastructure/builders/service-routes.dto.builder.spec.ts`:

```ts
import { ServiceRoutesDtoBuilder } from './service-routes.dto.builder';

describe('ServiceRoutesDtoBuilder', () => {
    it('運行系統と路線の id を付け替え、系統の中の順と端の駅を残す', () => {
        const dto = ServiceRoutesDtoBuilder.buildFromModel({
            service: { id: 's-1', serviceName: '相鉄', serviceDescription: '', createdAt: '', updatedAt: '' },
            routes: [{ id: 'r-1', routeName: '本線', sequence: 1, startRouteStationListId: 'rsl-a', endRouteStationListId: 'rsl-b' }],
        });

        expect(dto.service.serviceId).toBe('s-1');
        expect(dto.routes[0]).toMatchObject({ routeId: 'r-1', sequence: 1, startRouteStationListId: 'rsl-a', endRouteStationListId: 'rsl-b' });
    });
});
```

`src/app/libs/user/infrastructure/builders/user.dto.builder.spec.ts`:

```ts
import { UserDtoBuilder } from './user.dto.builder';

describe('UserDtoBuilder', () => {
    it('DTO の項目だけを写し、password は持たせない', () => {
        const dto = UserDtoBuilder.buildFromModel({
            userId: 'u-1', username: 'a', password: 'secret', displayName: 'A', role: 'admin', createdAt: 'c', updatedAt: 'u',
        });

        expect(dto).toEqual({ userId: 'u-1', username: 'a', displayName: 'A', role: 'admin', createdAt: 'c', updatedAt: 'u' });
        expect(dto).not.toHaveProperty('password');
    });
});
```

`src/app/libs/calendar/infrastructure/builders/calendar.dto.builder.spec.ts`（付け替えだけの builder の代表。agency・calendar-date・service・stop・trip-class・route も同じ形の 1 件で書く。下の表の値で `<B>`・`<ID>` を置き換える）:

```ts
import { CalendarDtoBuilder } from './calendar.dto.builder';

describe('CalendarDtoBuilder', () => {
    it('id を calendarId にし、ほかの項目はそのまま写す', () => {
        expect(
            CalendarDtoBuilder.buildFromModel({ id: 'c-1', calendarName: '平日ダイヤ', endDate: null }),
        ).toEqual({ calendarId: 'c-1', calendarName: '平日ダイヤ', endDate: null });
    });
});
```

| spec ファイル（builder の隣） | `<B>` | `<ID>` |
|---|---|---|
| `agency.dto.builder.spec.ts` | `AgencyDtoBuilder` | `agencyId` |
| `calendar-date.dto.builder.spec.ts` | `CalendarDateDtoBuilder` | `calendarDateId` |
| `service.dto.builder.spec.ts` | `ServiceDtoBuilder` | `serviceId` |
| `stop.dto.builder.spec.ts` | `StopDtoBuilder` | `stopId` |
| `trip-class.dto.builder.spec.ts` | `TripClassDtoBuilder` | `tripClassId` |
| `route.dto.builder.spec.ts` | `RouteDtoBuilder` | `routeId` |

（service・stop は Model の必須項目を全部渡す。route は `routeStationLists: [{ id: 'rsl-1' }]` も渡し、`routeStationLists[0].routeStationListId` が `'rsl-1'` になることも確かめる。trip-class は `trips: [{ id: 't-1' }]` を渡し、`trips[0].tripId` が `'t-1'` になることも確かめる。）

Run: `npx jest --testPathPatterns="libs/(agency|calendar|formation|service|station|route|trip-class|user)/infrastructure/builders"`
Expected: FAIL。`not.toHaveProperty('id')` や `password` の検査で落ちる（旧方式でも通るものはあってよい）

- [ ] **Step 3: builder を手書きにする**

それぞれのファイルの中身を、次で置き換える（import はこの通りにし、class-transformer の import は消す）。

`agency.dto.builder.ts`:

```ts
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

export const AgencyDtoBuilder = {
    buildFromModel: ({ id, ...rest }: AgencyModel): AgencyDetailsDto => ({
        ...rest,
        agencyId: id,
    }),
    buildFromModels: (models: AgencyModel[]): AgencyDetailsDto[] =>
        models.map((model) => AgencyDtoBuilder.buildFromModel(model)),
} as const;
```

`calendar.dto.builder.ts`:

```ts
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export const CalendarDtoBuilder = {
    buildFromModel: ({ id, ...rest }: CalendarModel): CalendarDetailsDto => ({
        ...rest,
        calendarId: id,
    }),
    buildFromModels: (models: CalendarModel[]): CalendarDetailsDto[] =>
        models.map((model) => CalendarDtoBuilder.buildFromModel(model)),
} as const;
```

`calendar-date.dto.builder.ts`:

```ts
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateModel } from '../models/calendar-date.model';

export const CalendarDateDtoBuilder = {
    buildFromModel: ({
        id,
        ...rest
    }: CalendarDateModel): CalendarDateDetailsDto => ({
        ...rest,
        calendarDateId: id,
    }),
    buildFromModels: (models: CalendarDateModel[]): CalendarDateDetailsDto[] =>
        models.map((model) => CalendarDateDtoBuilder.buildFromModel(model)),
} as const;
```

`formation.dto.builder.ts`:

```ts
import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export const FormationDtoBuilder = {
    buildFromModel: ({
        id,
        agency,
        ...rest
    }: FormationModel): FormationDetailsDto => ({
        ...rest,
        formationId: id,
        agency: agency && AgencyDtoBuilder.buildFromModel(agency),
    }),
    buildFromModels: (models: FormationModel[]): FormationDetailsDto[] =>
        models.map((model) => FormationDtoBuilder.buildFromModel(model)),
} as const;
```

`service.dto.builder.ts`:

```ts
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

export const ServiceDtoBuilder = {
    buildFromModel: ({ id, ...rest }: ServiceModel): ServiceDetailsDto => ({
        ...rest,
        serviceId: id,
    }),
    buildFromModels: (models: ServiceModel[]): ServiceDetailsDto[] =>
        models.map((model) => ServiceDtoBuilder.buildFromModel(model)),
} as const;
```

`service-agencies.dto.builder.ts`:

```ts
import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceAgenciesModel } from '../models/service-agencies.model';
import { ServiceDtoBuilder } from './service.dto.builder';

export const ServiceAgenciesDtoBuilder = {
    buildFromModel: ({
        service,
        agencies,
        ...rest
    }: ServiceAgenciesModel): ServiceAgenciesDto => ({
        ...rest,
        service: service && ServiceDtoBuilder.buildFromModel(service),
        agencies: agencies && AgencyDtoBuilder.buildFromModels(agencies),
    }),
    buildFromModels: (models: ServiceAgenciesModel[]): ServiceAgenciesDto[] =>
        models.map((model) => ServiceAgenciesDtoBuilder.buildFromModel(model)),
} as const;
```

`service-routes.dto.builder.ts`:

```ts
import { RouteDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route.dto.builder';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceDtoBuilder } from './service.dto.builder';

export const ServiceRoutesDtoBuilder = {
    buildFromModel: ({
        service,
        routes,
        ...rest
    }: ServiceRoutesModel): ServiceRoutesDto => ({
        ...rest,
        service: service && ServiceDtoBuilder.buildFromModel(service),
        routes:
            routes &&
            routes.map((route) => ({
                ...RouteDtoBuilder.buildFromModel(route),
                sequence: route.sequence,
                startRouteStationListId: route.startRouteStationListId,
                endRouteStationListId: route.endRouteStationListId,
            })),
    }),
    buildFromModels: (models: ServiceRoutesModel[]): ServiceRoutesDto[] =>
        models.map((model) => ServiceRoutesDtoBuilder.buildFromModel(model)),
} as const;
```

`station.dto.builder.ts`:

```ts
import { RouteStationListDtoBuilder } from 'src/app/libs/route/infrastructure/builders/route-station-list.dto.builder';
import { TimeDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/time.dto.builder';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';
import { StopDtoBuilder } from './stop.dto.builder';

export const StationDtoBuilder = {
    buildFromModel: ({
        id,
        routeStationLists,
        stops,
        times,
        ...rest
    }: StationModel): StationDetailsDto => ({
        ...rest,
        stationId: id,
        routeStationLists:
            routeStationLists &&
            RouteStationListDtoBuilder.buildFromModels(routeStationLists),
        stops: stops && StopDtoBuilder.buildFromModels(stops),
        times: times && TimeDtoBuilder.buildFromModels(times),
    }),
    buildFromModels: (models: StationModel[]): StationDetailsDto[] =>
        models.map((model) => StationDtoBuilder.buildFromModel(model)),
} as const;
```

`stop.dto.builder.ts`:

```ts
import { StopDetailsDto } from '../../usecase/dtos/stop-details.dto';
import { StopModel } from '../models/stop.model';

export const StopDtoBuilder = {
    buildFromModel: ({ id, ...rest }: StopModel): StopDetailsDto => ({
        ...rest,
        stopId: id,
    }),
    buildFromModels: (models: StopModel[]): StopDetailsDto[] =>
        models.map((model) => StopDtoBuilder.buildFromModel(model)),
} as const;
```

`route.dto.builder.ts`:

```ts
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';
import { RouteStationListDtoBuilder } from './route-station-list.dto.builder';

export const RouteDtoBuilder = {
    buildFromModel: ({
        id,
        routeStationLists,
        ...rest
    }: RouteModel): RouteDetailsDto => ({
        ...rest,
        routeId: id,
        routeStationLists:
            routeStationLists &&
            RouteStationListDtoBuilder.buildFromModels(routeStationLists),
    }),
    buildFromModels: (models: RouteModel[]): RouteDetailsDto[] =>
        models.map((model) => RouteDtoBuilder.buildFromModel(model)),
} as const;
```

`route-station-list.dto.builder.ts`:

```ts
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { RouteStationListDetailsDto } from '../../usecase/dtos/route-station-list-details.dto';
import { RouteStationListModel } from '../models/route-station-list.model';
import { RouteDtoBuilder } from './route.dto.builder';

export const RouteStationListDtoBuilder = {
    buildFromModel: ({
        id,
        route,
        station,
        ...rest
    }: RouteStationListModel): RouteStationListDetailsDto => ({
        ...rest,
        routeStationListId: id,
        route: route && RouteDtoBuilder.buildFromModel(route),
        station: station && StationDtoBuilder.buildFromModel(station),
    }),
    buildFromModels: (
        models: RouteStationListModel[],
    ): RouteStationListDetailsDto[] =>
        models.map((model) => RouteStationListDtoBuilder.buildFromModel(model)),
} as const;
```

`route-stations.dto.builder.ts`:

```ts
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteStationsModel } from '../models/route-stations.model';
import { RouteDtoBuilder } from './route.dto.builder';

export const RouteStationsDtoBuilder = {
    buildFromModel: ({
        route,
        stations,
        ...rest
    }: RouteStationsModel): RouteStationsDto => ({
        ...rest,
        route: route && RouteDtoBuilder.buildFromModel(route),
        stations:
            stations &&
            stations.map((station) => ({
                ...StationDtoBuilder.buildFromModel(station),
                stationSequence: station.stationSequence,
                stationNumbering: station.stationNumbering,
            })),
    }),
    buildFromModels: (models: RouteStationsModel[]): RouteStationsDto[] =>
        models.map((model) => RouteStationsDtoBuilder.buildFromModel(model)),
} as const;
```

`trip-class.dto.builder.ts`:

```ts
import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export const TripClassDtoBuilder = {
    buildFromModel: ({
        id,
        trips,
        ...rest
    }: TripClassModel): TripClassDetailsDto => ({
        ...rest,
        tripClassId: id,
        trips: trips && TripDtoBuilder.buildFromModels(trips),
    }),
    buildFromModels: (models: TripClassModel[]): TripClassDetailsDto[] =>
        models.map((model) => TripClassDtoBuilder.buildFromModel(model)),
} as const;
```

`user.dto.builder.ts`（`password` を DTO に入れないため、ここだけ項目を並べる）:

```ts
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserModel } from '../models/user.model';

export const UserDtoBuilder = {
    /** 応答に password が混ざっても DTO に入れないよう、項目を並べて写す */
    buildFromModel: (model: UserModel): UserDetailsDto => ({
        userId: model.userId,
        username: model.username,
        displayName: model.displayName,
        role: model.role,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
    }),
    buildFromModels: (models: UserModel[]): UserDetailsDto[] =>
        models.map((model) => UserDtoBuilder.buildFromModel(model)),
} as const;
```

- [ ] **Step 4: 型と spec を通す**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし。TS2322 で「optional in … but required in …」が出たら、Model の任意を DTO にそろえる（キャストで黙らせない）。

Run: `npx jest --testPathPatterns="libs/(agency|calendar|formation|service|station|route|trip-class|user)/infrastructure/builders"`
Expected: PASS

- [ ] **Step 5: 本番データで新旧を比べる**

```bash
node_modules/.bin/esbuild .context/golden/read-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/read-runner.js --log-level=error
node .context/golden/read-runner.js .context/golden/read.task4.json
node .context/golden/compare.mjs .context/golden/read.master.json .context/golden/read.task4.json
```

Expected: `OK`（旧にある値が新に全部ある）

- [ ] **Step 6: 全 spec を通してコミットする**

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: failed なし

触ったファイルを 1 つずつ prettier で整形してからコミットする。

```bash
git add -A src/app/libs
git diff --cached --stat
git commit -m "refactor: :recycle: マスタ系の読み取り builder を手書きの付け替えにする"
```

---

### Task 5: 読み取りの builder を手書きにする（列車・運用・目撃）

対象：time・trip・trip-operation-list・trip-block・operation・operation-current-position・operation-group・operation-sighting・operation-sighting-time-cross-section。

**Files:**
- Modify: 上の 9 個の builder（`time.dto.builder.ts` は Task 1 で新設済み）
- Modify: `src/app/libs/trip/infrastructure/models/trip.model.ts`（`tripClass`・`tripBlock` を足す）、`src/app/libs/operation/infrastructure/models/operation.model.ts`（`calendar` を足して interface にする）、`operation-current-position.model.ts`・`operation-trips.model.ts`・`operation-sighting.model.ts`・`operation-sighting-time-cross-section.model.ts`（interface にする）
- Modify: `src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder.spec.ts`（書き直す）
- Create: `trip.dto.builder.spec.ts`・`operation-current-position.dto.builder.spec.ts`・`operation-sighting.dto.builder.spec.ts`・`operation-sighting-time-cross-section.dto.builder.spec.ts`

**Interfaces:**
- Consumes: Task 4 の `CalendarDtoBuilder`・`FormationDtoBuilder`・`StationDtoBuilder`・`StopDtoBuilder`・`TripClassDtoBuilder`・`AgencyDtoBuilder`
- Produces: 読み取りの builder が全部手書きになる（class-transformer を使う読み取りは無くなる）

- [ ] **Step 1: Model をそろえる**

`TripBlockModel`・`TripModel`・`TimeModel`・`TripOperationListModel` は書き込み（Task 6）がまだ `@Expose` を使うので、class のまま残し、項目だけ足す。

`src/app/libs/trip/infrastructure/models/trip.model.ts` に、デコレーターを付けずに足す（書き込みの `plainToClass` は `@Expose` の無い項目を捨てるので、送る本文は変わらない）:

```ts
    tripClass?: TripClassModel;

    tripBlock?: TripBlockModel;
```

import: `import { TripClassModel } from 'src/app/libs/trip-class/infrastructure/models/trip-class.model';` と `import { TripBlockModel } from 'src/app/libs/trip-block/infrastructure/models/trip-block.model';`

`src/app/libs/operation/infrastructure/models/operation.model.ts`:

```ts
import { CalendarModel } from 'src/app/libs/calendar/infrastructure/models/calendar.model';

export interface OperationModel {
    id: string;
    calendarId?: string;
    operationNumber?: string;
    createdAt?: string;
    updatedAt?: string;
    calendar?: CalendarModel;
}
```

`operation-sighting.model.ts`（2 つの class）と `operation-sighting-time-cross-section.model.ts` は、`export class` を `export interface` にし、`@Expose`・`@Type` と class-transformer の import を消す。

- [ ] **Step 2: spec を書く（失敗することを確かめる）**

`src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder.spec.ts`（全文を置き換える）:

```ts
import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockDtoBuilder } from './trip-block.dto.builder';

describe('TripBlockDtoBuilder', () => {
    // API の応答と同じ形の素の JSON（入れ子の列車・時刻・運用・種別を含む）
    const model = {
        id: 'block-1',
        createdAt: '2026-03-14T00:00:00.000Z',
        trips: [
            {
                id: 'trip-1',
                tripNumber: '6400',
                tripBlockId: 'block-1',
                times: [{ id: 'time-1', stationId: 'st-1', departureTime: '05:00:00' }],
                tripOperationLists: [
                    { id: 'tol-1', operationId: 'op-1', operation: { id: 'op-1', operationNumber: '58K' } },
                ],
                tripClass: { id: 'class-1', tripClassName: '各停' },
            },
        ],
    } as TripBlockModel;

    it('すべての階層の id を xxxId に付け替える', () => {
        const dto = TripBlockDtoBuilder.buildFromModel(model);

        expect(dto.tripBlockId).toBe('block-1');
        expect(dto.createdAt).toBe('2026-03-14T00:00:00.000Z');
        const [trip] = dto.trips;
        expect(trip.tripId).toBe('trip-1');
        expect(trip.tripBlockId).toBe('block-1');
        expect(trip.times[0]).toEqual({ timeId: 'time-1', stationId: 'st-1', departureTime: '05:00:00' });
        expect(trip.tripOperationLists[0]).toEqual({
            tripOperationListId: 'tol-1',
            operationId: 'op-1',
            operation: { operationId: 'op-1', operationNumber: '58K' },
        });
        expect(trip.tripClass).toEqual({ tripClassId: 'class-1', tripClassName: '各停' });
        expect(JSON.stringify(dto)).not.toMatch(/"id":/);
    });

    it('fields で絞った trip-blocks（時刻に id が無い）でも落ちない', () => {
        const dto = TripBlockDtoBuilder.buildFromModel({
            id: 'block-1',
            trips: [{ id: 'trip-1', times: [{ stationId: 'st-1', departureTime: '05:00' }] }],
        } as TripBlockModel);

        expect(dto.trips[0].times[0]).toEqual({ timeId: undefined, stationId: 'st-1', departureTime: '05:00' });
        expect(dto.trips[0].tripOperationLists).toBeUndefined();
    });
});
```

`src/app/libs/trip/infrastructure/builders/trip.dto.builder.spec.ts`:

```ts
import { TripModel } from '../models/trip.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

describe('TripDtoBuilder', () => {
    it('列車が属するブロックの id も付け替える', () => {
        const dto = TripDtoBuilder.buildFromModel({
            id: 'trip-1',
            tripBlock: { id: 'block-1' },
        } as TripModel);

        expect(dto.tripId).toBe('trip-1');
        expect(dto.tripBlock).toEqual({ tripBlockId: 'block-1' });
    });
});

describe('TimeDtoBuilder', () => {
    it('時刻の駅・のりば・区間の入れ子を付け替える', () => {
        const dto = TimeDtoBuilder.buildFromModel({
            id: 'time-1',
            station: { id: 'st-1', stationName: '横浜' },
            stop: { id: 'stop-1', stationId: 'st-1' },
            startTripOperationLists: [{ id: 'tol-1' }],
            endTripOperationLists: [],
        } as never);

        expect(dto.timeId).toBe('time-1');
        expect(dto.station).toEqual({ stationId: 'st-1', stationName: '横浜' });
        expect(dto.stop).toEqual({ stopId: 'stop-1', stationId: 'st-1' });
        expect(dto.startTripOperationLists).toEqual([{ tripOperationListId: 'tol-1' }]);
        expect(dto.endTripOperationLists).toEqual([]);
    });
});

describe('TripOperationListDtoBuilder', () => {
    it('運用が null のときは null のまま', () => {
        const dto = TripOperationListDtoBuilder.buildFromModel({
            id: 'tol-1',
            operation: null,
            startTime: { id: 'time-1' },
        } as never);

        expect(dto.tripOperationListId).toBe('tol-1');
        expect(dto.operation).toBeNull();
        expect(dto.startTime).toEqual({ timeId: 'time-1' });
    });
});
```

（このファイルの `as never` は、テストで一部の項目だけを渡すためのもの。本体のコードには使わない。）

`src/app/libs/operation/infrastructure/builders/operation-current-position.dto.builder.spec.ts`:

```ts
import { OperationCurrentPositionDtoBuilder } from './operation-current-position.dto.builder';

describe('OperationCurrentPositionDtoBuilder', () => {
    it('運用と前・今・次の区間を付け替え、null はそのまま返す', () => {
        const dto = OperationCurrentPositionDtoBuilder.buildFromModel({
            operation: { id: 'op-1', operationNumber: '58K', calendar: { id: 'c-1' } },
            prev: { id: 'tol-p', trip: { id: 'trip-p' } },
            current: null,
            next: { id: 'tol-n' },
            position: { prev: { id: 'pp' }, current: { id: 'pc' }, next: { id: 'pn' } },
        });

        expect(dto.operation).toEqual({ operationId: 'op-1', operationNumber: '58K', calendar: { calendarId: 'c-1' } });
        expect(dto.prev).toEqual({ tripOperationListId: 'tol-p', trip: { tripId: 'trip-p' } });
        expect(dto.current).toBeNull();
        expect(dto.next).toEqual({ tripOperationListId: 'tol-n' });
        expect(dto.position).toEqual({
            prev: { tripOperationListId: 'pp' },
            current: { tripOperationListId: 'pc' },
            next: { tripOperationListId: 'pn' },
        });
    });
});
```

`src/app/libs/operation-sighting/infrastructure/builders/operation-sighting.dto.builder.spec.ts`:

```ts
import { OperationSightingDtoBuilder } from './operation-sighting.dto.builder';

describe('OperationSightingDtoBuilder', () => {
    it('目撃・運用・編成の id を付け替え、取り消しと引き継ぎ元はそのまま写す', () => {
        const dto = OperationSightingDtoBuilder.buildFromModel({
            id: 's-1',
            operationId: 'op-1',
            formationId: 'f-1',
            operation: { id: 'op-1', operationNumber: '58K' },
            formation: { id: 'f-1', formationNumber: '10701' },
            invalidation: null,
            sightedAsOperation: null,
        });

        expect(dto).toEqual({
            operationSightingId: 's-1',
            operationId: 'op-1',
            formationId: 'f-1',
            operation: { operationId: 'op-1', operationNumber: '58K' },
            formation: { formationId: 'f-1', formationNumber: '10701' },
            invalidation: null,
            sightedAsOperation: null,
        });
    });
});
```

`src/app/libs/operation-sighting/infrastructure/builders/operation-sighting-time-cross-section.dto.builder.spec.ts`:

```ts
import { OperationSightingTimeCrossSectionDtoBuilder } from './operation-sighting-time-cross-section.dto.builder';

describe('OperationSightingTimeCrossSectionDtoBuilder', () => {
    it('最新の目撃と、部分的な expectedSighting（id なし）を付け替える', () => {
        const dto = OperationSightingTimeCrossSectionDtoBuilder.buildFromModel({
            latestSighting: { id: 's-1', operation: { id: 'op-1' } },
            expectedSighting: { operation: { id: 'op-2', operationNumber: '60K' }, formation: { id: 'f-1' } },
            sightedAsOperation: { operationId: 'op-1', operationNumber: '58K' },
        });

        expect(dto.latestSighting).toEqual({ operationSightingId: 's-1', operation: { operationId: 'op-1' } });
        expect(dto.expectedSighting).toEqual({
            operationSightingId: undefined,
            operation: { operationId: 'op-2', operationNumber: '60K' },
            formation: { formationId: 'f-1' },
        });
        expect(dto.sightedAsOperation).toEqual({ operationId: 'op-1', operationNumber: '58K' });
    });

    it('expectedSighting が無いときも落ちない', () => {
        const dto = OperationSightingTimeCrossSectionDtoBuilder.buildFromModel({
            latestSighting: { id: 's-1' },
            expectedSighting: undefined,
        });

        expect(dto.expectedSighting).toBeUndefined();
    });
});
```

Run: `npx jest --testPathPatterns="libs/(trip|trip-block|operation|operation-sighting)/infrastructure/builders"`
Expected: FAIL（`position` が旧方式では捨てられる、`JSON.stringify` に `"id":` が残る、などで落ちる）

- [ ] **Step 3: builder を手書きにする**

`src/app/libs/trip/infrastructure/builders/time.dto.builder.ts`:

```ts
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { StopDtoBuilder } from 'src/app/libs/station/infrastructure/builders/stop.dto.builder';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TimeDtoBuilder = {
    buildFromModel: ({
        id,
        trip,
        station,
        stop,
        startTripOperationLists,
        endTripOperationLists,
        ...rest
    }: TimeModel): TimeDetailsDto => ({
        ...rest,
        timeId: id,
        trip: trip && TripDtoBuilder.buildFromModel(trip),
        station: station && StationDtoBuilder.buildFromModel(station),
        stop: stop && StopDtoBuilder.buildFromModel(stop),
        startTripOperationLists:
            startTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(startTripOperationLists),
        endTripOperationLists:
            endTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(endTripOperationLists),
    }),
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/trip/infrastructure/builders/trip.dto.builder.ts`:

```ts
import { TripBlockDtoBuilder } from 'src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder';
import { TripClassDtoBuilder } from 'src/app/libs/trip-class/infrastructure/builders/trip-class.dto.builder';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';

export const TripDtoBuilder = {
    buildFromModel: ({
        id,
        times,
        tripOperationLists,
        tripClass,
        tripBlock,
        ...rest
    }: TripModel): TripDetailsDto => ({
        ...rest,
        tripId: id,
        times: times && TimeDtoBuilder.buildFromModels(times),
        tripOperationLists:
            tripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(tripOperationLists),
        tripClass: tripClass && TripClassDtoBuilder.buildFromModel(tripClass),
        tripBlock: tripBlock && TripBlockDtoBuilder.buildFromModel(tripBlock),
    }),
    buildFromModels: (models: TripModel[]): TripDetailsDto[] =>
        models.map((model) => TripDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder.ts`:

```ts
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { TripOperationListDetailsDto } from '../../usecase/dtos/trip-operation-list-details.dto';
import { TripOperationListModel } from '../models/trip-operation-list.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

export const TripOperationListDtoBuilder = {
    buildFromModel: ({
        id,
        trip,
        operation,
        startTime,
        endTime,
        ...rest
    }: TripOperationListModel): TripOperationListDetailsDto => ({
        ...rest,
        tripOperationListId: id,
        trip: trip && TripDtoBuilder.buildFromModel(trip),
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        startTime: startTime && TimeDtoBuilder.buildFromModel(startTime),
        endTime: endTime && TimeDtoBuilder.buildFromModel(endTime),
    }),
    buildFromModels: (
        models: TripOperationListModel[],
    ): TripOperationListDetailsDto[] =>
        models.map((model) => TripOperationListDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/trip-block/infrastructure/builders/trip-block.dto.builder.ts`:

```ts
import { TripDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.dto.builder';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockDtoBuilder = {
    buildFromModel: ({
        id,
        trips,
        ...rest
    }: TripBlockModel): TripBlockDetailsDto => ({
        ...rest,
        tripBlockId: id,
        trips: trips && TripDtoBuilder.buildFromModels(trips),
    }),
    buildFromModels: (models: TripBlockModel[]): TripBlockDetailsDto[] =>
        models.map((model) => TripBlockDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/operation/infrastructure/builders/operation.dto.builder.ts`:

```ts
import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export const OperationDtoBuilder = {
    buildFromModel: ({
        id,
        calendar,
        ...rest
    }: OperationModel): OperationDetailsDto => ({
        ...rest,
        operationId: id,
        calendar: calendar && CalendarDtoBuilder.buildFromModel(calendar),
    }),
    buildFromModels: (models: OperationModel[]): OperationDetailsDto[] =>
        models.map((model) => OperationDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/operation/infrastructure/builders/operation-group.dto.builder.ts`:

```ts
import { OperationGroupDto } from '../../usecase/dtos/operation-group.dto';
import { OperationGroupModel } from '../models/operation-group.model';

export const OperationGroupDtoBuilder = {
    /** 運用群は id を持たないので、そのまま写す */
    buildFromModel: (model: OperationGroupModel): OperationGroupDto => ({
        ...model,
    }),
    buildFromModels: (models: OperationGroupModel[]): OperationGroupDto[] =>
        models.map((model) => OperationGroupDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/operation/infrastructure/builders/operation-current-position.dto.builder.ts`:

```ts
import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationDtoBuilder } from './operation.dto.builder';

const buildSegment = TripOperationListDtoBuilder.buildFromModel;

export const OperationCurrentPositionDtoBuilder = {
    buildFromModel: ({
        operation,
        prev,
        current,
        next,
        position,
        ...rest
    }: OperationCurrentPositionModel): OperationCurrentPositionDto => ({
        ...rest,
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        prev: prev && buildSegment(prev),
        current: current && buildSegment(current),
        next: next && buildSegment(next),
        position: position && {
            prev: position.prev && buildSegment(position.prev),
            current: position.current && buildSegment(position.current),
            next: position.next && buildSegment(position.next),
        },
    }),
    buildFromModels: (
        models: OperationCurrentPositionModel[],
    ): OperationCurrentPositionDto[] =>
        models.map((model) =>
            OperationCurrentPositionDtoBuilder.buildFromModel(model),
        ),
} as const;
```

注：`const buildSegment = TripOperationListDtoBuilder.buildFromModel;` はモジュールの読み込み時に評価される。trip 側と循環 import になって `undefined` を掴む場合は、`(model: TripOperationListModel) => TripOperationListDtoBuilder.buildFromModel(model)` に変える。spec が `TypeError` で落ちたらこれを疑う。

`src/app/libs/operation-sighting/infrastructure/builders/operation-sighting.dto.builder.ts`:

```ts
import { FormationDtoBuilder } from 'src/app/libs/formation/infrastructure/builders/formation.dto.builder';
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingDtoBuilder = {
    buildFromModel: ({
        id,
        operation,
        formation,
        ...rest
    }: OperationSightingModel): OperationSightingDetailsDto => ({
        ...rest,
        operationSightingId: id,
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        formation: formation && FormationDtoBuilder.buildFromModel(formation),
    }),
    buildFromModels: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] =>
        models.map((model) => OperationSightingDtoBuilder.buildFromModel(model)),
} as const;
```

`src/app/libs/operation-sighting/infrastructure/builders/operation-sighting-time-cross-section.dto.builder.ts`:

```ts
import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingDtoBuilder } from './operation-sighting.dto.builder';

type ExpectedModel = OperationSightingTimeCrossSectionModel['expectedSighting'];
type ExpectedDto = OperationSightingTimeCrossSectionDto['expectedSighting'];

/** 推定の目撃は id も入れ子も欠けうる（部分的な目撃）。あるものだけ付け替える */
const buildExpectedSighting = ({
    id,
    operation,
    formation,
    ...rest
}: ExpectedModel): ExpectedDto => ({
    ...rest,
    operationSightingId: id,
    operation: operation && {
        ...omitId(operation),
        operationId: operation.id,
        calendar:
            operation.calendar &&
            CalendarDtoBuilder.buildFromModel(operation.calendar),
    },
    formation: formation && {
        ...omitId(formation),
        formationId: formation.id,
        agency:
            formation.agency &&
            AgencyDtoBuilder.buildFromModel(formation.agency),
    },
});

function omitId<T extends { id?: string }>({ id, ...rest }: T): Omit<T, 'id'> {
    return rest;
}

export const OperationSightingTimeCrossSectionDtoBuilder = {
    buildFromModel: ({
        latestSighting,
        expectedSighting,
        ...rest
    }: OperationSightingTimeCrossSectionModel): OperationSightingTimeCrossSectionDto => ({
        ...rest,
        latestSighting:
            latestSighting &&
            OperationSightingDtoBuilder.buildFromModel(latestSighting),
        expectedSighting:
            expectedSighting && buildExpectedSighting(expectedSighting),
    }),
    buildFromModels: (
        models: OperationSightingTimeCrossSectionModel[],
    ): OperationSightingTimeCrossSectionDto[] =>
        models.map((model) =>
            OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(model),
        ),
} as const;
```

注：`omitId` の `id` は捨てるための引数。lint の no-unused-vars で落ちるなら、その lint 設定が分割代入の残りを許す（`ignoreRestSiblings`）かを確かめる。許さないなら `const { id: _id, ...rest } = value;` の形にし、設定に合わせる。

- [ ] **Step 4: 型と spec を通す**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし

Run: `npx jest --testPathPatterns="libs/(trip|trip-block|operation|operation-sighting)/infrastructure/builders"`
Expected: PASS

- [ ] **Step 5: 本番データで新旧を比べる**

```bash
node_modules/.bin/esbuild .context/golden/read-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/read-runner.js --log-level=error
node .context/golden/read-runner.js .context/golden/read.task5.json
node .context/golden/compare.mjs .context/golden/read.master.json .context/golden/read.task5.json
```

Expected: `OK`

速さも見ておく（本番の trip-blocks 上下で旧 338ms・手書き 15ms だった。目安として 1 桁 ms〜数十 ms に収まるか）。

```bash
grep -l '"/v3/trip-blocks"' .context/golden/responses/*.json | head -2
```

この 2 ファイルを使い、`TripBlockDtoBuilder.buildFromModels` の時間を `performance.now()` で 5 回測る小さなスクリプトを `.context/golden/bench.ts` に書いて、同じく esbuild で束ねて実行する。中央値を書き留める。

- [ ] **Step 6: 全 spec を通してコミットする**

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: failed なし

```bash
git add -A src/app/libs
git diff --cached --stat
git commit -m "refactor: :recycle: 列車・運用・目撃の読み取り builder を手書きの付け替えにする"
```

---

### Task 6: 書き込みを、送る項目を明示する形にする

refactor なので、API に送る本文は今と完全に同じにする（区間の `id` が落ちる不具合も、この時点ではそのまま）。

**Files:**
- Create: `src/app/libs/trip/infrastructure/builders/trip.model.builder.ts`・`time.model.builder.ts`・`trip-operation-list.model.builder.ts`、`src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.spec.ts`
- Modify: `src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.ts`、`src/app/libs/auth/infrastructure/builders/login.model.builder.ts`、`src/app/libs/user/infrastructure/builders/user.model.builder.ts`
- Modify: 書き込みの DTO（`create-trip-block.dto.ts`・`replace-trip-block.dto.ts`・`create-trip.dto.ts`・`replace-trip.dto.ts`・`create-time.dto.ts`・`replace-time.dto.ts`・`create-trip-operation-list.dto.ts`・`replace-trip-operation-list.dto.ts`・`login.dto.ts`・`register-user.dto.ts`）
- Modify: 書き込みの Model（`trip-block.model.ts`・`trip.model.ts`・`time.model.ts`・`trip-operation-list.model.ts`・`login.model.ts`）
- Modify: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util.ts`（＋spec）、`src/app/pages/timetable/timetable-edit-form/services/timetable-edit-form.service.ts`

**Interfaces:**
- Consumes: `.context/golden/write.master.json`・`write-runner.ts`・`compare.mjs`（Task 3）
- Produces: `TripModelBuilder.buildFromCreateDto` / `buildFromReplaceDto`、`TimeModelBuilder.buildFromCreateDto` / `buildFromReplaceDto`、`TripOperationListModelBuilder.buildFromCreateDto` / `buildFromReplaceDto`。Task 7 が `TripOperationListModelBuilder.buildFromReplaceDto` に `id` を足す。

- [ ] **Step 1: 書き込みの DTO と Model を interface にする**

`@Exclude() xxx: undefined` の「無いことを示す項目」は項目ごと消す。

`src/app/libs/trip-block/usecase/dtos/create-trip-block.dto.ts`:

```ts
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';

export interface CreateTripBlockDto {
    trips: CreateTripDto[];
}
```

`src/app/libs/trip-block/usecase/dtos/replace-trip-block.dto.ts`:

```ts
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';

export interface ReplaceTripBlockDto {
    tripBlockId: string;
    trips: ReplaceTripDto[];
}
```

`src/app/libs/trip/usecase/dtos/create-trip.dto.ts`:

```ts
import { ETripDirection } from '../enums/trip.enum';
import { CreateTimeDto } from './create-time.dto';
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

export interface CreateTripDto {
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: ETripDirection;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
    times: CreateTimeDto[];
    tripOperationLists: CreateTripOperationListDto[];
}
```

`src/app/libs/trip/usecase/dtos/replace-trip.dto.ts`:

```ts
import { ETripDirection } from '../enums/trip.enum';
import { ReplaceTimeDto } from './replace-time.dto';
import { ReplaceTripOperationListDto } from './replace-trip-operation-list.dto';

export interface ReplaceTripDto {
    tripId: string;
    serviceId: string;
    tripNumber: string;
    tripClassId: string;
    tripName: string | null;
    tripDirection: ETripDirection;
    depotIn: boolean;
    depotOut: boolean;
    calendarId: string | null;
    extraCalendarId: string | null;
    times: ReplaceTimeDto[];
    tripOperationLists: ReplaceTripOperationListDto[];
}
```

`src/app/libs/trip/usecase/dtos/create-time.dto.ts`:

```ts
export interface CreateTimeDto {
    stationId: string;
    stopId: string | null;
    stopSequence: number;
    pickupType: number;
    dropoffType: number;
    arrivalDays: number | null;
    arrivalTime: string | null;
    departureDays: number | null;
    departureTime: string | null;
}
```

`src/app/libs/trip/usecase/dtos/replace-time.dto.ts`（更新で新しく足した駅は `timeId` を持たない）:

```ts
import { CreateTimeDto } from './create-time.dto';

export interface ReplaceTimeDto extends CreateTimeDto {
    timeId?: string;
}
```

`src/app/libs/trip/usecase/dtos/create-trip-operation-list.dto.ts`:

```ts
export interface CreateTripOperationListDto {
    operationId: string;
    startStationId: string;
    endStationId: string;
    nextTripOperationListId?: string | null;
}
```

`src/app/libs/trip/usecase/dtos/replace-trip-operation-list.dto.ts`:

```ts
import { CreateTripOperationListDto } from './create-trip-operation-list.dto';

/** id は既存の区間だけが持つ（新しい区間は無い） */
export interface ReplaceTripOperationListDto extends CreateTripOperationListDto {
    id?: string;
}
```

`login.dto.ts`・`register-user.dto.ts`・`login.model.ts` は `export class` を `export interface` にする（中身は今のまま）。

`trip-block.model.ts`・`trip.model.ts`・`time.model.ts`・`trip-operation-list.model.ts` は、`@Expose`・`@Type` と class-transformer の import を消して `export interface` にする（Task 5 で足した `tripClass`・`tripBlock` はそのまま）。

`ReplaceTripOperationListDto` の `id` を `tripOperationListId` に改名しない理由：API の受け口（`ReplaceTripOperationListDto.id`）と入力画面（`ITimetableEditFormOriginalSegment.id`）が `id` で、送る形そのものだから。

- [ ] **Step 2: 書き込みの spec を書く（失敗することを確かめる）**

`src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.spec.ts`:

```ts
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TripBlockModelBuilder } from './trip-block.model.builder';

const createTrip: CreateTripDto = {
    serviceId: 'service',
    tripNumber: '1001',
    tripClassId: 'local',
    tripName: '',
    tripDirection: 0,
    depotIn: false,
    depotOut: false,
    calendarId: 'calendar',
    extraCalendarId: null,
    times: [
        { stationId: 'a', stopId: null, stopSequence: 1, pickupType: 0, dropoffType: 1, arrivalDays: null, arrivalTime: null, departureDays: 1, departureTime: '05:01' },
    ],
    tripOperationLists: [
        { operationId: 'op-1', startStationId: 'a', endStationId: 'd', nextTripOperationListId: null },
    ],
};

describe('TripBlockModelBuilder', () => {
    it('登録は ID をどの階層にも載せない', () => {
        const body = TripBlockModelBuilder.buildFromCreateDto({ trips: [createTrip] });

        expect(JSON.stringify(body)).not.toMatch(/"id"|Id":"(trip|time|tol|block)/);
        expect(body).toEqual({
            trips: [
                {
                    serviceId: 'service', tripNumber: '1001', tripClassId: 'local', tripName: '', tripDirection: 0,
                    depotIn: false, depotOut: false, calendarId: 'calendar', extraCalendarId: null,
                    times: [
                        { stationId: 'a', stopId: null, stopSequence: 1, pickupType: 0, dropoffType: 1, arrivalDays: null, arrivalTime: null, departureDays: 1, departureTime: '05:01' },
                    ],
                    tripOperationLists: [
                        { operationId: 'op-1', startStationId: 'a', endStationId: 'd', nextTripOperationListId: null },
                    ],
                },
            ],
        });
    });

    it('コピー元の ID がフォームから紛れ込んでも、登録には載せない', () => {
        const polluted = {
            ...createTrip,
            tripId: 'trip-src',
            tripBlockId: 'block-src',
            times: [{ ...createTrip.times[0], timeId: 'time-src', tripId: 'trip-src' }],
            tripOperationLists: [{ ...createTrip.tripOperationLists[0], id: 'tol-src' }],
        } as CreateTripDto;

        const body = TripBlockModelBuilder.buildFromCreateDto({ trips: [polluted] });

        expect(JSON.stringify(body)).not.toMatch(/-src/);
    });

    it('更新はブロック・列車・時刻の xxxId を id にする', () => {
        const trip: ReplaceTripDto = {
            ...createTrip,
            tripId: 'trip-1',
            times: [{ ...createTrip.times[0], timeId: 'time-a' }],
            tripOperationLists: [{ ...createTrip.tripOperationLists[0], id: 'tol-1' }],
        };

        const body = TripBlockModelBuilder.buildFromReplaceDto({ tripBlockId: 'block-1', trips: [trip] });

        expect(body.id).toBe('block-1');
        expect(body.trips[0].id).toBe('trip-1');
        expect(body.trips[0].times[0].id).toBe('time-a');
        expect(body.trips[0]).not.toHaveProperty('tripId');
        expect(body.trips[0].times[0]).not.toHaveProperty('timeId');
    });
});
```

`src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util.spec.ts` の最初の `it`（`toBeInstanceOf`）を次に置き換え、使わなくなる `CreateTripDto`・`ReplaceTripDto` の import を消す。

```ts
    it('登録は列車・時刻の ID を持たせず、更新は持たせる', () => {
        const withIds = trip({
            tripId: 'trip-1',
            times: [time('a', STOP, null, '05:01'), time('b', STOP, '05:10', null)].map(
                (t, i) => ({ ...t, timeId: `time-${i}`, tripId: 'trip-1' }),
            ),
        });

        const [created] = toTripDtos([withIds], ETimetableEditFormMode.COPY);
        const [replaced] = toTripDtos([withIds], ETimetableEditFormMode.UPDATE);

        expect(created).not.toHaveProperty('tripId');
        expect(created.times[0]).not.toHaveProperty('timeId');
        expect(created).not.toHaveProperty('stopType');
        expect(replaced).toMatchObject({ tripId: 'trip-1' });
        expect(replaced.times[0]).toMatchObject({ timeId: 'time-0' });
        expect(replaced.times[0]).not.toHaveProperty('stopType');
        expect(replaced.times[0]).not.toHaveProperty('tripId');
    });
```

Run: `npx jest --testPathPatterns="trip-block.model.builder|timetable-edit-form-to-trip-dtos"`
Expected: FAIL（`buildFromCreateDto` が型の上で `{ trips }` を受け付けない、`stopType` が載る、など）

- [ ] **Step 3: 書き込みの builder を作る**

`src/app/libs/trip/infrastructure/builders/time.model.builder.ts`:

```ts
import { CreateTimeDto } from '../../usecase/dtos/create-time.dto';
import { ReplaceTimeDto } from '../../usecase/dtos/replace-time.dto';

export const TimeModelBuilder = {
    buildFromCreateDto: (dto: CreateTimeDto) => ({
        stationId: dto.stationId,
        stopId: dto.stopId,
        stopSequence: dto.stopSequence,
        pickupType: dto.pickupType,
        dropoffType: dto.dropoffType,
        arrivalDays: dto.arrivalDays,
        arrivalTime: dto.arrivalTime,
        departureDays: dto.departureDays,
        departureTime: dto.departureTime,
    }),
    buildFromReplaceDto: (dto: ReplaceTimeDto) => ({
        id: dto.timeId,
        ...TimeModelBuilder.buildFromCreateDto(dto),
    }),
} as const;
```

`src/app/libs/trip/infrastructure/builders/trip-operation-list.model.builder.ts`:

```ts
import { CreateTripOperationListDto } from '../../usecase/dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../../usecase/dtos/replace-trip-operation-list.dto';

export const TripOperationListModelBuilder = {
    buildFromCreateDto: (dto: CreateTripOperationListDto) => ({
        operationId: dto.operationId,
        startStationId: dto.startStationId,
        endStationId: dto.endStationId,
        nextTripOperationListId: dto.nextTripOperationListId,
    }),
    /** 今の本文に合わせ、区間の id はまだ送らない（不具合。次の fix コミットで直す） */
    buildFromReplaceDto: (dto: ReplaceTripOperationListDto) => ({
        ...TripOperationListModelBuilder.buildFromCreateDto(dto),
    }),
} as const;
```

`src/app/libs/trip/infrastructure/builders/trip.model.builder.ts`:

```ts
import { CreateTripDto } from '../../usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from '../../usecase/dtos/replace-trip.dto';
import { TimeModelBuilder } from './time.model.builder';
import { TripOperationListModelBuilder } from './trip-operation-list.model.builder';

/** 列車の項目（ID と入れ子を除く）。登録と更新で同じ */
const buildTripFields = (dto: CreateTripDto | ReplaceTripDto) => ({
    serviceId: dto.serviceId,
    tripNumber: dto.tripNumber,
    tripClassId: dto.tripClassId,
    tripName: dto.tripName,
    tripDirection: dto.tripDirection,
    depotIn: dto.depotIn,
    depotOut: dto.depotOut,
    calendarId: dto.calendarId,
    extraCalendarId: dto.extraCalendarId,
});

export const TripModelBuilder = {
    buildFromCreateDto: (dto: CreateTripDto) => ({
        ...buildTripFields(dto),
        times: dto.times.map((time) => TimeModelBuilder.buildFromCreateDto(time)),
        tripOperationLists: dto.tripOperationLists.map((o) =>
            TripOperationListModelBuilder.buildFromCreateDto(o),
        ),
    }),
    buildFromReplaceDto: (dto: ReplaceTripDto) => ({
        id: dto.tripId,
        ...buildTripFields(dto),
        times: dto.times.map((time) => TimeModelBuilder.buildFromReplaceDto(time)),
        tripOperationLists: dto.tripOperationLists.map((o) =>
            TripOperationListModelBuilder.buildFromReplaceDto(o),
        ),
    }),
} as const;
```

`src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.ts`（全文を置き換える）:

```ts
import { TripModelBuilder } from 'src/app/libs/trip/infrastructure/builders/trip.model.builder';
import { CreateTripBlockDto } from '../../usecase/dtos/create-trip-block.dto';
import { ReplaceTripBlockDto } from '../../usecase/dtos/replace-trip-block.dto';

export const TripBlockModelBuilder = {
    buildFromCreateDto: (dto: CreateTripBlockDto) => ({
        trips: dto.trips.map((trip) => TripModelBuilder.buildFromCreateDto(trip)),
    }),
    buildFromReplaceDto: (dto: ReplaceTripBlockDto) => ({
        id: dto.tripBlockId,
        trips: dto.trips.map((trip) => TripModelBuilder.buildFromReplaceDto(trip)),
    }),
} as const;
```

`src/app/libs/auth/infrastructure/builders/login.model.builder.ts`（全文）:

```ts
import { LoginDto } from '../../usecase/dtos/login.dto';
import { LoginModel } from '../models/login.model';

export const LoginModelBuilder = {
    buildFromLoginDto: (dto: LoginDto): LoginModel => ({
        username: dto.username,
        password: dto.password,
    }),
} as const;
```

`src/app/libs/user/infrastructure/builders/user.model.builder.ts`（全文）:

```ts
import { RegisterUserDto } from '../../usecase/dtos/register-user.dto';
import { UserModel } from '../models/user.model';

export const UserModelBuilder = {
    buildFromRegisterUserDto: (
        dto: RegisterUserDto,
    ): Pick<UserModel, 'username' | 'password'> => ({
        username: dto.username,
        password: dto.password,
    }),
} as const;
```

- [ ] **Step 4: 入力画面の `toTripDtos` を項目の明示にする**

`timetable-edit-form-to-trip-dtos.util.ts` の import から `ClassConstructor, plainToClass`（class-transformer）と `classTransformerOptions` を消し、`toTripDtos` を次に置き換える（`buildTripOperationLists` はそのまま）。

```ts
export function toTripDtos(
    trips: FormArray<ITimetableEditFormTrip>['value'],
    mode: ETimetableEditFormMode,
): CreateTripDto[] | ReplaceTripDto[] {
    return trips.map((trip) => {
        const times = trip.times.filter(
            (o) => o.stopType !== ETimetableEditFormStopType.NOT_GOING_THROUGH,
        );
        const timeDtos = times.map((time, index, arr) => {
            const arrivalTime =
                time.arrivalTime && index !== 0
                    ? parse(time.arrivalTime, 'HH:mm', new Date())
                    : null;
            const departureTime =
                time.departureTime && index !== arr.length - 1
                    ? parse(time.departureTime, 'HH:mm', new Date())
                    : null;

            return {
                timeId: time.timeId ?? undefined,
                stationId: time.stationId,
                stopId: time.stopId,
                stopSequence: index + 1,
                pickupType:
                    time.stopType === ETimetableEditFormStopType.STOP &&
                    index !== arr.length - 1
                        ? 0
                        : 1,
                dropoffType:
                    time.stopType === ETimetableEditFormStopType.STOP &&
                    index !== 0
                        ? 0
                        : 1,
                arrivalDays:
                    arrivalTime && index !== 0
                        ? getHours(arrivalTime) < 4
                            ? 2
                            : 1
                        : null,
                arrivalTime:
                    arrivalTime && index !== 0
                        ? format(arrivalTime, 'HH:mm')
                        : null,
                departureDays:
                    departureTime && index !== arr.length - 1
                        ? getHours(departureTime) < 4
                            ? 2
                            : 1
                        : null,
                departureTime:
                    departureTime && index !== arr.length - 1
                        ? format(departureTime, 'HH:mm')
                        : null,
            };
        });
        const tripFields = {
            serviceId: trip.serviceId,
            tripNumber: trip.tripNumber || '不明',
            tripClassId: trip.tripClassId,
            tripName: trip.tripName,
            tripDirection: trip.tripDirection,
            depotIn: trip.depotIn,
            depotOut: trip.depotOut,
            calendarId: trip.calendarId,
            extraCalendarId: trip.extraCalendarId,
            tripOperationLists: buildTripOperationLists(trip, times),
        };

        if (mode === ETimetableEditFormMode.UPDATE) {
            const dto: ReplaceTripDto = {
                ...tripFields,
                tripId: trip.tripId ?? undefined,
                times: timeDtos,
            };
            return dto;
        }

        // 登録・コピーは ID を持たせない（コピー元の ID がフォームに残っていても落とす）
        const dto: CreateTripDto = {
            ...tripFields,
            times: timeDtos.map(({ timeId, ...rest }) => rest),
        };
        return dto;
    }) as CreateTripDto[] | ReplaceTripDto[];
}
```

注：`timeId` を捨てる分割代入が lint の no-unused-vars に掛かるときは、Task 5 Step 3 の注と同じく lint 設定に合わせる。末尾の `as` は、`map` の戻りが `(CreateTripDto | ReplaceTripDto)[]` になるのを、今の戻り値の型（配列ごとの union）に合わせるためのもの。今のシグネチャを変えずに済ませる唯一のキャストとして許す。

`src/app/pages/timetable/timetable-edit-form/services/timetable-edit-form.service.ts` の 238・239 行を次にする。

```ts
            ? trips.map((trip) => ({ trips: [trip] }))
            : [{ trips }];
```

- [ ] **Step 5: 型と spec を通す**

Run: `grep -rnE "(tripId|timeId|tripBlockId|tripOperationListId|startTimeId|endTimeId): undefined" src/app --include='*.ts'`
Expected: 出力なし（残っていれば、Create/Replace DTO の新しい形に合わせて消す）

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし

Run: `npx jest --testPathPatterns="trip-block.model.builder|timetable-edit-form"`
Expected: PASS

- [ ] **Step 6: 本文が今と完全に同じか比べる**

```bash
node_modules/.bin/esbuild .context/golden/write-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/write-runner.js --log-level=error
node .context/golden/write-runner.js .context/golden/write.task6.json
node .context/golden/compare.mjs .context/golden/write.master.json .context/golden/write.task6.json --exact
```

Expected: `OK`（完全一致）

- [ ] **Step 7: 全 spec を通してコミットする**

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: failed なし

```bash
git add -A src/app
git diff --cached --stat
git commit -m "refactor: :recycle: 書き込みの本文を送る項目の明示で組み立てる"
```

---

### Task 7: 更新で運用区間の id を送る（fix）

**Files:**
- Modify: `src/app/libs/trip/infrastructure/builders/trip-operation-list.model.builder.ts`
- Modify: `src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.spec.ts`

**Interfaces:**
- Consumes: Task 6 の `TripOperationListModelBuilder`
- Produces: 更新の本文の区間に `id` が載る

- [ ] **Step 1: spec を書く（失敗することを確かめる）**

`trip-block.model.builder.spec.ts` の describe に足す。

```ts
    it('更新は既存の区間の id を送り、新しい区間には id を付けない', () => {
        const trip: ReplaceTripDto = {
            ...createTrip,
            tripId: 'trip-1',
            times: [{ ...createTrip.times[0], timeId: 'time-a' }],
            tripOperationLists: [
                { operationId: 'op-1', startStationId: 'a', endStationId: 'b', nextTripOperationListId: null, id: 'tol-1' },
                { operationId: 'op-2', startStationId: 'b', endStationId: 'd', nextTripOperationListId: 'tol-next' },
            ],
        };

        const body = TripBlockModelBuilder.buildFromReplaceDto({ tripBlockId: 'block-1', trips: [trip] });
        const [kept, added] = JSON.parse(JSON.stringify(body)).trips[0].tripOperationLists;

        expect(kept).toEqual({ id: 'tol-1', operationId: 'op-1', startStationId: 'a', endStationId: 'b', nextTripOperationListId: null });
        expect(added).toEqual({ operationId: 'op-2', startStationId: 'b', endStationId: 'd', nextTripOperationListId: 'tol-next' });
    });
```

Run: `npx jest --testPathPatterns=trip-block.model.builder`
Expected: FAIL（`kept` に `id` が無い）

- [ ] **Step 2: 直す**

`trip-operation-list.model.builder.ts` の `buildFromReplaceDto` を次にする。

```ts
    /** 既存の区間は id を送る。無いと API が区間を作り直し、ほかの区間からのつながりが切れる */
    buildFromReplaceDto: (dto: ReplaceTripOperationListDto) => ({
        id: dto.id,
        ...TripOperationListModelBuilder.buildFromCreateDto(dto),
    }),
```

Run: `npx jest --testPathPatterns=trip-block.model.builder`
Expected: PASS

- [ ] **Step 3: 意図した差分だけが出るか比べる**

```bash
node_modules/.bin/esbuild .context/golden/write-runner.ts --bundle --platform=node --alias:src=./src --outfile=.context/golden/write-runner.js --log-level=error
node .context/golden/write-runner.js .context/golden/write.task7.json
node .context/golden/compare.mjs .context/golden/write.master.json .context/golden/write.task7.json --exact
```

Expected: 差分は次の 3 行だけ（ほかの行が出たら止まって調べる）。

```
$.update-区間1つ.trips[0].tripOperationLists[0].id: 新にだけある
$.update-区間2つ.trips[0].tripOperationLists[0].id: 新にだけある
$.update-区間2つ.trips[0].tripOperationLists[1].id: 新にだけある
```

（`compare.mjs` は配列の添字を `.0` の形で出す。行の書き方が違っても、中身がこの 3 か所なら合格。）

- [ ] **Step 4: コミットする**

```bash
git add src/app/libs/trip/infrastructure/builders/trip-operation-list.model.builder.ts src/app/libs/trip-block/infrastructure/builders/trip-block.model.builder.spec.ts
git diff --cached --stat
git commit -m "fix: :bug: 列車情報の更新で運用区間の id を送る"
```

コミット本文に、原因（`TripOperationListModel` の `@Expose({ name: 'tripOperationListId' })` が `id` を拾えなかった）と影響（API が区間を作り直し、ほかの区間からのつながりが切れうる）を書く。

---

### Task 8: 残りのクラスをすべて interface にし、class-transformer を外す

**Files:**
- Modify: `src/app/libs/*/usecase/dtos/*.ts`・`src/app/libs/*/infrastructure/models/*.ts` の残り
- Delete: `src/app/core/configs/class-transformer.ts`・`src/app/core/utils/class-transformer.ts`
- Modify: `setup-jest.ts`・`package.json`・`package-lock.json`
- Create: `.context/codemod/to-interface.mjs`

**Interfaces:**
- Produces: `src` の中に `class-transformer`・`reflect-metadata` の import が無い。依存からも消える。

- [ ] **Step 1: 残っているクラスを数える**

Run: `grep -rlE "^export (abstract )?class " src/app/libs/*/usecase/dtos src/app/libs/*/infrastructure/models`
Expected: 一覧が出る（これを Step 2 で変換する）

Run: `grep -rnE "@(Expose|Type|Exclude)\([^)]*$" src/app/libs`
Expected: 出力なし（デコレーターが複数行にまたがっていない。出たら Step 2 の後に手で直す）

- [ ] **Step 2: 変換スクリプトで class を interface にする**

`.context/codemod/to-interface.mjs`:

```js
// usecase/dtos と infrastructure/models の class を interface にし、class-transformer の痕跡を消す
import fs from 'node:fs';

const files = process.argv.slice(2);
for (const f of files) {
    const before = fs.readFileSync(f, 'utf8');
    const after = before
        .split('\n')
        .filter((l) => !/^import .* from 'class-transformer';$/.test(l))
        .filter((l) => l !== "import 'reflect-metadata';")
        .filter((l) => !/^\s*@(Expose|Type|Exclude)\(.*\)\s*$/.test(l))
        .join('\n')
        .replace(/^export class (\w+) extends (\w+) \{/gm, 'export interface $1 extends $2 {')
        .replace(/^export class (\w+) \{/gm, 'export interface $1 {');
    if (after !== before) {
        fs.writeFileSync(f, after);
        console.log('changed', f);
    }
}
```

```bash
node .context/codemod/to-interface.mjs $(grep -rlE "^export class |class-transformer|reflect-metadata" src/app/libs/*/usecase/dtos src/app/libs/*/infrastructure/models)
```

変わったファイルを 1 つずつ `npx prettier --write <ファイル>` で整形する（デコレーターを消した後の空行が詰まる）。

- [ ] **Step 3: 補助と reflect-metadata の読み込みを消す**

```bash
rm src/app/core/configs/class-transformer.ts src/app/core/utils/class-transformer.ts
```

`setup-jest.ts` の 1 行目 `import 'reflect-metadata';` を消す。

Run: `grep -rnE "class-transformer|reflect-metadata|classTransformer" src setup-jest.ts`
Expected: 出力なし

- [ ] **Step 4: 型・ビルド・spec を通す**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: エラーなし。`'X' only refers to a type, but is being used as a value here` が出たら、その DTO を値として使っている所がある。`new`・`instanceof`・`ClassConstructor` を探して型の使い方に直す。

Run: `npm run build:dev`
Expected: 成功

Run: `npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: failed なし

- [ ] **Step 5: コミットする（refactor）**

```bash
git add -A src setup-jest.ts
git diff --cached --stat
git commit -m "refactor: :recycle: DTO と Model のクラスを interface にし class-transformer の補助を消す"
```

- [ ] **Step 6: 依存から外す（build）**

```bash
npm uninstall class-transformer reflect-metadata
```

（registry に繋ぐので、サンドボックスで止まったら `registry.npmjs.org` を許可するかサンドボックスの外で動かす。）

Run: `grep -nE "class-transformer|reflect-metadata" package.json`
Expected: 出力なし

Run: `npm run build:dev && npx jest > .context/jest.log 2>&1; grep -E "^Tests:" .context/jest.log`
Expected: ビルド成功・failed なし

Run（サンドボックスの外で）: `npm run lint`
Expected: 0 errors

```bash
git add package.json package-lock.json
git diff --cached --stat
git commit -m "build: :package: class-transformer と reflect-metadata を外す"
```

---

### Task 9: ADR-0006 を書く

**Files:**
- Create: `docs/adr/0006-remove-class-transformer.md`

- [ ] **Step 1: 既存の ADR の書式を見る**

Run: `sed -n 1,30p docs/adr/0004-remove-unused-code-and-consolidate-libraries.md`

- [ ] **Step 2: ADR を書く**

同じ書式で、次を入れる。作業日時（2026-10-13）と Agent のモデル名（Claude Opus 5.5）も書く。

- 状況：Lighthouse と CPU プロファイルの数字（5 ページで 0.7〜1.6 秒）。class-transformer がしていた仕事は 3 つだけ。
- 決定：spec の「決定事項」の表のとおり。読み取りはスプレッド、書き込みは項目の明示。builder の形。
- 理由：二重定義・リフレクションの層が要らない。速さ（本番の trip-blocks で 338ms → 15ms）。
- 結果：Model の `?` を DTO にそろえる決まり。読み取りでは API の余分なキーが素通しになる。更新で区間の `id` が落ちていた不具合を同時に直した。
- 新しく DTO を足すときの決まり：interface で書き、builder は `XxxDtoBuilder.buildFromModel` / `buildFromModels` の形で、`id` と入れ子だけ付け替える。

- [ ] **Step 3: CLAUDE.md の記述を直す**

`CLAUDE.md` の「`libs/<domain>/`」の節にある「`builders/` がモデル → DTO 変換を担う」の後に、「class-transformer は使わない。DTO・Model は interface で、builder が `id` ↔ `xxxId` を手で付け替える（ADR-0006）」と足す。

- [ ] **Step 4: コミットする**

```bash
git add docs/adr/0006-remove-class-transformer.md CLAUDE.md
git diff --cached --stat
git commit -m "docs: :memo: DTO/Model のクラスと class-transformer を廃止した ADR-0006 を書く"
```

---

### Task 10: 効果を手元で測る（master とブランチ）

本番にはデプロイしない。master（Task 3 で作った `dist-master`）とブランチを、同じ最適化・同じ手元の API で比べる。

**Files:**
- Create: `.context/measure/serve.mjs`・`.context/measure/profile.mjs`・`.context/measure/run.sh`・`.context/measure/compare.mjs`
- Create: `.context/measure/dist-branch/`

**Interfaces:**
- Consumes: `.context/measure/dist-master/`（Task 3）

- [ ] **Step 1: ブランチをビルドする**

```bash
npx ng build --configuration development --optimization --source-map=false --named-chunks=false --output-path=.context/measure/dist-branch
```

Run: `ls .context/measure/dist-branch/browser/*.map 2>/dev/null | wc -l`
Expected: 0

- [ ] **Step 2: 配信と /api の中継をするサーバーを作る**

`.context/measure/serve.mjs`:

```js
// 使い方: node serve.mjs <dist の browser> <port>
// 静的ファイルを配り、/api は手元の backend（localhost:3011）へ中継する。無いパスは index.html（SPA）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [root, port] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
        const proxy = http.request({ host: 'localhost', port: 3011, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:3011' } }, (r) => {
            res.writeHead(r.statusCode, r.headers);
            r.pipe(res);
        });
        proxy.on('error', () => { res.writeHead(502); res.end(); });
        req.pipe(proxy);
        return;
    }
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(target)] ?? 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
}).listen(Number(port), () => console.log(`serving ${root} on ${port}`));
```

- [ ] **Step 3: CPU プロファイルのスクリプトを作る**

`.context/measure/profile.mjs`:

```js
// 使い方: node profile.mjs <URL> <出力の接頭辞>
// CPU 4 倍遅延でページを開き、JS 実行の合計と class-transformer の時間を JSON で出す
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE);
const [url, out] = process.argv.slice(2);
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333' });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 823, isMobile: true, deviceScaleFactor: 2 });
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const t0 = Date.now();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
const networkIdleMs = Date.now() - t0;
await new Promise((r) => setTimeout(r, 3000));
const { profile } = await cdp.send('Profiler.stop');
await page.close();
await browser.disconnect();

const self = new Map();
for (let i = 0; i < profile.samples.length; i++) self.set(profile.samples[i], (self.get(profile.samples[i]) ?? 0) + profile.timeDeltas[i] / 1000);
// class-transformer の chunk は、その中にしか無い関数名（getExposedMetadatas）で見つける
const ctUrls = new Set(profile.nodes.filter((n) => n.callFrame.functionName === 'getExposedMetadatas').map((n) => n.callFrame.url));
let busy = 0;
let classTransformer = 0;
for (const n of profile.nodes) {
    const ms = self.get(n.id) ?? 0;
    if (!['(idle)', '(program)', '(root)', '(garbage collector)'].includes(n.callFrame.functionName)) busy += ms;
    if (ctUrls.has(n.callFrame.url)) classTransformer += ms;
}
fs.writeFileSync(`${out}.json`, JSON.stringify({ url, networkIdleMs, busy: Math.round(busy), classTransformer: Math.round(classTransformer) }));
```

- [ ] **Step 4: 計測をまとめて回すスクリプトを作る**

`.context/measure/run.sh`:

```bash
#!/bin/bash
# 使い方: run.sh <名前> <port>  … 10 ページ × 3 回、Lighthouse（スマホ・PC）と CPU プロファイルを取る
set -u
cd "$(dirname "$0")"
name=$1; port=$2
PAGES="top:/ real-time:/operation/real-time past-time:/operation/past-time table:/operation/table route-diagram:/operation/route-diagram all-line:/timetable/all-line station:/timetable/station train-diagram:/train-diagram train-location:/train-location vehicle:/library/vehicle"
export PUPPETEER_CORE=$(ls -d /tmp/claude-1000/npm-cache/_npx/*/node_modules/puppeteer-core | head -1)
mkdir -p "out/$name"
for i in 1 2 3; do
  for p in $PAGES; do
    page=${p%%:*}; url="http://localhost:$port${p#*:}"
    for d in mobile desktop; do
      P=""; [ $d = desktop ] && P="--preset=desktop"
      npm_config_cache=/tmp/claude-1000/npm-cache npx -y lighthouse@latest "$url" --port=9333 $P --output=json --output-path="out/$name/$page.$d.$i.json" --quiet || echo "FAIL lighthouse $page $d $i"
    done
    node profile.mjs "$url" "out/$name/$page.cpu.$i" || echo "FAIL profile $page $i"
  done
done
echo DONE
```

- [ ] **Step 5: 比較の集計スクリプトを作る**

`.context/measure/compare.mjs`:

```js
// out/master と out/branch を、ページごとに 3 回の中央値で並べる
import fs from 'node:fs';

const pages = ['top', 'real-time', 'past-time', 'table', 'route-diagram', 'all-line', 'station', 'train-diagram', 'train-location', 'vehicle'];
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const lh = (name, page, d, key) => median([1, 2, 3].map((i) => {
    const j = read(`out/${name}/${page}.${d}.${i}.json`);
    if (!j) return null;
    if (key === 'perf') return Math.round(j.categories.performance.score * 100);
    return j.audits[key].numericValue;
}));
const cpu = (name, page, key) => median([1, 2, 3].map((i) => read(`out/${name}/${page}.cpu.${i}.json`)?.[key]));
const f = (x) => (x == null ? '-' : Math.round(x));
console.log('| ページ | CPU 合計 ms（master→branch） | うち class-transformer ms | スマホ TBT ms | スマホ LCP ms | スマホ Perf | PC TBT ms | PC Perf |');
console.log('|---|---|---|---|---|---|---|---|');
for (const p of pages) {
    const pair = (fn) => `${f(fn('master'))} → ${f(fn('branch'))}`;
    console.log(`| ${p} | ${pair((n) => cpu(n, p, 'busy'))} | ${pair((n) => cpu(n, p, 'classTransformer'))} | ${pair((n) => lh(n, p, 'mobile', 'total-blocking-time'))} | ${pair((n) => lh(n, p, 'mobile', 'largest-contentful-paint'))} | ${pair((n) => lh(n, p, 'mobile', 'perf'))} | ${pair((n) => lh(n, p, 'desktop', 'total-blocking-time'))} | ${pair((n) => lh(n, p, 'desktop', 'perf'))} |`);
}
```

- [ ] **Step 6: 測る（サンドボックスの外で。裏で回す）**

master と branch を交互にではなく続けて測ると、その間に DB のデータが変わりうる。計測は同じ時間帯にまとめて回す。

```bash
cd .context/measure
node serve.mjs dist-master/browser 4300 > serve-master.log 2>&1 & echo $! > serve-master.pid
node serve.mjs dist-branch/browser 4301 > serve-branch.log 2>&1 & echo $! > serve-branch.pid
google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333 --user-data-dir=chrome-profile about:blank >/dev/null 2>&1 & echo $! > chrome.pid
sleep 3
./run.sh master 4300 > run-master.log 2>&1
./run.sh branch 4301 > run-branch.log 2>&1
kill $(cat serve-master.pid serve-branch.pid chrome.pid)
```

Expected: どちらの log も `DONE` で終わる。`FAIL` 行が無い。

- [ ] **Step 7: 集計して記録する**

Run: `cd .context/measure && node compare.mjs | tee result.md`
Expected: branch の class-transformer 列が全ページ 0。トップ・列車位置情報・ダイヤグラム・駅別・運用表で、CPU 合計とスマホ TBT が下がっている。

結果の表は PR の本文に貼る。数字が下がらないページがあれば、ユーザーに報告して止まる（推測で直さない）。

---

### Task 11: 保存テストと目視（ユーザーと一緒に）

**Files:** なし（手元の画面と DB での確認）

- [ ] **Step 1: 手元の画面を最新にする**

docker の client（4200）は作業ツリーを監視してビルドし直す。`docker logs --tail 50 <client のコンテナ名>` で、エラー無くビルドし直したことを確かめる。

- [ ] **Step 2: 保存テストの準備**

テスト用のダイヤは「2021年10月JR渋谷駅工事臨時ダイヤ」（`27792766-0031-4b89-9c32-23eea267cbbc`）。列番はそのダイヤに無いもの（`9999T` など）を使う。Supabase MCP（読み取り専用）で、無いことを先に確かめる。

```sql
select trip_number from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number in ('9999T', '9998T');
```

Expected: 0 件

- [ ] **Step 3: 登録・コピー・更新を画面で行い、DB で中身を確かめる**

1. 登録：`9999T` を運用つきで登録する。DB で列車・時刻・区間ができ、`operation_id` が入っていることを確かめる。
2. コピー：`9999T` をコピーして `9998T` を作る。DB で、新しい列車・時刻・区間の id がコピー元と**違う**ことを確かめる。
3. 更新：`9999T` を開き、時刻を 1 つ変えて保存する。DB で、列車・時刻の id が変わらないことに加え、**区間の id も変わらない**ことを確かめる（Task 7 の修正）。
4. つながり：`9998T` の区間の「次の運用」を `9999T` の区間に向けてから、`9999T` を更新する。`9998T` の区間の `next_trip_operation_list_id` が残ることを確かめる。

それぞれ、保存の前に SELECT で「前」の値を取り、保存の後に同じ SELECT で比べる。

- [ ] **Step 4: 後始末の SQL をユーザーに渡す**

Supabase MCP は読み取り専用なので、ユーザーに流してもらう。順番は `trip_operation_lists`（times への FK が CASCADE でない）→ `trips`（times は CASCADE で消える）→ `trip_blocks`。

```sql
delete from trip_operation_lists where trip_id in (select id from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number in ('9999T', '9998T'));
delete from trip_blocks where id in (select trip_block_id from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number in ('9999T', '9998T'))
  and not exists (select 1 from trips t where t.trip_block_id = trip_blocks.id and t.trip_number not in ('9999T', '9998T'));
```

（`trips` を先に消すと `trip_blocks` を特定できなくなる。上の 2 文の間に、`trips` の削除 `delete from trips where calendar_id = '27792766-0031-4b89-9c32-23eea267cbbc' and trip_number in ('9999T', '9998T');` を、ブロックの id を控えてから流す。流す前に、控えたブロックの id をユーザーに見せる。）

- [ ] **Step 5: 全ページを目で見る**

手元（localhost:4200）で閲覧用の 10 ページを、スマホ幅（390px）と PC 幅（1440px）で開き、master のビルド（localhost:4300）と並べて比べる。特に走行本数・列車の位置・ダイヤグラム・駅別時刻表・運用表・リアルタイム運用情報・目撃の一覧・現在位置の表示を見る。スクリーンショットを `.context/measure/visual/` に保存する。

---

## Self-Review の結果

- Spec の各節 → Task の対応：1 型（Task 4・5・6・8）、2 読み取り（Task 1・4・5）、3 書き込み（Task 6）、3-1 不具合（Task 7）、4 消すもの（Task 2・8）、5 変わる所（Task 4・5 の比較で確認）、確かめ方 1〜7（spec＝Task 4〜7、新旧比較＝Task 3〜7、保存テスト・目視＝Task 11、全体＝各 Task の最後と Task 8、効果＝Task 10）、進め方・ADR（Task 9）。
- 名前の一貫：`buildFromModel` / `buildFromModels`、`buildFromCreateDto` / `buildFromReplaceDto`、`buildFromLoginDto`、`buildFromRegisterUserDto` は Task 1 で決め、以降すべて同じ名前で使う。
- 意図したキャスト：`toTripDtos` の戻り値の `as`（今のシグネチャを保つため）と、spec の部分入力の `as never`・`as TripBlockModel`。本体の builder にはキャストを入れない。
