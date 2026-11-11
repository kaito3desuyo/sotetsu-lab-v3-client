# M25 使い方と用語 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** どのページからでもヘッダーの「?」で「このページの見方」を開け、そこから使い方 `/guide` と用語集 `/glossary` に進めるようにする。

**Architecture:**
- 「このページの見方」の文は、URL のパスから探す 1 つの表（`layout/page-help/`）に持つ。ルートの data は増やさない。
- ヘッダーの「?」が Material の Bottom Sheet を開く。
- 使い方と用語集は、免責事項と同じ形の静的なページ（HTML 直書き・`PageMeta`・SSR）にする。

**Tech Stack:** Angular 22（standalone・OnPush・signals）、Angular Material（`MatBottomSheet`）、Tailwind（`tw-` 接頭辞）、Jest 30。

**Spec:** `docs/superpowers/specs/2026-11-11-m25-guide-glossary-design.md`

## Global Constraints

- api は変えない。
- 既存の画面の情報を減らさない。常連の邪魔になる案内（毎回出るポップアップ・一覧を押し下げる枠）を出さない。
- 「?」はヘッダーのある全ページに出す。アカウントのボタンの左に置き、`mat-icon-button`、アイコンは `help_outline`、`aria-label="このページの見方"`。
- ヘッダーは 320px で要素の合計がちょうど画面の幅になっている。ボタンを足しても、ページ名が折り返さずヘッダーからはみ出さないこと。320・360・390px の実物で確かめる。
- URL は `/guide`（ページ名「使い方」）と `/glossary`（ページ名「用語集」）。
- GA のイベントは `help_open`（`page`: パスの型）と `help_link`（`page`: パスの型、`to`: `/guide` か `/glossary`）。パスの型は URL から `;` 以降の行列パラメータ・`?` 以降・`#` 以降を取り除いたもの。
- 文は HTML に直に書く。Markdown を描く仕組みや新しい依存を入れない。
- 事実に自信の無い所は、文の中に `【要確認】` と書いて画面に見えるようにする。ユーザーがすべて直し終えるまで PR をマージしない（1 本の PR で出す）。
- 文の根拠: 順送り = api `src/libs/operation/usecase/operation-number-circulation.ts`。推測の「?」・同日引き継ぎ・不明 = api `docs/superpowers/specs/2026-10-19-sighting-run-assignment-design.md` と `sighting-carry-over.read-model.ts`。出庫 ○・入庫 △ と画面の記号 = client `docs/design.md` と画面。直通先と運用番号の見分け方 = spec の該当章と `.context/m25-through-service-research.md`。client と api が食い違ったら api を正とし、ユーザーに報告する。
- Tailwind: `tw-bg-transparent` は生成されない（`[background-color:transparent]` を使う）。素の `<button>` には `[font-family:inherit]`。border には `tw-border-solid`。余白は 4px 単位。
- コミットは GPG 署名つき（サンドボックス外）、Conventional Commits＋絵文字、本文の末尾に Co-Authored-By と Claude-Session の 2 行。

## Review Focus

1. 行列パラメータ付きの URL（`/operation/table;calendar_id=…`）で開いたとき、そのページの見方が出ること（素のパスでしか引けないと、検索から入った人ほど外れる）。→ Task 1 のテスト。
2. 表に無いページ（`/login`・`/maintenance`・404・`/moderation/users/<id>`）でも「?」が動き、サイトの一言説明とリンクだけが出ること。→ Task 1・Task 2 のテスト。
3. 320px でヘッダーのページ名が折り返さないこと（一番長いページ名「リアルタイム運用情報」「過去の運用情報」で）。→ Task 3 の実物の確認。
4. 用語集へページ内リンク（`/glossary#junokuri`）で入ったとき、貼り付くヘッダーに見出しが隠れないこと。→ Task 5 のテストと実物の確認。
5. SSR の HTML に使い方・用語集の本文が入っていること（検索から来た人が最初に開くページになるため）。→ Task 6 の確認。

---

### Task 1: 「このページの見方」の表と、パスから説明を探す関数

**Files:**
- Create: `src/app/layout/page-help/page-help.ts`
- Test: `src/app/layout/page-help/page-help.spec.ts`

