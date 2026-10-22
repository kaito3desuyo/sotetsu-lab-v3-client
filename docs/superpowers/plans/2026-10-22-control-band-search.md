# 検索カードを操作帯に寄せる Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トップ以外のページから検索カード・投稿カードを消し、操作をヘッダー下の操作帯（`app-control-band`）と右下の投稿ボタンに集める。あわせて前後の駅／運用への送り・今日のダイヤ・投稿の先入れを足す。

**Architecture:** 各ページの帯の中身を増やす（帯の部品に要約の行への差し込み口は足さない。2026-10-22 ユーザー指示で取りやめ）。新しい共有部品は 4 つ（前後へ送る `app-step-nav`・今日 `app-today-calendar-button`・貼り付く上り下り `app-sticky-direction-toggle`・投稿ダイアログ `app-operation-post-dialog`）。投稿フォームはカードから `app-operation-post-form` に切り出し、トップのカードとダイアログで共用する。

**Tech Stack:** Angular 22（standalone・signals・OnPush）、Angular Material（M2）、Tailwind（`tw-` 接頭辞）、jest 30。

**Spec:** `docs/superpowers/specs/2026-10-22-control-band-search-design.md`

## Global Constraints

- client だけを触る。API は変えない。
- トップ（`/`）の 5 枚のカードは見た目も動きも変えない。
- Material に部品があるものは Material を使う（`mat-stroked-button`・`mat-icon-button`・`mat-menu`・`MatDialog`・extended FAB）。素の button を作らない。
- class の切り替えは `[class]`／`[class.x]`。`[ngClass]` を使わない。
- 枠を付けるときは `tw-border-solid` を併記する。任意プロパティは `[prop:value]`（`tw-` を付けない）。
- 余白は 4px の倍数。帯の中は「上下 16・まとまりの間 16・ラベル→中身 8」。
- ダイヤの表記は `yyyy/M/d改正 ダイヤ名`。
- コミットは Conventional Commits＋絵文字（例: `feat: :sparkles: …`）。署名コミットなのでサンドボックスの外で `git commit` する。コミット後に `git log --show-signature -1` で署名を確かめる。
- テストは `npx jest --testPathPatterns="<パス>" > .context/jest.txt 2>&1` で流し、`.context/jest.txt` の `Tests:` 行を読む（`npm test` はサンドボックス内で全部落ちる・パイプで tail すると要約が消える）。
- prettier はファイル単位で（`npx prettier --write <ファイル>`）。ディレクトリ単位でかけない。
- 画面の確認（Playwright）は localhost を使うのでサンドボックス外。

## Review Focus

1. **分岐駅・端の駅の送り**: 二俣川は前 1・次 2、横浜（本線の起点）は前が無く押せない。同じ駅 ID が 2 路線にある（目黒線と東横線の日吉〜田園調布）ときに同じ駅が二重に出ない。→ Task 2 のテスト。
2. **行路図でダイヤを替えたとき、同じ運用番号が無い**: 空の画面に戻り、帯のダイヤは選んだものが残る（今日のダイヤに巻き戻らない）。→ Task 7 のテスト。
3. **今日のダイヤが複数ある日**（臨時ダイヤ＋元のダイヤ）: どちらを見ていても「今日」は押せない。押すと先頭（`todaysCalendarId`）へ。→ Task 3 のテスト。
4. **投稿に成功したらダイアログが閉じ、失敗したら閉じない**（入力が消えない）。→ Task 9 のテスト。
5. **全線時刻表の貼り付きの切替と表の箱の高さ**: 【2026-10-22 ユーザー指示で取りやめ】全線時刻表は列車ダイヤグラムと同じ画面いっぱいの箱（`main` を `100dvh − ヘッダー`・manual の帯・ページはスクロールしない・切替は貼り付かない）にした。表の箱の高さは px の決め打ちをやめ、カードの `flex-1` で取る。→ Task 5 の注記。

---

## PR 1: 時刻表（駅別時刻表・全線時刻表）

### Task 0: 掟と ADR を先に書く

**Files:**
- Modify: `docs/design.md`（「操作カード（検索・投稿・ライブラリ）」節 321 行目あたり、「操作帯は貼り付き」段落 246 行目あたり、ロック済みページの節のうち検索カード・投稿カードに触れている行）
- Create: `docs/adr/0010-search-in-control-band.md`

- [ ] **Step 1: 操作カードの節を書き換える**

「単独配置」の箇条を次に置き換える。

```markdown
-   **検索カード・投稿カードはトップ（ダッシュボード）だけに置く**（ユーザー指示 2026-10-22「検索フォーム等の操作系を、トップ画面を除いてカード形式からヘッダー下に寄せたい」）。
    他のページの操作は操作帯（`app-control-band`）に載せ、帯にすでにあるもの・サイドナビにあるリンクは足さない。
    リアルタイム運用情報の投稿は右下の固定ボタン（extended FAB「投稿する」）と投稿ダイアログ。
    行ごとの小さな投稿ボタンは運用番号（運用順）または所属と編成番号（編成順）を入れた状態で開く
```

- [ ] **Step 2: 「操作帯は貼り付き」の段落の後ろに 2 つの掟を足す**

```markdown
**前後へ送る**（`app-step-nav`・2026-10-22）。駅別時刻表は前後の駅、運用行路図は前後の運用へ送る。
帯の中は名前付き（「‹ 鶴ヶ峰」「希望ヶ丘 ›」）、要約の行はアイコンだけ（‹ ›）を「開く／畳む」の左に置き、畳んでも送れるようにする。
分岐駅は隣の駅を全部出す（二俣川は前 1・次 2）。要約の行でその向きの候補が 2 つ以上ならメニューで選ぶ。候補が無い向きは押せない。

**今日のダイヤ**（`app-today-calendar-button`・2026-10-22）。ダイヤの選択欄の右に「今日」。今日のダイヤ（`todaysCalendarIds` のどれか）を見ている間は押せない。
押すと今日の先頭のダイヤ（`todaysCalendarId`）を選んだときと同じ動きをする。
```

- [ ] **Step 3: ロック済みページの節の古い記述を直す**

`grep -n -e '検索カード' -e '投稿カード' docs/design.md` で出る行のうち、ロック済みページの節（397 行目以降）で「検索カードが下にある」ことを前提にしている文に、行末へ「（2026-10-22 に検索カードは操作帯へ寄せた。操作カードの節）」を足す。経緯の文は消さない。

- [ ] **Step 4: ADR を書く**

`docs/adr/0010-search-in-control-band.md`:

```markdown
# 0010. 検索カードをトップ専用にし、操作を操作帯にまとめる

- 日付: 2026-10-22
- 状態: 採用

## 背景

検索カード（時刻表を検索する・運用情報を検索する）は各ページの一番下にあり、長い表を見ていると条件を替えるのに最下部まで行く必要があった。
操作帯（ADR 0001）が全ページに載り、ページの条件の多くは帯で替えられるようになっていたため、カードの中身の大半は帯と重複していた。

## 決定

- トップ以外のページから検索カードを消す。帯に無い中身だけを帯に足す。リンク（リアルタイム／過去の運用情報）はサイドナビにあるので足さない。
- 前後の駅・運用へ送るボタン（`app-step-nav`）と今日のダイヤのボタン（`app-today-calendar-button`）を足す。送りは帯を開いたときの名前付きボタンだけにし、要約の行には置かない（2026-10-22 ユーザー指示で取りやめ。差し込み口は消した。要約の文が狭くなる）。
- リアルタイムの投稿カードを、右下の固定ボタン＋投稿ダイアログに替える。フォームは `app-operation-post-form` に切り出してトップのカードと共用する。

## 結果

- 下部のカードぶん各ページが短くなる。カードの導線（自己リンクの除外など）の掟は不要になる。
- 帯が背の高いページ（全線時刻表・運用行路図）ができる。scroll 型の帯なので、スクロールすれば要約の行（40px）だけ残る。
```

- [ ] **Step 5: コミット**

```bash
git add docs/design.md docs/adr/0010-search-in-control-band.md
git diff --cached --stat
git commit -m 'docs: :memo: 検索カードを操作帯に寄せる掟と ADR を書く'
git log --show-signature -1 --oneline
```

---

### Task 1: 帯の要約の行に差し込み口を足す

（2026-10-22 ユーザー指示で取りやめ。差し込み口は消した。以下は経緯として残す）

**Files:**
- Modify: `src/app/shared/control-band/control-band.component.html`
- Test: `src/app/shared/control-band/control-band.component.spec.ts`

**Interfaces:**
- Produces: 要約の行（`data-testid="control-band-bar"`）の「解除」と「開く／畳む」の間に、属性 `controlBandBarActions` を持つ子要素を差し込める。

- [ ] **Step 1: 失敗するテストを書く**

spec の末尾に足す。

```ts
@Component({
    template: `
        <app-control-band summary="要約">
            <p>中身</p>
            <span controlBandBarActions data-testid="bar-action">送る</span>
        </app-control-band>
    `,
    imports: [ControlBandComponent],
})
class BarActionsHostComponent {}

describe('ControlBandComponent の要約の行の差し込み口', () => {
    it('controlBandBarActions の要素は、操作部でなく要約の行の「開く／畳む」の前に出る', async () => {
        await TestBed.configureTestingModule({
            imports: [BarActionsHostComponent],
        }).compileComponents();
        const fixture = TestBed.createComponent(BarActionsHostComponent);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        const bar = el.querySelector('[data-testid="control-band-bar"]');
        const content = el.querySelector(
            '[data-testid="control-band-content"]',
        );
        const action = el.querySelector('[data-testid="bar-action"]');
        const toggle = el.querySelector('[data-testid="control-band-toggle"]');

        expect(bar?.contains(action)).toBe(true);
        expect(content?.contains(action)).toBe(false);
        expect(
            action!.compareDocumentPosition(toggle!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
```

spec の先頭の import に `Component` が無ければ `import { Component } from '@angular/core';` を足す。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="control-band.component.spec" > .context/jest.txt 2>&1`
Expected: `.context/jest.txt` に FAIL（`bar?.contains(action)` が false）

- [ ] **Step 3: 差し込み口を足す**

`control-band.component.html` の「解除」ボタンの `@if` ブロックの直後、`#toggleButton` の button の直前に入れる。

