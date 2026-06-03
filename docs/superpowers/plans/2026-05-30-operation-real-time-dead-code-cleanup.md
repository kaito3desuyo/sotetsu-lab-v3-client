# OperationRealTime デッドコード削除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** リファクタリング後に残った旧パターンのデッドコード（コンポーネント・サービスメソッド・ステートファイル等）を一括削除し、`operation-real-time/` を新パターンのみの構成にする。

**Architecture:** 削除のみの作業。生きているファイルへの参照（import / providers）も合わせてクリーンアップする。新しいコードは一切追加しない。

**Tech Stack:** Angular 20, @ngneat/elf, TypeScript, ESLint

---

## 削除対象サマリー

### 削除するディレクトリ（コンポーネント 10 個）
```
components/operation-real-time-main-c/
components/operation-real-time-header-c/
components/operation-real-time-header-p/
components/operation-real-time-control-panel-c/
components/operation-real-time-control-panel-p/
components/operation-real-time-legend-p/
components/operation-real-time-new-table-by-operation-c/
components/operation-real-time-new-table-by-formation-c/
components/operation-real-time-new-table-p/
components/operation-real-time-table/
```

### 削除するファイル（4 個）
```
states/operation-real-time.state.ts        ← 旧 @Injectable ステート
utils/operation-real-time.util.ts          ← 旧テーブルデータ生成ユーティリティ
interfaces/operation-real-time-table-data.interface.ts
pipes/operation-real-time-time-color.pipe.ts
```

### 修正するファイル（2 個）
```
operation-real-time.route.ts               ← 旧ステートの providers 参照を削除
services/operation-real-time.service.ts    ← v2 API メソッド 6 個と旧ステート参照を削除
```

---

## Task 1: 作業ブランチを作成する

**Files:** なし（git 操作のみ）

- [ ] **Step 1: ブランチを作成する**

```bash
git checkout -b refactor/operation-real-time-dead-code-cleanup
```

Expected: `Switched to a new branch 'refactor/operation-real-time-dead-code-cleanup'`

---

## Task 2: デッドコンポーネントディレクトリを削除する

**Files:**
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-main-c/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-header-c/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-header-p/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-control-panel-c/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-control-panel-p/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-legend-p/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-new-table-by-operation-c/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-new-table-by-formation-c/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-new-table-p/`
- Delete: `src/app/pages/operation/operation-real-time/components/operation-real-time-table/`

- [ ] **Step 1: 10 ディレクトリを一括削除する**

```bash
BASE=src/app/pages/operation/operation-real-time/components
rm -rf \
  "$BASE/operation-real-time-main-c" \
  "$BASE/operation-real-time-header-c" \
  "$BASE/operation-real-time-header-p" \
  "$BASE/operation-real-time-control-panel-c" \
  "$BASE/operation-real-time-control-panel-p" \
  "$BASE/operation-real-time-legend-p" \
  "$BASE/operation-real-time-new-table-by-operation-c" \
  "$BASE/operation-real-time-new-table-by-formation-c" \
  "$BASE/operation-real-time-new-table-p" \
  "$BASE/operation-real-time-table"
```

- [ ] **Step 2: 削除を確認する**

```bash
ls src/app/pages/operation/operation-real-time/components/
```

Expected: 以下 5 ディレクトリのみが残る
```
operation-real-time-controller/
operation-real-time-formation-table/
operation-real-time-header/
operation-real-time-legend/
operation-real-time-operation-table/
```

---

## Task 3: デッドファイル（state / utils / interfaces / pipes）を削除する

**Files:**
- Delete: `src/app/pages/operation/operation-real-time/states/operation-real-time.state.ts`
- Delete: `src/app/pages/operation/operation-real-time/utils/operation-real-time.util.ts`
- Delete: `src/app/pages/operation/operation-real-time/interfaces/operation-real-time-table-data.interface.ts`
- Delete: `src/app/pages/operation/operation-real-time/pipes/operation-real-time-time-color.pipe.ts`

- [ ] **Step 1: ファイルを削除し、空になったディレクトリも削除する**

```bash
BASE=src/app/pages/operation/operation-real-time
rm -f \
  "$BASE/states/operation-real-time.state.ts" \
  "$BASE/utils/operation-real-time.util.ts" \
  "$BASE/interfaces/operation-real-time-table-data.interface.ts" \
  "$BASE/pipes/operation-real-time-time-color.pipe.ts"