**Interfaces:**
- Produces:
  - `interface PageHelp { lines: string[] }`
  - `function toHelpPath(url: string): string`：`;` `?` `#` 以降を取り除き、末尾の `/` も取り除く（`/` だけは残す）。
  - `function findPageHelp(path: string): PageHelp | null`：表から完全一致で探す。無ければ `/moderation/users/` で始まるものは投稿者ページの説明、それ以外は `null`。
  - `const SITE_INTRO: string`：表に無いページで出す一言（「相鉄線の『どの編成が、どの列車に入るか』を、みんなの目撃で記録する非公式のサイトです。」を元に下書き）。
- 表のキー（説明を書くページ）: `/`、`/timetable/all-line`、`/timetable/station`、`/timetable/add`・`/timetable/update`・`/timetable/copy`（同じ説明を共有）、`/train-diagram`、`/train-location`、`/operation/real-time`、`/operation/past-time`、`/operation/table`、`/operation/route-diagram`、`/library/vehicle`、`/my-page`、`/moderation`、`/moderation/users/*`、`/register`、`/guide`、`/glossary`。
- 各ページの説明は 3〜5 行。実際の画面を開いて、見るべき所を具体的に書く（例: リアルタイムは「左の数字が運用番号、太字が編成番号…」）。自信の無い所は `【要確認】`。

- [ ] **Step 1: 失敗するテストを書く**
  - `toHelpPath('/operation/table;calendar_id=x;calendar_id=x')` → `'/operation/table'`
  - `toHelpPath('/timetable/station?x=1#a')` → `'/timetable/station'`
  - `toHelpPath('/')` → `'/'`、`toHelpPath('/guide/')` → `'/guide'`
  - `findPageHelp('/operation/real-time')?.lines.length` が 3 以上 5 以下
  - `findPageHelp('/timetable/add')` と `findPageHelp('/timetable/update')` と `findPageHelp('/timetable/copy')` が同じ中身
  - `findPageHelp('/moderation/users/abc')` が null でない
  - `findPageHelp('/login')`・`findPageHelp('/maintenance')`・`findPageHelp('/no-such-page')` が null
  - 表のすべての値の `lines` が 3〜5 行
- [ ] **Step 2:** `npx jest --testPathPatterns=src/app/layout/page-help` で FAIL を確かめる
- [ ] **Step 3:** `page-help.ts` を書く（文の下書きを含む）
- [ ] **Step 4:** 同じコマンドで PASS
- [ ] **Step 5:** コミット `feat: :sparkles: ページごとの見方の文と探す関数を足す`

### Task 2: 「このページの見方」のシート

