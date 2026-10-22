# 初回読み込みの骨組み PR3（列車ダイヤグラム・列車情報の入力・ダッシュボード） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 残りの 3 ページで、取る前に本物と同じ高さの骨組みを出す。列車ダイヤグラムは図の駅の行が後から動くのを、列車情報の入力はダイヤの帯と入力の格子が後から入って押し下げるのをなくす。ダッシュボードは骨組みの棒を共通部品に寄せるだけ（形は変えない）。

**Architecture:** PR1（#263）・PR2（#264）と同じ。取ったかどうかは各ページのストアの `hasFetched…` で見分け、`fetchData()` の始めで `false`、終わりで（失敗しても）`true`。世代番号はファイル単位の `let fetchSeq = 0;`（PR2 のレビューで、コンポーネントのフィールドだとページを離れてすぐ戻ったときに前のインスタンスの取得が骨組みを消すと分かった）。骨組みの形は本番で測った寸法に合わせる。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、Elf ストア、Tailwind（`tw-` 接頭辞・preflight 無効）、Jest（`npx jest <path>`）、Playwright MCP（計測）

**Spec:** `docs/superpowers/specs/2026-10-22-initial-skeleton-design.md`（PR2 の計画 `docs/superpowers/plans/2026-10-22-initial-skeleton-pr2.md` と、master の PR2 の実装 `src/app/pages/timetable/timetable-all-line/` も読むこと。`let fetchSeq` とテストの形はそこにある）

## Global Constraints

- 骨組みは `app-skeleton-bar`（`src/app/shared/skeleton/skeleton-bar.component.ts`）で組む。新しい共通部品は作らない
- 骨組みを包む要素に `aria-label="読み込み中"` と `data-testid` を付ける
- テンプレートの順: `@if (取る前) { 骨組み } @else if (0 件) { app-empty-state } @else { 本物 }`
- 世代番号はファイル先頭（`XxxStore.resetLoading();` の直後）の `let fetchSeq = 0;`。`const seq = ++fetchSeq;`・`if (seq === fetchSeq)`
- コンストラクタの始めでフラグを `false` に戻す（ストアは訪問をまたいで残る）
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
- Bash でパイプ（`|`）をつながない。git stash・rebase・reset --hard・push はしない
- 「直す前に落ちる」は実際に流して確かめる。テストを書いた直後に実装前の状態で流し、落ちた行を報告に書く
- Playwright のコンソールログ（`.playwright-mcp/console-*.log`）は読まない（ws のトークンが入っている）

## 本番の寸法と読み込み中の動き（2026-10-22・390×844 / 1440×900）

| ページ | 見えたこと |
|---|---|
| 列車ダイヤグラム | CLS 0.05 / 0.02。図のカードの大きさは変わらない（`main` が画面の高さに固定）。約 3.6 秒で図の左の駅名（`div.tw-absolute.tw-truncate`）が下へ 48〜76px 動く。駅の行の間隔が列車のデータから決まるため。凡例は高さ 33px の 1 行のまま、項目（出庫・入庫・別の運用へ・から）が「現在時刻」の前に後から入り、横に押す |
| 列車ダイヤグラム | 図のカード: x 12・幅 画面−24・スマホ y 385 高さ 447 / PC y 279 高さ 609。駅名の列は幅 88px |
| 列車情報の入力（登録） | CLS 0.046 / 0.061。ダイヤの帯（48px）が後から上に入り全体を押し下げる。駅が届くと入力の格子が 375→1,523px に伸び、PC では下のボタンの行が画面の外へ押し出される |
| 列車情報の入力（更新） | CLS 0.07 / 0.061。上と同じ。加えて表の行が入れ替わる |
| 列車情報の入力（コピー） | CLS 0.063 / 0.073。上と同じ。加えて「コピー元: …」の行（32px）が後から入る |
| 列車情報の入力の寸法 | カード `article`（`p-4 gap-4`）の中: ダイヤの帯 48（`-mx-4 -mt-4`）→ 路線で絞り込み 44 →（登録・コピーだけ）初期値の取り込み スマホ 192 / PC 120（コピーは コピー元の行の分 +32 で 224 / 152）→（登録・コピーだけ）列車個別保存の行 スマホ 68 / PC 48 → フォーム（スマホは前後の列車の行 48＋格子＋下の操作バー 61、PC は格子＋ボタンの行 36）。格子の行は 1 行目 57・以降 65 |
| ダッシュボード | CLS 0.02 / 0。骨組みあり。今回は棒を `app-skeleton-bar` に寄せるだけ |

