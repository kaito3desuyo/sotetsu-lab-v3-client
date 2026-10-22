# 初回読み込みの骨組み PR1（共通部品・運用行路図・運用表・駅別時刻表） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 共通の骨組み部品を作り、CLS の大きい 3 ページ（運用行路図 0.89・運用表 0.57・駅別時刻表 0.51）で、取る前に骨組みを出してずれと誤表示をなくす。

**Architecture:** `shared/skeleton/` に棒 1 本（`app-skeleton-bar`）とチップの行（`app-skeleton-chips`）だけを置き、骨組みの形は各ページのテンプレートで本物に似せて組む。取ったかどうかは各ページのストアの `hasFetched…` で見分け、`fetchData()` の始めで `false`、終わりで（失敗しても）`true` にする。長さが決まらない一覧は画面からヘッダーを引いた高さを取る。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、Elf ストア、Tailwind（`tw-` 接頭辞・preflight 無効）、Jest（`npx jest <path>`）、Playwright MCP（計測）

**Spec:** `docs/superpowers/specs/2026-10-22-initial-skeleton-design.md`

## Global Constraints

- 骨組みの見た目はダッシュボードと同じ: `tw-animate-pulse tw-rounded-control tw-bg-paper-3 motion-reduce:tw-animate-none`
- 長さが決まらない一覧・表の高さ: `tw-h-[calc(100dvh-48px)] md:tw-h-[calc(100dvh-64px)]`（中は `tw-overflow-hidden`）
- 絞り込みのチップの行は高さ 42px、チップは高さ 32px
- 骨組みを包む要素に `aria-label="読み込み中"` と `data-testid` を付ける
- テンプレートの順: `@if (!hasFetched…()) { 骨組み } @else if (0 件) { app-empty-state } @else { 本物 }`
- 読み込みが終わった後の見た目（位置・大きさ・色）は変えない。各ページはロック済み
- 部品はすべて `ChangeDetectionStrategy.OnPush`・standalone・`inject()`・private は `#`
- class の付け替えは `[class]`（`[ngClass]` は使わない）
- prettier は自分で変えたファイルだけに 1 つずつ（`node node_modules/prettier/bin/prettier.cjs --write <file>`）。ディレクトリに掛けない
- jest は `npx jest <path>`（サンドボックス内で可）。結果は `> .context/<name>.log 2>&1` に出して `grep -E "^Tests:|✕"` で見る
- eslint・git commit はサンドボックス外。コミットは Conventional Commits＋絵文字、末尾に次の 2 行
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`
- コミット後は `git log --show-signature -1` で署名を確かめる
- Playwright のコンソールログ（`.playwright-mcp/console-*.log`）は読まない（ws のトークンが入っている）

## Review Focus

1. 取得が失敗したとき — 骨組みが出たまま止まらず、運用表は保存していたカード、他は空表示か前の状態に戻る（各タスクの「失敗しても骨組みを消す」テスト）
2. 条件を変えて取り直したとき（ダイヤ・駅・方向・運用を変えた） — 前の結果ではなく骨組みに戻る（各タスクの「取り直すときは骨組みに戻す」テスト）
3. 運用番号の無い運用行路図 — 骨組みではなく「運用番号を設定して検索してください」を出す（Task 4 のテスト）
4. 運用表の再訪（保存したストアに古い `hasFetchedOperationTrips: true` が残っている） — 取得の始めで `false` に戻るので、前のダイヤのカードが一瞬出ない（Task 3 のテスト「取り直すときは骨組みに戻す」で押さえる）
5. 360px 未満の狭い画面 — 駅別の骨組みの時の列も本物と同じく 40px に詰まる（Task 5 のテンプレートに `max-[359px]:tw-w-10` を入れる。テストはしない・Task 6 で目視）

---

## File Structure

| ファイル | 役目 |
|---|---|
| Create `src/app/shared/skeleton/skeleton-bar.component.ts` | 灰色の棒 1 本。大きさは使う側の class |
| Create `src/app/shared/skeleton/skeleton-bar.component.spec.ts` | 見た目の class と aria-hidden |
| Create `src/app/shared/skeleton/skeleton-chips.component.ts` | 幅の並びからチップの行を作る |
| Create `src/app/shared/skeleton/skeleton-chips.component.spec.ts` | 42px の行・数・aria-label |
| Modify `src/app/pages/operation/operation-real-time/components/operation-real-time-filter/*` | ng-template を `app-skeleton-chips` に置き換え |
| Modify `src/app/pages/operation/operation-real-time/components/operation-real-time-skeleton-ledger/*` | span の棒を `app-skeleton-bar` に置き換え |
| Modify `src/app/pages/operation/operation-table/stores/operation-table.store.ts` | `hasFetchedOperationTrips` |
| Modify `src/app/pages/operation/operation-table/operation-table.component.{ts,html,spec.ts}` | 一覧の骨組み・取得の始めと終わりでフラグ |
| Modify `src/app/pages/operation/operation-table/components/operation-table-filter/*` | 運用群チップの骨組み |
| Modify `src/app/pages/operation/operation-route-diagram/stores/operation-route-diagram.store.ts` | `hasFetchedOperationTrips` |
| Modify `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.{ts,html,spec.ts}` | 図の骨組み |
| Modify `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/*` | 路線チップの骨組み（操作帯ごと） |
| Modify `src/app/pages/timetable/timetable-station/stores/timetable-station.store.ts` | `hasFetchedTimetable` |
| Modify `src/app/pages/timetable/timetable-station/timetable-station.component.{ts,html,spec.ts}` | 時刻の格子の骨組み |
| Modify `docs/design.md` | 3 ページの「ロック後の改訂」 |

---

### Task 1: 共通の骨組み部品

**Files:**
- Create: `src/app/shared/skeleton/skeleton-bar.component.ts`
- Create: `src/app/shared/skeleton/skeleton-bar.component.spec.ts`
- Create: `src/app/shared/skeleton/skeleton-chips.component.ts`
- Create: `src/app/shared/skeleton/skeleton-chips.component.spec.ts`

**Interfaces:**
- Produces: `SkeletonBarComponent`（selector `app-skeleton-bar`・入力なし・大きさはホストの class）
- Produces: `SkeletonChipsComponent`（selector `app-skeleton-chips`・`widths = input.required<readonly string[]>()`・ホストに `data-testid="filter-chips-skeleton"`）

- [ ] **Step 1: 失敗するテストを書く**

`src/app/shared/skeleton/skeleton-bar.component.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SkeletonBarComponent } from './skeleton-bar.component';

@Component({
    imports: [SkeletonBarComponent],
    template: `<app-skeleton-bar class="tw-h-5 tw-w-24"></app-skeleton-bar>`,
})
class HostComponent {}

describe('SkeletonBarComponent', () => {
    it('骨組みの見た目に、使う側の大きさの class を足す', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const bar = (fixture.nativeElement as HTMLElement).querySelector(
            'app-skeleton-bar',
        ) as HTMLElement;

        for (const name of [
            'tw-block',
            'tw-animate-pulse',
            'tw-rounded-control',
            'tw-bg-paper-3',
            'motion-reduce:tw-animate-none',
            'tw-h-5',
            'tw-w-24',
        ]) {
            expect(bar.classList).toContain(name);
        }
    });

    it('棒 1 本は読み上げない（読み上げは包む側の aria-label）', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const bar = (fixture.nativeElement as HTMLElement).querySelector(
            'app-skeleton-bar',
        ) as HTMLElement;

        expect(bar.getAttribute('aria-hidden')).toBe('true');
    });
});
```

`src/app/shared/skeleton/skeleton-chips.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { SkeletonChipsComponent } from './skeleton-chips.component';

describe('SkeletonChipsComponent', () => {
    const create = (widths: readonly string[]) => {
        const fixture = TestBed.createComponent(SkeletonChipsComponent);
        fixture.componentRef.setInput('widths', widths);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('高さ 42px の行に、渡した幅のチップを 32px の高さで並べる', () => {
        const host = create(['tw-w-14', 'tw-w-24']);
        const chips = host.querySelectorAll('app-skeleton-bar');

        expect(host.classList).toContain('tw-h-[42px]');
        expect(chips).toHaveLength(2);
        expect(chips[0].classList).toContain('tw-h-8');
        expect(chips[0].classList).toContain('tw-w-14');
        expect(chips[1].classList).toContain('tw-w-24');
    });

    it('読み込み中と読み上げ、テストから探せる', () => {
        const host = create(['tw-w-14']);

        expect(host.getAttribute('aria-label')).toBe('読み込み中');
        expect(host.getAttribute('data-testid')).toBe('filter-chips-skeleton');
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/shared/skeleton > .context/jest-skeleton.log 2>&1; grep -E "^Tests:|Cannot find module" .context/jest-skeleton.log`
Expected: `Cannot find module './skeleton-bar.component'` 等で FAIL

- [ ] **Step 3: 部品を書く**

`src/app/shared/skeleton/skeleton-bar.component.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * 骨組み（skeleton）の灰色の棒 1 本。大きさ・角の丸みは使う側が class で渡す
 * （例: `<app-skeleton-bar class="tw-h-5 tw-w-24">`）。見た目はダッシュボードの骨組みと同じ。
 * 棒 1 本は読み上げず、包む側に aria-label="読み込み中" を付ける。
 */