**Files:**
- Create: `src/app/layout/page-help/page-help-sheet.component.ts`（テンプレートは同じ名前の `.html`）
- Test: `src/app/layout/page-help/page-help-sheet.component.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `findPageHelp`・`SITE_INTRO`
- Produces: `PageHelpSheetComponent`。`MAT_BOTTOM_SHEET_DATA` で `PageHelpSheetData { pageTitle: string; path: string }` を受ける。
- 見出し: `pageTitle` があれば「（pageTitle）の見方」、無ければ「Sotetsu Lab. の見方」。
- 本文: `findPageHelp(path)` の `lines`。null なら `SITE_INTRO` の 1 行。
- リンク: 「使い方 ›」（`/guide`）と「用語集 ›」（`/glossary`）。押すと `GoogleAnalyticsService.sendEvent('help_link', { page: path, to })` を送り、シートを閉じて遷移する（`routerLink` ＋ `MatBottomSheetRef.dismiss()`）。

- [ ] **Step 1: 失敗するテストを書く**
  - `{ pageTitle: 'リアルタイム運用情報', path: '/operation/real-time' }` で見出しが「リアルタイム運用情報の見方」、行の数が表と同じ
  - `{ pageTitle: 'ログイン', path: '/login' }` で本文が `SITE_INTRO`、リンクが 2 つ
  - `{ pageTitle: '', path: '/' }` で見出しが「Sotetsu Lab. の見方」、本文はトップ（`/`）の説明の行
  - 「用語集 ›」を押すと `sendEvent('help_link', { page: '/operation/real-time', to: '/glossary' })` と `dismiss()` が呼ばれる
- [ ] **Step 2:** `npx jest --testPathPatterns=src/app/layout/page-help` で FAIL
- [ ] **Step 3:** 部品を書く。見た目は docs/design.md の既存のシート・カードに合わせる
- [ ] **Step 4:** PASS
- [ ] **Step 5:** コミット `feat: :sparkles: このページの見方のシートを足す`

### Task 3: ヘッダーの「?」

**Files:**
- Modify: `src/app/layout/components/header/header.component.html`（アカウントのボタンの直前）
- Modify: `src/app/layout/components/header/header.component.ts`
- Modify: `src/app/layout/components/header/header.component.spec.ts`
- Modify: `docs/design.md`（ヘッダーの節に「?」を書き足す。prettier はかけない）

**Interfaces:**
- Consumes: Task 2 の `PageHelpSheetComponent`・`PageHelpSheetData`、Task 1 の `toHelpPath`
- ヘッダーは既存の `pageTitle` 入力を使う。パスは `Router.url` を `toHelpPath` で変換する。
- 押すと `MatBottomSheet.open(PageHelpSheetComponent, { data: { pageTitle, path } })` と `sendEvent('help_open', { page: path })`。

- [ ] **Step 1: 失敗するテストを書く**
  - `button[aria-label="このページの見方"]` があり、アカウントのボタンより前にある
  - Router の url が `/operation/table;calendar_id=x` のとき、押すと `open` が `{ data: { pageTitle: <入力の値>, path: '/operation/table' } }` で呼ばれ、`sendEvent('help_open', { page: '/operation/table' })` が呼ばれる
- [ ] **Step 2:** `npx jest --testPathPatterns=src/app/layout/components/header` で FAIL
- [ ] **Step 3:** 実装し、docs/design.md に書き足す
- [ ] **Step 4:** PASS
- [ ] **Step 5: 実物の確認**（Playwright。手元の画面の通信を本番に振り向け、書き込みは止める）
  - 320・360・390px で、`/operation/real-time`・`/operation/past-time`・`/` のヘッダーの h1 が 1 行（高さが 1 行分）で、右端がはみ出さないことを DOM で測る
  - 「?」を押してシートが出ることをスクショで確かめる
  - 折り返すなら、ボタンを詰める案を実物の複製で並べてユーザーに見せる（勝手に文字を削らない）
- [ ] **Step 6:** コミット `feat: :sparkles: ヘッダーにこのページの見方のボタンを置く`

### Task 4: 使い方のページ `/guide`

**Files:**
- Create: `src/app/pages/guide/guide.component.ts`・`.html`・`.spec.ts`、`src/app/pages/guide/guide.route.ts`
- Create: `src/app/pages/guide/components/operation-flow-figure/`（運用の流れの図。SVG か HTML かは作る人が決める）
- Modify: `src/app/app.route.ts`（`disclaimer` の隣に `guide`）、`src/app/app.routes.server.ts`（`disclaimer` と同じ `RenderMode.Server`・`headers: LONG`）、`src/sitemap.xml`、`src/app/layout/components/sidenav/sidenav.component.html`（「このサイトについて」の先頭に「使い方」「用語集」）と同じ spec

**Interfaces:**
- 形は `DisclaimerComponent` に合わせる（`PageMeta.set({ title: '使い方', description, url: '/guide' })`、route の `data.title: '使い方'`、`<main>` と `mat-typography` の枠）。
- 本文の組み立て（spec「作るもの 2」）:
  1. 相鉄の運用の流れ（図 1 枚）: 運用と運用番号 / 運用群と車両の会社 / 編成 / ダイヤで決まることと日ごとに変わること / 目撃 / 推測の「?」（順送り・同日引き継ぎ）/ 出庫 ○・入庫 △ / 直通先の各線での扱い / 運用番号の見分け方（JR 線内では列車番号なので「列車から選ぶ」を案内）
  2. やりたいこと別の使い方（各ページへのリンク付き）
  3. 用語集へのリンク
- 図: 運用 → 編成 → 目撃 → 推測の関係と、順送りの輪を 1 群（11→12→…→16→11）で例示。320px で読めること。

- [ ] **Step 1: 失敗するテストを書く**
  - `PageMeta.set` が `{ title: '使い方', url: '/guide' }` を含んで呼ばれる
  - 見出しに「相鉄の運用の流れ」「やりたいこと別の使い方」がある
  - `a[href="/glossary"]` がある
  - 本文に「11」から「16」までの順送りの例と、「列車から選ぶ」の案内がある
  - sidenav の spec: `a[href="/guide"]` が「使い方」、`a[href="/glossary"]` が「用語集」
- [ ] **Step 2:** `npx jest --testPathPatterns="src/app/pages/guide|sidenav"` で FAIL
- [ ] **Step 3:** 実装し、本文を下書きする（`【要確認】` の扱いは Global Constraints）
- [ ] **Step 4:** PASS
- [ ] **Step 5:** コミット `feat: :sparkles: 使い方のページを足す`

### Task 5: 用語集のページ `/glossary`

**Files:**
- Create: `src/app/pages/glossary/glossary.component.ts`・`.html`・`.spec.ts`、`glossary.route.ts`
- Modify: `src/app/app.route.ts`、`src/app/app.routes.server.ts`、`src/sitemap.xml`

**Interfaces:**
- 形は Task 4 と同じ（`title: '用語集'`、`url: '/glossary'`）。
- 用語ごとに見出し（`h3`）を付け、英字の id を振る: `unyo`（運用）、`unyo-bango`（運用番号・運番）、`unyo-gun`（運用群）、`hensei`（編成）、`mokugeki`（目撃）、`suisoku`（推測の「?」）、`junokuri`（順送り）、`dojitsu-hikitsugi`（同日引き継ぎ）、`fumei`（不明）、`shukko`（出庫 ○）、`nyuko`（入庫 △）、`kyusha`（休車 100）、`chokutsu`（直通・直通先の各線での扱い）、`shubetsu`（種別）。画面で見つけた記号（◆ など）は id を足して載せる。
- 見出しは貼り付くヘッダーに隠れないよう `[scroll-margin-top:64px]`（md 以上は 80px）。
- フラグメント付きで入ったときは、部品の中で `ActivatedRoute.fragment` を読み、描画後に該当の見出しへ `scrollIntoView()` する（アプリ全体の `anchorScrolling` は変えない）。
- 運用群の表: spec「運用群の事実」の今のダイヤの行（7 群は 70〜73 相鉄車・74〜79 JR 車の 2 行）。過去の群（2・4・9 群、5G・8G）は表の下に 1 行ずつ。順送りの表は spec「ユーザーが決めたこと 5」のとおり。

- [ ] **Step 1: 失敗するテストを書く**
  - `PageMeta.set` が `{ title: '用語集', url: '/glossary' }` を含む
  - 上の id がすべて存在する
  - 順送りの節に「70 → 71 → 72 → 73 → 70」があり、順送りの無い群として「8 群」「K 群」がある
  - 運用群の表に「74〜79」と「JR 車」が同じ行にある
  - fragment が `junokuri` のとき、`#junokuri` の要素の `scrollIntoView` が呼ばれる