rmdir "$BASE/states" "$BASE/interfaces" 2>/dev/null || true
```

- [ ] **Step 2: 確認する**

```bash
ls src/app/pages/operation/operation-real-time/utils/
ls src/app/pages/operation/operation-real-time/pipes/
```

Expected:
- `utils/` には `circulate-operation-number.ts` のみ残る
- `pipes/` には `operation-real-time-day-count.pipe.ts` のみ残る
- `states/` ディレクトリは消える
- `interfaces/` ディレクトリは消える

---

## Task 4: route ファイルから旧ステートの参照を削除する

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.route.ts`

- [ ] **Step 1: route ファイルを以下の内容に書き換える**

```typescript
import { Route } from '@angular/router';
import { OperationRealTimeResolverService } from './services/operation-real-time-resolver.service';
import { OperationRealTimeService } from './services/operation-real-time.service';

export const OPERATION_REAL_TIME_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./operation-real-time.component').then(
                (mod) => mod.OperationRealTimeComponent,
            ),
        providers: [
            OperationRealTimeService,
            OperationRealTimeResolverService,
        ],
        resolve: {
            from: OperationRealTimeResolverService,
        },
        data: {
            title: 'リアルタイム運用情報',
        },
        runGuardsAndResolvers: 'always',
    },
];
```

---

## Task 5: service ファイルから v2 メソッドと旧ステート参照を削除する

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts`

削除対象:
- import ブロック（旧ステート）: lines 28-31
- `#operationRealTimeStateStore` inject: line 49
- `#operationRealTimeStateQuery` inject: line 50
- v2 メソッド群: `fetchOperationSightingTimeCrossSections()`, `fetchFormationSightingTimeCrossSections()`, `fetchOperationCurrentPosition()`, `fetchTripClassesV2()`, `fetchOperationSightingHistories()`, `fetchFormationSightingHistories()` (lines 52-274)

v2 メソッドと共に不要になる import:
- `CondOperator` (v2 クエリビルダーのみで使用)
- `RequestQueryBuilder` の `CondOperator` 用使用 → `RequestQueryBuilder` 自体は v2 のみ
- `TodaysOperationListStateQuery` (v2 のみ使用)
- `TodaysFormationListStateQuery` (v2 のみ使用)
- `OperationSightingDetailsDto` (v2 型注釈のみ)
- `TripClassDetailsDto` (v2 型注釈のみ)
- `dayjs` (v2 のみ使用)

- [ ] **Step 1: ファイル冒頭の import ブロックを書き換える**

```typescript
import { inject, Injectable } from '@angular/core';
import {
    format,
    getHours,
    setHours,
    setMilliseconds,
    setMinutes,
    setSeconds,
    subDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { flow } from 'es-toolkit';
import { forkJoin, from, Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationRealTimeStore } from '../stores/operation-real-time.store';
```

- [ ] **Step 2: クラス本体の inject と v2 メソッドを削除する**

`@Injectable()` デコレータから v3 メソッドの直前（`// v3` コメント）までを以下に書き換える:

```typescript
@Injectable()
export class OperationRealTimeService {
    readonly #serviceService = inject(ServiceService);
    readonly #routeService = inject(RouteService);
    readonly #tripClassService = inject(TripClassService);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #formationService = inject(FormationService);
    readonly #operationSightingService = inject(OperationSightingService);

    // v3
```

（それ以降 `fetchRoutes_V3` から末尾の `}` までは変更なし）

---

## Task 6: lint でコンパイルエラーがないことを確認する

- [ ] **Step 1: lint を実行する**

```bash
npm run lint
```

Expected: エラーなし（warnings は無視可）

- [ ] **Step 2: 型チェックを実行する**

```bash
npx tsc --noEmit
```

Expected: エラーなし

---

## Task 7: コミットする

- [ ] **Step 1: 変更をステージングする**

```bash
git add src/app/pages/operation/operation-real-time/
```

- [ ] **Step 2: コミットする**