```html
        <!-- 要約の行に置く操作（前後へ送るなど）。畳んでも見えるので、読みながら使える（2026-10-22） -->
        <ng-content select="[controlBandBarActions]"></ng-content>
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns="control-band.component.spec" > .context/jest.txt 2>&1`
Expected: `Tests:` 行に failed が無い

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/app/shared/control-band/control-band.component.html src/app/shared/control-band/control-band.component.spec.ts
git add src/app/shared/control-band/control-band.component.html src/app/shared/control-band/control-band.component.spec.ts
git commit -m 'feat: :sparkles: 操作帯の要約の行に操作を差し込めるようにする'
```

---

### Task 2: 前後の駅を求める関数と、前後へ送る部品

**Files:**
- Modify: `src/app/shared/station-groups.util.ts`
- Test: `src/app/shared/station-groups.util.spec.ts`
- Create: `src/app/shared/step-nav/step-nav.component.ts`
- Create: `src/app/shared/step-nav/step-nav.component.html`
- Create: `src/app/shared/step-nav/step-target.type.ts`
- Test: `src/app/shared/step-nav/step-nav.component.spec.ts`

**Interfaces:**
- Produces:
  - `export interface StepTarget { id: string; label: string; }`（`step-target.type.ts`）
  - `export function findNeighborStations(groups: StationGroup[], stationId: string | null | undefined): { prev: StepTarget[]; next: StepTarget[] }`（`station-groups.util.ts`）
  - `app-step-nav`: `prev = input<StepTarget[]>([])`・`next = input<StepTarget[]>([])`・`step = output<StepTarget>()`（`variant`・`prevLabel`・`nextLabel` の compact は取りやめ。2026-10-22 ユーザー指示。以下の compact のテスト・実装コードは経緯として残す）

- [ ] **Step 1: 前後の駅の失敗するテストを書く**

`station-groups.util.spec.ts` に足す。

```ts
describe('findNeighborStations', () => {
    const st = (stationId: string, stationName: string) =>
        ({ stationId, stationName }) as StationDetailsDto;
    const groups: StationGroup[] = [
        {
            routeId: 'main',
            label: '相鉄 本線',
            stations: [
                st('yokohama', '横浜'),
                st('tsurugamine', '鶴ヶ峰'),
                st('futamatagawa', '二俣川'),
                st('kibogaoka', '希望ヶ丘'),
            ],
        },
        {
            routeId: 'izumino',
            label: '相鉄 いずみ野線',
            stations: [st('futamatagawa', '二俣川'), st('minamimakigahara', '南万騎が原')],
        },
        {
            routeId: 'toyoko',
            label: '東急 東横線',
            stations: [st('hiyoshi', '日吉'), st('tamagawa', '多摩川')],
        },
        {
            routeId: 'meguro',
            label: '東急 目黒線',
            stations: [st('hiyoshi', '日吉'), st('tamagawa', '多摩川')],
        },
    ];

    it('分岐駅は、駅を含む路線ごとの隣を全部返す', () => {
        expect(findNeighborStations(groups, 'futamatagawa')).toEqual({
            prev: [{ id: 'tsurugamine', label: '鶴ヶ峰' }],
            next: [
                { id: 'kibogaoka', label: '希望ヶ丘' },
                { id: 'minamimakigahara', label: '南万騎が原' },
            ],
        });
    });

    it('起点の駅は前が無い', () => {
        expect(findNeighborStations(groups, 'yokohama')).toEqual({
            prev: [],
            next: [{ id: 'tsurugamine', label: '鶴ヶ峰' }],
        });
    });

    it('同じ駅を持つ 2 路線で、同じ隣を二重に出さない', () => {
        expect(findNeighborStations(groups, 'hiyoshi')).toEqual({
            prev: [],
            next: [{ id: 'tamagawa', label: '多摩川' }],
        });
    });

    it('駅が無い・見つからないときは両方空', () => {
        expect(findNeighborStations(groups, null)).toEqual({ prev: [], next: [] });
        expect(findNeighborStations(groups, 'nowhere')).toEqual({ prev: [], next: [] });
    });
});
```

import に `findNeighborStations`・`StationGroup` と `StationDetailsDto`（`src/app/libs/station/usecase/dtos/station-details.dto`）を足す。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="station-groups.util.spec" > .context/jest.txt 2>&1`
Expected: FAIL（`findNeighborStations` が無い）

- [ ] **Step 3: 型と関数を書く**

`src/app/shared/step-nav/step-target.type.ts`:

```ts
/** 前後へ送る先 1 つ（駅・運用など）。 */
export interface StepTarget {
    id: string;
    label: string;
}
```

`station-groups.util.ts` の末尾に足す（import に `StepTarget` を足す）。

```ts
/**
 * 前後の駅（駅別時刻表の「前後へ送る」）。今の駅を含む路線ごとに、路線の中の 1 つ前と 1 つ後を取る。
 * 分岐駅は隣を全部返す（二俣川: 前 鶴ヶ峰／次 希望ヶ丘・南万騎が原）。駅 ID で重複を除く
 * （目黒線と東横線のように同じ駅を持つ路線で、同じ隣が二重に出ないように）。
 */
export function findNeighborStations(
    groups: StationGroup[],
    stationId: string | null | undefined,
): { prev: StepTarget[]; next: StepTarget[] } {
    const prev = new Map<string, StepTarget>();
    const next = new Map<string, StepTarget>();
    if (!stationId) return { prev: [], next: [] };

    for (const { stations } of groups) {
        const index = stations.findIndex((s) => s.stationId === stationId);
        if (index < 0) continue;
        const before = stations[index - 1];
        const after = stations[index + 1];
        if (before && !prev.has(before.stationId)) {
            prev.set(before.stationId, {
                id: before.stationId,
                label: before.stationName,
            });
        }
        if (after && !next.has(after.stationId)) {
            next.set(after.stationId, {
                id: after.stationId,
                label: after.stationName,
            });
        }
    }
    return { prev: [...prev.values()], next: [...next.values()] };
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns="station-groups.util.spec" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 5: 送る部品の失敗するテストを書く**

`src/app/shared/step-nav/step-nav.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepNavComponent } from './step-nav.component';
import { StepTarget } from './step-target.type';

describe('StepNavComponent', () => {
    let fixture: ComponentFixture<StepNavComponent>;
    const el = () => fixture.nativeElement as HTMLElement;
    const buttons = () =>
        Array.from(el().querySelectorAll('button')) as HTMLButtonElement[];

    const setup = async (
        prev: StepTarget[],
        next: StepTarget[],
        variant: 'full' | 'compact',
    ) => {
        await TestBed.configureTestingModule({
            imports: [StepNavComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(StepNavComponent);
        fixture.componentRef.setInput('prev', prev);
        fixture.componentRef.setInput('next', next);
        fixture.componentRef.setInput('variant', variant);
        fixture.detectChanges();
    };

    it('full は候補ごとに名前付きのボタンを出し、押すとその候補を流す', async () => {
        await setup(
            [{ id: 'a', label: '鶴ヶ峰' }],
            [
                { id: 'b', label: '希望ヶ丘' },
                { id: 'c', label: '南万騎が原' },
            ],
            'full',
        );
        const emitted: StepTarget[] = [];
        fixture.componentInstance.step.subscribe((t) => emitted.push(t));

        expect(buttons().map((b) => b.textContent?.trim())).toEqual([
            'chevron_left 鶴ヶ峰',
            '希望ヶ丘 chevron_right',
            '南万騎が原 chevron_right',
        ]);
        buttons()[2].click();
        expect(emitted).toEqual([{ id: 'c', label: '南万騎が原' }]);
    });

    it('compact は ‹ › の 2 つだけ。候補が 1 つならすぐ流す', async () => {
        await setup(
            [{ id: 'a', label: '鶴ヶ峰' }],
            [{ id: 'b', label: '希望ヶ丘' }],
            'compact',
        );
        const emitted: StepTarget[] = [];
        fixture.componentInstance.step.subscribe((t) => emitted.push(t));

        expect(buttons()).toHaveLength(2);
        expect(buttons()[0].getAttribute('aria-label')).toBe('前: 鶴ヶ峰');
        buttons()[1].click();
        expect(emitted).toEqual([{ id: 'b', label: '希望ヶ丘' }]);
    });

    it('compact で候補が 2 つ以上の向きは、押すとメニューを開く（すぐには流さない）', async () => {
        await setup(
            [],
            [
                { id: 'b', label: '希望ヶ丘' },
                { id: 'c', label: '南万騎が原' },
            ],
            'compact',
        );
        const emitted: StepTarget[] = [];
        fixture.componentInstance.step.subscribe((t) => emitted.push(t));

        buttons()[1].click();
        fixture.detectChanges();
        expect(emitted).toEqual([]);
        const items = Array.from(
            document.querySelectorAll('.mat-mdc-menu-item'),
        ).map((i) => i.textContent?.trim());
        expect(items).toEqual(['希望ヶ丘', '南万騎が原']);
    });

    it('候補が無い向きのボタンは押せない', async () => {
        await setup([], [{ id: 'b', label: '希望ヶ丘' }], 'compact');
        expect(buttons()[0].disabled).toBe(true);
        expect(buttons()[1].disabled).toBe(false);
    });
});
```

- [ ] **Step 6: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="step-nav.component.spec" > .context/jest.txt 2>&1`
Expected: FAIL（`./step-nav.component` が無い）

- [ ] **Step 7: 部品を書く**

`step-nav.component.ts`:

```ts
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { StepTarget } from './step-target.type';

/**
 * 前後へ送るボタン（駅別時刻表の前後の駅・運用行路図の前後の運用。docs/design.md「前後へ送る」）。
 * full は帯の中に名前付きで並べ、compact は要約の行にアイコンだけを置く。
 * compact でその向きの候補が 2 つ以上（分岐駅）のときはメニューで選ばせる。
 */
@Component({
    selector: 'app-step-nav',
    templateUrl: './step-nav.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatMenuModule],
    host: { class: 'tw-contents' },
})
export class StepNavComponent {
    readonly prev = input<StepTarget[]>([]);
    readonly next = input<StepTarget[]>([]);
    readonly variant = input<'full' | 'compact'>('full');
    /** compact のアイコンの読み上げ（「前」「次」の後ろに候補名が 1 つなら付ける） */
    readonly prevLabel = input('前');
    readonly nextLabel = input('次');
    readonly step = output<StepTarget>();

    ariaLabel(direction: string, targets: StepTarget[]): string {
        return targets.length === 1
            ? `${direction}: ${targets[0].label}`
            : direction;
    }
}
```

`step-nav.component.html`:

```html
@if (variant() === 'full') {
    <div class="tw-flex tw-flex-row tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <div class="tw-flex tw-flex-row tw-flex-wrap tw-gap-2">
            @for (target of prev(); track target.id) {
                <button mat-stroked-button type="button" (click)="step.emit(target)">
                    <mat-icon>chevron_left</mat-icon>
                    {{ target.label }}
                </button>
            }
        </div>
        <div class="tw-flex tw-flex-row tw-flex-wrap tw-justify-end tw-gap-2">
            @for (target of next(); track target.id) {
                <button
                    mat-stroked-button
                    type="button"
                    (click)="step.emit(target)"
                >
                    {{ target.label }}
                    <mat-icon iconPositionEnd>chevron_right</mat-icon>
                </button>
            }
        </div>
    </div>
} @else {
    @for (
        side of [
            { targets: prev(), icon: 'chevron_left', label: prevLabel() },
            { targets: next(), icon: 'chevron_right', label: nextLabel() },
        ];
        track side.icon
    ) {
        @if (side.targets.length > 1) {
            <button
                mat-icon-button
                type="button"
                class="tw-shrink-0"
                [attr.aria-label]="ariaLabel(side.label, side.targets)"
                [matMenuTriggerFor]="menu"
            >
                <mat-icon>{{ side.icon }}</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
                @for (target of side.targets; track target.id) {
                    <button mat-menu-item type="button" (click)="step.emit(target)">
                        {{ target.label }}
                    </button>
                }
            </mat-menu>
        } @else {
            <button
                mat-icon-button
                type="button"
                class="tw-shrink-0"
                [disabled]="side.targets.length === 0"
                [attr.aria-label]="ariaLabel(side.label, side.targets)"
                (click)="step.emit(side.targets[0])"
            >
                <mat-icon>{{ side.icon }}</mat-icon>
            </button>
        }
    }
}
```

テストの文言 `'chevron_left 鶴ヶ峰'` は mat-icon のリガチャ文字を含めた textContent。空白が合わなければ、テスト側を `.replace(/\s+/g, ' ')` で正規化してから比べる（実装は変えない）。

- [ ] **Step 8: 通ることを確かめる**

Run: `npx jest --testPathPatterns="step-nav.component.spec|station-groups.util.spec" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 9: コミット**

```bash
npx prettier --write src/app/shared/station-groups.util.ts src/app/shared/station-groups.util.spec.ts src/app/shared/step-nav/step-nav.component.ts src/app/shared/step-nav/step-nav.component.html src/app/shared/step-nav/step-target.type.ts src/app/shared/step-nav/step-nav.component.spec.ts
git add src/app/shared/station-groups.util.ts src/app/shared/station-groups.util.spec.ts src/app/shared/step-nav
git commit -m 'feat: :sparkles: 前後の駅を求める関数と前後へ送る部品を足す'
```

---

### Task 3: 今日のダイヤのボタン

**Files:**
- Create: `src/app/shared/today-calendar-button/today-calendar-button.component.ts`
- Test: `src/app/shared/today-calendar-button/today-calendar-button.component.spec.ts`

**Interfaces:**
- Produces: `app-today-calendar-button`: `calendarId = input<string | null | undefined>()`・`selectToday = output<string>()`（今日の先頭のダイヤ ID を流す）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TodayCalendarButtonComponent } from './today-calendar-button.component';

describe('TodayCalendarButtonComponent', () => {
    let fixture: ComponentFixture<TodayCalendarButtonComponent>;
    const ids$ = new BehaviorSubject<string[]>(['special', 'base']);
    const first$ = new BehaviorSubject<string | undefined>('special');
    const button = () =>
        (fixture.nativeElement as HTMLElement).querySelector('button')!;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TodayCalendarButtonComponent],
            providers: [
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarIds$: ids$,
                        todaysCalendarId$: first$,
                    },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(TodayCalendarButtonComponent);
    });

    it.each(['special', 'base'])(
        '今日のダイヤ（%s）を見ている間は押せない',
        (calendarId) => {
            fixture.componentRef.setInput('calendarId', calendarId);
            fixture.detectChanges();
            expect(button().disabled).toBe(true);
        },
    );

    it('別のダイヤを見ているときは押せて、今日の先頭のダイヤを流す', () => {
        fixture.componentRef.setInput('calendarId', 'old');
        fixture.detectChanges();
        const emitted: string[] = [];
        fixture.componentInstance.selectToday.subscribe((id) => emitted.push(id));

        expect(button().disabled).toBe(false);
        button().click();
        expect(emitted).toEqual(['special']);
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="today-calendar-button.component.spec" > .context/jest.txt 2>&1`
Expected: FAIL（部品が無い）

- [ ] **Step 3: 部品を書く**

```ts
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';

/**
 * ダイヤの選択欄の右に置く「今日」（docs/design.md「今日のダイヤ」）。
 * 今日のダイヤのどれかを見ている間は押せない。押すと今日の先頭のダイヤを流す。
 */
@Component({
    selector: 'app-today-calendar-button',
    template: `
        <button
            mat-stroked-button
            type="button"
            [disabled]="disabled()"
            (click)="onClick()"
        >
            <mat-icon>today</mat-icon>
            今日
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
    host: { class: 'tw-shrink-0' },
})
export class TodayCalendarButtonComponent {
    readonly #query = inject(TodaysCalendarListStateQuery);
    readonly calendarId = input<string | null | undefined>();
    readonly selectToday = output<string>();

    readonly #todaysCalendarIds = toSignal(this.#query.todaysCalendarIds$, {
        initialValue: [] as string[],
    });
    readonly #todaysCalendarId = toSignal(this.#query.todaysCalendarId$);

    readonly disabled = computed(() => {
        const calendarId = this.calendarId();
        return (
            !this.#todaysCalendarId() ||
            (!!calendarId && this.#todaysCalendarIds().includes(calendarId))
        );
    });

    onClick(): void {
        const today = this.#todaysCalendarId();
        if (today) this.selectToday.emit(today);
    }
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns="today-calendar-button.component.spec" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/app/shared/today-calendar-button/today-calendar-button.component.ts src/app/shared/today-calendar-button/today-calendar-button.component.spec.ts
git add src/app/shared/today-calendar-button
git commit -m 'feat: :sparkles: 今日のダイヤに戻すボタンを足す'
```

---

### Task 4: 駅別時刻表（全線への選択肢・今日・前後の駅・検索カード撤去）

**Files:**
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.ts`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.html`
- Test: `src/app/pages/timetable/timetable-station/timetable-station.component.spec.ts`

**Interfaces:**
- Consumes: `findNeighborStations`・`StepTarget`（Task 2）、`app-step-nav`（Task 2）、`app-today-calendar-button`（Task 3）
- Produces: 駅の選択欄の値 `ALL_LINE_OPTION = '__all-line__'`（このファイル内の定数）

- [ ] **Step 1: 失敗するテストを書く**

spec の末尾に足す。既存の「URL の向き」の describe と同じく、`template: ''` で描かずにメソッドを呼ぶ。

```ts
describe('TimetableStationComponent の帯の操作', () => {
    let component: TimetableStationComponent;
    let navigate: jest.SpyInstance;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                calendar_id: 'cal-1',
                                station_id: 'st-1',
                                trip_direction: '1',
                            }),
                        ),
                    },
                },
                {
                    provide: TimetableStationService,
                    useValue: {
                        fetchCalendar: () => of(undefined),
                        fetchTrips: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                        fetchStations: () => of(undefined),
                        fetchOperations: () => of(undefined),
                        fetchOperationSightingTimeCrossSections: () => of(undefined),
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(TimetableStationComponent).componentInstance;
        navigate.mockClear();
    });

    it('駅の選択欄で「全線」を選ぶと、同じダイヤ・方向で全線時刻表へ移る', () => {
        component.onStationChange(ALL_LINE_OPTION);
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-1', trip_direction: 1 },
        ]);
    });

    it('前後の駅へ送ると、ダイヤ・方向を引き継いで駅だけ替える', () => {
        component.onStep({ id: 'st-2', label: '希望ヶ丘' });
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            { calendar_id: 'cal-1', station_id: 'st-2', trip_direction: 1 },
        ]);
    });
});
```

import に `ALL_LINE_OPTION` を足す（`import { ALL_LINE_OPTION, TimetableStationComponent } from './timetable-station.component';`）。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="timetable-station/timetable-station.component.spec" > .context/jest.txt 2>&1`
Expected: FAIL（`ALL_LINE_OPTION`・`onStep` が無い）