@Component({
    selector: 'app-skeleton-bar',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-block tw-animate-pulse tw-rounded-control tw-bg-paper-3 motion-reduce:tw-animate-none',
        'aria-hidden': 'true',
    },
})
export class SkeletonBarComponent {}
```

`src/app/shared/skeleton/skeleton-chips.component.ts`:

```ts
import {
    ChangeDetectionStrategy,
    Component,
    input,
} from '@angular/core';
import { SkeletonBarComponent } from './skeleton-bar.component';

/**
 * 絞り込みのチップの行の骨組み。行は app-filter-chips の 1 行と同じ 42px、チップは 32px。
 * 選択肢が届く前に仮のチップ（運用群の「休」だけ等）を出さないために使う。
 */
@Component({
    selector: 'app-skeleton-chips',
    imports: [SkeletonBarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-flex tw-h-[42px] tw-flex-row tw-items-center tw-gap-2 tw-overflow-hidden',
        'aria-label': '読み込み中',
        'data-testid': 'filter-chips-skeleton',
    },
    template: `
        @for (width of widths(); track $index) {
            <app-skeleton-bar
                class="tw-h-8 tw-shrink-0"
                [class]="width"
            ></app-skeleton-bar>
        }
    `,
})
export class SkeletonChipsComponent {
    /** チップごとの幅の class（例: 'tw-w-14'）。本物のチップの幅に近い値を並べる */
    readonly widths = input.required<readonly string[]>();
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/app/shared/skeleton > .context/jest-skeleton.log 2>&1; grep -E "^Tests:|✕" .context/jest-skeleton.log`
Expected: `Tests: 4 passed, 4 total`

もし `[class]="width"` で静的な `tw-h-8 tw-shrink-0` やホストの class が消えるなら、`[class]` の代わりに `class="tw-h-8 tw-shrink-0 {{ width }}"` にする（リアルタイムの絞り込みでは `class` と `[class]` の併記で両方残ることを 2026-10-22 に確かめている）。

- [ ] **Step 5: 整形・lint・コミット**

```bash
node node_modules/prettier/bin/prettier.cjs --write src/app/shared/skeleton/skeleton-bar.component.ts
node node_modules/prettier/bin/prettier.cjs --write src/app/shared/skeleton/skeleton-bar.component.spec.ts
node node_modules/prettier/bin/prettier.cjs --write src/app/shared/skeleton/skeleton-chips.component.ts
node node_modules/prettier/bin/prettier.cjs --write src/app/shared/skeleton/skeleton-chips.component.spec.ts
npx eslint src/app/shared/skeleton   # サンドボックス外
git add src/app/shared/skeleton
git commit   # サンドボックス外
```

コミットメッセージ: `refactor: :recycle: 骨組みの棒とチップの行を共通部品にする`（本文なし・末尾 2 行）

---

### Task 2: リアルタイムを共通部品に寄せる

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-filter/operation-real-time-filter.component.html`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-filter/operation-real-time-filter.component.ts`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-skeleton-ledger/operation-real-time-skeleton-ledger.component.html`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-skeleton-ledger/operation-real-time-skeleton-ledger.component.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`・`SkeletonChipsComponent`（Task 1）

見た目と既存テスト（`filter-chips-skeleton` が 2 つ・各 42px・`skeleton-row` が 67px）は変えない。既存テストがそのまま通ることが、このタスクの確かめになる。

- [ ] **Step 1: 絞り込みの ng-template を置き換える**

`operation-real-time-filter.component.html` の 2 か所の `<ng-container *ngTemplateOutlet="chipsSkeleton; context: { widths: … }">` を次に置き換え、末尾の `<!-- 作りはダッシュボードの…-->` コメントと `<ng-template #chipsSkeleton …>…</ng-template>` を消す。

```html
    } @else {
        <app-skeleton-chips [widths]="agencySkeletonWidths"></app-skeleton-chips>
    }
```

```html
    } @else {
        <app-skeleton-chips [widths]="groupSkeletonWidths"></app-skeleton-chips>
    }
```

`operation-real-time-filter.component.ts`: `imports` から `NgTemplateOutlet` を外し（import 文も消す）、`SkeletonChipsComponent`（`src/app/shared/skeleton/skeleton-chips.component`）を足す。`agencySkeletonWidths`・`groupSkeletonWidths` はそのまま。

- [ ] **Step 2: 帳票の骨組みの棒を置き換える**

`operation-real-time-skeleton-ledger.component.html` の `<span class="tw-block tw-h-… tw-w-… tw-animate-pulse tw-rounded-control tw-bg-paper-3 motion-reduce:tw-animate-none"></span>` を 6 つとも `<app-skeleton-bar class="tw-h-… tw-w-…"></app-skeleton-bar>` にする（大きさの class だけ残す）。対応は次のとおり。

| 前の大きさ | 後 |
|---|---|
| `tw-h-6 tw-w-9` | `<app-skeleton-bar class="tw-h-6 tw-w-9"></app-skeleton-bar>` |
| `tw-h-5 tw-w-24` | `<app-skeleton-bar class="tw-h-5 tw-w-24"></app-skeleton-bar>` |
| `tw-h-3 tw-w-[88px]`（2 つ） | `<app-skeleton-bar class="tw-h-3 tw-w-[88px]"></app-skeleton-bar>` |
| `tw-h-3.5 tw-w-10` | `<app-skeleton-bar class="tw-h-3.5 tw-w-10"></app-skeleton-bar>` |
| `tw-h-3.5 tw-w-44` | `<app-skeleton-bar class="tw-h-3.5 tw-w-44"></app-skeleton-bar>` |

包んでいる `<span class="tw-flex …">` 2 つと行の `div` はそのまま。`operation-real-time-skeleton-ledger.component.ts` に `imports: [SkeletonBarComponent]` を足す。

- [ ] **Step 3: 既存テストが通ることを確かめる**

Run: `npx jest src/app/pages/operation/operation-real-time > .context/jest-rt.log 2>&1; grep -E "^Tests:|✕" .context/jest-rt.log`
Expected: `Tests: 61 passed, 61 total`

- [ ] **Step 4: 手元の画面で変わっていないことを見る**

手元（http://localhost:4200）で、`**/v3/operations**` の 2 本目以降を止めて（1 本目は resolver なので通す）、390×844 で `/operation/real-time` を撮る。リアルタイムの PR #261 のときの骨組み（チップの形 2 行・67px の行）と同じに見えること。

```js
async (page) => {
  const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  let n = 0;
  await p.route('**/v3/operations**', (r) => { n++; if (n === 1) return r.continue(); });
  p.goto('http://localhost:4200/operation/real-time').catch(() => {});
  await p.waitForTimeout(6000);
  await p.screenshot({ path: '/home/seapolis/Projects/sotetsu-lab-v3/sotetsu-lab-v3-client/.context/rt-skeleton-after-refactor.png' });
  await ctx.close();
}
```

- [ ] **Step 5: 整形・lint・コミット**

変えた 4 ファイルに 1 つずつ prettier を掛け、`git diff` で自分の行以外が動いていないか見る。eslint（サンドボックス外）を 4 ファイルに掛ける。

コミットメッセージ: `refactor: :recycle: リアルタイムの骨組みを共通部品で組む`

---

### Task 3: 運用表

**Files:**
- Modify: `src/app/pages/operation/operation-table/stores/operation-table.store.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.html`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.spec.ts`
- Modify: `src/app/pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.html`
- Modify: `src/app/pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.ts`
- Modify: `src/app/pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`・`SkeletonChipsComponent`（Task 1）
- Produces: `OperationTableStore.setHasFetchedOperationTrips(value: boolean): void`・`OperationTableStore.hasFetchedOperationTrips$: Observable<boolean>`

- [ ] **Step 1: 失敗するテストを書く（ページ）**

`operation-table.component.spec.ts` の末尾に足す（import に `ActivatedRoute, convertToParamMap` を `@angular/router` から、`Subject` を `rxjs` から足す）:

```ts
describe('OperationTableComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationTableComponent>;
    let trips$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    beforeEach(async () => {
        trips$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({ calendar_id: 'cal-1' }),
                        ),
                    },
                },
                {
                    provide: OperationTableService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
                {
                    provide: CalendarListStateQuery,
                    useValue: { calendars$: of([]) },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: { todaysCalendarId: 'cal-1' },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        fixture.destroy();
        OperationTableStore.setOperationTrips([]);
        OperationTableStore.setHasFetchedOperationTrips(false);
        OperationTableStore.resetLoading();
    });

