# v2→v3 API移行バグ修正手順書

> 作成日: 2026-06-17 / 調査者: Claude (Opus 4.6)
> 対象リポジトリ: `sotetsu-lab-v3-client`
>
> この手順書は、実装担当モデルが**設計判断をせずに**完遂できるよう、修正レシピを具体化してある。レシピにない判断が必要になったら、自分で決めずに停止して質問すること。

## ブランチ

現在のブランチ `refactor/phase-0-to-4` で作業する。ブランチの新規作成は不要。

## 修正の検証方法（全修正に共通）

各修正コミット後、以下を確認:
1. `npx tsc --noEmit` — 型エラーなし
2. `npm run build:prod` — ビルド成功

## 修正一覧

### 修正1: `forkJoin` 空配列ハング — `operation-real-time.service.ts`

**ファイル:** `src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts`

**問題:** `fetchStations()` (行50) で `forkJoin(routes.map(...))` を呼んでいるが、`routes` が空配列の場合 `forkJoin([])` は永久に emit しない。呼び出し元 `operation-real-time.component.ts:58` の `await lastValueFrom(...)` が永久にブロックする。

**修正レシピ:**

`fetchStations()` メソッドの先頭に空配列ガードを追加:

```ts
fetchStations(): Observable<void> {
    const routes = OperationRealTimeStore.routes;

    if (!routes.length) {
        return of(undefined);
    }

    return forkJoin(
        // ...既存コードそのまま
```

import に `of` を追加（既に `of` が import されていれば不要。確認すること）。

---

### 修正2: `from([])` + `lastValueFrom` で EmptyError — `operation-real-time.service.ts`

**ファイル:** `src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts`

**問題:** `fetchOperationSightingTimeCrossSections()` (行150)、`fetchFormationSightingTimeCrossSections()` (行177)、`fetchCurrentPositions()` (行255) で `from(array).pipe(mergeMap(...), map(...))` を使っているが、配列が空の場合 `from([])` は何も emit せず complete する。`lastValueFrom` は EmptyError を throw する。

`fetchCurrentPositionThatShouldUpdate()` (行281) には既に `if (!currentPositions.length) { return of(undefined); }` ガードがある。これと同じパターンを他3メソッドにも適用する。

**修正レシピ:**

3つのメソッドそれぞれの先頭に空配列ガードを追加:

```ts
fetchOperationSightingTimeCrossSections(params?: {
    forceReload?: boolean;
}): Observable<void> {
    const operations = OperationRealTimeStore.operations;

    if (!operations.length) {
        return of(undefined);
    }

    return from(operations).pipe(
        // ...既存コードそのまま
```

```ts
fetchFormationSightingTimeCrossSections(params?: {
    forceReload?: boolean;
}): Observable<void> {
    const formations = OperationRealTimeStore.formations;

    if (!formations.length) {
        return of(undefined);
    }

    return from(formations).pipe(
        // ...既存コードそのまま
```

```ts
fetchCurrentPositions(params?: {
    forceReload?: boolean;
}): Observable<void> {
    const operations = OperationRealTimeStore.operations;

    if (!operations.length) {
        return of(undefined);
    }

    return from(operations).pipe(
        // ...既存コードそのまま
```

---

### 修正3: `forkJoin` 空配列ハング — `operation-table.service.ts`

**ファイル:** `src/app/pages/operation/operation-table/services/operation-table.service.ts`

**問題:** `fetchOperationTrips()` (行30-37) で `operations` をフィルタ後 `forkJoin(operations.map(...))` を呼ぶ。全 operation が `operationNumber === '100'` の場合、空配列が `forkJoin` に渡されハングする。

**修正レシピ:**

`switchMap` の中で空配列チェックを追加:

```ts
switchMap((operations: OperationDetailsDto[]) => {
    if (!operations.length) {
        return of([]);
    }
    return forkJoin(
        operations.map((operation) =>
            this.#operationService.findOneWithTrips({
                operationId: operation.operationId,
            }),
        ),
    );
}),
```

import に `of` を追加:

```ts
import { forkJoin, Observable, of } from 'rxjs';
```

---

### 修正4: `trip.tripBlock.trips` null安全性 — 2つのパイプ

**ファイル1:** `src/app/pages/timetable/timetable-station/pipes/timetable-station-find-last-stop-station.pipe.ts`

**問題:** 行13と行23で `trip.tripBlock.trips` にアクセスしているが、`tripBlock` が undefined の場合クラッシュする。

**修正レシピ:**

行12の `transform` メソッドの先頭に early return を追加:

```ts
transform(trip: TripDetailsDto): StationDetailsDto['stationId'] {
    if (!trip.tripBlock?.trips?.length) {
        const fallbackTime = maxBy(trip.times, (o) => o.stopSequence);
        return fallbackTime?.stationId;
    }

    const searchingTrip = trip.tripBlock.trips.find(
        // ...既存コードそのまま
```

**ファイル2:** `src/app/pages/timetable/timetable-station/pipes/timetable-station-find-other-trips-in-same-trip-block.pipe.ts`