列車情報の入力はログインなしで開ける（保存はしない）。計測用の URL:

- 登録 `/timetable/add;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_direction=0`
- 更新 `/timetable/update;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_direction=0;trip_block_id=782f1898-9d48-43e2-b5fc-06d5841b5520`
- コピー `/timetable/copy;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_block_id=782f1898-9d48-43e2-b5fc-06d5841b5520`

## Review Focus

1. 列車ダイヤグラムで路線・方向だけを変えた（`fetchData({ refetchTripBlocks: false })`） — 骨組みに戻らず図を出したまま（Task 1 のテスト）。その取得が先に終わっても、ダイヤを変えた取得が終わるまでは骨組みのまま（Task 1 のテスト）
2. 列車情報の入力の下書きの復元 — 取り終えてから案内を出すので、フォームの部品が骨組みの後に作られても復元できる（Task 2 のテスト）
3. 列車情報の入力の更新で、取り終えたフォームに既存の列車が入る — フォームの部品が後から作られても、`effect` が入力値から作り直す（Task 2 のテスト）
4. 取得が失敗したとき — 骨組みが出たまま止まらない（各タスクの失敗のテスト）
5. ダッシュボードの「読み込み中」の読み上げ — `app-skeleton-bar` は `aria-hidden` なので、`aria-label` は包む要素に移す（Task 3）

---

## File Structure

| ファイル | 役目 |
|---|---|
| Modify `src/app/pages/train-diagram/stores/train-diagram.store.ts` | `hasFetchedTrainDiagram` |
| Modify `src/app/pages/train-diagram/train-diagram.component.{ts,html,spec.ts}` | 図の骨組み・凡例に読み込み中を渡す |
| Modify `src/app/pages/train-diagram/components/train-diagram-legend/*` | 項目の代わりの骨組み |
| Modify `src/app/pages/timetable/timetable-edit-form/stores/timetable-edit-form.store.ts` | `hasFetchedEditForm` |
| Modify `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.{ts,html,spec.ts}` | フォームの骨組み |
| Modify `src/app/pages/dashboard/components/dashboard-status-card/*` | 棒を `app-skeleton-bar` に |
| Modify `src/app/pages/dashboard/components/dashboard-latest-sightings/*` | 棒を `app-skeleton-bar` に |
| Modify `docs/design.md` | 3 ページの「ロック後の改訂」 |

---

### Task 1: 列車ダイヤグラム

**Files:**
- Modify: `src/app/pages/train-diagram/stores/train-diagram.store.ts`
- Modify: `src/app/pages/train-diagram/train-diagram.component.ts`
- Modify: `src/app/pages/train-diagram/train-diagram.component.html`
- Modify: `src/app/pages/train-diagram/train-diagram.component.spec.ts`
- Modify: `src/app/pages/train-diagram/components/train-diagram-legend/train-diagram-legend.component.ts`
- Modify: `src/app/pages/train-diagram/components/train-diagram-legend/train-diagram-legend.component.html`
- Modify: `src/app/pages/train-diagram/components/train-diagram-legend/train-diagram-legend.component.spec.ts`（無ければ作る）

**Interfaces:**
- Produces: `TrainDiagramStore.setHasFetchedTrainDiagram(value: boolean): void`・`hasFetchedTrainDiagram$: Observable<boolean>`・`TrainDiagramLegendComponent.loading = input<boolean>(false)`

`fetchData(flags)` はコンストラクタの `paramMap` の購読から呼ばれる。ダイヤが変わったとき（と初回）は `refetchTripBlocks: true`、路線・方向だけが変わったときは `false`。列車を取り直すときだけ骨組みに戻す。

- [ ] **Step 1: 失敗するテストを書く（ページ）**

`train-diagram.component.spec.ts` の最初の `describe` の `afterEach`（無ければ足す）で `TrainDiagramStore.setHasFetchedTrainDiagram(false);`。「ロード中はプログレスバーだけを出し、スピナーは出さない」はそのまま残す。`describe` の中の末尾に足す（既存の setup の書き方に合わせる。サービスのスタブの `fetchTripBlocks` を `Subject` に差し替えて終わりを操る）:

```ts
    it('列車を取り終わるまでは図の代わりに骨組みを出し、空表示も出さない', () => {
        TrainDiagramStore.setHasFetchedTrainDiagram(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-train-diagram-chart')).toBeNull();
        expect(el.querySelector('app-empty-state')).toBeNull();
    });

    it('取り終えたら骨組みを消して図を出す', () => {
        TrainDiagramStore.setHasFetchedTrainDiagram(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-skeleton"]'),
        ).toBeNull();
    });

    it('列車の取得が失敗しても骨組みを消す', async () => {
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () =>
            throwError(() => new Error('fetch failed'));

        await component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('路線・方向だけを変えた取得では骨組みに戻さない', async () => {
        await component.fetchData({ refetchTripBlocks: true });
        const pending = new Subject<undefined>();
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () => pending;

        void component.fetchData({ refetchTripBlocks: false });

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(true);
    });

    it('ダイヤを変えた取得の途中で路線だけの取得が先に終わっても、骨組みのまま', async () => {
        await component.fetchData({ refetchTripBlocks: true });
        const pending = new Subject<undefined>();
        const service = TestBed.inject(TrainDiagramService) as {
            fetchTripBlocks: () => unknown;
        };
        service.fetchTripBlocks = () => pending;

        void component
            .fetchData({ refetchTripBlocks: true })
            .catch(() => undefined);
        await component.fetchData({ refetchTripBlocks: false });

        expect(
            await firstValueFrom(TrainDiagramStore.hasFetchedTrainDiagram$),
        ).toBe(false);
    });
```

サービスのクラス名・import は spec の既存の書き方に合わせる（`TrainDiagramService` でなければその名前に）。`Subject`・`firstValueFrom`・`throwError` の import を足す。

ページを離れてすぐ戻ったときのテストも 1 本足す（PR2 の `timetable-all-line.component.spec.ts` の「ページを離れてすぐ戻ったとき…」と同じ形）。1 つ目のインスタンスが `fetchTripBlocks` を購読するまで待ってから destroy し、2 つ目を作り、1 つ目の Subject を後から終わらせても `hasFetchedTrainDiagram` は `false` のまま。2 つ目が終わったら `true`。

- [ ] **Step 2: 失敗するテストを書く（凡例）**

```ts
describe('TrainDiagramLegendComponent の読み込み中', () => {
    let fixture: ComponentFixture<TrainDiagramLegendComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramLegendComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(TrainDiagramLegendComponent);
    });

    it('読み込み中は項目の代わりに棒を出し、現在時刻の見本は残す', () => {
        fixture.componentRef.setInput('loading', true);
        fixture.componentRef.setInput('showCurrentTimeCursor', true);
        fixture.componentRef.setInput('hasDepotOut', true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-legend-skeleton"]'),
        ).not.toBeNull();
        expect(el.textContent).not.toContain('出庫');
        expect(el.textContent).toContain('現在時刻');
    });

    it('読み込みが終わったら棒を消して項目を出す', () => {
        fixture.componentRef.setInput('loading', false);
        fixture.componentRef.setInput('hasDepotOut', true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="train-diagram-legend-skeleton"]'),
        ).toBeNull();
        expect(el.textContent).toContain('出庫');
    });
});
```

- [ ] **Step 3: 落ちることを確かめる**

Run: `npx jest src/app/pages/train-diagram > .context/jest-diagram.log 2>&1; grep -E "^Tests:|✕" .context/jest-diagram.log`
Expected: 新しいテストが FAIL

- [ ] **Step 4: ストアにフラグを足す**

`train-diagram.store.ts`: `StoreProps` に `hasFetchedTrainDiagram: boolean;`・初期値 `false`。`persistState` の対象には**入れない**（保存しているのは操作帯の開閉だけ）。

```ts
    /** いまのダイヤの列車を取り終えたか（失敗しても true）。取る前は図の代わりに骨組みを出す */
    setHasFetchedTrainDiagram(value: boolean): void {
        store.update(setProp('hasFetchedTrainDiagram', () => value));
    },
```

```ts
    hasFetchedTrainDiagram$: store.pipe(
        select((state) => state.hasFetchedTrainDiagram),
    ),
```

- [ ] **Step 5: ページを直す**

`train-diagram.component.ts`:

- ファイル先頭の `TrainDiagramStore.resetLoading();` の直後に:

```ts
// 列車を取り直す取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
// 後から終わって新しい骨組みを消さないよう、インスタンスでなくファイル単位で数える
let fetchSeq = 0;
```

- フィールド:

```ts
    readonly hasFetchedTrainDiagram = toSignal(
        TrainDiagramStore.hasFetchedTrainDiagram$,
        { initialValue: false },
    );
    /** 骨組みの駅の行の数（画面 1 枚分を埋める数。あふれた分はカードが隠す） */
    readonly skeletonStationRows = Array.from({ length: 16 }, (_, i) => i);
```

- コンストラクタの始めに `TrainDiagramStore.setHasFetchedTrainDiagram(false);`（コメント: ストアは訪問をまたいで残る）
- `fetchData()`:

```ts
    async fetchData(flags: { refetchTripBlocks: boolean }): Promise<void> {
        // 路線・方向だけの取得は世代を進めず、骨組みにも触らない（図を出したまま）
        const seq = flags.refetchTripBlocks ? ++fetchSeq : fetchSeq;
        TrainDiagramStore.enableLoading();
        if (flags.refetchTripBlocks) {
            TrainDiagramStore.setHasFetchedTrainDiagram(false);
        }

        try {
            // （中身は今のまま）
        } finally {
            TrainDiagramStore.disableLoading();
            // 列車を取り直した取得のうち、いちばん新しいものだけが骨組みを消す
            if (flags.refetchTripBlocks && seq === fetchSeq) {
                TrainDiagramStore.setHasFetchedTrainDiagram(true);
            }
        }
    }
```

- `isEmpty` の `if (this.isLoading()) return false;` を `if (!this.hasFetchedTrainDiagram()) return false;` にする（路線・方向を変えた直後に空表示がちらつかないのは今と同じ。取る前に「ありません」と判定しない）

`train-diagram.component.html`:

- `app-train-diagram-legend` に `[loading]="!hasFetchedTrainDiagram()"` を足す
- 図のカードの中の `@if (isEmpty()) {` の前に分岐を足す（`@if` → `@else if`）:

```html
        @if (!hasFetchedTrainDiagram()) {
            <!-- 取る前は図と同じ白いカードに、駅名の列（88px）と駅の行の骨組みを出す。
                 以前は駅の行が先に出て、列車が届くと行の間隔が変わって下へ動いていた（CLS 0.05・2026-10-22） -->
            <div
                class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-6 tw-overflow-hidden tw-rounded-card tw-bg-white tw-p-3"
                aria-label="読み込み中"
                data-testid="train-diagram-skeleton"
            >
                @for (row of skeletonStationRows; track row) {
                    <div
                        class="tw-flex tw-shrink-0 tw-flex-row tw-items-center tw-gap-3"
                    >
                        <app-skeleton-bar
                            class="tw-h-3 tw-w-[88px] tw-shrink-0"
                        ></app-skeleton-bar>
                        <app-skeleton-bar
                            class="tw-h-px tw-flex-1"
                        ></app-skeleton-bar>
                    </div>
                }
            </div>
        } @else if (isEmpty()) {
```

- `imports` に `SkeletonBarComponent` を足す

- [ ] **Step 6: 凡例を直す**

`train-diagram-legend.component.ts`: `imports: [SkeletonBarComponent]`、`readonly loading = input<boolean>(false);`（コメント: 列車を取る前は、後から増える項目の代わりに棒を出す）

`train-diagram-legend.component.html`: 回送・出庫・入庫・別の運用へ・から の 4 つの `@if` を `@if (loading()) { 骨組み } @else { 今の 4 つ }` で包む。現在時刻の項目は外に残す（今日のダイヤなら取る前から出ている）。骨組み:

```html
    @if (loading()) {
        <span
            class="tw-flex tw-items-center tw-gap-4"
            aria-label="読み込み中"
            data-testid="train-diagram-legend-skeleton"
        >
            <app-skeleton-bar class="tw-h-4 tw-w-10"></app-skeleton-bar>
            <app-skeleton-bar class="tw-h-4 tw-w-10"></app-skeleton-bar>
            <app-skeleton-bar class="tw-h-4 tw-w-28"></app-skeleton-bar>
        </span>
    } @else {
        （今の 4 つの @if をそのまま）
    }
```