    const finishFetch = async () => {
        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();
    };

    it('取り終わるまでは骨組みを出し、空表示もカードも出さない', () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        expect(query('[data-testid="operation-table-skeleton"]')).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
        expect(query('app-operation-table-card')).toBeNull();
    });

    it('取り終えたら骨組みを消す', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        await finishFetch();

        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', async () => {
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();
        OperationTableStore.setCalendar({ calendarId: 'cal-1' } as never);

        await finishFetch();

        expect(query('app-empty-state')).not.toBeNull();
    });

    it('取得に失敗しても骨組みを消す（保存していたカードを出すため）', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、ここだけ受け流す
        const swallow = () => undefined;
        process.on('unhandledRejection', swallow);
        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        trips$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        process.off('unhandledRejection', swallow);

        expect(query('[data-testid="operation-table-skeleton"]')).toBeNull();
    });

    it('取り直すときは骨組みに戻す（保存した古いフラグが残っていても）', () => {
        OperationTableStore.setHasFetchedOperationTrips(true);

        fixture = TestBed.createComponent(OperationTableComponent);
        fixture.detectChanges();

        expect(query('[data-testid="operation-table-skeleton"]')).not.toBeNull();
    });
});
```

- [ ] **Step 2: 失敗するテストを書く（絞り込み）**

`operation-table-filter.component.spec.ts` の末尾に足す（import に `NO_ERRORS_SCHEMA`・`ComponentFixture`・`TestBed`・`DateFnsPipe`（`src/app/core/pipes/dateFns.pipe`）・`OperationTableStore`（`../../stores/operation-table.store`）が無ければ足す）:

```ts
describe('OperationTableFilterComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationTableFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableFilterComponent],
        })
            .overrideComponent(OperationTableFilterComponent, {
                set: { imports: [DateFnsPipe], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationTableFilterComponent);
        fixture.componentRef.setInput('operationTrips', []);
        fixture.componentRef.setInput('calendars', []);
    });

    afterEach(() => OperationTableStore.setHasFetchedOperationTrips(false));

    it('運用を取る前は、運用群のチップの代わりにチップの形の骨組みを出す', () => {
        OperationTableStore.setHasFetchedOperationTrips(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).not.toBeNull();
        expect(el.querySelector('app-filter-chips')).toBeNull();
    });

    it('運用を取った後は、運用群のチップを出す', () => {
        OperationTableStore.setHasFetchedOperationTrips(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).toBeNull();
        expect(el.querySelector('app-filter-chips')).not.toBeNull();
    });
});
```

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx jest src/app/pages/operation/operation-table > .context/jest-table.log 2>&1; grep -E "^Tests:|✕" .context/jest-table.log`
Expected: 新しいテストが `setHasFetchedOperationTrips is not a function` 等で FAIL