- [ ] **Step 2:** `npx jest --testPathPatterns=src/app/pages/glossary` で FAIL
- [ ] **Step 3:** 実装し、本文を下書きする
- [ ] **Step 4:** PASS
- [ ] **Step 5:** コミット `feat: :sparkles: 用語集のページを足す`

### Task 6: 通しの確認と文のレビュー

- [ ] **Step 1:** `npx jest`（全件）・`npx ng lint`・`npm run build:prod` がすべて通る
- [ ] **Step 2: 実物の確認**（Playwright、390px と 320px）
  - `/guide`・`/glossary`・`/glossary#junokuri`（見出しがヘッダーの下に見える）・各ページの「?」のシート
  - SSR: `npm run build:prod` の出力を手元で起動するか dev の SSR で、`/guide` と `/glossary` の HTML に本文の見出しが入っていることを確かめる
- [ ] **Step 3:** `【要確認】` の一覧（場所と問い）を作り、スクショと一緒にユーザーに見せる。ユーザーの答えで直し、`【要確認】` が 0 件になるまで繰り返す（`grep -rn "要確認" src/app` が 0 件）
- [ ] **Step 4:** コミット `docs: :memo: 使い方と用語集の文を確かめた内容に直す`（コミットの型は直した内容に合わせる）
- [ ] **Step 5:** PR を作る（milestone「M25 使い方と用語」が GitHub に無ければ作る）。本文に GA で前後を比べる見方（spec「目標」）を書く
