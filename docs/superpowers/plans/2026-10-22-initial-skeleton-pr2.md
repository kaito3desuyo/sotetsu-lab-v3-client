# 初回読み込みの骨組み PR2（全線時刻表・過去の運用・列車位置情報） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR1（#263）で作った共通の骨組み部品を使い、全線時刻表（CLS 0.46）・過去の運用（0.30）・列車位置情報（0.13）で、取る前に本物と同じ高さの骨組みを出してずれをなくす。

**Architecture:** PR1 と同じ。取ったかどうかは各ページのストアの `hasFetched…` で見分け、`fetchData()` の始めで `false`、終わりで（失敗しても）`true` にする。終わりで `true` にするのは世代番号 `#fetchSeq` が一番新しい取得だけ。骨組みの形は各ページのテンプレートで、本番で測った寸法に合わせて組む。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、Elf ストア、Tailwind（`tw-` 接頭辞・preflight 無効）、Jest（`npx jest <path>`）、Playwright MCP（計測）

**Spec:** `docs/superpowers/specs/2026-10-22-initial-skeleton-design.md`（PR1 の計画 `docs/superpowers/plans/2026-10-22-initial-skeleton-pr1.md` も読むこと。部品の使い方と `#fetchSeq` の形はそこにある）

## Global Constraints

- 骨組みは `app-skeleton-bar`（`src/app/shared/skeleton/skeleton-bar.component.ts`）と `app-skeleton-chips`（`src/app/shared/skeleton/skeleton-chips.component.ts`）で組む。新しい共通部品は作らない
- 長さが決まらない一覧の高さ: `tw-h-[calc(100dvh-48px)] md:tw-h-[calc(100dvh-64px)]`（中は `tw-overflow-hidden`）。本物にスクロールの箱があるページは、その箱と同じ式を `max-h` でなく `h` にして使う
- 骨組みを包む要素に `aria-label="読み込み中"` と `data-testid` を付ける
- テンプレートの順: `@if (取る前) { 骨組み } @else if (0 件) { app-empty-state } @else { 本物 }`
- 読み込みが終わった後の見た目（位置・大きさ・色）は変えない。各ページはロック済み
- 取得中のプログレスバー（`@if (isLoading())` の `mat-progress-bar`）は残す
- 部品はすべて `ChangeDetectionStrategy.OnPush`・standalone・`inject()`・private は `#`
- class の付け替えは `[class]`（`[ngClass]` は使わない）
- prettier は自分で変えたファイルだけに 1 つずつ（`node node_modules/prettier/bin/prettier.cjs --write <file>`）。ディレクトリに掛けない
- jest は `npx jest <path>`（サンドボックス内で可）。結果は `> .context/<name>.log 2>&1` に出して `grep -E "^Tests:|✕"` で見る
- eslint・git commit はサンドボックス外。コミットは Conventional Commits＋絵文字、末尾に次の 2 行
  - `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`
- コミット後は `git log --show-signature -1` で署名を確かめる
- Bash でパイプ（`|`）をつながない。1 コマンド 1 目的
- Playwright のコンソールログ（`.playwright-mcp/console-*.log`）は読まない（ws のトークンが入っている）

## 本番の寸法（2026-10-22・読み込み後・390×844 / 1440×900）

| ページ | 要素 | 寸法 |
|---|---|---|
| 全線時刻表 | 路線の絞り込みの操作帯 | y 48/64・高さ 122。中は横スクロール 1 行のチップ（本線 83px・いずみ野線 125・厚木線 97・新横浜線 111・相鉄・JR直通線 129・埼京線 69・川越線 69・りんかい線 97…、間は 16px） |
| 全線時刻表 | 表の `article` | y 186/202・高さ 868/908 = ダイヤの帯 48 ＋ 余白 16 ＋ ページ送り 48 ＋ 16 ＋ スクロールの箱 724/764 ＋ 16 |
| 全線時刻表 | 表の中 | 見出し 3 段 × 24px・左の駅名の列 127px・列車の列 40px |
| 全線時刻表 | 取得中 | 約 2 秒、検索カードだけが y 64 に見え、その上に帯と表が入る |
| 過去の運用 | 操作帯 | 高さ 254/239。読み込みの間も変わらない |
| 過去の運用 | 表の `article` | y 318/319・高さ 724/764（スクロールの箱そのもの）。取得中は高さ 140 で一度出てから伸びる |
| 過去の運用 | 表の中 | 見出しの行 51px・行 39px・編成の列 87px・日付の列 145px |
| 列車位置情報 | 本文の場所 | 取る前は空でフッターが y 252 に見える |
| 列車位置情報 | 駅のパネル | スマホは路線図の上（y 264・高さ 45）、lg 以上は右の列（x 664） |
| 列車位置情報 | 路線図のカード | スマホ y 321・高さ 1,492 以上、lg 以上は左の列（幅 640） |

## Review Focus