- [ ] **Step 3: コンポーネントを直す**

`timetable-station.component.ts`:

1. import を足す: `findNeighborStations`（`station-groups.util` から、既存の `buildStationGroups` と同じ行）、`StepNavComponent`・`StepTarget`、`TodayCalendarButtonComponent`。`TimetableSearchCardComponent` の import と `imports` 配列の項目を消し、`StepNavComponent`・`TodayCalendarButtonComponent` を足す。
2. クラスの前に定数を足す。

```ts
/** 駅の選択欄の先頭の「全線（駅を選ばない）」の値。選ぶと全線時刻表へ移る（2026-10-22） */
export const ALL_LINE_OPTION = '__all-line__';
```

3. `stationGroups` の下に足す。

```ts
    readonly allLineOption = ALL_LINE_OPTION;

    /** 前後の駅（分岐駅は隣を全部）。docs/design.md「前後へ送る」 */
    readonly neighborStations = computed(() =>
        findNeighborStations(this.stationGroups(), this.stationId()),
    );
```

4. `onStationChange` の先頭（`if (stationId === this.stationId()) return;` の前）に足す。

```ts
        if (stationId === ALL_LINE_OPTION) {
            this.#handleNavigationResult(
                this.#router.navigate([
                    'timetable',
                    'all-line',
                    {
                        calendar_id: this.calendarId(),
                        trip_direction: this.tripDirection(),
                    },
                ]),
            );
            return;
        }
```

5. `onDirectionChange` の前に足す。

```ts
    onStep(target: StepTarget): void {
        this.onStationChange(target.id);
    }
```

- [ ] **Step 4: テンプレートを直す**

`timetable-station.component.html`:

1. 駅の `<mat-select>` の中、`@for (group of stationGroups(); ...)` の直前に足す。

```html
                    <mat-option [value]="allLineOption">全線（駅を選ばない）</mat-option>
                    <mat-divider></mat-divider>
```

（`MatDividerModule` を `imports` に足す。）

2. ダイヤの `<mat-form-field>` を次の div で包み、右に「今日」を置く。

```html
            <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                <mat-form-field class="tw-min-w-0 tw-flex-1" subscriptSizing="dynamic">
                    <!-- 既存のダイヤの mat-label・mat-select をそのまま -->
                </mat-form-field>
                <app-today-calendar-button
                    [calendarId]="calendarId()"
                    (selectToday)="onCalendarChange($event)"
                ></app-today-calendar-button>
            </div>
```

（もとの `<mat-form-field class="tw-w-full" subscriptSizing="dynamic">` の class だけ `tw-min-w-0 tw-flex-1` に替える。）

3. `</header>` の直後（`</app-control-band>` の前）に足す。

```html
        <!-- 前後の駅（docs/design.md「前後へ送る」・2026-10-22） -->
        <div class="tw-mt-4 tw-flex tw-flex-col tw-gap-2">
            <p class="tw-m-0 tw-text-xs tw-text-grey-600">前後の駅</p>
            <app-step-nav
                [prev]="neighborStations().prev"
                [next]="neighborStations().next"
                (step)="onStep($event)"
            ></app-step-nav>
        </div>
```

（compact の `<app-step-nav controlBandBarActions …>` は取りやめ。2026-10-22 ユーザー指示。）

4. ファイル末尾の `<app-timetable-search-card ...></app-timetable-search-card>` を消す。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest --testPathPatterns="timetable-station" > .context/jest.txt 2>&1`
Expected: failed 無し。既存の spec に検索カードを前提にしたもの（`app-timetable-search-card` を探すもの）があれば、検索カードが無いことを確かめる形に直す。

- [ ] **Step 6: 画面で確かめる（サンドボックス外・Playwright）**

`http://localhost:4200/timetable/station;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;station_id=fb799a2e-c96c-4629-8a7d-e8b57f8e6930;trip_direction=1`（二俣川）を 390×844 と 1440×900 で開き、次を確かめてスクリーンショットを `.context/verify-control-band/` に残す。
- 帯に「‹ 鶴ヶ峰」「希望ヶ丘 ›」「南万騎が原 ›」、ダイヤの右に「今日」（押せない）。
- 1500px スクロールした要約の行に ‹ › が無く、要約の文が狭くならない（取りやめ。2026-10-22）。
- 駅の選択欄の先頭に「全線（駅を選ばない）」があり、選ぶと全線時刻表（下り）へ移る。
- ページの下に検索カードが無い。
- 横浜を開くと ‹ が押せない。