**問題:** 行12で `trip.tripBlock.trips.filter(...)` にアクセスしているが、`tripBlock` が undefined の場合クラッシュする。

**修正レシピ:**

行11-12を以下に変更:

```ts
transform(trip: TripDetailsDto): TripDetailsDto[] {
    return (trip.tripBlock?.trips ?? []).filter((o) => o.tripId !== trip.tripId);
}
```

---

### 修正5: `tripBlock.trips[0]` null安全性 — `timetable-edit-form.service.ts`

**ファイル:** `src/app/shared/timetable-edit-form/services/timetable-edit-form.service.ts`

**問題:** 行104で `tripBlock.trips[0].tripDirection` にアクセスしているが、`trips` が undefined または空配列の場合クラッシュする。

**修正レシピ:**

行102-106を以下に変更:

```ts
tap((tripBlock: TripBlockDetailsDto) => {
    const firstTrip = tripBlock.trips?.[0];
    if (firstTrip) {
        this.#timetableEditFormStateStore.setTripDirection(
            firstTrip.tripDirection as ETripDirection,
        );
    }
    this.#timetableEditFormStateStore.setTripBlocks([tripBlock]);
}),
```

---

### 修正6: `tripOperationLists[0]` null安全性 — `timetable-station.state.ts`

**ファイル:** `src/app/pages/timetable/timetable-station/states/timetable-station.state.ts`

**問題:** 行214で `trip.tripOperationLists[0].operationId` にアクセスしているが、`tripOperationLists` が undefined または空配列の場合クラッシュする。

**修正レシピ:**

行211-217の `#extractOperationIds` メソッドを以下に変更:

```ts
#extractOperationIds(trips: TripDetailsDto[]): string[] {
    return Array.from(
        new Set(
            trips
                .filter((trip) => trip.tripOperationLists?.length)
                .map((trip) => trip.tripOperationLists[0].operationId),
        ),
    );
}
```

---

### 修正7: `minBy` 結果の null安全性 — `timetable-station.state.ts`

**ファイル:** `src/app/pages/timetable/timetable-station/states/timetable-station.state.ts`

**問題:** 行237-247の `#sortTrips` メソッド内で `minBy(a.times, ...)` の結果をnullチェックせず `.departureTime` にアクセスしている。`times` が空配列の場合 `minBy` は `undefined` を返しクラッシュする。

**修正レシピ:**

行236-248のソート部分を以下に変更:

```ts
trips: (o.tripBlock?.trips ?? []).sort((a, b) => {
    const aTime = minBy(a.times, (o2) => o2.stopSequence);
    const bTime = minBy(b.times, (o2) => o2.stopSequence);
    if (!aTime || !bTime) return 0;
    const format = 'HH:mm:ss';
    return (
        dayjs(aTime.departureTime, format)
            .add(aTime.departureDays - 1, 'days')
            .unix() -
        dayjs(bTime.departureTime, format)
            .add(bTime.departureDays - 1, 'days')
            .unix()
    );
}),
```

変更点は `if (!aTime || !bTime) return 0;` の1行追加のみ。

---

### 修正8: DtoBuilder未適用 — `operation-sighting.query.ts`

**ファイル:** `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`

**問題:** 行53-54の `findManyBySpecificPeriod` メソッドが `res.body` をそのまま返している。同ファイル内の他メソッド（行92-95、行133-136）は全て DtoBuilder を通しているのに、このメソッドだけ builder が抜けている。

**修正レシピ:**

行53-54を以下に変更:

```ts
map((res) => {
    return OperationSightingsDtoBuilder.buildFromModels(res.body);
}),
```

`OperationSightingsDtoBuilder` は同ファイルの行10で既に import 済み（`OperationSightingDtoBuilder` と一緒にインポートされている）。import の追加は不要。ただし、もし `OperationSightingsDtoBuilder`（末尾に `s` 付き）が import されていなければ追加すること:

```ts
import { OperationSightingDtoBuilder, OperationSightingsDtoBuilder } from '../builders/operation-sighting.dto.builder';
```

---

### 修正9: `zip` → `combineLatest` — `timetable-station.state.ts`

**ファイル:** `src/app/pages/timetable/timetable-station/states/timetable-station.state.ts`

**問題:** 行156で `zip` を使って `trips$` と `tripBlocks$` をペアリングしているが、`zip` はemission indexで対応付けるため、高速ナビゲーションやストアの再設定時にずれるリスクがある。`combineLatest` の方が安全（最新値同士の組み合わせ）。

**修正レシピ:**

行156を以下に変更:

```ts
readonly timetableData$ = combineLatest([
    this.#store.state.pipe(select((state) => state.trips)),
    this.#store.state.pipe(select((state) => state.tripBlocks)),
]).pipe(
```

import を変更: `zip` を `combineLatest` に置き換える。ファイル先頭の rxjs import から `zip` を削除し `combineLatest` を追加。`zip` が他の箇所で使われていなければ削除してよい（`grep` で確認）。

---

### 修正10: V2サフィックス除去 — `timetable-all-line.service.ts`

**ファイル:** `src/app/pages/timetable/timetable-all-line/services/timetable-all-line.service.ts`