1. 取得が失敗したとき — 骨組みが出たまま止まらない（各タスクの「失敗しても骨組みを消す」テスト）
2. 条件を変えて取り直したとき（全線: ダイヤ・方向、過去: 基準日・日数、位置情報: 路線・ダイヤ） — 前の結果ではなく骨組みに戻る（各タスクの「取り直すときは骨組みに戻す」テスト）
3. 条件の無い URL（全線の `calendar_id` 無し・過去の基準日無し） — 骨組みでなく今までどおり検索カード・「基準日と日数を設定して検索してください」を出す（Task 1・Task 2 のテスト）
4. 同じページへ戻ってきたとき（ストアは const なので前の `hasFetched…: true` が残る） — 前の結果が一瞬出ないよう、コンストラクタの始めでフラグを `false` に戻す（各タスクの「入ったときは骨組みから」テスト）
5. 全線時刻表の編集・削除の後の取り直し（`fetchTripBlocks()` を直接呼ぶ） — `fetchData()` を通らないので骨組みに戻らず、表を出したまま差し替える（変えない。Task 1 で `fetchData()` 以外にフラグを触らないこと）

---

## File Structure

| ファイル | 役目 |
|---|---|
| Modify `src/app/pages/timetable/timetable-all-line/stores/timetable-all-line.store.ts` | `hasFetchedTripBlocks`・`isAwaitingTripBlocks$` |
| Modify `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.{ts,html,spec.ts}` | 表の骨組み・取得の始めと終わりでフラグ |
| Modify `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/*` | 路線チップの骨組み（操作帯は 1 つのまま） |
| Modify `src/app/pages/operation/operation-past-time/stores/operation-past-time.store.ts` | `hasFetchedPastTime` |
| Modify `src/app/pages/operation/operation-past-time/operation-past-time.component.{ts,spec.ts}` | 取得の始めと終わりでフラグ |
| Modify `src/app/pages/operation/operation-past-time/components/operation-past-time-table/*` | 表の骨組み |
| Modify `src/app/pages/train-location/stores/train-location.store.ts` | `hasFetchedTrainLocation` |
| Modify `src/app/pages/train-location/train-location.component.{ts,html,spec.ts}` | 駅のパネルと路線図の骨組み |
| Modify `docs/design.md` | 3 ページの「ロック後の改訂」 |

---

### Task 1: 全線時刻表

**Files:**
- Modify: `src/app/pages/timetable/timetable-all-line/stores/timetable-all-line.store.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.html`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.spec.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.html`
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`・`SkeletonChipsComponent`（PR1）
- Produces: `TimetableAllLineStore.setHasFetchedTripBlocks(value: boolean): void`・`hasFetchedTripBlocks$`・`isAwaitingTripBlocks$: Observable<boolean>`（ダイヤがあって、まだ取り終えていない）

- [ ] **Step 1: 失敗するテストを書く（ページ）**

`timetable-all-line.component.spec.ts` の最初の `describe` にある「ロード中はチップ・テーブルを出さず…」のテストは、`isLoading()` で本物を隠す振る舞いを確かめている。これを消し、ファイルの末尾に次を足す（import に `Subject` を足す）:

```ts
describe('TimetableAllLineComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableAllLineComponent>;
    let tripBlocks$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const query = (selector: string) =>
        (fixture.nativeElement as HTMLElement).querySelector(selector);

    const setup = async (params: Record<string, string>) => {
        tripBlocks$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: () => of(undefined),
                        fetchTripBlocks: () => tripBlocks$,
                    },
                },
                {
                    provide: CalendarListStateQuery,
                    useValue: { selectByCalendarId: () => of(undefined) },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(TimetableAllLineComponent);
        fixture.detectChanges();
    };

    afterEach(() => {
        fixture.destroy();
        TimetableAllLineStore.setCalendarId(null as unknown as string);
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        TimetableAllLineStore.resetLoading();
    });

    it('ダイヤがあって取り終わるまでは、表の骨組みを出し、本物の表は出さない', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
        expect(query('app-timetable-all-line-table')).toBeNull();
        // 路線の絞り込みは自分で骨組みを出すので、取る前から置く
        expect(query('app-timetable-all-line-route-filter')).not.toBeNull();
    });

    it('取り終えたら骨組みを消して表を出す', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-all-line-table')).not.toBeNull();
    });

    it('失敗しても骨組みを消す', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        const pending = fixture.componentInstance.fetchData();
        pending.catch(() => undefined);

        tripBlocks$.error(new Error('offline'));
        await flush();
        fixture.detectChanges();

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
    });

    it('ダイヤが無ければ骨組みを出さない（検索カードだけ）', async () => {
        await setup({});

        expect(query('[data-testid="all-line-table-skeleton"]')).toBeNull();
        expect(query('app-timetable-search-card')).not.toBeNull();
    });

    it('条件を変えて取り直すときは骨組みに戻す', async () => {
        await setup({ calendar_id: 'cal-1', trip_direction: '0' });
        tripBlocks$.next(undefined);
        tripBlocks$.complete();
        await flush();
        fixture.detectChanges();

        tripBlocks$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);
        fixture.detectChanges();

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', async () => {
        TimetableAllLineStore.setCalendarId('cal-old');
        TimetableAllLineStore.setHasFetchedTripBlocks(true);

        await setup({ calendar_id: 'cal-1', trip_direction: '0' });

        expect(query('[data-testid="all-line-table-skeleton"]')).not.toBeNull();
    });
});
```

注意: 「失敗しても」のテストは、コンストラクタの `fetchData()` が受け止められずに reject すると jest が落ちることがある。PR1 では `process.on('unhandledRejection')` が型で通らなかったので、そうなったら `jest.spyOn(TimetableAllLineComponent.prototype, 'fetchData')` で元の実装を `.catch(() => undefined)` で包んでから `setup()` する（PR1 の運用表のテストと同じやり方）。

- [ ] **Step 2: 失敗するテストを書く（路線の絞り込み）**