- [ ] **Step 7: コミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-station/timetable-station.component.ts src/app/pages/timetable/timetable-station/timetable-station.component.html src/app/pages/timetable/timetable-station/timetable-station.component.spec.ts
git add src/app/pages/timetable/timetable-station
git commit -m 'feat: :sparkles: 駅別時刻表の検索カードを帯に寄せ、前後の駅と今日を足す'
```

---

### Task 5: 貼り付く上り下りの切替を共有し、全線時刻表の帯を広げる

> **注記（2026-10-22 ユーザー指示）**: 全線時刻表は後から列車ダイヤグラムと同じ画面いっぱいの箱に作り直した（`main` は `calc(100dvh-48px)`／md から 64px、帯は `collapse="manual"`・`flush`、畳んだ状態は `TimetableAllLineStore.controlCollapsed`、切替は帯の下で貼り付かない、表のカードは `tw-flex-1`）。以下の Step 10 の 136/152px・56px の引き算と、Step 12 の「貼り付く」確認は取りやめ。共有部品 `app-sticky-direction-toggle` は駅別時刻表で使う。

**Files:**
- Create: `src/app/shared/sticky-direction-toggle/sticky-direction-toggle.component.ts`
- Create: `src/app/shared/sticky-direction-toggle/sticky-direction-toggle.component.scss`（駅別時刻表の scss から移す）
- Test: `src/app/shared/sticky-direction-toggle/sticky-direction-toggle.component.spec.ts`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.html`・`.scss`・`.ts`（共有部品に置き換え）
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.html`・`.ts`・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.html`・`.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-table/timetable-all-line-table.component.html:29`（箱の高さ）
- Test: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.spec.ts`

**Interfaces:**
- Produces:
  - `app-sticky-direction-toggle`: `value = input<ETripDirection | null | undefined>()`・`valueChange = output<ETripDirection>()`
  - `app-timetable-all-line-route-filter` に `alwaysVisible = input(false)`・`summaryLead = input('')` を足し、帯の操作部の先頭に `[bandLead]` の要素、要約の行への差し込み口は作らない（取りやめ。2026-10-22）。
- Consumes: `app-today-calendar-button`（Task 3）、`buildStationGroups`

- [ ] **Step 1: 共有の切替の失敗するテストを書く**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { StickyDirectionToggleComponent } from './sticky-direction-toggle.component';

describe('StickyDirectionToggleComponent', () => {
    let fixture: ComponentFixture<StickyDirectionToggleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StickyDirectionToggleComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(StickyDirectionToggleComponent);
        fixture.componentRef.setInput('value', ETripDirection.OUTBOUND);
        fixture.detectChanges();
    });

    it('上り・下りの 2 つを出し、押した向きを数で流す', () => {
        const emitted: ETripDirection[] = [];
        fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        const buttons = Array.from(el.querySelectorAll('button'));
        expect(buttons.map((b) => b.textContent?.trim())).toEqual(['上り', '下り']);

        buttons[0].click();
        expect(emitted).toEqual([ETripDirection.INBOUND]);
    });

    it('今の向きを押しても流さない', () => {
        const emitted: ETripDirection[] = [];
        fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
        const el = fixture.nativeElement as HTMLElement;
        el.querySelectorAll('button')[1].click();
        expect(emitted).toEqual([]);
    });
});
```

`app-segment-toggle` の中のボタンが `button` でなければ（`mat-button-toggle` など）、`querySelectorAll` のセレクタを `app-segment-toggle` の spec で使っているものに合わせる。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="sticky-direction-toggle" > .context/jest.txt 2>&1`
Expected: FAIL（部品が無い）

- [ ] **Step 3: 共有の切替を書く**

`sticky-direction-toggle.component.scss` に、`timetable-station.component.scss` の `.sticky-direction-band { … }` の中身（コメントごと）を移す。セレクタは `:host` に替える。

`sticky-direction-toggle.component.ts`:

```ts
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';

/**
 * トップバーと操作帯の要約の行の直下に貼り付く上り／下りの切替（駅別時刻表・全線時刻表）。
 * 長い時刻表を読みながら切り替えられるようにする（ユーザー判断 2026-09-23・全線は 2026-10-22）。
 * 上下 8px の地は負マージンで打ち消し、main の gap を変えない。z は 1: ドロワーの遮光幕（z-10）より下。
 */
@Component({
    selector: 'app-sticky-direction-toggle',
    template: `
        <app-segment-toggle
            [options]="options"
            [value]="value()"
            (valueChange)="onChange($event)"
        ></app-segment-toggle>
    `,
    styleUrl: './sticky-direction-toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SegmentToggleComponent],
    host: {
        class: 'tw-block tw-sticky tw-top-[calc(48px_+_var(--control-band-offset,0px))] tw-z-[1] -tw-my-2 tw-bg-paper-2 tw-py-2 md:tw-top-[calc(64px_+_var(--control-band-offset,0px))]',
    },
})
export class StickyDirectionToggleComponent {
    readonly value = input<ETripDirection | null | undefined>();
    readonly valueChange = output<ETripDirection>();

    readonly options: readonly [SegmentToggleOption, SegmentToggleOption] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    onChange(value: number | string): void {
        const direction = Number(value) as ETripDirection;
        if (direction === this.value()) return;
        this.valueChange.emit(direction);
    }
}
```

- [ ] **Step 4: 駅別時刻表を共有の切替に替える**

`timetable-station.component.html` の `<div class="sticky-direction-band …">…</div>`（コメントごと）を次に替える。

```html
    <app-sticky-direction-toggle
        [value]="tripDirection()"
        (valueChange)="onDirectionChange($event)"
    ></app-sticky-direction-toggle>
```

`timetable-station.component.scss` から `.sticky-direction-band` を消す（ファイルが空になったら `styleUrl` ごと消す）。`timetable-station.component.ts` の `imports` で `SegmentToggleComponent` を `StickyDirectionToggleComponent` に替える。`tripDirectionOptions` は `bandSummary` が使っているので残す。

Run: `npx jest --testPathPatterns="timetable-station|sticky-direction-toggle" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 5: 全線時刻表の失敗するテストを書く**

`timetable-all-line.component.spec.ts` の末尾に足す（既存の describe の TestBed 設定を写し、`template: ''` で描かない）。`ActivatedRoute` は `snapshot.params` と `paramMap` を持つ値にする。

```ts
describe('TimetableAllLineComponent の帯の操作', () => {
    let component: TimetableAllLineComponent;
    let navigate: jest.SpyInstance;
    const params = { calendar_id: 'cal-1', trip_direction: '1' };

    beforeEach(async () => {
        // 既存の describe の providers を写し、ActivatedRoute を次に替える
        // { provide: ActivatedRoute, useValue: { snapshot: { params }, paramMap: of(convertToParamMap(params)) } }
        // .overrideComponent(TimetableAllLineComponent, { set: { template: '', imports: [] } })
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(TimetableAllLineComponent).componentInstance;
        navigate.mockClear();
    });

    it('ダイヤを替えると、方向などはそのままで calendar_id だけ替える', () => {
        component.onCalendarChange('cal-2');
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-2', trip_direction: '1' },
        ]);
    });

    it('同じダイヤを選んでも移らない', () => {
        TimetableAllLineStore.setCalendarId('cal-1');
        component.onCalendarChange('cal-1');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('駅を選ぶと、同じダイヤ・方向で駅別時刻表へ移る', () => {
        TimetableAllLineStore.setCalendarId('cal-1');
        TimetableAllLineStore.setTripDirection(1);
        component.onStationSelect('st-9');
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'station',
            { calendar_id: 'cal-1', station_id: 'st-9', trip_direction: 1 },
        ]);
    });

    it('上り下りの切替は、押した向きへ移る', () => {
        component.onDirectionChange(0);
        expect(navigate).toHaveBeenCalledWith([
            'timetable',
            'all-line',
            { calendar_id: 'cal-1', trip_direction: 0 },
        ]);
    });
});
```

`TimetableAllLineStore.setCalendarId`・`setTripDirection` は実在する（`stores/timetable-all-line.store.ts:201`・`:204`）。コメントの「写す」部分は、実装者が同じファイルの既存 describe の `configureTestingModule` をそのまま書き写す（このファイルの既存の設定に依存するため計画には書けない。依存するサービスはすべて `of(undefined)` を返すモックにする）。

- [ ] **Step 6: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="timetable-all-line/timetable-all-line.component.spec" > .context/jest.txt 2>&1`
Expected: FAIL（`onCalendarChange`・`onStationSelect`・`onDirectionChange` が無い）

- [ ] **Step 7: 全線時刻表のコンポーネントに操作を足す**

`timetable-all-line.component.ts`:

```ts
    // inject を足す: TodaysCalendarListStateQuery は不要（ボタン側が持つ）
    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly #routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    /** 駅別時刻表へ移る選択欄の選択肢（駅別時刻表と同じ）。 */
    readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    /** 要約の頭に付ける「改正日 ダイヤ名 上り」 */
    readonly summaryLead = computed(() =>
        joinSummaryParts([
            formatCalendarSummaryLabel(this.calendar()),
            this.tripDirection() === 0 ? '上り' : this.tripDirection() === 1 ? '下り' : null,
        ]),
    );

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'all-line',
                { ...this.#route.snapshot.params, calendar_id: calendarId },
            ]),
            this.#notification,
        );
    }

    onStationSelect(stationId: string): void {
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'station',
                {
                    calendar_id: this.calendarId(),
                    station_id: stationId,
                    trip_direction: this.tripDirection(),
                },
            ]),
            this.#notification,
        );
    }

    onDirectionChange(tripDirection: number): void {
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'all-line',
                { ...this.#route.snapshot.params, trip_direction: tripDirection },
            ]),
            this.#notification,
        );
    }
```

`calendars`・`#routeStations`・`#agencies` のうち既にあるものは足さない。`formatCalendarSummaryLabel` の引数の型は `src/app/core/utils/format-calendar-summary-label.util.ts` を開いて合わせる（`calendar()` が undefined のとき null を返すよう `this.calendar() ? formatCalendarSummaryLabel(this.calendar()) : null` にする）。`joinSummaryParts` は `src/app/shared/control-band/control-band-summary.util.ts`、`notifyNavigationFailure` は `src/app/core/utils/notify-navigation-failure`、`buildStationGroups` は `src/app/shared/station-groups.util`。既存の `onToggleDirection` は空の画面のボタン用なので残す。`imports` から `TimetableSearchCardComponent` を消し、`MatFormFieldModule`・`MatSelectModule`・`MatDividerModule`・`DateFnsPipe`・`TodayCalendarButtonComponent`・`StickyDirectionToggleComponent` を足す。

- [ ] **Step 8: 絞り込み部品に差し込み口と常に出す指定を足す**

`timetable-all-line-route-filter.component.ts` に足す。

```ts
    /** ページが帯に選択欄を差し込むときは、取る前やチップが無いときも帯を出す（2026-10-22） */
    readonly alwaysVisible = input(false);
    /** 要約の頭（ダイヤと方向）。路線の要約の前に付ける */
    readonly summaryLead = input('');
```

`bandSummaryOrEmpty` を次に替える。

```ts
    readonly bandSummaryOrEmpty = computed(() =>
        joinSummaryParts([
            this.summaryLead(),
            this.isAwaitingTripBlocks() ? null : this.bandSummary(),
        ]),
    );
```

（`input` と `joinSummaryParts` を import に足す。`joinSummaryParts` が空文字を落とすことを `control-band-summary.util.ts` で確かめる。落とさなければ `[...].filter(Boolean)` を通してから渡す。）

`timetable-all-line-route-filter.component.html` を次に替える（既存のコメントは残す）。

```html
@if (alwaysVisible() || isAwaitingTripBlocks() || routeOptions().length) {
    <app-control-band
        [summary]="bandSummaryOrEmpty()"
        [filterActive]="!isAwaitingTripBlocks() && filterActive()"
    >
        <ng-content select="[bandLead]"></ng-content>
        @if (isAwaitingTripBlocks() || routeOptions().length) {
            <p class="tw-m-0 tw-mb-2 tw-text-xs tw-text-grey-600">路線で絞り込み</p>
            @if (isAwaitingTripBlocks()) {
                <app-skeleton-chips [widths]="routeSkeletonWidths"></app-skeleton-chips>
            } @else {
                <app-filter-chips
                    mode="multiple"
                    [scrollMode]="true"
                    [options]="routeOptions()"
                    [selected]="selectedRouteIds()"
                    (selectedChange)="onChange($event)"
                ></app-filter-chips>
            }
        }
    </app-control-band>
}
```

既存の spec「ダイヤが無く選択肢も無ければ、操作帯ごと出さない（今のまま）」は `alwaysVisible` が false のときの話として残す。足すテスト:

```ts
    it('alwaysVisible なら、選択肢が無くても帯を出す', () => {
        // 既存の「ダイヤが無く選択肢も無ければ」のテストと同じ準備をして
        fixture.componentRef.setInput('alwaysVisible', true);
        fixture.detectChanges();
        expect(
            (fixture.nativeElement as HTMLElement).querySelector('app-control-band'),
        ).not.toBeNull();
    });
```