```bash
git commit -m "$(cat <<'EOF'
refactor: :recycle: OperationRealTime のデッドコードを削除する

旧パターン（-c/-p コンポーネント分割・states/ ファイル）への移行完了に伴い、
参照されなくなったコンポーネント 10 個・ステートファイル・v2 API メソッド群を削除する。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: libs/ 配下のデッドメソッドを削除する

リファクタリングで `operation-real-time.service.ts` の v2 メソッド `fetchFormationSightingTimeCrossSections()` が唯一の呼び出し元だったため、削除後に孤立するメソッドが `libs/operation-sighting/` に 2 つ発生する。

**影響なし確認済み（削除しない）：**
- `operationSightingService.findOneTimeCrossSectionFromOperationNumber()` → `timetable-station.service.ts` が使用中
- `tripClassService.findMany()` → 他 3 サービスが使用中
- `operationSightingService.findMany()` → `operation-past-time.service.ts` が使用中

**注意: `operationService.findOneWithCurrentPosition()` は Task 10 で削除する（shared/ 削除後に孤立）。**

**削除対象：**
- `libs/operation-sighting/usecase/operation-sighting.service.ts` の `findOneTimeCrossSectionFromFormationNumber()` メソッド（lines 71-78）
- `libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts` の `findOneTimeCrossSectionFromFormationNumber()` メソッド（lines 211-229）

**Files:**
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts:71-78`
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts:211-229`

- [ ] **Step 1: usecase service からデッドメソッドを削除する**

`src/app/libs/operation-sighting/usecase/operation-sighting.service.ts` の以下のブロックを丸ごと削除する：

```typescript
    findOneTimeCrossSectionFromFormationNumber(params: {
        formationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionFromFormationNumber(
            params,
        );
    }
```

（直前の `}` と直後の `findOneTimeCrossSectionByFormationNumber_V3` の間の 7 行を削除）

- [ ] **Step 2: infrastructure query からデッドメソッドを削除する**

`src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts` の以下のブロックを丸ごと削除する：

```typescript
    findOneTimeCrossSectionFromFormationNumber(params: {
        formationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { formationNumber } = params;

        return this.http
            .get<OperationSightingTimeCrossSectionModel>(
                `${this.apiUrl}/time-cross-section/from-formation-number/${formationNumber}`,
                { observe: 'response' },
            )
            .pipe(
                map((res) => {
                    return OperationSightingDtoBuilder.toTimeCrossSectionDto(
                        res.body,
                    );
                }),
            );
    }
```

（直後の `findOneTimeCrossSectionByFormationNumber_V3` は残す）

- [ ] **Step 3: lint で確認する**

```bash
npm run lint
```

Expected: エラーなし

- [ ] **Step 4: コミットに含める（Task 7 のステージングに追加）**

```bash
git add src/app/libs/operation-sighting/
```

---

## Task 9: shared/ 配下のデッドコンポーネントを削除する

`shared/` の以下 3 コンポーネントは、削除対象の dead コンポーネントのみが唯一の使用元であることを確認済み。

| ディレクトリ | 唯一の使用元 |
|---|---|
| `shared/operation-post-card/` | `operation-real-time-main-c/`（削除対象） |
| `shared/current-position-link/` | `operation-real-time-new-table-p/`（削除対象） |
| `shared/formation-number-link/` | `operation-real-time-new-table-p/`（削除対象） |

注意: `shared/new-operation-post-card/` は dashboard および `operation-real-time.component.ts` が使用中のため **削除しない**。

**Files:**
- Delete: `src/app/shared/operation-post-card/`
- Delete: `src/app/shared/current-position-link/`
- Delete: `src/app/shared/formation-number-link/`

- [ ] **Step 1: 3 ディレクトリを削除する**

```bash
BASE=src/app/shared
rm -rf \
  "$BASE/operation-post-card" \
  "$BASE/current-position-link" \
  "$BASE/formation-number-link"
```

- [ ] **Step 2: 確認する**

```bash
ls src/app/shared/
```

Expected: `operation-post-card/`・`current-position-link/`・`formation-number-link/` が存在しないこと

- [ ] **Step 3: lint で確認する**

```bash
npm run lint
```

Expected: エラーなし

- [ ] **Step 4: コミットに含める（Task 7 のステージングに追加）**

```bash
git add src/app/shared/
```

---

---

## Task 10: shared/ 削除により孤立した libs/ デッドメソッドを削除する

Task 9 の `shared/operation-post-card/` 削除後、`operation-post-card.service.ts` が唯一の呼び出し元だったメソッドが libs/ に孤立する。

**削除対象：**

| ファイル | メソッド | 行 |
|---|---|---|
| `libs/operation/usecase/operation.service.ts` | `findOneWithCurrentPosition()` | 42-47 |
| `libs/operation/infrastructure/queries/operation.query.ts` | `findOneWithCurrentPosition()` | 144-175 |
| `libs/operation-sighting/usecase/operation-sighting.service.ts` | `createOne()` | 88-93 |
| `libs/operation-sighting/infrastructure/commands/operation-sighting.command.ts` | `createOne()` + dead imports | 23-35 |

**Files:**
- Modify: `src/app/libs/operation/usecase/operation.service.ts:42-47`
- Modify: `src/app/libs/operation/infrastructure/queries/operation.query.ts:144-175`
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts:88-93`
- Modify: `src/app/libs/operation-sighting/infrastructure/commands/operation-sighting.command.ts:23-35`

- [ ] **Step 1: `OperationService.findOneWithCurrentPosition()` を削除する**

`src/app/libs/operation/usecase/operation.service.ts` の以下のブロックを丸ごと削除する：

```typescript
    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationCurrentPositionDto> {
        return this.operationQuery.findOneWithCurrentPosition(operationId, qb);
    }
```

（直後の `findOneWithCurrentPosition_V3` は残す）

- [ ] **Step 2: `OperationQuery.findOneWithCurrentPosition()` を削除する**

`src/app/libs/operation/infrastructure/queries/operation.query.ts` の以下のブロックを丸ごと削除する：

```typescript
    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationCurrentPositionDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationCurrentPositionModel>(
                this.apiUrl + '/' + operationId + '/current-position',
                {
                    params: httpParams,
                },
            )
            .pipe(
                map((data) => {
                    return {
                        operation: buildOperationDetailsDto(data.operation),
                        position: {
                            prev: buildTripOperationListDetailsDto(
                                data.position.prev,
                            ),
                            current: buildTripOperationListDetailsDto(
                                data.position.current,
                            ),
                            next: buildTripOperationListDetailsDto(
                                data.position.next,
                            ),
                        },
                    };
                }),
            );
    }
```

（直後の `findOneWithCurrentPosition_V3` は残す）

- [ ] **Step 3: `OperationSightingService.createOne()` と dead import を削除する**

`src/app/libs/operation-sighting/usecase/operation-sighting.service.ts` の以下のブロックを削除する：

```typescript
    createOne(
        qb: RequestQueryBuilder,
        body: CreateOperationSightingDto,
    ): Observable<OperationSightingDetailsDto> {
        return this.operationSightingCommand.createOne(qb, body);
    }
```

また、同ファイルの先頭から `CreateOperationSightingDto` の import 行も削除する：

```typescript
import { CreateOperationSightingDto } from './dtos/create-operation-sighting.dto';
```

- [ ] **Step 4: `OperationSightingCommand.createOne()` と dead imports を削除する**

`src/app/libs/operation-sighting/infrastructure/commands/operation-sighting.command.ts` を以下の内容に書き換える（`createOne()` メソッドと不要な import を除去）：

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FetchError } from 'src/app/core/classes/custom-error';
import { environment } from 'src/environments/environment';
import { InvalidateOperationSightingDto } from '../../usecase/dtos/invalidate-operation-sighting.dto';
import { PostOperationSightingDto } from '../../usecase/dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from '../../usecase/dtos/restore-operation-sighting.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingCommand {
    private readonly apiUrl = environment.apiUrl + '/v2/operation-sightings';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';

    constructor(private readonly http: HttpClient) {}

    post(body: PostOperationSightingDto): Observable<void> {
        return this.http.post(`${this.#v3ApiUrl}`, body).pipe(
            map(() => undefined),
            catchError(({ status, error }) => {
                return throwError(
                    () =>
                        new FetchError(
                            status,
                            error?.message ?? '不明なエラーが発生しました',
                        ),
                );
            }),
        );
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/invalidate`, body)
            .pipe(map(() => undefined));
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        const { operationSightingId } = body;

        return this.http
            .patch(`${this.#v3ApiUrl}/${operationSightingId}/restore`, body)
            .pipe(map(() => undefined));
    }
}
```

削除された import: `HttpParams`, `RequestQueryBuilder`, `CreateOperationSightingDto`, `OperationSightingDtoBuilder`, `OperationSightingModelBuilder`, `OperationSightingModel`

- [ ] **Step 5: lint と型チェックで確認する**

```bash
npm run lint
```

Expected: エラーなし

```bash
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 6: 変更をステージングしてコミットする**

```bash
git add src/app/libs/operation/
git add src/app/libs/operation-sighting/
```

（Task 8 の `src/app/libs/operation-sighting/` と Task 9 の `src/app/shared/` も未コミットであればまとめてコミット可）

```bash
git commit -m "$(cat <<'EOF'
refactor: :recycle: shared/ 削除により孤立した libs/ デッドメソッドを削除する

operation-post-card/ 等の shared コンポーネント削除後に唯一の呼び出し元を失った
v2 系メソッドを libs/operation/ と libs/operation-sighting/ から削除する。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

---

## Task 11: `_V3` サフィックスを外す

Tasks 5・8・10 の削除により、`_V3` サフィックスを付けていた理由（同名 v2 メソッドとの共存）が解消された。唯一のバージョンになったメソッドのサフィックスを除去する。

**除去しないもの（v2 が生存中）:**
- `findOneTimeCrossSectionByOperationNumber_V3` — v2 の `findOneTimeCrossSectionFromOperationNumber` が `timetable-station.service.ts` で現役のため変更不可

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts`
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts`
- Modify: `src/app/libs/operation/usecase/operation.service.ts`
- Modify: `src/app/libs/operation/infrastructure/queries/operation.query.ts`
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts`
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`

---

### 11-A: `libs/` のメソッド rename

- [ ] **Step 1: `OperationService.findOneWithCurrentPosition_V3` → `findOneWithCurrentPosition` に rename する**

`src/app/libs/operation/usecase/operation.service.ts` の以下の行を書き換える：

```typescript
// Before
    findOneWithCurrentPosition_V3(params: {
```
```typescript
// After
    findOneWithCurrentPosition(params: {
```

- [ ] **Step 2: `OperationQuery.findOneWithCurrentPosition_V3` → `findOneWithCurrentPosition` に rename する**

`src/app/libs/operation/infrastructure/queries/operation.query.ts` の以下の行を書き換える：

```typescript
// Before
    findOneWithCurrentPosition_V3(params: {
```
```typescript
// After
    findOneWithCurrentPosition(params: {
```

- [ ] **Step 3: `OperationSightingService.findOneTimeCrossSectionByFormationNumber_V3` → `findOneTimeCrossSectionByFormationNumber` に rename する**

`src/app/libs/operation-sighting/usecase/operation-sighting.service.ts` の以下を書き換える：

```typescript
// Before
    findOneTimeCrossSectionByFormationNumber_V3(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByFormationNumber_V3(
```
```typescript
// After
    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByFormationNumber(
```

- [ ] **Step 4: `OperationSightingQuery.findOneTimeCrossSectionByFormationNumber_V3` → `findOneTimeCrossSectionByFormationNumber` に rename する**

`src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts` の以下の行を書き換える：

```typescript
// Before
    findOneTimeCrossSectionByFormationNumber_V3(params: {
```
```typescript
// After
    findOneTimeCrossSectionByFormationNumber(params: {
```

---

### 11-B: `operation-real-time.service.ts` のメソッド rename

削除後は v2 メソッドが存在しないため、全 11 メソッドからサフィックスを除去する。

- [ ] **Step 5: 11 メソッドのシグネチャを一括 rename する**

`src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts` で以下の置換を行う（replace_all）：

| Before | After |
|---|---|
| `fetchRoutes_V3()` | `fetchRoutes()` |
| `fetchStations_V3()` | `fetchStations()` |
| `fetchTripClasses_V3()` | `fetchTripClasses()` |
| `fetchCalendar_V3()` | `fetchCalendar()` |
| `fetchOperations_V3()` | `fetchOperations()` |
| `fetchFormations_V3()` | `fetchFormations()` |
| `fetchOperationSightingTimeCrossSections_V3(` | `fetchOperationSightingTimeCrossSections(` |
| `fetchFormationSightingTimeCrossSections_V3(` | `fetchFormationSightingTimeCrossSections(` |
| `fetchSightingHistories_V3(` | `fetchSightingHistories(` |
| `fetchCurrentPositions_V3(` | `fetchCurrentPositions(` |
| `fetchCurrentPositionThatShouldUpdate_V3()` | `fetchCurrentPositionThatShouldUpdate()` |

また同ファイル内の lib メソッド呼び出しも更新する：

```typescript
// Before
                    this.#operationSightingService
                        .findOneTimeCrossSectionByFormationNumber_V3({
```
```typescript
// After
                    this.#operationSightingService
                        .findOneTimeCrossSectionByFormationNumber({
```

```typescript
// Before (2 箇所: fetchCurrentPositions と fetchCurrentPositionThatShouldUpdate 内)
                    this.#operationService
                        .findOneWithCurrentPosition_V3({
```
```typescript
// After
                    this.#operationService
                        .findOneWithCurrentPosition({
```

---

### 11-C: `operation-real-time.component.ts` の呼び出し側 rename

- [ ] **Step 6: component の呼び出し 11 箇所を rename する**

`src/app/pages/operation/operation-real-time/operation-real-time.component.ts` で以下の置換を行う（replace_all）：

| Before | After |
|---|---|
| `this.#operationRealTimeService.fetchRoutes_V3()` | `this.#operationRealTimeService.fetchRoutes()` |
| `this.#operationRealTimeService.fetchStations_V3()` | `this.#operationRealTimeService.fetchStations()` |
| `this.#operationRealTimeService.fetchTripClasses_V3()` | `this.#operationRealTimeService.fetchTripClasses()` |
| `this.#operationRealTimeService.fetchCalendar_V3()` | `this.#operationRealTimeService.fetchCalendar()` |
| `this.#operationRealTimeService.fetchOperations_V3()` | `this.#operationRealTimeService.fetchOperations()` |
| `this.#operationRealTimeService.fetchFormations_V3()` | `this.#operationRealTimeService.fetchFormations()` |
| `this.#operationRealTimeService.fetchOperationSightingTimeCrossSections_V3(` | `this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(` |
| `this.#operationRealTimeService.fetchFormationSightingTimeCrossSections_V3(` | `this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(` |
| `this.#operationRealTimeService.fetchSightingHistories_V3(` | `this.#operationRealTimeService.fetchSightingHistories(` |
| `this.#operationRealTimeService.fetchCurrentPositions_V3(` | `this.#operationRealTimeService.fetchCurrentPositions(` |
| `this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate_V3()` | `this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate()` |

---

### 11-D: 確認・コミット

- [ ] **Step 7: 残存する `_V3` 参照がないか確認する（`findOneTimeCrossSectionByOperationNumber_V3` は除外）**

```bash
grep -r "_V3" src/app/pages/operation/operation-real-time/ src/app/libs/operation/ src/app/libs/operation-sighting/ \
  | grep -v "findOneTimeCrossSectionByOperationNumber_V3" \
  | grep -v ".spec.ts"
```

Expected: 出力なし

- [ ] **Step 8: lint と型チェックを実行する**

```bash
npm run lint
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 9: コミットする**

```bash
git add \
  src/app/pages/operation/operation-real-time/services/operation-real-time.service.ts \
  src/app/pages/operation/operation-real-time/operation-real-time.component.ts \
  src/app/libs/operation/ \
  src/app/libs/operation-sighting/

git commit -m "$(cat <<'EOF'
refactor: :recycle: v2 削除後に不要となった _V3 サフィックスを除去する

v2 系メソッドの全削除により唯一のバージョンとなったメソッドから _V3 サフィックスを外す。
findOneTimeCrossSectionByOperationNumber_V3 は v2 が timetable-station で現役のため据え置き。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 削除後のディレクトリ構造（期待値）

```
operation-real-time/
  operation-real-time.component.ts
  operation-real-time.component.html
  operation-real-time.component.scss
  operation-real-time.component.spec.ts
  operation-real-time.route.ts
  components/
    operation-real-time-controller/
    operation-real-time-formation-table/
    operation-real-time-header/
    operation-real-time-legend/
    operation-real-time-operation-table/
  enums/
    operation-real-time.enum.ts
  pipes/
    operation-real-time-day-count.pipe.ts
  services/
    operation-real-time.service.ts
    operation-real-time-resolver.service.ts
    operation-real-time.service.spec.ts
    operation-real-time-resolver.service.spec.ts
  stores/
    operation-real-time.store.ts
  utils/
    circulate-operation-number.ts
```