`timetable-all-line-route-filter.component.spec.ts` の末尾に足す（import に `NO_ERRORS_SCHEMA` を足す）:

```ts
describe('TimetableAllLineRouteFilterComponent の読み込み中', () => {
    let fixture: ComponentFixture<TimetableAllLineRouteFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineRouteFilterComponent],
        })
            .overrideComponent(TimetableAllLineRouteFilterComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        TimetableAllLineStore.setCalendarId(null as unknown as string);
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        TimetableAllLineStore.setStations([]);
    });

    it('ダイヤがあって取る前は、操作帯にチップの形の骨組みを出し、要約は空にする', () => {
        TimetableAllLineStore.setCalendarId('cal-1');
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelectorAll('app-control-band').length).toBe(1);
        expect(el.querySelector('app-skeleton-chips')).not.toBeNull();
        expect(el.querySelector('app-filter-chips')).toBeNull();
        expect(fixture.componentInstance.bandSummaryOrEmpty()).toBe('');
    });

    it('取り終えたら骨組みを本物のチップに替える（帯は作り直さない）', () => {
        TimetableAllLineStore.setStations([
            makeRouteStation('st-r1', 'r1', '本線'),
        ]);
        TimetableAllLineStore.setCalendarId('cal-1');
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
        fixture.detectChanges();
        const band = (fixture.nativeElement as HTMLElement).querySelector(
            'app-control-band',
        );

        TimetableAllLineStore.setHasFetchedTripBlocks(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).toBeNull();
        expect(el.querySelector('app-filter-chips')).not.toBeNull();
        expect(el.querySelector('app-control-band')).toBe(band);
    });

    it('ダイヤが無く選択肢も無ければ、操作帯ごと出さない（今のまま）', () => {
        TimetableAllLineStore.setCalendarId(null as unknown as string);
        fixture = TestBed.createComponent(TimetableAllLineRouteFilterComponent);
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

Run: `npx jest src/app/pages/timetable/timetable-all-line > .context/jest-all-line.log 2>&1; grep -E "^Tests:|✕" .context/jest-all-line.log`
Expected: 新しいテストが FAIL

- [ ] **Step 4: ストアにフラグを足す**

`timetable-all-line.store.ts`:

- `StoreProps` に `hasFetchedTripBlocks: boolean;`、初期値 `hasFetchedTripBlocks: false,`
- メソッド（`resetLoading()` の後ろ）:

```ts
    /** いまの条件の取得が終わったか（失敗しても true）。取る前は表と路線のチップの代わりに骨組みを出す */
    setHasFetchedTripBlocks(value: boolean): void {
        store.update(setProp('hasFetchedTripBlocks', () => value));
    },
```

- select（`isLoading$` の後ろ）:

```ts
    hasFetchedTripBlocks$: store.pipe(
        select((state) => state.hasFetchedTripBlocks),
    ),
    /** ダイヤがあって、まだ取り終えていない（骨組みを出すとき） */
    isAwaitingTripBlocks$: store.pipe(
        select((state) => !!state.calendarId && !state.hasFetchedTripBlocks),
    ),
```

- [ ] **Step 5: ページを直す**

`timetable-all-line.component.ts`:

- `imports` に `SkeletonBarComponent` を足す（`src/app/shared/skeleton/skeleton-bar.component`）
- フィールドを足す:

```ts
    readonly isAwaitingTripBlocks = toSignal(
        TimetableAllLineStore.isAwaitingTripBlocks$,
        { initialValue: false },
    );
    /** 骨組みの行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
    /** 骨組みの列車の列の数 */
    readonly skeletonColumns = Array.from({ length: 30 }, (_, i) => i);
    #fetchSeq = 0;
```

- コンストラクタの始め（`this.#route.paramMap` の前）に足す:

```ts
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        TimetableAllLineStore.setHasFetchedTripBlocks(false);
```

- `fetchData()` を次にする（`if (!calendarId) return;` は残す）:

```ts
    async fetchData(): Promise<void> {
        if (!TimetableAllLineStore.calendarId) return;

        const seq = ++this.#fetchSeq;
        TimetableAllLineStore.enableLoading();
        TimetableAllLineStore.setHasFetchedTripBlocks(false);

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            // （中身は今のまま）
        } finally {
            TimetableAllLineStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === this.#fetchSeq) {
                TimetableAllLineStore.setHasFetchedTripBlocks(true);
            }
        }
    }
```

編集・削除の後の `fetchTripBlocks()`（`fetchData()` の外で 3 か所）は触らない。表を出したまま差し替えるため。

`timetable-all-line.component.html` の `@if (isLoading()) { …プログレスバー… } @else { 絞り込み＋表 }` を次にする。冒頭のコメントも書き換える:

```html
    <!-- 読み込み中の合図はトップバー直下のプログレスバー（ロック済みページと同じ）。
         取る前は、路線の絞り込みはチップの形の骨組み、表は本物と同じ高さの骨組みを出す。
         以前は trip-blocks（数 MB）を取り終えるまで絞り込みと表を出さず、約 2 秒検索カードだけが見えて
         いて、届くと絞り込みと表がその上に入り検索カードを押し出していた（CLS 0.46・2026-10-22）。
         偽の「件数 0 / 0」を出さないのは前と同じ -->
    @if (isLoading()) {
        <div
            class="tw-fixed tw-left-0 tw-top-[48px] tw-z-[60] tw-w-full md:tw-top-[64px]"
        >
            <mat-progress-bar
                color="accent"
                mode="indeterminate"
            ></mat-progress-bar>
        </div>
    }

    <app-timetable-all-line-route-filter></app-timetable-all-line-route-filter>

    @if (isAwaitingTripBlocks()) {
        <!-- 本物の表と同じ並び: ダイヤの帯 48px・ページ送り 48px・スクロールの箱（本物の max-h と同じ式の高さ） -->
        <article
            class="tw-overflow-clip tw-rounded-card tw-bg-white"
            aria-label="読み込み中"
            data-testid="all-line-table-skeleton"
        >
            <app-skeleton-bar
                class="tw-h-12 tw-w-full tw-rounded-none"
            ></app-skeleton-bar>
            <div class="tw-flex tw-flex-col tw-gap-4 tw-p-4">
                <app-skeleton-bar
                    class="tw-h-12 tw-w-64 tw-max-w-full tw-self-end"
                ></app-skeleton-bar>
                <div
                    class="tw-flex tw-h-[calc(100dvh_-_80px_-_var(--control-band-offset,0px))] tw-flex-col tw-gap-2 tw-overflow-hidden md:tw-h-[calc(100dvh_-_96px_-_var(--control-band-offset,0px))]"
                >
                    @for (row of skeletonRows; track row) {
                        <div class="tw-flex tw-shrink-0 tw-flex-row tw-gap-2">
                            <app-skeleton-bar
                                class="tw-h-5 tw-w-[119px] tw-shrink-0"
                            ></app-skeleton-bar>
                            @for (column of skeletonColumns; track column) {
                                <app-skeleton-bar
                                    class="tw-h-5 tw-w-8 tw-shrink-0"
                                ></app-skeleton-bar>
                            }
                        </div>
                    }
                </div>
            </div>
        </article>
    } @else {
        <app-timetable-all-line-table
            ...（今の属性とイベントをそのまま）
        ></app-timetable-all-line-table>
    }
```

（`...` の所は今のテンプレートの `app-timetable-all-line-table` の属性 10 個とイベント 7 個をそのまま移す。省略しない）

- [ ] **Step 6: 路線の絞り込みを直す**

`timetable-all-line-route-filter.component.ts`:

- `imports` に `SkeletonChipsComponent` を足す
- フィールドを足す:

```ts
    readonly isAwaitingTripBlocks = toSignal(
        TimetableAllLineStore.isAwaitingTripBlocks$,
        { initialValue: false },
    );
    /** 取る前は要約を出さない（「全路線」と出してから「路線：…」に変わらないように） */
    readonly bandSummaryOrEmpty = computed(() =>
        this.isAwaitingTripBlocks() ? '' : this.bandSummary(),
    );
    /** 路線のチップの骨組みの幅（本番で測った本線・いずみ野線・厚木線・新横浜線・相鉄・JR直通線…の幅） */
    readonly routeSkeletonWidths = [
        'tw-w-[83px]',
        'tw-w-[125px]',
        'tw-w-[97px]',
        'tw-w-[111px]',
        'tw-w-[129px]',
        'tw-w-[69px]',
        'tw-w-[69px]',
        'tw-w-[97px]',
    ];
```

`timetable-all-line-route-filter.component.html` を次にする（帯は 1 つ。中身だけ切り替える。帯を枝ごとに作ると、取り直しのたびに作り直されて畳んだ状態が消える — PR1 の運用行路図と同じ）:

```html
@if (isAwaitingTripBlocks() || routeOptions().length) {
    <!-- 操作部はページ上端の全幅の白帯に載せる（列車ダイヤグラムと同じ・2026-10-05）。
         取る前も帯の高さを取り、チップの形の骨組みを出す（2026-10-22） -->
    <app-control-band
        [summary]="bandSummaryOrEmpty()"
        [filterActive]="!isAwaitingTripBlocks() && filterActive()"
    >
        @if (isAwaitingTripBlocks()) {
            <app-skeleton-chips
                [widths]="routeSkeletonWidths"
            ></app-skeleton-chips>
        } @else {
            <!-- mockup-05: 路線チップは折返し多段ではなく横スクロール 1 行表示 -->
            <app-filter-chips
                mode="multiple"
                [scrollMode]="true"
                [options]="routeOptions()"
                [selected]="selectedRouteIds()"
                (selectedChange)="onChange($event)"
            ></app-filter-chips>
        }
    </app-control-band>
}
```

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest src/app/pages/timetable/timetable-all-line > .context/jest-all-line.log 2>&1; grep -E "^Tests:|✕" .context/jest-all-line.log`
Expected: 全件 PASS

- [ ] **Step 8: 整形・lint・コミット**

変えた 7 ファイルに 1 つずつ prettier。eslint はサンドボックス外で変えた ts だけに掛ける。

コミットメッセージ: `fix: :bug: 全線時刻表の初回読み込み中は表と路線のチップに骨組みを出す`

---

### Task 2: 過去の運用

**Files:**
- Modify: `src/app/pages/operation/operation-past-time/stores/operation-past-time.store.ts`
- Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.ts`
- Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.spec.ts`
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.ts`
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.html`
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`（PR1）
- Produces: `OperationPastTimeStore.setHasFetchedPastTime(value: boolean): void`・`hasFetchedPastTime$: Observable<boolean>`

- [ ] **Step 1: 失敗するテストを書く（ページ）**

`operation-past-time.component.spec.ts` の末尾に足す（import に `ActivatedRoute, convertToParamMap` と `Subject` を足す）:

```ts
describe('OperationPastTimeComponent の取得のフラグ', () => {
    let fixture: ComponentFixture<OperationPastTimeComponent>;
    let sightings$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const hasFetched = () => {
        let value: boolean | undefined;
        OperationPastTimeStore.hasFetchedPastTime$
            .subscribe((v) => (value = v))
            .unsubscribe();
        return value;
    };

    beforeEach(async () => {
        sightings$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                reference_date: '2026-10-22',
                                days: '7',
                            }),
                        ),
                    },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => sightings$,
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        fixture.destroy();
        OperationPastTimeStore.setReferenceDate(null);
        OperationPastTimeStore.setDays(null);
        OperationPastTimeStore.setHasFetchedPastTime(false);
        OperationPastTimeStore.resetLoading();
    });

    it('取り終わるまでは false、取り終えたら true', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        expect(hasFetched()).toBe(false);

        sightings$.next(undefined);
        sightings$.complete();
        await flush();

        expect(hasFetched()).toBe(true);
    });

    it('失敗しても true にする', async () => {
        const original = OperationPastTimeComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationPastTimeComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationPastTimeComponent) {
                return original.call(this).catch(() => undefined);
            });
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        sightings$.error(new Error('offline'));
        await flush();
        spy.mockRestore();

        expect(hasFetched()).toBe(true);
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        OperationPastTimeStore.setHasFetchedPastTime(true);
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        expect(hasFetched()).toBe(false);
    });

    it('古い取得が後から終わっても、新しい取得が終わるまで false のまま', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        const first = sightings$;
        sightings$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);

        first.next(undefined);
        first.complete();
        await flush();

        expect(hasFetched()).toBe(false);
    });
});
```

注意: 4 つ目のテストは、サービスのスタブが `() => sightings$` を呼ぶたびに今の `sightings$` を返すこと（変数を差し替えた後の呼び出しは新しい Subject を受け取る）を使っている。

- [ ] **Step 2: 失敗するテストを書く（表）**

`operation-past-time-table.component.spec.ts` の `afterEach` に `OperationPastTimeStore.setHasFetchedPastTime(false);` を足し、`describe` の中の末尾に足す:

```ts
    it('基準日と日数があって取る前は、表の骨組みを出し、空表示も表も出さない', () => {
        OperationPastTimeStore.setReferenceDate('2026-07-01');
        OperationPastTimeStore.setDays(2);
        OperationPastTimeStore.setHasFetchedPastTime(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="past-time-table-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
        expect(el.querySelector('table')).toBeNull();
    });

    it('取り終えたら骨組みを消す', () => {
        OperationPastTimeStore.setReferenceDate('2026-07-01');
        OperationPastTimeStore.setDays(2);
        OperationPastTimeStore.setHasFetchedPastTime(true);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="past-time-table-skeleton"]',
            ),
        ).toBeNull();
    });

    it('取り終えて 0 件なら空表示を出す', () => {
        OperationPastTimeStore.setFormations([]);
        OperationPastTimeStore.setReferenceDate('2026-07-01');
        OperationPastTimeStore.setDays(2);
        OperationPastTimeStore.setHasFetchedPastTime(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-empty-state')).not.toBeNull();
        expect(
            el.querySelector('[data-testid="past-time-table-skeleton"]'),
        ).toBeNull();
    });

    it('基準日が無ければ骨組みでなく「基準日と日数を設定して検索してください」を出す', () => {
        OperationPastTimeStore.setHasFetchedPastTime(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="past-time-table-skeleton"]'),
        ).toBeNull();
        expect(el.querySelector('app-empty-state')).not.toBeNull();
    });
```

既存のテストが「取った後」の表や空表示を確かめているなら、そのテストの前で `OperationPastTimeStore.setHasFetchedPastTime(true);` を呼ぶよう直す（期待値は変えない）。

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx jest src/app/pages/operation/operation-past-time > .context/jest-past.log 2>&1; grep -E "^Tests:|✕" .context/jest-past.log`
Expected: 新しいテストが FAIL

- [ ] **Step 4: ストアにフラグを足す**

`operation-past-time.store.ts`:

- `StoreProps` に `hasFetchedPastTime: boolean;`、初期値 `hasFetchedPastTime: false,`
- メソッド（`resetLoading()` の後ろ）:

```ts
    /** いまの条件の取得が終わったか（失敗しても true）。取る前は表の代わりに骨組みを出す */
    setHasFetchedPastTime(value: boolean): void {
        store.update(setProp('hasFetchedPastTime', () => value));
    },
```

- select（`isLoading$` の後ろ）:

```ts
    hasFetchedPastTime$: store.pipe(
        select((state) => state.hasFetchedPastTime),
    ),
```

- [ ] **Step 5: ページを直す**

`operation-past-time.component.ts`:

- フィールドに `#fetchSeq = 0;`
- コンストラクタの始め（`this.#route.paramMap` の前）に:

```ts
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        OperationPastTimeStore.setHasFetchedPastTime(false);
```

- `fetchData()`:

```ts
    async fetchData(): Promise<void> {
        const seq = ++this.#fetchSeq;
        OperationPastTimeStore.enableLoading();
        OperationPastTimeStore.setHasFetchedPastTime(false);

        try {
            // （中身は今のまま）
        } finally {
            // 途中の reject でローディングバーが残り続けないようにする
            OperationPastTimeStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === this.#fetchSeq) {
                OperationPastTimeStore.setHasFetchedPastTime(true);
            }
        }
    }
```

