# ダイヤグラムの component を割る Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pages/train-diagram/train-diagram.component.ts`（1,460 行）を、図の組み立て（純関数）・URL と状態の行き来・取得に分け、component を 400 行前後にする。あわせて、線の組み立ての長いタスク（初回 641ms・SPA 移動 731ms、CPU 4 倍）を方向ごとに分けて測り直す。

**Architecture:** 図の組み立ての computed の鎖（`#chainObservations` から `selectedTripInfo` まで約 45 本）を `utils/build-diagram-model.util.ts` の純関数 1 本に出し、component は `computed(() => buildDiagramModel(...))` で受ける。URL の parse・既定値・書き換えは `utils/train-diagram-url.util.ts`、`fetchData` は既存の `services/train-diagram.service.ts` へ移す。動きは変えない。

**Tech Stack:** Angular 22（signals）、Jest。

**Spec:** 無し。根拠は `.context/review-2026-11-12/fable-code.md` の 4-1 と `fable-performance.md` の P8。

## Global Constraints

- 動きと見た目を変えない。線の本数・座標・選択の情報を、割る前と同じ値で出す（Task 1 の照合の spec で固定する）。
- 既存の `utils/*.util.ts` の純関数とその spec は変えない。新しい純関数はそれらを呼ぶだけにする。
- 手書きのメモ化（`#observationCache`）は、純関数の外（component）に残す。純関数は同じ入力に同じ出力を返すだけにする。
- `RouteStationListState` を effect で page store に写す所（fable-code 1-3）は、store が直接読む形に直す。これだけは今回まとめて直す。

## 決めたこと

- 純関数の入力: `{ tripBlocksByDirection, routeStations, stationNameById, pxPerMinute, axisPxPerMinute, directionFilter, selectedTripId, now }`。出力: `{ stationRows, bodyHeight, diagramLines, turnbackLinks, hasDeadhead, hasDepotOut, hasDepotIn, hasTransfer, selectedTripInfo, tripIdsByChainOf }`。今の computed の公開名と同じ名前にする。
- P8 は、割ったあとで `buildDiagramModel` を方向ごとに 2 回呼んで結果を合わせる形にできるかを Task 4 で測る。合わせられない（折り返しの線が方向をまたぐ）なら、Worker には移さず、測った数字を ADR に残して終える。

## Review Focus

- 0 時台をまたぐ列車の線と、折り返しの点線が、割る前と同じ座標になること。
- URL に不正な値（`px_per_minute=abc`、存在しない `route_id`）があるとき、今と同じ既定値に正規化して `replaceUrl` すること。
- 投稿の後の目撃の取り直しで、選択中の列車の情報が消えないこと。
- 方向の絞り込みを切り替えたとき、選択中の列車が別の方向なら選択を外すこと（今の動き）。
- SSR で描いた線と hydration 後の線が同じであること（NG0500 系の警告が出ないこと）。

---

### Task 1: 照合の spec を先に作る

**Files:**

- Create: `src/app/pages/train-diagram/train-diagram.snapshot.spec.ts`
- Create: `src/app/pages/train-diagram/testing/diagram-fixture.ts`（平日・上下・0 時台を含む小さな trip-blocks と路線の駅）

- [ ] **Step 1: 今の component を TestBed で描き、fixture を入れたときの `diagramLines()`・`turnbackLinks()`・`stationRows()`・選択した列車の `selectedTripInfo()` を JSON にして `toMatchSnapshot()` で残す。**
- [ ] **Step 2: 2 回流して snapshot が揺れないことを確かめる。**
- [ ] **Step 3: コミット** `test: :white_check_mark: ダイヤグラムの線の組み立ての照合を足す`

### Task 2: 図の組み立てを純関数に出す

**Files:**

- Create: `src/app/pages/train-diagram/utils/build-diagram-model.util.ts` と `.spec.ts`
- Modify: `src/app/pages/train-diagram/train-diagram.component.ts`

**Interfaces:**

- Produces: `buildDiagramModel(input: DiagramModelInput): DiagramModel`（型は「決めたこと」の項目どおり）

- [ ] **Step 1: spec を書く** — fixture で Task 1 の snapshot と同じ値が出る／列車が 0 本で空の結果／方向の絞り込みで片側だけ。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: computed の鎖の本体を移し、component は 1 本の computed とそれを分ける computed だけにする**
- [ ] **Step 4: Task 1 の snapshot が変わらずに通ることを確かめる**
- [ ] **Step 5: コミット** `refactor: :recycle: ダイヤグラムの図の組み立てを純関数に出す`

### Task 3: URL と状態の行き来・取得・駅の写しを移す

**Files:**

- Create: `src/app/pages/train-diagram/utils/train-diagram-url.util.ts` と `.spec.ts`
- Modify: `src/app/pages/train-diagram/services/train-diagram.service.ts`・`.spec.ts`、`stores/train-diagram.store.ts`、component

**Interfaces:**

- Produces: `parseTrainDiagramParams(paramMap: ParamMap, defaults: TrainDiagramDefaults): { params: TrainDiagramParams; needsReplace: boolean }`、`formatTrainDiagramParams(params: TrainDiagramParams): Params`、`TrainDiagramService.fetchData(flags): Promise<void>`

- [ ] **Step 1: spec を書く** — 今の constructor の `paramMap` の購読が扱う値ごと（既定値・不正値・正規化で `replaceUrl`）に、parse の結果と `needsReplace` を固定する。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: 移す。store は `RouteStationListState` を `withComputed` の中で `inject` して読み、component の effect と `setRouteStations` を消す。**
- [ ] **Step 4: 全 jest・lint・`tsc -p tsconfig.app.json`、Task 1 の snapshot が通ることを確かめる。component の行数を記録する。**
- [ ] **Step 5: コミット** `refactor: :recycle: ダイヤグラムの URL と取得を component から出す`

### Task 4: 長いタスクを測り、方向ごとに分けられるか決める

**Files:**

- Create: `docs/adr/0026-train-diagram-model.md`

- [ ] **Step 1: 手元の dev（CPU 4 倍）で、初回と SPA 移動の `buildDiagramModel` の時間を Performance の記録で取る（割る前の 641ms・731ms と比べる）。**
- [ ] **Step 2: 方向ごとに 2 回呼んで合わせた結果が Task 1 の snapshot と同じになるかを spec で試す。同じなら、2 本目を `requestIdleCallback` で後に回し、最長のタスクを測り直す。違うなら戻す。**
- [ ] **Step 3: どちらにしたかと数字を ADR に書き、コミット** `docs: :memo: ダイヤグラムの図の組み立ての ADR を足す`