（出庫 40px・入庫 40px・別の運用へ・から 112px の幅に近い棒。高さ 16px は項目と同じなので凡例の高さは変わらない）

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest src/app/pages/train-diagram > .context/jest-diagram.log 2>&1; grep -E "^Tests:|✕" .context/jest-diagram.log`
Expected: 全件 PASS

- [ ] **Step 8: 整形・lint・コミット**

コミットメッセージ: `fix: :bug: 列車ダイヤグラムの初回読み込み中は図と凡例の項目に骨組みを出す`

---

### Task 2: 列車情報の入力（登録・コピー・更新）

**Files:**
- Modify: `src/app/pages/timetable/timetable-edit-form/stores/timetable-edit-form.store.ts`
- Modify: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.ts`
- Modify: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.html`
- Modify: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts`

**Interfaces:**
- Produces: `TimetableEditFormStore.setHasFetchedEditForm(value: boolean): void`・`hasFetchedEditForm$: Observable<boolean>`

`app-timetable-edit-form-trips` は `effect` で入力値（駅・列車・モード等）からフォームを作り直す。下書きの案内（`#proposeDraftRestoreIfAny()`）は `fetchData()` の `finally` の後に出る。だから、取り終えてからフォームの部品を出しても、初期化と下書きの復元は今どおり動く。

- [ ] **Step 1: 失敗するテストを書く**

`timetable-edit-form.component.spec.ts` の `afterEach` に `TimetableEditFormStore.setHasFetchedEditForm(false);`。`describe` の中の末尾に足す（既存の setup・サービスのスタブの書き方に合わせる。`fetchStations` 等を `Subject` に差し替えて終わりを操る）:

```ts
    it('取り終わるまではフォームの代わりに骨組みを出す', () => {
        TimetableEditFormStore.setHasFetchedEditForm(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="edit-form-skeleton"]'),
        ).not.toBeNull();
        expect(el.querySelector('app-timetable-edit-form-trips')).toBeNull();
    });

    it('取り終えたら骨組みを消してフォームを出す', async () => {
        await component.fetchData();
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="edit-form-skeleton"]')).toBeNull();
        expect(
            el.querySelector('app-timetable-edit-form-trips'),
        ).not.toBeNull();
    });

    it('取得が失敗しても骨組みを消す', async () => {
        // 既存の「取得に失敗しても読み込み中を解く」と同じ失敗のさせ方にする
        // （そのテストの最後で hasFetchedEditForm$ が true になることも確かめる形にしてよい）
    });

    it('更新のときは初期値の取り込みと列車個別保存の行の骨組みを出さない', () => {
        TimetableEditFormStore.setMode(ETimetableEditFormMode.UPDATE);
        TimetableEditFormStore.setHasFetchedEditForm(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(
            el.querySelector('[data-testid="edit-form-skeleton-initial-value"]'),
        ).toBeNull();
    });

    it('登録のときは初期値の取り込みの骨組みを出す', () => {
        TimetableEditFormStore.setMode(ETimetableEditFormMode.ADD);
        TimetableEditFormStore.setHasFetchedEditForm(false);
        fixture.detectChanges();

        expect(
            (fixture.nativeElement as HTMLElement).querySelector(
                '[data-testid="edit-form-skeleton-initial-value"]',
            ),
        ).not.toBeNull();
    });
```

「取得が失敗しても骨組みを消す」は、既存の「取得に失敗しても読み込み中を解く」（spec の 154 行付近）を読み、同じ失敗のさせ方で `hasFetchedEditForm$` が `true` になることを確かめる中身を書く（空のまま残さない）。

ページを離れてすぐ戻ったときのテストも 1 本足す（PR2 の `timetable-all-line.component.spec.ts` と同じ形）。

既存の「下書きの復元の案内」の describe が、フォームの部品があることを前提にしているなら、`fetchData()` を終わらせてから（またはフラグを `true` にしてから）確かめるよう直す（期待値は変えない）。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts > .context/jest-edit.log 2>&1; grep -E "^Tests:|✕" .context/jest-edit.log`
Expected: 新しいテストが FAIL

- [ ] **Step 3: ストアにフラグを足す**

`timetable-edit-form.store.ts`: `StoreProps` に `hasFetchedEditForm: boolean;`・初期値 `false`。

```ts
    /** 駅・路線・ダイヤ・（更新とコピーは）元の列車を取り終えたか（失敗しても true）。取る前はフォームの代わりに骨組みを出す */
    setHasFetchedEditForm(value: boolean): void {
        store.update(setProp('hasFetchedEditForm', () => value));
    },