- [ ] **Step 6: 表を直す**

`operation-past-time-table.component.ts`:

- `imports` に `SkeletonBarComponent` を足す
- フィールドを足す:

```ts
    readonly hasFetchedPastTime = toSignal(
        OperationPastTimeStore.hasFetchedPastTime$,
        { initialValue: false },
    );
    /** 骨組みの行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
    /** 骨組みの日付の列の数（7 日分） */
    readonly skeletonDays = Array.from({ length: 7 }, (_, i) => i);
```

`operation-past-time-table.component.html` の `<article>` の中の最初の `@if (tableDisplayed() && !hasResults()) {` の前に分岐を足す（`@if` → `@else if` に付け替える）:

```html
    @if (tableDisplayed() && !hasFetchedPastTime()) {
        <!-- 取る前は本物のスクロールの箱と同じ高さを取り、編成の列（87px）と日付の列（145px）の形で
             見出しの行 51px・行 39px の骨組みを出す。以前は表が途中の高さで一度出てから伸び、
             検索カードを押し出していた（CLS 0.30・2026-10-22） -->
        <div
            class="tw-flex tw-h-[calc(100dvh_-_80px_-_var(--control-band-offset,0px))] tw-flex-col tw-overflow-hidden md:tw-h-[calc(100dvh_-_96px_-_var(--control-band-offset,0px))]"
            aria-label="読み込み中"
            data-testid="past-time-table-skeleton"
        >
            <div class="tw-flex tw-h-[51px] tw-shrink-0 tw-flex-row tw-items-center">
                <div class="tw-w-[87px] tw-shrink-0 tw-px-2">
                    <app-skeleton-bar class="tw-h-5 tw-w-full"></app-skeleton-bar>
                </div>
                @for (day of skeletonDays; track day) {
                    <div class="tw-w-[145px] tw-shrink-0 tw-px-2">
                        <app-skeleton-bar class="tw-h-5 tw-w-full"></app-skeleton-bar>
                    </div>
                }
            </div>
            @for (row of skeletonRows; track row) {
                <div class="tw-flex tw-h-[39px] tw-shrink-0 tw-flex-row tw-items-center">
                    <div class="tw-w-[87px] tw-shrink-0 tw-px-2">
                        <app-skeleton-bar class="tw-h-4 tw-w-12"></app-skeleton-bar>
                    </div>
                    @for (day of skeletonDays; track day) {
                        <div class="tw-w-[145px] tw-shrink-0 tw-px-2">
                            <app-skeleton-bar class="tw-h-4 tw-w-3/4"></app-skeleton-bar>
                        </div>
                    }
                </div>
            }
        </div>
    } @else if (tableDisplayed() && !hasResults()) {
```

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest src/app/pages/operation/operation-past-time > .context/jest-past.log 2>&1; grep -E "^Tests:|✕" .context/jest-past.log`
Expected: 全件 PASS

- [ ] **Step 8: 整形・lint・コミット**

変えた 6 ファイルに 1 つずつ prettier。eslint はサンドボックス外。

コミットメッセージ: `fix: :bug: 過去の運用情報の初回読み込み中は表の高さで骨組みを出す`

---

### Task 3: 列車位置情報

**Files:**
- Modify: `src/app/pages/train-location/stores/train-location.store.ts`
- Modify: `src/app/pages/train-location/train-location.component.ts`
- Modify: `src/app/pages/train-location/train-location.component.html`
- Modify: `src/app/pages/train-location/train-location.component.spec.ts`

**Interfaces:**
- Consumes: `SkeletonBarComponent`（PR1）
- Produces: `TrainLocationStore.setHasFetchedTrainLocation(value: boolean): void`・`hasFetchedTrainLocation$: Observable<boolean>`

`fetchData()` は路線・ダイヤが変わったとき（と初回）だけ呼ばれる（コンストラクタの `paramMap` の購読）。駅を選ぶ・時刻を変えるだけでは呼ばれない。だから `fetchData()` の始めで必ず `false` に戻してよい。

- [ ] **Step 1: テストを直し、失敗するテストを書く**

`train-location.component.spec.ts`:

- `afterEach` に `TrainLocationStore.setHasFetchedTrainLocation(false);` を足す
- 「ロード中はプログレスバーだけ（スピナーは出さない）で、本文は出さない。バーはヘッダーの下」を次に置き換える:

```ts
    it('取る前は骨組みを出し、本文は出さない。取得中のプログレスバーはヘッダーの下', () => {
        TrainLocationStore.enableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(false);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(
            el.querySelector('[data-testid="train-location-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-train-location-line')).toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
        expect(el.querySelector('app-loading')).toBeNull();
        const bar = el.querySelector('mat-progress-bar');
        expect(bar?.getAttribute('color')).toBe('accent');
        // 運用表と同じ位置（ヘッダーのすぐ下）
        expect(bar?.parentElement?.className).toContain('tw-top-[48px]');
        expect(bar?.parentElement?.className).toContain('md:tw-top-[64px]');

        TrainLocationStore.disableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(true);
        fixture.detectChanges();

        expect(
            el.querySelector('[data-testid="train-location-skeleton"]'),
        ).toBeNull();
        expect(el.querySelector('app-train-location-line')).toBeTruthy();
        expect(el.querySelector('mat-progress-bar')).toBeNull();
    });