- [ ] **Step 9: 全線時刻表のテンプレートを直す**

`timetable-all-line.component.html` の `<app-timetable-all-line-route-filter></app-timetable-all-line-route-filter>` を次に替える。

```html
    <!-- 検索カードの中身（ダイヤ・駅）を帯に寄せた（2026-10-22）。上り下りは駅別時刻表と同じく帯の下に貼り付ける -->
    <app-timetable-all-line-route-filter
        [alwaysVisible]="true"
        [summaryLead]="summaryLead()"
    >
        <div bandLead class="tw-mb-4 tw-grid tw-grid-cols-1 tw-gap-x-2 tw-gap-y-4 sm:tw-grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:tw-max-w-[40rem]">
            <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                <mat-form-field class="tw-min-w-0 tw-flex-1" subscriptSizing="dynamic">
                    <mat-label>ダイヤ</mat-label>
                    <mat-select
                        [value]="calendarId()"
                        (valueChange)="onCalendarChange($event)"
                    >
                        @for (calendar of calendars(); track calendar.calendarId) {
                            <mat-option [value]="calendar.calendarId">
                                {{
                                    calendar.startDate
                                        | dateFns
                                            : {
                                                  format: 'yyyy/M/d改正',
                                                  parseFormat: 'yyyy-MM-dd',
                                              }
                                }}
                                {{ calendar.calendarName }}
                            </mat-option>
                        }
                    </mat-select>
                </mat-form-field>
                <app-today-calendar-button
                    [calendarId]="calendarId()"
                    (selectToday)="onCalendarChange($event)"
                ></app-today-calendar-button>
            </div>
            <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
                <mat-label>駅別時刻表へ移る</mat-label>
                <mat-select
                    placeholder="駅を選ぶ"
                    (valueChange)="onStationSelect($event)"
                >
                    @for (group of stationGroups(); track group.routeId) {
                        <mat-optgroup [label]="group.label">
                            @for (station of group.stations; track station.stationId) {
                                <mat-option [value]="station.stationId">
                                    {{ station.stationName }}
                                </mat-option>
                            }
                        </mat-optgroup>
                    }
                </mat-select>
            </mat-form-field>
        </div>
    </app-timetable-all-line-route-filter>

    <app-sticky-direction-toggle
        [value]="tripDirection()"
        (valueChange)="onDirectionChange($event)"
    ></app-sticky-direction-toggle>
```

ファイル末尾の `<app-timetable-search-card …></app-timetable-search-card>` と、その上の「検索カードを広告より前に置く」のコメントを消す。

- [ ] **Step 10: 表の箱の高さを切替の分だけ縮める**（取りやめ・上の注記）

切替の高さは 56px（切替 40px＋上下 8px）。負マージンで gap を打ち消しているので、表の箱から引くのは 56px。

`timetable-all-line-table.component.html:29` の箱の class を次に替える。

```html
                    class="tw-max-h-[calc(100dvh_-_136px_-_var(--control-band-offset,0px))] tw-overflow-auto md:tw-max-h-[calc(100dvh_-_152px_-_var(--control-band-offset,0px))]"
```

上のコメントの「高さは「画面 − トップバー − 16/32px」」の後ろに「− 貼り付く上り下りの切替 56px（2026-10-22）」を足す。`timetable-all-line.component.html` の骨組みの箱（`tw-h-[calc(100dvh_-_80px_-_…)]`）も同じく `136px`／`152px` に替える。

- [ ] **Step 11: 通ることを確かめる**

Run: `npx jest --testPathPatterns="timetable-all-line|timetable-station|sticky-direction-toggle" > .context/jest.txt 2>&1`
Expected: failed 無し。検索カードを前提にした既存の spec があれば、無いことを確かめる形に直す。

- [ ] **Step 12: 画面で確かめる（サンドボックス外）**

`http://localhost:4200/timetable/all-line;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_direction=1` を 390×844 と 1440×900 で開く。
- 帯にダイヤ（＋今日・押せない）・駅別時刻表へ移る・路線で絞り込み。要約は「2026/3/14改正 平日ダイヤ 下り・路線：相鉄の 4 路線」の形。
- 帯の下に上り下りの切替がある（貼り付かない。ページはスクロールしない）。
- 表の箱を一番下までスクロールしたとき、最下段（終着駅の段）が画面内に収まる（`document.querySelector('app-timetable-all-line-table .tw-overflow-auto').getBoundingClientRect().bottom <= innerHeight` を evaluate で確かめる）。
- 上りを押すと上りへ、駅を選ぶと駅別時刻表へ移る。下部に検索カードが無い。
- スクリーンショットを `.context/verify-control-band/` に残す。

- [ ] **Step 13: コミット**

```bash
npx prettier --write <この Task で触った各ファイル>
git add src/app/shared/sticky-direction-toggle src/app/pages/timetable
git commit -m 'feat: :sparkles: 全線時刻表の検索カードを帯に寄せ、上り下りの切替を貼り付ける'
```

### PR 1 の締め

- [ ] `npx jest > .context/jest-all.txt 2>&1` を流し、`Tests:` 行に failed が無いことを確かめる。
- [ ] `npm run lint`（サンドボックス外）で新しい指摘が無いことを確かめる。
- [ ] ユーザーに PR の作成を確認してから `git push`・`gh pr create`（本文の末尾に attribution）。

---

## PR 2: 運用（運用表・運用行路図・過去の運用情報）

PR 1 のマージ後、master から `feat/control-band-search-operation` を切る（PR 1 の部品を使う）。

### Task 6: 運用表と過去の運用情報

**Files:**
- Modify: `src/app/pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.html`・`.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.html`・`.ts`
- Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.html`・`.ts`
- Test: `src/app/pages/operation/operation-table/components/operation-table-filter/operation-table-filter.component.spec.ts`

**Interfaces:**
- Consumes: `app-today-calendar-button`（Task 3）

- [ ] **Step 1: 失敗するテストを書く**

`operation-table-filter.component.spec.ts` に足す（既存の describe の準備を使う。`TodaysCalendarListStateQuery` を `{ todaysCalendarIds$: of(['today']), todaysCalendarId$: of('today') }` でモックする）。

```ts
    it('「今日」を押すと、今日のダイヤを calendarChange で流す', () => {
        fixture.componentRef.setInput('calendarId', 'old');
        fixture.detectChanges();
        const emitted: string[] = [];
        component.calendarChange.subscribe((id: string) => emitted.push(id));

        const today = (fixture.nativeElement as HTMLElement).querySelector(
            'app-today-calendar-button button',
        ) as HTMLButtonElement;
        today.click();
        expect(emitted).toEqual(['today']);
    });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-table-filter" > .context/jest.txt 2>&1`
Expected: FAIL（ボタンが無い）

- [ ] **Step 3: 「今日」を足す**

`operation-table-filter.component.html` のダイヤの `</mat-form-field>` の直後（同じ `tw-flex tw-flex-row` の中）に足す。

```html
        <app-today-calendar-button
            class="tw-self-center"
            [calendarId]="calendarId()"
            (selectToday)="onCalendarChange($event)"
        ></app-today-calendar-button>
```

`operation-table-filter.component.ts` の `imports` に `TodayCalendarButtonComponent` を足す。

- [ ] **Step 4: 運用表と過去の運用情報の検索カードを消す**

- `operation-table.component.html` の末尾の `<app-operation-search-card [calendarId]="calendarId()"></app-operation-search-card>` を消す。骨組みのコメントの「下の検索カードが操作帯のすぐ下に見え」は経緯なので残す。
- `operation-past-time.component.html` の `<app-operation-search-card></app-operation-search-card>` を消す。
- 両方の `.ts` の `imports` から `OperationSearchCardComponent` を消す。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest --testPathPatterns="operation-table|operation-past-time" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 6: 画面で確かめる（サンドボックス外）**

運用表（`/operation/table;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb`）と過去の運用情報（`/operation/past-time`）を 390・1440 で開き、帯のダイヤの右に「今日」（押せない）、下部に検索カードが無いことを確かめる。古いダイヤを選んで「今日」が押せるようになり、押すと戻ることも確かめる。

- [ ] **Step 7: コミット**

```bash
npx prettier --write <触った各ファイル>
git add src/app/pages/operation/operation-table src/app/pages/operation/operation-past-time
git commit -m 'feat: :sparkles: 運用表と過去の運用情報の検索カードを外し、運用表に今日を足す'
```

---

### Task 7: 運用行路図（ダイヤ・運用番号・前後の運用・今日）

**Files:**
- Create: `src/app/shared/operation-select-options.util.ts`
- Test: `src/app/shared/operation-select-options.util.spec.ts`
- Modify: `src/app/shared/operation-search-card/operation-search-card.component.ts`（並べ方を共通の関数に寄せる）
- Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.html`・`.ts`・`.spec.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.html`・`.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/stores/operation-route-diagram.store.ts`（`setOperationTrips` に null を渡せるように）
- Test: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.spec.ts`

**Interfaces:**
- Produces:
  - `export function toOperationSelectOptions(operations: OperationDetailsDto[]): OperationDetailsDto[]`（休車 100 を除き番号順）
  - `export function findNeighborOperations(operations: OperationDetailsDto[], operationId: string | null | undefined): { prev: StepTarget[]; next: StepTarget[] }`（ラベルは運用番号そのまま。例「42G」）
  - 行路図の絞り込み部品に `alwaysVisible = input(false)`・`summaryLead = input('')`・`[bandLead]` の差し込み（Task 5 の全線と同じ形。`[controlBandBarActions]` の差し込みは作らない）
- Consumes: `app-step-nav`・`StepTarget`（Task 2）、`app-today-calendar-button`（Task 3）、`OperationService.findManyByCalendarId({ calendarId })`

- [ ] **Step 1: 並べ方と前後の運用の失敗するテストを書く**

```ts
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import {
    findNeighborOperations,
    toOperationSelectOptions,
} from './operation-select-options.util';

const op = (operationId: string, operationNumber: string) =>
    ({ operationId, operationNumber }) as OperationDetailsDto;

describe('toOperationSelectOptions', () => {
    it('休車の 100 を除き、運用番号の順に並べる', () => {
        const result = toOperationSelectOptions([
            op('c', '43G'),
            op('x', '100'),
            op('a', '11'),
            op('b', '42G'),
        ]);
        expect(result.map((o) => o.operationNumber)).toEqual(['11', '42G', '43G']);
    });
});

describe('findNeighborOperations', () => {
    const list = [op('a', '11'), op('b', '42G'), op('c', '43G')];

    it('並びの 1 つ前と 1 つ後を返す', () => {
        expect(findNeighborOperations(list, 'b')).toEqual({
            prev: [{ id: 'a', label: '11' }],
            next: [{ id: 'c', label: '43G' }],
        });
    });

    it('端は片方が空、見つからなければ両方空', () => {
        expect(findNeighborOperations(list, 'a').prev).toEqual([]);
        expect(findNeighborOperations(list, 'c').next).toEqual([]);
        expect(findNeighborOperations(list, null)).toEqual({ prev: [], next: [] });
    });
});
```

`generateOperationSortNumber` の並びで `11 < 42G < 43G` になることを `src/app/core/utils/generate-operation-sort-number.ts` で確かめ、違えば期待値を実際の並びに合わせる（並べ方そのものは変えない）。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-select-options" > .context/jest.txt 2>&1`
Expected: FAIL（ファイルが無い）

- [ ] **Step 3: 関数を書き、検索カードを寄せる**

`src/app/shared/operation-select-options.util.ts`:

```ts
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StepTarget } from './step-nav/step-target.type';

/** 運用番号の選択欄の選択肢（休車の 100 を除き番号順）。検索カードと運用行路図の帯が使う。 */
export function toOperationSelectOptions(
    operations: OperationDetailsDto[],
): OperationDetailsDto[] {
    return operations
        .filter((o) => o.operationNumber !== '100')
        .sort(
            (a, b) =>
                Number(generateOperationSortNumber(a.operationNumber)) -
                Number(generateOperationSortNumber(b.operationNumber)),
        );
}

/** 前後の運用（運用行路図の「前後へ送る」）。選択欄と同じ並びの 1 つ前と 1 つ後。 */
export function findNeighborOperations(
    operations: OperationDetailsDto[],
    operationId: string | null | undefined,
): { prev: StepTarget[]; next: StepTarget[] } {
    const index = operations.findIndex((o) => o.operationId === operationId);
    if (!operationId || index < 0) return { prev: [], next: [] };
    const toTarget = (o: OperationDetailsDto | undefined): StepTarget[] =>
        o ? [{ id: o.operationId, label: o.operationNumber }] : [];
    return {
        prev: toTarget(operations[index - 1]),
        next: toTarget(operations[index + 1]),
    };
}
```

`operation-search-card.component.ts` の `map((operations) => operations.filter(…).sort(…))` を `map(toOperationSelectOptions)` に替え、使わなくなった `generateOperationSortNumber` の import を消す。

Run: `npx jest --testPathPatterns="operation-select-options|operation-search-card" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 4: 行路図の失敗するテストを書く**

`operation-route-diagram.component.spec.ts` の末尾に足す。`OperationService` を次のモックにし、`template: ''` で描かない（既存の describe の providers を写し、`OperationService` を足す）。

```ts
describe('OperationRouteDiagramComponent の帯の操作', () => {
    let component: OperationRouteDiagramComponent;
    let navigate: jest.SpyInstance;
    const byCalendar: Record<string, OperationDetailsDto[]> = {
        'cal-1': [op('a1', '42G'), op('b1', '43G')],
        'cal-2': [op('b2', '43G'), op('c2', '44G')],
        'cal-3': [op('d3', '11')],
    };
    const op = (operationId: string, operationNumber: string) =>
        ({ operationId, operationNumber }) as OperationDetailsDto;

    beforeEach(async () => {
        // 既存の describe の providers を写し、次を足す:
        // { provide: OperationService, useValue: { findManyByCalendarId: ({ calendarId }) => of(byCalendar[calendarId] ?? []) } }
        // ActivatedRoute は { paramMap: of(convertToParamMap({ operation_id: 'b1' })) }
        // .overrideComponent(OperationRouteDiagramComponent, { set: { template: '', imports: [] } })
        navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        component = TestBed.createComponent(OperationRouteDiagramComponent).componentInstance;
        component.selectedCalendarId.set('cal-1');
        navigate.mockClear();
    });

    it('運用番号を選ぶと、その運用の行路図へ移る', () => {
        component.onOperationChange('a1');
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'a1' },
        ]);
    });

    it('ダイヤを替えたとき、同じ運用番号があればその運用へ移る', async () => {
        OperationRouteDiagramStore.setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        await component.onCalendarChange('cal-2');
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'b2' },
        ]);
        expect(component.selectedCalendarId()).toBe('cal-2');
    });

    it('同じ運用番号が無ければ運用番号を外し、選んだダイヤを残す', async () => {
        OperationRouteDiagramStore.setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        await component.onCalendarChange('cal-3');
        expect(navigate).toHaveBeenCalledWith(['/operation/route-diagram']);
        expect(component.selectedCalendarId()).toBe('cal-3');
    });

    it('前後の運用へ送ると、その運用へ移る', () => {
        component.onStep({ id: 'a1', label: '42G' });
        expect(navigate).toHaveBeenCalledWith([
            '/operation/route-diagram',
            { operation_id: 'a1' },
        ]);
    });
});
```

運用はストアの `operationTrips.operation` から取り出す作り（`operation$`）なので、テストでは `setOperationTrips` で入れる。`OperationTripsDto` は `src/app/libs/operation/usecase/dtos/operation-trips.dto.ts` から import する。

- [ ] **Step 5: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-route-diagram/operation-route-diagram.component.spec" > .context/jest.txt 2>&1`
Expected: FAIL（`selectedCalendarId`・`onOperationChange`・`onCalendarChange`・`onStep` が無い）

- [ ] **Step 6: 行路図のコンポーネントに操作を足す**

`operation-route-diagram.component.ts`:

```ts
    readonly #operationService = inject(OperationService);
    readonly #notification = inject(NotificationService);
    readonly calendars = toSignal(inject(CalendarListStateQuery).calendars$, {
        initialValue: [],
    });
    readonly #todaysCalendarId = toSignal(
        inject(TodaysCalendarListStateQuery).todaysCalendarId$,
    );

    /**
     * 帯で選んでいるダイヤ。運用を開いている間はそのダイヤ、運用が無いときは今日のダイヤ。
     * ダイヤだけ替えて同じ運用番号が無かったときは、選んだダイヤを残す（2026-10-22）
     */
    readonly selectedCalendarId = linkedSignal<string | null>(
        () => this.searchCalendarId() ?? this.#todaysCalendarId() ?? null,
    );

    /** 帯の運用番号の選択肢（検索カードと同じ並び）。 */
    readonly operationOptions = toSignal(
        toObservable(this.selectedCalendarId).pipe(
            switchMap((calendarId) =>
                calendarId
                    ? this.#operationService
                          .findManyByCalendarId({ calendarId })
                          .pipe(catchError(() => of([])))
                    : of([]),
            ),
            map(toOperationSelectOptions),
        ),
        { initialValue: [] },
    );

    readonly neighborOperations = computed(() =>
        findNeighborOperations(this.operationOptions(), this.searchOperationId()),
    );

    /** 要約の頭「43G運 2026/3/14改正 平日ダイヤ」 */
    readonly summaryLead = computed(() =>
        joinSummaryParts([
            this.operation()?.operationNumber
                ? `${this.operation()!.operationNumber}運`
                : null,
            this.calendar() ? formatCalendarSummaryLabel(this.calendar()) : null,
        ]),
    );

    onOperationChange(operationId: string): void {
        notifyNavigationFailure(
            this.#router.navigate([
                '/operation/route-diagram',
                { operation_id: operationId },
            ]),
            this.#notification,
        );
    }

    onStep(target: StepTarget): void {
        this.onOperationChange(target.id);
    }

    /** 同じ運用番号が新しいダイヤにあればその運用へ、無ければ運用番号を外す */
    async onCalendarChange(calendarId: string): Promise<void> {
        if (!calendarId || calendarId === this.selectedCalendarId()) return;
        this.selectedCalendarId.set(calendarId);
        const operationNumber = this.operation()?.operationNumber;
        const operations = await lastValueFrom(
            this.#operationService
                .findManyByCalendarId({ calendarId })
                .pipe(catchError(() => of([] as OperationDetailsDto[]))),
        );
        const same = operations.find(
            (o) => o.operationNumber === operationNumber,
        );
        notifyNavigationFailure(
            this.#router.navigate(
                same
                    ? ['/operation/route-diagram', { operation_id: same.operationId }]
                    : ['/operation/route-diagram'],
            ),
            this.#notification,
        );
    }
```

import を足す: `linkedSignal`（`@angular/core`）、`toObservable`（`@angular/core/rxjs-interop`）、`catchError`・`switchMap`（`rxjs/operators`、`map` は既存）、`of`（`rxjs`）、`OperationService`、`OperationDetailsDto`、`CalendarListStateQuery`、`TodaysCalendarListStateQuery`、`NotificationService`、`notifyNavigationFailure`、`joinSummaryParts`、`formatCalendarSummaryLabel`、`toOperationSelectOptions`・`findNeighborOperations`、`StepTarget`。`imports` から `OperationSearchCardComponent` を消し、`MatFormFieldModule`・`MatSelectModule`・`DateFnsPipe`・`StepNavComponent`・`TodayCalendarButtonComponent` を足す。

運用番号を外して移ったとき（URL に `operation_id` が無い）、今の `paramMap` の subscribe は `setOperationId(null)` を呼んで `fetchData` が何もしない。ストアの `operationTrips` が前の運用のまま残ると図が出続けるので、次のようにする。

- `operation-route-diagram.store.ts` の `setOperationTrips` の引数を `OperationTripsDto | null` に広げる（初期値はもともと null）。
- subscribe の中で、`operationId` が無いときは `OperationRouteDiagramStore.setOperationTrips(null);` を呼ぶ。

```ts
            .subscribe((paramMap) => {
                const operationId = paramMap.get('operation_id');

                OperationRouteDiagramStore.setOperationId(operationId);
                // 運用番号を外したとき（ダイヤを替えて同じ番号が無かった）、前の運用の図を残さない（2026-10-22）
                if (!operationId) OperationRouteDiagramStore.setOperationTrips(null);
                this.fetchData();
            });
```

テストを 1 つ足す。

```ts
    it('運用番号の無い URL に移ったら、前の運用の図を消す', () => {
        OperationRouteDiagramStore.setOperationTrips({
            operation: op('b1', '43G'),
            trips: [],
        } as unknown as OperationTripsDto);
        paramMap$.next(convertToParamMap({}));
        expect(component.operation()).toBeUndefined();
    });
```

このテストのため、beforeEach の `ActivatedRoute` は `paramMap: paramMap$`（`const paramMap$ = new BehaviorSubject(convertToParamMap({ operation_id: 'b1' }))`）にする。

- [ ] **Step 7: 絞り込み部品に差し込み口と常に出す指定を足す**

`operation-route-diagram-route-filter.component.ts` に `alwaysVisible = input(false)`・`summaryLead = input('')` を足し、帯の `[summary]` を `joinSummaryParts([summaryLead(), isAwaitingOperationTrips() ? null : bandSummary()])` にする。

`.html` を次に替える（既存のコメントは残す）。

```html
@if (alwaysVisible() || isAwaitingOperationTrips() || routeOptions().length > 0) {
    <app-control-band
        [summary]="summary()"
        [filterActive]="!isAwaitingOperationTrips() && filterActive()"
    >
        <ng-content select="[bandLead]"></ng-content>
        @if (isAwaitingOperationTrips() || routeOptions().length > 0) {
            <p class="tw-m-0 tw-mb-2 tw-text-xs tw-text-grey-600">路線で絞り込み</p>
            @if (isAwaitingOperationTrips()) {
                <app-skeleton-chips [widths]="routeSkeletonWidths"></app-skeleton-chips>
            } @else {
                <app-filter-chips
                    mode="multiple"
                    [scrollMode]="true"
                    [options]="routeOptions()"
                    [selected]="selectedRouteIds()"
                    (selectedChange)="onChange($event)"
                ></app-filter-chips>
            }
        }
    </app-control-band>
}
```

`summary` は ts に `readonly summary = computed(() => joinSummaryParts([this.summaryLead(), this.isAwaitingOperationTrips() ? null : this.bandSummary()]));` として足す。

`[controlBandBarActions]` の中継（`ngProjectAs`）は作らない（2026-10-22 ユーザー指示。Task 5 の全線の絞り込み部品にも足さない）。

足すテスト（`operation-route-diagram-route-filter.component.spec.ts`）:

```ts
    it('alwaysVisible なら、運用番号が未設定でチップが無くても帯を出す', () => {
        // 既存の「チップが 1 つも無い間は帯ごと出さない」と同じ準備をして
        fixture.componentRef.setInput('alwaysVisible', true);
        fixture.detectChanges();
        expect(
            (fixture.nativeElement as HTMLElement).querySelector('app-control-band'),
        ).not.toBeNull();
    });
```

- [ ] **Step 8: 行路図のテンプレートを直す**

`operation-route-diagram.component.html` の `<app-operation-route-diagram-route-filter></app-operation-route-diagram-route-filter>` を次に替える。