**問題:** 4つのメソッドがV2サフィックスを持つが、全てv3エンドポイントを呼んでいる。

**修正レシピ:**

以下の4メソッドのリネーム:
- `fetchStationsV2` → `fetchStations`
- `fetchTripBlocksV2` → `fetchTripBlocks`
- `addTripToTripBlockV2` → `addTripToTripBlock`
- `deleteTripFromTripBlockV2` → `deleteTripFromTripBlock`

呼び出し元も全て更新すること（各ファイルを `grep` して漏れなく変更）:

| 呼び出し元ファイル | 変更箇所 |
|---|---|
| `src/app/pages/timetable/timetable-all-line/services/timetable-all-line-resolver.service.ts` | 行57: `fetchStationsV2()` → `fetchStations()` |
| 同上 | 行58: `fetchTripBlocksV2()` → `fetchTripBlocks()` |
| `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-table-c/timetable-all-line-table-c.component.ts` | 行121: `deleteTripFromTripBlockV2` → `deleteTripFromTripBlock` |
| 同上 | 行127: `fetchTripBlocksV2` → `fetchTripBlocks` |
| 同上 | 行165: `addTripToTripBlockV2` → `addTripToTripBlock` |
| 同上 | 行171: `fetchTripBlocksV2` → `fetchTripBlocks` |
| 同上 | 行210: `deleteTripFromTripBlockV2` → `deleteTripFromTripBlock` |
| 同上 | 行217: `fetchTripBlocksV2` → `fetchTripBlocks` |

変更後、`grep -rn "V2" src/app/pages/timetable/timetable-all-line/` で残存がないことを確認。

---

### 修正11: V2サフィックス除去・陳腐化コメント削除 — `operation-past-time.service.ts`

**ファイル:** `src/app/pages/operation/operation-past-time/services/operation-past-time.service.ts`

**修正レシピ:**

1. 行29の `// v2` コメントを削除
2. `fetchFormationsV2` → `fetchFormations` にリネーム

呼び出し元の更新:

| 呼び出し元ファイル | 変更箇所 |
|---|---|
| `src/app/pages/operation/operation-past-time/services/operation-past-time-resolver.service.ts` | 行41: `fetchFormationsV2()` → `fetchFormations()` |

変更後、`grep -rn "V2\|// v2" src/app/pages/operation/operation-past-time/` で `fetchOperationsV3` と `fetchOperationSightingsV3` のみが残ることを確認（この2つは v3 をv2 と区別するための命名であり、v2版の `fetchOperations` / `fetchOperationSightings` が存在しないため V3 サフィックスも外してよいが、**他のタスクと合わせて実施する方が安全なので今回はスキップ**）。

---

### 修正12: `angular.json` の陳腐化エントリ削除

**ファイル:** `angular.json`

**修正レシピ:**

行34の `"allowedCommonJsDependencies": ["@nestjsx/crud-request"],` を削除する（行ごと削除）。`@nestjsx/crud-request` は `package.json` から既に削除されており、`src/` に import も存在しない。

---

### 修正13: `CLAUDE.md` の陳腐化記述更新

**ファイル:** `CLAUDE.md`

**修正レシピ:**

「HTTP / 認証」セクションを以下に書き換え:

```markdown
## HTTP / 認証

`AuthInterceptor` が `x-sotetsu-lab-authorization` ヘッダーを付与する。API エンドポイントは `/v3/` を使用する（v2 は全て移行済み）。インフラクエリは `HttpParams` でクエリパラメータを構築し、`md5(JSON.stringify(params))` をキーに `shareReplay` でキャッシュし、`forceReload: true` でキャッシュを破棄できる。
```

---

## コミット分割

以下の3コミットに分割する:

### コミット1: バグ修正（修正1〜9）
```
fix: :bug: v2→v3 API移行に伴うバグを修正する
```

修正内容:
- forkJoin 空配列ハング対策（修正1, 2, 3）
- from([]) + lastValueFrom の EmptyError 対策（修正2）
- trip.tripBlock.trips の null 安全性（修正4）
- tripBlock.trips[0] の null 安全性（修正5）
- tripOperationLists[0] の null 安全性（修正6）
- minBy 結果の null チェック（修正7）
- OperationSightingQuery の DtoBuilder 適用漏れ（修正8）
- zip → combineLatest（修正9）

### コミット2: V2サフィックス除去（修正10, 11）
```
refactor: :recycle: 実態がv3のメソッドからV2サフィックスを除去する
```

### コミット3: 設定・ドキュメント更新（修正12, 13）
```
chore: :wrench: 陳腐化した@nestjsx/crud-request関連の記述を削除する
```

## 検証（最終）

全コミット完了後:
1. `npx tsc --noEmit` — 型エラーなし
2. `npm run build:prod` — ビルド成功
3. `grep -rn "@nestjsx/crud-request" src/ angular.json` — 0件
4. `grep -rn "fetchStationsV2\|fetchTripBlocksV2\|addTripToTripBlockV2\|deleteTripFromTripBlockV2\|fetchFormationsV2" src/` — 0件