```

- 「G12: 在線列車が0本のとき…」の `TrainLocationStore.disableLoading();` の後に `TrainLocationStore.setHasFetchedTrainLocation(true);` を足す（期待値は変えない）
- 「fetchData: フェッチが reject しても isLoading が回復する（try/finally）」の最後に足す:

```ts
        // 失敗しても骨組みを消す
        expect(
            await firstValueFrom(TrainLocationStore.hasFetchedTrainLocation$),
        ).toBe(true);
```

- `describe('TrainLocationComponent', …)` の中の末尾に足す:

```ts
    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        TrainLocationStore.setHasFetchedTrainLocation(true);
        fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="train-location-skeleton"]',
            ),
        ).not.toBeNull();
    });

    it('路線を変えて取り直すときは骨組みに戻す', async () => {
        await component.fetchData({
            refetchTripBlocks: true,
            refetchStationAxis: true,
        });
        fixture.detectChanges();
        const service = TestBed.inject(TrainLocationService) as {
            fetchStationAxis: () => unknown;
        };
        service.fetchStationAxis = () => new Subject<undefined>();

        component
            .fetchData({ refetchTripBlocks: false, refetchStationAxis: true })
            .catch(() => undefined);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="train-location-skeleton"]',
            ),
        ).not.toBeNull();
    });
```

（import に `Subject` を足す）

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/pages/train-location/train-location.component.spec.ts > .context/jest-loc.log 2>&1; grep -E "^Tests:|✕" .context/jest-loc.log`
Expected: 新しいテストと直したテストが FAIL

- [ ] **Step 3: ストアにフラグを足す**

`train-location.store.ts`:

- `StoreProps` に `hasFetchedTrainLocation: boolean;`、初期値 `hasFetchedTrainLocation: false,`
- メソッド（`resetLoading()` の後ろ）:

```ts
    /** いまの路線・ダイヤの取得が終わったか（失敗しても true）。取る前は本文の代わりに骨組みを出す */
    setHasFetchedTrainLocation(value: boolean): void {
        store.update(setProp('hasFetchedTrainLocation', () => value));
    },
```

- select（`isLoading$` の後ろ）:

```ts
    hasFetchedTrainLocation$: store.pipe(
        select((state) => state.hasFetchedTrainLocation),
    ),
```

- [ ] **Step 4: ページを直す**

`train-location.component.ts`:

- `imports` に `SkeletonBarComponent` を足す
- フィールドを足す:

```ts
    readonly hasFetchedTrainLocation = toSignal(
        TrainLocationStore.hasFetchedTrainLocation$,
        { initialValue: false },
    );
    /** 骨組みの駅の行の数（画面 1 枚分を埋める数。あふれた分はカードが隠す） */
    readonly skeletonStationRows = Array.from({ length: 16 }, (_, i) => i);
    #fetchSeq = 0;
```

- コンストラクタの始め（`interval(...)` の前）に:

```ts
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の路線図が一瞬出ないようにする
        TrainLocationStore.setHasFetchedTrainLocation(false);
```

- `fetchData()` の `TrainLocationStore.enableLoading();` の前に `const seq = ++this.#fetchSeq;`、直後に `TrainLocationStore.setHasFetchedTrainLocation(false);`。`finally` を次にする:

```ts
        } finally {
            TrainLocationStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === this.#fetchSeq) {
                TrainLocationStore.setHasFetchedTrainLocation(true);
            }
        }
```

- `hasNoTrainsInService` の `if (this.isLoading()) return false;` を `if (!this.hasFetchedTrainLocation()) return false;` にする（取る前に「走行中の列車はありません」と判定しない。本文は取った後にしか出ないので見た目は変わらない）

`train-location.component.html` の `<div class="tw-flex-1 tw-overflow-y-auto tw-px-3 tw-py-3">` の中の `@if (!isLoading()) {` を次にする:

```html
        @if (!hasFetchedTrainLocation()) {
            <!-- 取る前は本物と同じ格子で、駅のパネル（45px）と路線図のカード（画面 1 枚分）の骨組みを出す。
                 以前は本文が空でフッターが見えていて、届くと押し出されていた（CLS 0.13・2026-10-22）。
                 isLoading() で本文を消すのもやめた -->
            <div
                class="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-[40rem_minmax(0,1fr)] lg:tw-items-start"
                aria-label="読み込み中"
                data-testid="train-location-skeleton"
            >
                <app-skeleton-bar
                    class="tw-h-[45px] tw-w-full tw-rounded-card lg:tw-col-start-2 lg:tw-row-start-1"
                ></app-skeleton-bar>
                <div
                    class="tw-flex tw-h-[calc(100dvh-48px)] tw-flex-col tw-gap-6 tw-overflow-hidden tw-rounded-card tw-bg-white tw-p-4 md:tw-h-[calc(100dvh-64px)] lg:tw-col-start-1 lg:tw-row-start-1"
                >
                    @for (row of skeletonStationRows; track row) {
                        <div class="tw-flex tw-shrink-0 tw-flex-row tw-items-center tw-gap-4">
                            <app-skeleton-bar
                                class="tw-h-4 tw-w-4 tw-shrink-0 tw-rounded-full"
                            ></app-skeleton-bar>
                            <app-skeleton-bar
                                class="tw-h-5 tw-w-24 tw-shrink-0"
                            ></app-skeleton-bar>
                            <app-skeleton-bar
                                class="tw-h-8 tw-w-28 tw-shrink-0"
                            ></app-skeleton-bar>
                        </div>
                    }
                </div>
            </div>
        } @else {
```