- [ ] **Step 4: ストアにフラグを足す**

`operation-table.store.ts`:

- `StoreProps` に `hasFetchedOperationTrips: boolean;`、初期値に `hasFetchedOperationTrips: false,`
- メソッドを足す:

```ts
    /** いまの calendar_id の取得が終わったか（失敗しても true）。取る前は一覧の代わりに骨組みを出す */
    setHasFetchedOperationTrips(value: boolean): void {
        store.update(setProp('hasFetchedOperationTrips', () => value));
    },
```

- select を足す（保存済みの古い状態には無い項目なので `?? false`）:

```ts
    hasFetchedOperationTrips$: store.pipe(
        select((state) => state.hasFetchedOperationTrips ?? false),
    ),
```

- [ ] **Step 5: ページを直す**

`operation-table.component.ts`:

- `imports` に `SkeletonBarComponent`（`src/app/shared/skeleton/skeleton-bar.component`）を足す
- signal を足す:

```ts
    readonly hasFetchedOperationTrips = toSignal(
        OperationTableStore.hasFetchedOperationTrips$,
        { initialValue: false },
    );
    /** 骨組みのカードの数。1440px で 4 面 × 2 段あれば画面 1 枚分を埋める */
    readonly skeletonCards = Array.from({ length: 8 }, (_, i) => i);
    /** 骨組みのカード 1 枚の列車の行の数 */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
```

- `isEmpty` を `!this.isLoading()` から `this.hasFetchedOperationTrips()` に変える:

```ts
    readonly isEmpty = computed(
        () =>
            this.hasFetchedOperationTrips() &&
            !!this.calendar() &&
            this.operationTrips().length === 0,
    );
```

- `fetchData()` の始め（`enableLoading()` の直後）に `OperationTableStore.setHasFetchedOperationTrips(false);`、`OperationTableStore.disableLoading();` の直後に `OperationTableStore.setHasFetchedOperationTrips(true);` を足す

`operation-table.component.html` の `@if (isEmpty()) { … } @else if (!isLoading()) {` を次にする（中のカードの grid はそのまま）:

```html
    @if (!hasFetchedOperationTrips()) {
        <!-- 取る前は画面からヘッダーを引いた高さで、縦カードの骨組みを出す。以前は一覧の場所が空で、
             下の検索カードが操作帯のすぐ下に見え、届いた一覧に押し出されていた（CLS 0.57・2026-10-22）。
             取得中にカードを出さない理由（ダイヤを替えたとき前のダイヤのカードが混ざる）は前と同じ -->
        <div
            class="tw-h-[calc(100dvh-48px)] tw-overflow-hidden md:tw-h-[calc(100dvh-64px)]"
            aria-label="読み込み中"
            data-testid="operation-table-skeleton"
        >
            <div
                class="tw-grid tw-grid-cols-[repeat(auto-fill,minmax(18.5rem,1fr))] tw-items-start tw-gap-4"
            >
                @for (card of skeletonCards; track card) {
                    <div class="tw-rounded-card tw-bg-white tw-px-3 tw-pb-2 tw-pt-3">
                        <div class="tw-mb-3 tw-flex tw-flex-row tw-items-center tw-gap-2">
                            <app-skeleton-bar class="tw-h-7 tw-w-16"></app-skeleton-bar>
                            <app-skeleton-bar class="tw-h-5 tw-w-12"></app-skeleton-bar>
                        </div>
                        @for (row of skeletonRows; track row) {
                            <div class="tw-flex tw-h-8 tw-flex-row tw-items-center tw-gap-2">
                                <app-skeleton-bar class="tw-h-4 tw-w-10"></app-skeleton-bar>
                                <app-skeleton-bar class="tw-h-4 tw-w-14"></app-skeleton-bar>
                                <app-skeleton-bar class="tw-h-4 tw-flex-1"></app-skeleton-bar>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    } @else if (isEmpty()) {
```

```html
    } @else {
```

（`@else if (!isLoading())` を `@else` にし、その下のコメントの「取得中は出さない: …」の 3 行を「取得中は上の骨組みを出す: …」に直す。中身の `div.tw-grid` 以下は変えない）

- [ ] **Step 6: 絞り込みを直す**

`operation-table-filter.component.ts`:

- `imports` に `SkeletonChipsComponent` を足す
- 足す:

```ts
    readonly hasFetchedOperationTrips = toSignal(
        OperationTableStore.hasFetchedOperationTrips$,
        { initialValue: false },
    );
    /** 運用群のチップの骨組みの幅（リアルタイムの運用群の行と同じ） */
    readonly groupSkeletonWidths = [
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-12',
        'tw-w-14',
    ];
```

`operation-table-filter.component.html` の `<app-filter-chips …></app-filter-chips>` を包む:

```html
        <!-- 運用群は運用から作るので、取る前は「休」だけが出ていた。チップの形の骨組みにする（2026-10-22） -->
        @if (hasFetchedOperationTrips()) {
            <app-filter-chips
                class="tw-min-h-[42px]"
                mode="multiple"
                [scrollMode]="true"
                [options]="groupOptions()"
                [selected]="selectedGroupNames()"
                (selectedChange)="onGroupChange($event)"
            ></app-filter-chips>
        } @else {
            <app-skeleton-chips [widths]="groupSkeletonWidths"></app-skeleton-chips>
        }
```

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest src/app/pages/operation/operation-table > .context/jest-table.log 2>&1; grep -E "^Tests:|✕" .context/jest-table.log`
Expected: 全件 PASS（✕ なし）

- [ ] **Step 8: 整形・lint・コミット**

変えた 7 ファイルに 1 つずつ prettier、`git diff` で自分の行以外が動いていないか見る（`operation-table-filter.component.ts` は import が 1 行に詰まっているので、整形で折り返されたら自分の変更として受け入れてよい）。eslint はサンドボックス外。

コミットメッセージ: `fix: :bug: 運用表の初回読み込み中は一覧と運用群のチップに骨組みを出す`

---

### Task 4: 運用行路図

**Files:**
- Modify: `src/app/pages/operation/operation-route-diagram/stores/operation-route-diagram.store.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.html`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.spec.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.html`
- Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`・`SkeletonChipsComponent`（Task 1）
- Produces: `OperationRouteDiagramStore.setHasFetchedOperationTrips(value: boolean): void`・`hasFetchedOperationTrips$: Observable<boolean>`・`isAwaitingOperationTrips$: Observable<boolean>`（運用番号があって、まだ取り終えていない）

- [ ] **Step 1: 失敗するテストを書く（ページ）**

`operation-route-diagram.component.spec.ts` の末尾に足す（import に `ActivatedRoute, convertToParamMap` と `of, Subject` を足す）:

```ts
describe('OperationRouteDiagramComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationRouteDiagramComponent>;
    let trips$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        trips$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                {
                    provide: OperationRouteDiagramService,
                    useValue: {
                        fetchOperationTrips: () => trips$,
                        fetchStations: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(OperationRouteDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationRouteDiagramComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        fixture.destroy();
        OperationRouteDiagramStore.setOperationId(null as unknown as string);
        OperationRouteDiagramStore.setHasFetchedOperationTrips(false);
        OperationRouteDiagramStore.resetLoading();
    });

    it('運用番号があって取り終わるまでは、図の骨組みを出し、空表示を出さない', async () => {
        await setup({ operation_id: 'op-1' });

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えたら骨組みを消す（失敗しても）', async () => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、ここだけ受け流す
        const swallow = () => undefined;
        process.on('unhandledRejection', swallow);
        await setup({ operation_id: 'op-1' });

        trips$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        process.off('unhandledRejection', swallow);

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
    });

    it('運用番号が無ければ、骨組みでなく「運用番号を設定して検索してください」を出す', async () => {
        await setup({});

        expect(query('[data-testid="route-diagram-skeleton"]')).toBeNull();
        expect(query('app-empty-state')).not.toBeNull();
    });

    it('別の運用へ移って取り直すときは骨組みに戻す', async () => {
        await setup({ operation_id: 'op-1' });
        trips$.next(undefined);
        trips$.complete();
        await flush();
        fixture.detectChanges();

        trips$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(query('[data-testid="route-diagram-skeleton"]')).not.toBeNull();
    });
});
```

- [ ] **Step 2: 失敗するテストを書く（路線の絞り込み）**

`operation-route-diagram-route-filter.component.spec.ts` の末尾に足す（import に `NO_ERRORS_SCHEMA`・`ComponentFixture`・`TestBed`・`OperationRouteDiagramStore`（`../../stores/operation-route-diagram.store`）が無ければ足す）:

```ts
describe('OperationRouteDiagramRouteFilterComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationRouteDiagramRouteFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramRouteFilterComponent],
        })
            .overrideComponent(OperationRouteDiagramRouteFilterComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        OperationRouteDiagramStore.setOperationId(null as unknown as string);
        OperationRouteDiagramStore.setHasFetchedOperationTrips(false);
    });

    it('運用番号があって取る前は、操作帯に路線のチップの形の骨組みを出す', () => {
        OperationRouteDiagramStore.setOperationId('op-1');
        OperationRouteDiagramStore.setHasFetchedOperationTrips(false);
        fixture = TestBed.createComponent(
            OperationRouteDiagramRouteFilterComponent,
        );
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-control-band')).not.toBeNull();
        expect(el.querySelector('app-skeleton-chips')).not.toBeNull();
        expect(el.querySelector('app-filter-chips')).toBeNull();
    });

    it('運用番号が無ければ、操作帯ごと出さない（audit C6 のまま）', () => {
        OperationRouteDiagramStore.setOperationId(null as unknown as string);
        fixture = TestBed.createComponent(
            OperationRouteDiagramRouteFilterComponent,
        );
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                'app-control-band',
            ),
        ).toBeNull();
    });
});
```

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx jest src/app/pages/operation/operation-route-diagram > .context/jest-route.log 2>&1; grep -E "^Tests:|✕" .context/jest-route.log`
Expected: 新しいテストが FAIL

- [ ] **Step 4: ストアにフラグを足す**

`operation-route-diagram.store.ts`:

- `StoreProps` に `hasFetchedOperationTrips: boolean;`、初期値 `hasFetchedOperationTrips: false,`
- メソッド:

```ts
    /** いまの運用の取得が終わったか（失敗しても true）。取る前は図と路線のチップの代わりに骨組みを出す */
    setHasFetchedOperationTrips(value: boolean): void {
        store.update(setProp('hasFetchedOperationTrips', () => value));
    },
```