```

```ts
    hasFetchedEditForm$: store.pipe(select((s) => s.hasFetchedEditForm)),
```

`resetForNewSession()` が全部の値を初期値に戻すなら、そこで `hasFetchedEditForm` も `false` に戻ってよい（戻る作りか読んで確かめ、報告に書く）。

- [ ] **Step 4: ページを直す**

`timetable-edit-form.component.ts`:

- ファイル先頭の `TimetableEditFormStore.resetLoading();` の直後に `let fetchSeq = 0;`（Task 1 と同じコメント）
- フィールド:

```ts
    readonly hasFetchedEditForm = toSignal(
        TimetableEditFormStore.hasFetchedEditForm$,
        { initialValue: false },
    );
    readonly EMode = ETimetableEditFormMode;
    /** 骨組みの格子の行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonGridRows = Array.from({ length: 14 }, (_, i) => i);
```

- コンストラクタの始めに `TimetableEditFormStore.setHasFetchedEditForm(false);`
- `fetchData()` の `TimetableEditFormStore.enableLoading();` の前に `const seq = ++fetchSeq;`、直後に `TimetableEditFormStore.setHasFetchedEditForm(false);`。`finally` を:

```ts
        } finally {
            TimetableEditFormStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === fetchSeq) {
                TimetableEditFormStore.setHasFetchedEditForm(true);
            }
        }
```

- `imports` に `SkeletonBarComponent`

`timetable-edit-form.component.html` の `<main>` の中を次にする:

```html
    @if (!hasFetchedEditForm()) {
        <!-- 取る前は本物のカードと同じ並びで骨組みを出す: ダイヤの帯 48・路線で絞り込み 44・
             （登録とコピーは）初期値の取り込み・列車個別保存の行・入力の格子（画面 1 枚分）。
             以前はダイヤの帯が後から上に入り、駅が届くと格子が伸びて下のボタンを押し出していた
             （CLS 0.05〜0.07・2026-10-22） -->
        <article
            class="tw-flex tw-flex-col tw-gap-4 tw-overflow-clip tw-rounded-card tw-bg-white tw-p-4"
            aria-label="読み込み中"
            data-testid="edit-form-skeleton"
        >
            <app-skeleton-bar
                class="-tw-mx-4 -tw-mt-4 tw-h-12 tw-rounded-none"
            ></app-skeleton-bar>
            <app-skeleton-bar class="tw-h-11 tw-w-full"></app-skeleton-bar>
            @if (mode() !== EMode.UPDATE) {
                <app-skeleton-bar
                    data-testid="edit-form-skeleton-initial-value"
                    class="tw-w-full tw-rounded-card"
                    [class]="
                        mode() === EMode.COPY
                            ? 'tw-h-[224px] sm:tw-h-[152px]'
                            : 'tw-h-[192px] sm:tw-h-[120px]'
                    "
                ></app-skeleton-bar>
                <app-skeleton-bar
                    class="tw-h-[68px] tw-w-full sm:tw-h-12"
                ></app-skeleton-bar>
            }
            <div
                class="tw-flex tw-h-[calc(100dvh-48px)] tw-flex-col tw-gap-2 tw-overflow-hidden md:tw-h-[calc(100dvh-64px)]"
            >
                @for (row of skeletonGridRows; track row) {
                    <div
                        class="tw-flex tw-h-[57px] tw-shrink-0 tw-flex-row tw-items-center tw-gap-2"
                    >
                        <app-skeleton-bar
                            class="tw-h-5 tw-w-24 tw-shrink-0"
                        ></app-skeleton-bar>
                        <app-skeleton-bar
                            class="tw-h-10 tw-flex-1"
                        ></app-skeleton-bar>
                    </div>
                }
            </div>
        </article>
    } @else {
        <app-timetable-edit-form-trips
            ...（今の属性とイベントをそのまま）
        ></app-timetable-edit-form-trips>
    }
```

（`...` の所は今のテンプレートの `app-timetable-edit-form-trips` の属性 16 個とイベント 7 個をそのまま移す。省略しない）

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest src/app/pages/timetable/timetable-edit-form > .context/jest-edit.log 2>&1; grep -E "^Tests:|✕" .context/jest-edit.log`
Expected: 全件 PASS

- [ ] **Step 6: 整形・lint・コミット**

コミットメッセージ: `fix: :bug: 列車情報の入力の初回読み込み中はフォームの並びで骨組みを出す`

---

### Task 3: ダッシュボードの棒を共通部品に寄せる

**Files:**
- Modify: `src/app/pages/dashboard/components/dashboard-status-card/dashboard-status-card.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/dashboard/components/dashboard-latest-sightings/dashboard-latest-sightings.component.{ts,html,spec.ts}`

形・大きさ・並びは変えない。`<span class="… tw-animate-pulse tw-rounded-control tw-bg-paper-3 motion-reduce:tw-animate-none">` を `<app-skeleton-bar>` にし、大きさの class（`tw-h-5 tw-w-8` 等）だけを残す。

- [ ] **Step 1: 書き換える**

最新の目撃情報（`dashboard-latest-sightings.component.html`）の 3 本:

```html
                    <app-skeleton-bar class="tw-h-5 tw-w-8"></app-skeleton-bar>
                    <app-skeleton-bar class="tw-h-5 tw-w-14"></app-skeleton-bar>
                    <app-skeleton-bar
                        class="tw-h-5 tw-flex-grow"
                    ></app-skeleton-bar>
```

今日の状況（`dashboard-status-card.component.html`）の 3 か所。`app-skeleton-bar` は `aria-hidden="true"` なので、`aria-label="読み込み中"` は包む要素に移す:

- ダイヤ名の所: `<span class="tw-inline-block" aria-label="読み込み中"><app-skeleton-bar class="tw-h-6 tw-w-24"></app-skeleton-bar></span>`
- 数の 2 か所: `<div aria-label="読み込み中"><app-skeleton-bar class="tw-h-9 tw-w-12"></app-skeleton-bar></div>`

両方の ts の `imports` に `SkeletonBarComponent`。

- [ ] **Step 2: テストを合わせる**

`dashboard-status-card.component.spec.ts` の `'.tw-animate-pulse[aria-label="読み込み中"]'` を `'[aria-label="読み込み中"] app-skeleton-bar'` にする（数は今と同じ 3）。`dashboard-latest-sightings.component.spec.ts` の `.tw-animate-pulse` は `app-skeleton-bar` のホストに付くので、そのまま通るか確かめる（通らなければ `app-skeleton-bar` で数える）。

Run: `npx jest src/app/pages/dashboard > .context/jest-dashboard.log 2>&1; grep -E "^Tests:|✕" .context/jest-dashboard.log`
Expected: 全件 PASS

- [ ] **Step 3: 整形・lint・コミット**

コミットメッセージ: `refactor: :recycle: ダッシュボードの骨組みの棒を共通部品に寄せる`

---

### Task 4: 計測・目視・design.md（メインの Opus が行う）

- [ ] jest 全件
- [ ] 手元の CLS（各 3 回 × 2 幅）: `/train-diagram`・入力の 3 つの URL・`/`。目標は 0.1 未満、列車ダイヤグラムとダッシュボードは今の値（0.05/0.02・0.02/0）を上回らない
- [ ] 読み込み後の寸法を本番と比べる: 列車ダイヤグラム（`app-train-diagram-legend`・`app-train-diagram-chart`）、入力（`app-timetable-edit-form-trips article` とその子）、ダッシュボード（`app-dashboard-status-card`・`app-dashboard-latest-sightings`）
- [ ] 骨組みを撮ってユーザーに見せる（列車ダイヤグラム: `**/v3/trip-blocks**`、入力: `**/v3/stations**` か `layout-shift` で選ぶ）
- [ ] design.md の 3 ページ（列車ダイヤグラム・列車情報の入力・ダッシュボード）の「ロック後の改訂」に書き足す
- [ ] コミット: `docs: :memo: 列車ダイヤグラム・列車情報の入力・ダッシュボードの骨組みをロック後の改訂に書き足す`

### Task 5: レビューと PR（メインの Opus が行う）

- [ ] Sonnet にブランチ全体をレビューさせ、直す
- [ ] サブエージェントが書いた「直す前に落ちる」テストは、直す前の実装に戻して自分で流して確かめる
- [ ] push して PR を作る（`fix/initial-skeleton-3`）