```html
    <!-- 検索カードの中身（ダイヤ・運用番号）を帯に寄せた（2026-10-22）。前後の運用は帯の中の名前付きボタン -->
    <app-operation-route-diagram-route-filter
        [alwaysVisible]="true"
        [summaryLead]="summaryLead()"
    >
        <div bandLead class="tw-mb-4 tw-flex tw-flex-col tw-gap-4 md:tw-max-w-[40rem]">
            <div class="tw-grid tw-grid-cols-1 tw-gap-x-2 tw-gap-y-4 sm:tw-grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div class="tw-flex tw-flex-row tw-items-center tw-gap-2">
                    <mat-form-field class="tw-min-w-0 tw-flex-1" subscriptSizing="dynamic">
                        <mat-label>ダイヤ</mat-label>
                        <mat-select
                            [value]="selectedCalendarId()"
                            (valueChange)="onCalendarChange($event)"
                        >
                            @for (calendar of calendars(); track calendar.calendarId) {
                                <mat-option [value]="calendar.calendarId">
                                    {{
                                        calendar.startDate
                                            | dateFns
                                                : {
                                                      format: 'yyyy/M/d改正',
                                                      parseFormat: 'yyyy-MM-dd',
                                                  }
                                    }}
                                    {{ calendar.calendarName }}
                                </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                    <app-today-calendar-button
                        [calendarId]="selectedCalendarId()"
                        (selectToday)="onCalendarChange($event)"
                    ></app-today-calendar-button>
                </div>
                <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
                    <mat-label>運用番号</mat-label>
                    <mat-select
                        [value]="searchOperationId()"
                        (valueChange)="onOperationChange($event)"
                    >
                        @for (operation of operationOptions(); track operation.operationId) {
                            <mat-option [value]="operation.operationId">
                                {{ operation.operationNumber }}運
                            </mat-option>
                        }
                    </mat-select>
                </mat-form-field>
            </div>
            <div class="tw-flex tw-flex-col tw-gap-2">
                <p class="tw-m-0 tw-text-xs tw-text-grey-600">前後の運用</p>
                <app-step-nav
                    [prev]="neighborOperations().prev"
                    [next]="neighborOperations().next"
                    (step)="onStep($event)"
                ></app-step-nav>
            </div>
        </div>
    </app-operation-route-diagram-route-filter>
```

`<app-operation-search-card [calendarId]=… [operationId]=…></app-operation-search-card>` を消す。運用番号が未設定のときの「運用番号を設定して検索してください」の空の画面はそのまま（帯の運用番号で選べるので、文言は変えない）。

運用番号が未設定で `searchOperationId()` が null のとき、`[value]` は null で選択欄は空になる。運用を開いていて別ダイヤに替え同じ番号が無かったとき、`searchOperationId` は前の値を残す（`filter(!!operation)` のため）。このときは選択欄に前の運用 ID が残るが、新しいダイヤの選択肢に無いので空に見える。それで正しい。

- [ ] **Step 9: 通ることを確かめる**

Run: `npx jest --testPathPatterns="operation-route-diagram|operation-select-options|operation-search-card" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 10: 画面で確かめる（サンドボックス外）**

`/operation/route-diagram;operation_id=45c1499a-8cbc-4b6f-a7e5-e146d8c607a3`（43G）を 390・1440 で開く。
- 帯にダイヤ（＋今日・押せない）・運用番号「43G運」・「‹ 42G」「44G ›」・路線で絞り込み。要約は「43G運・2026/3/14改正 平日ダイヤ・…」の形。
- 要約の行に ‹ › が無い（取りやめ。2026-10-22）。帯を開いた「‹ 42G」「44G ›」で隣の運用へ移る。
- 古いダイヤに替えて、同じ番号がある・無いの両方を試す（無いときは空の画面になり、帯のダイヤは選んだものが残る）。
- `/operation/route-diagram`（運用番号なし）を開くと、帯にダイヤ（今日）と空の運用番号が出る。
- 下部に検索カードが無い。スクリーンショットを `.context/verify-control-band/` に残す。

- [ ] **Step 11: コミット**

```bash
npx prettier --write <触った各ファイル>
git add src/app/shared/operation-select-options.util.ts src/app/shared/operation-select-options.util.spec.ts src/app/shared/operation-search-card src/app/pages/operation/operation-route-diagram src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter
git commit -m 'feat: :sparkles: 運用行路図の検索カードを帯に寄せ、前後の運用と今日を足す'
```

### PR 2 の締め

- [ ] `npx jest > .context/jest-all.txt 2>&1` の `Tests:` 行・`npm run lint`（サンドボックス外）。
- [ ] ユーザーに確認してから push・PR。

---

## PR 3: リアルタイムの投稿

PR 2 のマージ後、master から `feat/control-band-search-post` を切る。

### Task 8: 投稿フォームをカードから切り出す

**Files:**
- Create: `src/app/shared/operation-post-card/operation-post-form.component.ts`
- Create: `src/app/shared/operation-post-card/operation-post-form.component.html`
- Modify: `src/app/shared/operation-post-card/operation-post-card.component.ts`・`.html`（フォームを包むだけにする）
- Move tests: `src/app/shared/operation-post-card/operation-post-card.component.spec.ts` のうちフォームの振る舞いを確かめるものを `operation-post-form.component.spec.ts` へ移す

**Interfaces:**
- Produces: `app-operation-post-form`: `initialValue = input<OperationPostInitialValue>({})`・`submitted = output<void>()`（投稿に成功したときだけ）。
  `export interface OperationPostInitialValue { agencyId?: string; formationOrVehicleNumber?: string; operationNumber?: string; }`（`operation-post-form.component.ts` に置く）

- [ ] **Step 1: 失敗するテストを書く**

`operation-post-form.component.spec.ts`。既存の `operation-post-card.component.spec.ts` の TestBed 設定（サービス・socket・GA・snackBar のモック）を写す。

```ts
describe('OperationPostFormComponent', () => {
    // beforeEach: 既存の operation-post-card.component.spec.ts と同じ providers で
    // OperationPostFormComponent を作る。postOperationSighting は jest.fn() で、テストごとに戻り値を決める。

    it('initialValue の運用番号を入れた状態で始まる', () => {
        fixture.componentRef.setInput('initialValue', { operationNumber: '11' });
        fixture.detectChanges();
        expect(component.sightingForm.getRawValue().operationNumber).toBe('11');
    });

    it('initialValue の所属と編成番号を入れた状態で始まる', () => {
        fixture.componentRef.setInput('initialValue', {
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
        });
        fixture.detectChanges();
        const value = component.sightingForm.getRawValue();
        expect(value.agencyId).toBe('sotetsu');
        expect(value.formationOrVehicleNumber).toBe('10706');
        expect(value.operationNumber).toBe('');
    });

    it('投稿に成功したら submitted を流す', async () => {
        postOperationSighting.mockReturnValue(of(undefined));
        const submitted = jest.fn();
        component.submitted.subscribe(submitted);
        component.sightingForm.setValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
            operationNumber: '11',
            timeSetting: 'currentTime',
            sightingTime: '',
        });
        await component.submit(formGroupDirective);
        expect(submitted).toHaveBeenCalledTimes(1);
    });

    it('投稿に失敗したら submitted を流さず、入力を残す', async () => {
        postOperationSighting.mockReturnValue(
            throwError(() => new FetchError('失敗しました', 500)),
        );
        const submitted = jest.fn();
        component.submitted.subscribe(submitted);
        component.sightingForm.setValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
            operationNumber: '11',
            timeSetting: 'currentTime',
            sightingTime: '',
        });
        await component.submit(formGroupDirective);
        expect(submitted).not.toHaveBeenCalled();
        expect(component.sightingForm.getRawValue().operationNumber).toBe('11');
    });
});
```

`formGroupDirective` は既存の card spec が submit に渡しているものを写す。`FetchError` の生成の引数は `src/app/core/classes/custom-error.ts` で確かめる。既存の card spec が submit を確かめていれば、そのテストはこの form spec へ移し、card spec には「フォームを包んで見出し『運用情報を投稿する』を出す」だけを残す。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-post" > .context/jest.txt 2>&1`
Expected: FAIL（`operation-post-form.component` が無い）

- [ ] **Step 3: フォームを切り出す**

1. `operation-post-card.component.ts` を `operation-post-form.component.ts` に写し、クラス名を `OperationPostFormComponent`、selector を `app-operation-post-form`、`templateUrl` を `./operation-post-form.component.html` にする。`styleUrl` と `PanelCardComponent` の import は外す。
2. `operation-post-card.component.html` の `<form>…</form>` を `operation-post-form.component.html` に移す（`<app-panel-card>` は持ってこない）。
3. フォームに足す。

```ts
export interface OperationPostInitialValue {
    agencyId?: string;
    formationOrVehicleNumber?: string;
    operationNumber?: string;
}

    /** 初めに入れておく値（リアルタイムの行から開いたとき）。2026-10-22 */
    readonly initialValue = input<OperationPostInitialValue>({});
    /** 投稿に成功したときだけ流す（ダイアログを閉じるため） */
    readonly submitted = output<void>();
```

constructor に足す。

```ts
        effect(() => {
            const initial = this.initialValue();
            untracked(() => this.sightingForm.patchValue(initial));
        });
```

`submit` の成功の分岐の最後（`this.#operationPostCardService.emitSubmitEvent();` の後）に `this.submitted.emit();` を足す。`effect`・`input`・`output`・`untracked` を `@angular/core` の import に足す。

4. `operation-post-card.component.ts` を包むだけにする。

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PanelCardComponent } from '../panel-card/panel-card.component';
import { OperationPostFormComponent } from './operation-post-form.component';