- select:

```ts
    hasFetchedOperationTrips$: store.pipe(
        select((state) => state.hasFetchedOperationTrips),
    ),
    /** 運用番号があって、まだ取り終えていない（骨組みを出すとき） */
    isAwaitingOperationTrips$: store.pipe(
        select(
            (state) => !!state.operationId && !state.hasFetchedOperationTrips,
        ),
    ),
```

- [ ] **Step 5: ページを直す**

`operation-route-diagram.component.ts`:

- `imports` に `SkeletonBarComponent` を足す
- 足す:

```ts
    readonly isAwaitingOperationTrips = toSignal(
        OperationRouteDiagramStore.isAwaitingOperationTrips$,
        { initialValue: false },
    );
```

- `fetchData()` の `OperationRouteDiagramStore.enableLoading();` の直後に `OperationRouteDiagramStore.setHasFetchedOperationTrips(false);`、`OperationRouteDiagramStore.disableLoading();` の直後に `OperationRouteDiagramStore.setHasFetchedOperationTrips(true);`

`operation-route-diagram.component.html` の `<div>` の中の `@if (drawingDisplayed()) {` を次にする:

```html
            @if (isAwaitingOperationTrips()) {
                <!-- 取る前は図と同じ白地に、ダイヤの帯（48px）と図の場所を画面 1 枚分取る。
                     以前は路線の絞り込みの行が後から出て図を押し下げていた（CLS 0.89・2026-10-22） -->
                <div
                    class="tw-flex tw-h-[calc(100dvh-48px)] tw-flex-col tw-overflow-hidden tw-rounded-card tw-bg-white md:tw-h-[calc(100dvh-64px)]"
                    aria-label="読み込み中"
                    data-testid="route-diagram-skeleton"
                >
                    <app-skeleton-bar
                        class="tw-h-12 tw-w-full tw-shrink-0 tw-rounded-none"
                    ></app-skeleton-bar>
                    <div class="tw-flex tw-flex-row tw-gap-6 tw-p-4">
                        @for (column of skeletonStationColumns; track column) {
                            <app-skeleton-bar
                                class="tw-h-16 tw-w-4"
                            ></app-skeleton-bar>
                        }
                    </div>
                    <div class="tw-flex tw-flex-col tw-gap-10 tw-px-4">
                        @for (row of skeletonTripRows; track row) {
                            <app-skeleton-bar
                                class="tw-h-3 tw-w-3/4"
                            ></app-skeleton-bar>
                        }
                    </div>
                </div>
            } @else if (drawingDisplayed()) {
```

`operation-route-diagram.component.ts` に骨組みの数を足す:

```ts
    /** 骨組みの縦書きの駅名の列の数（スマホ幅で横にあふれない数） */
    readonly skeletonStationColumns = Array.from({ length: 8 }, (_, i) => i);
    /** 骨組みの列車の線の数 */
    readonly skeletonTripRows = Array.from({ length: 10 }, (_, i) => i);
```

- [ ] **Step 6: 路線の絞り込みを直す**

`operation-route-diagram-route-filter.component.ts`:

- `imports` に `SkeletonChipsComponent` を足す
- 足す:

```ts
    readonly isAwaitingOperationTrips = toSignal(
        OperationRouteDiagramStore.isAwaitingOperationTrips$,
        { initialValue: false },
    );
    /** 路線のチップの骨組みの幅（本線・いずみ野線・厚木線・新横浜線の幅に近い値） */
    readonly routeSkeletonWidths = ['tw-w-16', 'tw-w-24', 'tw-w-20', 'tw-w-24'];
```

（`toSignal` と `OperationRouteDiagramStore` の import が無ければ足す）

`operation-route-diagram-route-filter.component.html` の `@if (routeOptions().length > 0) {` の前に分岐を足す:

```html
@if (isAwaitingOperationTrips()) {
    <!-- 取る前も操作帯の高さを取る。以前はチップが届くまで帯ごと無く、届くと図を 146px 押し下げていた（2026-10-22） -->
    <app-control-band>
        <p class="tw-m-0 tw-mb-2 tw-text-xs tw-text-grey-600">路線で絞り込み</p>
        <app-skeleton-chips [widths]="routeSkeletonWidths"></app-skeleton-chips>
    </app-control-band>
} @else if (routeOptions().length > 0) {
```

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest src/app/pages/operation/operation-route-diagram > .context/jest-route.log 2>&1; grep -E "^Tests:|✕" .context/jest-route.log`
Expected: 全件 PASS

- [ ] **Step 8: 整形・lint・コミット**

変えた 7 ファイルに 1 つずつ prettier（`operation-route-diagram-drawing-presentational.component.html` は SVG の text が整形で壊れるので**触らない・渡さない**）。eslint はサンドボックス外。

コミットメッセージ: `fix: :bug: 運用行路図の初回読み込み中は図と路線のチップに骨組みを出す`

---

### Task 5: 駅別時刻表

**Files:**
- Modify: `src/app/pages/timetable/timetable-station/stores/timetable-station.store.ts`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.ts`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.html`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`（Task 1）
- Produces: `TimetableStationStore.setHasFetchedTimetable(value: boolean): void`・`hasFetchedTimetable$: Observable<boolean>`

- [ ] **Step 1: 失敗するテストを書く**

`timetable-station.component.spec.ts` の末尾に足す（import に `Subject` を `rxjs` から、`TimetableStationStore` を `./stores/timetable-station.store` から足す）:

```ts
describe('TimetableStationComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableStationComponent>;
    let calendar$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    beforeEach(async () => {
        calendar$ = new Subject<undefined>();
        const ok = () => of(undefined);
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id: 'cal-1',
                                station_id: 'st-1',
                                trip_direction: '0',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: () => calendar$,
                        fetchTrips: ok,
                        fetchTripClasses: ok,
                        fetchStations: ok,
                        fetchOperations: ok,
                        fetchOperationSightingTimeCrossSections: ok,
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableStationComponent);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        TimetableStationStore.setTrips([]);
        TimetableStationStore.setHasFetchedTimetable(false);
        TimetableStationStore.resetLoading();
    });

    const finishFetch = async () => {
        calendar$.next(undefined);
        calendar$.complete();
        await flush();
        fixture.detectChanges();
    };

    it('取り終わるまでは時刻表の骨組みを出し、「この条件の列車情報はありません」を出さない', () => {
        TimetableStationStore.setCalendar({ calendarId: 'cal-1' } as never);
        fixture.detectChanges();

        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();
        expect(query('app-empty-state')).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', async () => {
        TimetableStationStore.setCalendar({ calendarId: 'cal-1' } as never);

        await finishFetch();

        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
        expect(query('app-empty-state')).not.toBeNull();
    });

    it('取得に失敗しても骨組みを消す', async () => {
        // fetchData() は try/finally だけで失敗を投げ直す（既存の振る舞い）。ここだけ受け流す
        const swallow = () => undefined;
        process.on('unhandledRejection', swallow);

        calendar$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();
        process.off('unhandledRejection', swallow);

        expect(query('[data-testid="timetable-station-skeleton"]')).toBeNull();
    });

    it('駅・ダイヤ・方向を変えて取り直すときは骨組みに戻す', async () => {
        await finishFetch();

        calendar$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(
            query('[data-testid="timetable-station-skeleton"]'),
        ).not.toBeNull();
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/pages/timetable/timetable-station/timetable-station.component.spec.ts > .context/jest-station.log 2>&1; grep -E "^Tests:|✕" .context/jest-station.log`
Expected: 新しいテストが FAIL

- [ ] **Step 3: ストアにフラグを足す**

`timetable-station.store.ts`:

- `StoreProps` に `hasFetchedTimetable: boolean;`、初期値 `hasFetchedTimetable: false,`
- メソッド:

```ts
    /** いまの駅・ダイヤ・方向の取得が終わったか（失敗しても true）。取る前は時刻表の代わりに骨組みを出す */
    setHasFetchedTimetable(value: boolean): void {
        store.update(setProp('hasFetchedTimetable', () => value));
    },
```

- select: `hasFetchedTimetable$: store.pipe(select((state) => state.hasFetchedTimetable)),`

- [ ] **Step 4: ページを直す**

`timetable-station.component.ts`:

- `imports` に `SkeletonBarComponent` を足す
- 足す:

```ts
    readonly hasFetchedTimetable = toSignal(
        TimetableStationStore.hasFetchedTimetable$,
        { initialValue: false },
    );
    /** 骨組みの時の行の数と、1 行の列車のセルの数 */
    readonly skeletonHours = Array.from({ length: 4 }, (_, i) => i);
    readonly skeletonCells = Array.from({ length: 6 }, (_, i) => i);
```

- `fetchData()` を次のようにする（`try` の始めで `false`、5 本がそろったら `true`。失敗に備えて `finally` でも `true`）:

```ts
    async fetchData(): Promise<void> {
        TimetableStationStore.enableLoading();
        TimetableStationStore.setHasFetchedTimetable(false);

        try {
            // 互いに依存しないので並行に取る（以前は 1 本ずつ待っていた）
            await Promise.all([
                lastValueFrom(this.#timetableStationService.fetchCalendar()),
                lastValueFrom(this.#timetableStationService.fetchTrips()),
                lastValueFrom(this.#timetableStationService.fetchTripClasses()),
                lastValueFrom(this.#timetableStationService.fetchStations()),
                lastValueFrom(this.#timetableStationService.fetchOperations()),
            ]);
            // 時刻表はここで描ける。充当編成はセルの中だけなので、待たずに出す
            TimetableStationStore.setHasFetchedTimetable(true);

            // 充当編成は列車の運用番号とダイヤ（今日かどうか）が揃ってから取る。
            // B7: 過去ダイヤ表示時は編成関連のフェッチ自体をスキップする
            if (this.isTodaysCalendar()) {
                await lastValueFrom(
                    this.#timetableStationService.fetchOperationSightingTimeCrossSections(),
                );
            } else {
                TimetableStationStore.resetOperationSightingTimeCrossSections();
            }
        } finally {
            // 途中の reject でローディングバーと骨組みが永久残留しないことを保証する
            TimetableStationStore.setHasFetchedTimetable(true);
            TimetableStationStore.disableLoading();
        }
    }
```

`timetable-station.component.html` の `<div>` の中の `@if (isEmpty()) {` を次にする:

```html
        @if (!hasFetchedTimetable()) {
            <!-- 取る前は画面からヘッダーを引いた高さで、時刻表と同じ形（ダイヤの帯・時の列・列車のセル 81px）の
                 骨組みを出す。以前は取る前に「この条件の列車情報はありません」が出て、その下の検索カードが
                 届いた時刻表に押し出されていた（CLS 0.51・2026-10-22） -->
            <div
                class="tw-h-[calc(100dvh-48px)] tw-overflow-hidden md:tw-h-[calc(100dvh-64px)]"
                aria-label="読み込み中"
                data-testid="timetable-station-skeleton"
            >
                <div class="tw-overflow-hidden tw-rounded-card tw-bg-white">
                    <app-skeleton-bar
                        class="tw-h-12 tw-w-full tw-rounded-none"
                    ></app-skeleton-bar>
                    @for (hour of skeletonHours; track hour) {
                        <div
                            class="tw-flex tw-flex-row tw-border-0 tw-border-t tw-border-solid tw-border-rule"
                        >
                            <app-skeleton-bar
                                class="tw-w-14 tw-flex-shrink-0 tw-self-stretch tw-rounded-none max-[359px]:tw-w-10"
                            ></app-skeleton-bar>
                            <div
                                class="tw-grid tw-min-w-0 tw-flex-1 tw-grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] tw-content-start tw-gap-x-2 tw-gap-y-1 tw-p-2 max-[359px]:tw-px-1"
                            >
                                @for (cell of skeletonCells; track cell) {
                                    <app-skeleton-bar
                                        class="tw-h-[81px] tw-w-full"
                                    ></app-skeleton-bar>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
        } @else if (isEmpty()) {
```