（`@else` の中は今の格子をそのまま。閉じ括弧を合わせる）

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest src/app/pages/train-location > .context/jest-loc.log 2>&1; grep -E "^Tests:|✕" .context/jest-loc.log`
Expected: 全件 PASS

- [ ] **Step 6: 整形・lint・コミット**

変えた 4 ファイルに 1 つずつ prettier。eslint はサンドボックス外。

コミットメッセージ: `fix: :bug: 列車位置情報の初回読み込み中は駅のパネルと路線図に骨組みを出す`

---

### Task 4: 計測・目視・design.md（メインの Opus が行う）

**Files:**
- Modify: `docs/design.md`（全線時刻表・過去の運用・列車位置情報の各「ロック後の改訂」の末尾）

- [ ] **Step 1: jest 全件**

Run: `npx jest > .context/jest-all.log 2>&1; grep -E "^Tests:|^Test Suites:" .context/jest-all.log`
Expected: 全件 PASS

- [ ] **Step 2: 手元の CLS を測る**

PR1 の計画の Task 6 Step 2 のスクリプトで、`paths` を次にする。各 3 回 × 2 幅。

- `/timetable/all-line;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_direction=0`
- `/operation/past-time;reference_date=2026-10-22;days=7`
- `/train-location`

Expected: 3 ページとも両方の幅で 0.1 未満。直す前（本番）は 全線 0.46/0.29・過去 0.30/0.21・位置情報 0.13/0.08。

- [ ] **Step 3: 読み込み後の寸法を本番と比べる**

`getBoundingClientRect()` を手元と本番で 390×844 と 1440×900 で比べ、一致すること。

- 全線: `app-timetable-all-line-route-filter app-control-band`・`app-timetable-all-line-table`・`app-timetable-search-card`
- 過去: `app-control-band`・`app-operation-past-time-table`・`app-operation-search-card`
- 位置情報: `app-control-band`・`app-train-location-station-panel`・`app-train-location-line`・`footer`

- [ ] **Step 4: 骨組みを撮ってユーザーに見せる**

データの取得を止めた状態を 390×844 と 1440×900 で撮る（`.context/skeleton-<page>-<width>.png`）。止め方:

- 全線: `**/v3/trip-blocks**` を止める
- 過去: `**/v3/operation-sightings**` を止める（取れなければ `layout-shift` の対象を見て止める URL を選び直す）
- 位置情報: `**/v3/trip-blocks**` を止める

骨組みと本物で上下の位置がそろうことを確かめ、ユーザーに見せて意見をもらう。

- [ ] **Step 5: design.md に改訂を書き足す**

数字は Step 2 の結果で埋める。

全線時刻表:

```markdown
-   2026-10-22 — 取る前は路線の絞り込みの操作帯をチップの形の骨組みで先に出し、表の場所に本物と同じ並び
    （ダイヤの帯・ページ送り・スクロールの箱の高さ）で骨組みを出す。以前は trip-blocks を取り終えるまで絞り込みと
    表を出さず、届くと検索カードを押し出していた（CLS スマホ 0.46・PC 0.29 → <Step 2 の値>）。ダイヤ・方向を
    変えたときも骨組みに戻る。編集・削除の後の取り直しは表を出したまま差し替える。読み込みが終わった後の見た目は変えていない
```

過去の運用情報:

```markdown
-   2026-10-22 — 取る前は表の場所に、本物のスクロールの箱と同じ高さで編成の列と日付の列の骨組みを出す。
    以前は表が途中の高さで一度出てから伸び、検索カードを押し出していた（CLS スマホ 0.30・PC 0.21 → <Step 2 の値>）。
    読み込みが終わった後の見た目は変えていない
```

列車位置情報:

```markdown
-   2026-10-22 — 取る前は本文の場所に、駅のパネルと路線図のカード（画面 1 枚分）の骨組みを出す。以前は本文が空で
    フッターが見えていて、届くと押し出されていた（CLS スマホ 0.13・PC 0.08 → <Step 2 の値>）。取得中に本文を
    消すのもやめた（路線・ダイヤを変えたときは骨組みに戻る）。読み込みが終わった後の見た目は変えていない
```

- [ ] **Step 6: コミット**

```bash
git add docs/design.md
git diff --cached --stat
git commit   # サンドボックス外
```

コミットメッセージ: `docs: :memo: 全線時刻表・過去の運用情報・列車位置情報の骨組みをロック後の改訂に書き足す`

---

### Task 5: レビューと PR（メインの Opus が行う）

- [ ] **Step 1:** Sonnet のサブエージェントにブランチ全体をレビューさせ、見つかった点を直す
- [ ] **Step 2:** master の最新を取り、`git log --oneline origin/master..HEAD` で差分を確かめる
- [ ] **Step 3:** push して PR を作る

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u https://github.com/kaito3desuyo/sotetsu-lab-v3-client.git fix/initial-skeleton-2
gh pr create --repo kaito3desuyo/sotetsu-lab-v3-client --base master --head fix/initial-skeleton-2 --title "fix: :bug: 全線時刻表・過去の運用情報・列車位置情報の初回読み込みに骨組みを出す" --body-file -
```

本文: 何を直したか・前と後の CLS の表・確かめたこと・残り（PR3 のページ）。末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)` と空行と `https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`。