/** 運用情報を投稿するカード（トップ用）。中身は投稿ダイアログと共用のフォーム。 */
@Component({
    selector: 'app-operation-post-card',
    template: `
        <app-panel-card heading="運用情報を投稿する">
            <app-operation-post-form></app-operation-post-form>
        </app-panel-card>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PanelCardComponent, OperationPostFormComponent],
})
export class OperationPostCardComponent {}
```

`operation-post-card.component.html` と（空なら）`.scss` を消す（`git rm` ではなく `rm`。コミット時に `git add -A <dir>`）。

`app-panel-card` が中身に `tw-flex tw-flex-col tw-gap-4` 等を当てていて、フォームが 1 段深くなったことで余白が変わるなら、`app-operation-post-form` の host に `class: 'tw-contents'` を付けて段を消す。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns="operation-post|dashboard" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 5: トップの見た目が変わっていないことを確かめる（サンドボックス外）**

master と作業ブランチでトップ（`/`）の「運用情報を投稿する」を開き、カードの要素の `getBoundingClientRect()`（カード・各入力欄・ボタンの top/height）を evaluate で取り、差が無いことを確かめる。

- [ ] **Step 6: コミット**

```bash
npx prettier --write <触った各ファイル>
git add -A src/app/shared/operation-post-card
git diff --cached --stat
git commit -m 'refactor: :recycle: 運用情報の投稿フォームをカードから切り出す'
```

---

### Task 9: 投稿ダイアログ

**Files:**
- Create: `src/app/shared/operation-post-dialog/operation-post-dialog.component.ts`
- Create: `src/app/shared/operation-post-dialog/operation-post-dialog.service.ts`
- Test: `src/app/shared/operation-post-dialog/operation-post-dialog.component.spec.ts`

**Interfaces:**
- Consumes: `OperationPostFormComponent`・`OperationPostInitialValue`（Task 8）
- Produces: `OperationPostDialogService.open(initialValue?: OperationPostInitialValue): MatDialogRef<OperationPostDialogComponent>`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { OperationPostFormComponent } from '../operation-post-card/operation-post-form.component';
import { OperationPostDialogComponent } from './operation-post-dialog.component';

describe('OperationPostDialogComponent', () => {
    let fixture: ComponentFixture<OperationPostDialogComponent>;
    const close = jest.fn();

    beforeEach(async () => {
        close.mockClear();
        await TestBed.configureTestingModule({
            imports: [OperationPostDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { operationNumber: '11' } },
            ],
        })
            .overrideComponent(OperationPostFormComponent, {
                set: { template: '', imports: [], providers: [] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationPostDialogComponent);
        fixture.detectChanges();
    });

    it('受け取った値をフォームに渡す', () => {
        const form = fixture.debugElement.query(
            By.directive(OperationPostFormComponent),
        ).componentInstance as OperationPostFormComponent;
        expect(form.initialValue()).toEqual({ operationNumber: '11' });
    });

    it('投稿に成功したら閉じる', () => {
        const form = fixture.debugElement.query(
            By.directive(OperationPostFormComponent),
        ).componentInstance as OperationPostFormComponent;
        form.submitted.emit();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('× で閉じる', () => {
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[aria-label="投稿ダイアログを閉じる"]',
        ) as HTMLButtonElement;
        button.click();
        expect(close).toHaveBeenCalledTimes(1);
    });
});
```

`overrideComponent(OperationPostFormComponent, …)` でフォームの中身（サービス注入）を消しても、constructor の `fetchData` と `inject` は走る。落ちるなら、Task 8 の form spec と同じ providers をここにも足す。

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-post-dialog" > .context/jest.txt 2>&1`
Expected: FAIL（部品が無い）

- [ ] **Step 3: ダイアログとサービスを書く**

`operation-post-dialog.component.ts`（見た目は `calendar-select-dialog` にそろえる）:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
    OperationPostFormComponent,
    OperationPostInitialValue,
} from '../operation-post-card/operation-post-form.component';

/** リアルタイム運用情報の投稿ダイアログ（右下の投稿ボタン・行の投稿ボタンから開く。2026-10-22） */
@Component({
    selector: 'app-operation-post-dialog',
    template: `
        <section class="tw-flex tw-flex-col tw-gap-4 tw-p-6">
            <header class="tw-flex tw-flex-row tw-items-center tw-justify-between">
                <h2 class="mat-h2 !tw-m-0">運用情報を投稿する</h2>
                <button
                    mat-icon-button
                    type="button"
                    aria-label="投稿ダイアログを閉じる"
                    (click)="close()"
                >
                    <mat-icon>clear</mat-icon>
                </button>
            </header>
            <app-operation-post-form
                [initialValue]="data"
                (submitted)="close()"
            ></app-operation-post-form>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, OperationPostFormComponent],
})
export class OperationPostDialogComponent {
    readonly #dialogRef = inject(MatDialogRef<OperationPostDialogComponent>);
    readonly data: OperationPostInitialValue =
        inject<OperationPostInitialValue | null>(MAT_DIALOG_DATA) ?? {};

    close(): void {
        this.#dialogRef.close();
    }
}
```

`operation-post-dialog.service.ts`:

```ts
import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationPostInitialValue } from '../operation-post-card/operation-post-form.component';
import { OperationPostDialogComponent } from './operation-post-dialog.component';

@Injectable({ providedIn: 'root' })
export class OperationPostDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        initialValue: OperationPostInitialValue = {},
    ): MatDialogRef<OperationPostDialogComponent> {
        return this.#dialog.open(OperationPostDialogComponent, {
            width: '560px',
            maxWidth: 'calc(100vw - 32px)',
            data: initialValue,
            autoFocus: 'first-tabbable',
        });
    }
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns="operation-post" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 5: コミット**

```bash
npx prettier --write src/app/shared/operation-post-dialog/operation-post-dialog.component.ts src/app/shared/operation-post-dialog/operation-post-dialog.service.ts src/app/shared/operation-post-dialog/operation-post-dialog.component.spec.ts
git add src/app/shared/operation-post-dialog
git commit -m 'feat: :sparkles: 運用情報の投稿ダイアログを足す'
```

---

### Task 10: リアルタイムに投稿ボタンを置き、投稿カードを外す

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.html`・`.ts`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.html`・`.ts`
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.html`・`.ts`
- Test: 上の 3 つの `.spec.ts`

**Interfaces:**
- Consumes: `OperationPostDialogService.open(initialValue)`（Task 9）

- [ ] **Step 1: 失敗するテストを書く**

運用順カードの spec に足す（既存の準備に `{ provide: OperationPostDialogService, useValue: { open } }` を足す。`const open = jest.fn();`）。

```ts
    it('行の投稿ボタンは、その運用番号を入れて投稿ダイアログを開く', () => {
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="row-post"]',
        ) as HTMLButtonElement;
        button.click();
        expect(open).toHaveBeenCalledWith({
            operationNumber: component.operation().operationNumber,
        });
    });
```

編成順カードの spec に足す。

```ts
    it('行の投稿ボタンは、所属と編成番号を入れて投稿ダイアログを開く', () => {
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="row-post"]',
        ) as HTMLButtonElement;
        button.click();
        expect(open).toHaveBeenCalledWith({
            agencyId: component.formation().agencyId,
            formationOrVehicleNumber: component.formation().formationNumber,
        });
    });
```

ページの spec に足す。

```ts
    it('右下の投稿ボタンは、空の投稿ダイアログを開く', () => {
        fixture.detectChanges();
        const fab = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="post-fab"]',
        ) as HTMLButtonElement;
        fab.click();
        expect(open).toHaveBeenCalledWith();
    });

    it('投稿カードを出さない', () => {
        fixture.detectChanges();
        expect(
            (fixture.nativeElement as HTMLElement).querySelector('app-operation-post-card'),
        ).toBeNull();
    });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns="operation-real-time" > .context/jest.txt 2>&1`
Expected: FAIL（ボタンが無い）

- [ ] **Step 3: 行の投稿ボタンを足す**

運用順カード（`operation-real-time-operation-card.component.html`）: 外側の grid の class の `tw-grid-cols-[auto_1fr_auto]` を `tw-grid-cols-[auto_1fr_auto_auto]` に替え、grid の最後の子として足す。

```html
    <!-- この運用を投稿する（2026-10-22）。運用番号を入れた状態でダイアログを開く -->
    <button
        mat-icon-button
        type="button"
        data-testid="row-post"
        class="tw-col-start-4 tw-row-span-3 tw-row-start-1 tw-self-center !tw-text-grey-600"
        [attr.aria-label]="operation().operationNumber + '運用を投稿する'"
        (click)="openPost()"
    >
        <mat-icon>edit_note</mat-icon>
    </button>
```

`.ts` に足す。

```ts
    readonly #postDialog = inject(OperationPostDialogService);

    openPost(): void {
        this.#postDialog.open({
            operationNumber: this.operation().operationNumber,
        });
    }
```

（`inject`・`MatButtonModule`・`MatIconModule`・`OperationPostDialogService` の import、`imports` 配列に `MatButtonModule`・`MatIconModule`。）

編成順カード（`operation-real-time-formation-card.component.html`）: `tw-grid-cols-[72px_1fr_auto]` を `tw-grid-cols-[72px_1fr_auto_auto]` に替え、同じボタンを足す（aria-label は `formation().formationNumber + 'を投稿する'`）。`.ts` の `openPost` は次。

```ts
    openPost(): void {
        this.#postDialog.open({
            agencyId: this.formation().agencyId,
            formationOrVehicleNumber: this.formation().formationNumber,
        });
    }
```

カードの中の行の数（`tw-row-span-3`）は、そのカードの grid の行数に合わせる。カードを開いて、行が 2 段のときと 3 段（履歴あり）のときで縦の中央に来ることを目視で確かめる。

- [ ] **Step 4: 右下の投稿ボタンを置き、投稿カードを外す**

`operation-real-time.component.html` の末尾の `<div><app-operation-post-card></app-operation-post-card></div>` を次に替える。

```html
    <!-- 投稿は右下の固定ボタンからダイアログで（ユーザー指示 2026-10-22「投稿までの手数を少なくしたい」）。
         最後の行を隠さないよう、main の下にボタンの高さ＋余白ぶん（56 + 16 + 16 = 88px）を空ける -->
    <div class="tw-h-[88px]" aria-hidden="true"></div>
    <button
        mat-fab
        extended
        type="button"
        data-testid="post-fab"
        class="!tw-fixed tw-bottom-4 tw-right-4 tw-z-40 md:tw-bottom-6 md:tw-right-6"
        (click)="openPost()"
    >
        <mat-icon>edit_note</mat-icon>
        投稿する
    </button>
```

`main` の `tw-gap-4` があるので、空け幅の div の上にも 16px 入る。最後の行とボタンの重なりは Step 6 で測る。

`.ts`: `imports` から `OperationPostCardComponent` を消し、`MatButtonModule`・`MatIconModule` を足す。

```ts
    readonly #postDialog = inject(OperationPostDialogService);

    openPost(): void {
        this.#postDialog.open();
    }
```

投稿カードの骨組みに関わる既存のコメント（運用順の表の「下の投稿カードを画面の外に置き」など）は経緯なので残す。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest --testPathPatterns="operation-real-time|operation-post" > .context/jest.txt 2>&1`
Expected: failed 無し

- [ ] **Step 6: 画面で確かめる（サンドボックス外）**

`/operation/real-time` を 390×844 と 1440×900 で開く。
- 右下に「投稿する」。ヘッダーと同じ紺で目立つか（Material の既定の色が白っぽく沈むなら、`!tw-bg-primary-900 !tw-text-white` 等でトップバーと同じ色にする。トップバーの色は `getComputedStyle` で取る。2026-10-22 の見本では rgb(0, 21, 86)）。
- 運用順・編成順の各行の右端に投稿ボタン。押すとダイアログに運用番号（編成順は所属と編成番号）が入っている。
- ページを一番下までスクロールし、最後の行の下端がボタンの上端より上にあること（`getBoundingClientRect` で比べる）。
- ダイアログの × と Esc で閉じる。
- 投稿の実地テストは本番に出るので**しない**（ユーザーの了承を得たときだけ）。
- スクリーンショットを `.context/verify-control-band/` に残す。

- [ ] **Step 7: コミット**

```bash
npx prettier --write <触った各ファイル>
git add src/app/pages/operation/operation-real-time
git commit -m 'feat: :sparkles: リアルタイムの投稿を右下のボタンと行のボタンからのダイアログにする'
```

### PR 3 の締め

- [ ] `npx jest > .context/jest-all.txt 2>&1` の `Tests:` 行・`npm run lint`（サンドボックス外）。
- [ ] 各ページの CLS を手元で測る（初回の骨組みの PR #263〜#265 と同じ手順）。帯が高くなったページ（全線・行路図）で 0.04 を超えたら、骨組みの帯の高さをそろえる。
- [ ] ユーザーに確認してから push・PR。

---

## 自己点検の結果

- spec の各項目 → Task: 検索カード撤去（4・5・6・7）、投稿 FAB とダイアログ（8・9・10）、前後の駅（2・4）、前後の運用（7）、今日（3・4・5・6・7）、全線の貼り付く切替（5）、全線への選択肢（4）、帯の差し込み口（1。取りやめ）、掟と ADR（0）、CLS（PR 3 の締め）。
- 前後の運用は分岐が無いので、帯の中の名前付きボタンは前後 1 つずつ出る。要約の行の ‹ › は 2026-10-22 のユーザー指示で取りやめた。
- store の関数名（`TimetableAllLineStore.setCalendarId`・`setTripDirection`、`OperationRouteDiagramStore.setOperationTrips`）は実物で確かめた。各 spec の既存の TestBed 設定は実装者が開いて写す（各 Step に明記した）。