（`isEmpty` の computed は変えない。骨組みの分岐が先にあるので、取る前に空表示は出ない）

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest src/app/pages/timetable/timetable-station > .context/jest-station.log 2>&1; grep -E "^Tests:|✕" .context/jest-station.log`
Expected: 全件 PASS

- [ ] **Step 6: 整形・lint・コミット**

変えた 4 ファイルに 1 つずつ prettier、eslint はサンドボックス外。

コミットメッセージ: `fix: :bug: 駅別時刻表の初回読み込み中は「ありません」でなく骨組みを出す`

---

### Task 6: 計測・目視・design.md

**Files:**
- Modify: `docs/design.md`（`### \`timetable/station\``・`### \`operation/table\``・`### \`operation/route-diagram\`` の各「ロック後の改訂」の末尾）

- [ ] **Step 1: jest 全件**

Run: `npx jest > .context/jest-all.log 2>&1; grep -E "^Tests:|^Test Suites:" .context/jest-all.log`
Expected: 全件 PASS

- [ ] **Step 2: 手元の CLS を測る（直した後）**

手元（http://localhost:4200）で次を流す。`paths` は運用表・駅別・行路図（結果の URL）。各 3 回 × 2 幅。

```js
async (page) => {
  const browser = page.context().browser();
  const paths = ['/operation/table', '/timetable/station', '/operation/route-diagram;operation_id=dfa13572-b0df-4360-9118-b8b659a6d117'];
  const out = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const path of paths) {
      const runs = [];
      for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
        const p = await ctx.newPage();
        await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
        try { await p.goto('http://localhost:4200' + path, { waitUntil: 'networkidle', timeout: 90000 }); } catch (e) {}
        await p.waitForTimeout(3000);
        runs.push(await p.evaluate(() => Math.round(window.__cls * 1000) / 1000));
        await ctx.close();
      }
      out.push({ w: vp.width, path, runs });
    }
  }
  return out;
}
```

Expected: 3 ページとも両方の幅で 0.1 未満。直す前（本番）は 運用表 0.57/0.49・駅別 0.51/0.51・行路図 0.89/0.47。0.1 以上が残ったら、`layout-shift` の `sources` を出して原因の要素を特定し、その骨組みの高さを本物に合わせてから測り直す。

- [ ] **Step 3: 読み込み後の寸法を本番と比べる**

次の要素の `getBoundingClientRect()`（x・y+scrollY・幅・高さ）を、手元と本番で 390×900 と 1440×900 で比べ、一致すること。

- 運用表: `app-control-band`・`main > div.tw-grid`・`app-operation-table-card`（1 枚目）・`app-operation-search-card`
- 駅別: `app-timetable-station-table`・`app-timetable-search-card`
- 行路図: `app-operation-route-diagram-route-filter app-control-band`・`app-operation-route-diagram-drawing`・`app-operation-search-card`

- [ ] **Step 4: 骨組みを撮って目で見て、ユーザーに見せる**

3 ページそれぞれ、データの取得を止めた状態を 390×844 と 1440×900 で撮る。止め方:

- 運用表: `**/v3/operations/trips**` を全部止める
- 駅別: `**/v3/trips**` を全部止める（resolver のあとに取るもの）
- 行路図: `**/v3/operations/*/trips**` を全部止める

それぞれ `.context/skeleton-<page>-<width>.png` に保存し、Read で見る。本物の形（運用表は縦カード、駅別は帯＋時の列＋セル、行路図は帯＋図）に見えること、骨組みと本物で上下の位置が揃うことを確かめ、ユーザーに画面を見せて形の細部（行の数・棒の幅）の意見をもらう。直しがあれば該当タスクのテンプレートを直して Step 1 から繰り返す。

- [ ] **Step 5: design.md に改訂を書き足す**

3 ページの「ロック後の改訂:」の末尾に 1 つずつ足す（数字は Step 2 の結果で埋める）。

駅別時刻表:

```markdown
-   2026-10-22 — 取る前は時刻表の場所に、画面からヘッダーを引いた高さで骨組み（ダイヤの帯・時の列・列車のセル 81px）を出す。
    以前は取る前に「この条件の列車情報はありません」が出て、その下の検索カードが届いた時刻表に押し出されていた
    （CLS スマホ 0.51・PC 0.51 → <Step 2 の値>）。駅・ダイヤ・方向を変えたときも骨組みに戻る。読み込みが終わった後の見た目は変えていない
```

運用表:

```markdown
-   2026-10-22 — 取る前は一覧の場所に、画面からヘッダーを引いた高さで縦カードの骨組みを出し、運用群のチップも
    チップの形の骨組みにした（以前は一覧の場所が空で「休」だけが出ていた）。取得中にカードを出さないのは前と同じ
    （CLS スマホ 0.57・PC 0.49 → <Step 2 の値>）。読み込みが終わった後の見た目は変えていない
```

運用行路図:

```markdown
-   2026-10-22 — 運用番号があって取る前は、路線の絞り込みの操作帯をチップの形の骨組みで先に出し、図の場所に
    ダイヤの帯と図の骨組みを画面 1 枚分出す。以前は操作帯が後から出て図を 146px 押し下げていた
    （CLS スマホ 0.89・PC 0.47 → <Step 2 の値>）。運用番号が無いときの空表示と、読み込みが終わった後の見た目は変えていない
```

- [ ] **Step 6: コミット**

```bash
git add docs/design.md
git diff --cached --stat   # design.md だけであること
git commit   # サンドボックス外
```

コミットメッセージ: `docs: :memo: 運用表・運用行路図・駅別時刻表の骨組みをロック後の改訂に書き足す`

---

### Task 7: PR

- [ ] **Step 1: master の最新を取り、差分を確かめる**

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' fetch -q https://github.com/kaito3desuyo/sotetsu-lab-v3-client.git master:refs/remotes/origin/master
git log --oneline origin/master..HEAD
```

- [ ] **Step 2: ユーザーに PR を作ってよいか聞く**（push と PR はユーザーの指示が要る）

- [ ] **Step 3: 指示があれば push して PR を作る**

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u https://github.com/kaito3desuyo/sotetsu-lab-v3-client.git fix/initial-skeleton
gh pr create --repo kaito3desuyo/sotetsu-lab-v3-client --base master --head fix/initial-skeleton --title "fix: :bug: 運用行路図・運用表・駅別時刻表の初回読み込みに骨組みを出す" --body-file -
```

本文: 何を直したか・前と後の CLS の表・確かめたこと・残り（PR2・PR3 のページ）。末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)` と空行と `https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`。
