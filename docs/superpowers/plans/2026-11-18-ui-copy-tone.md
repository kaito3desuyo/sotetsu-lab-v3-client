# 画面の文言の文体を少し硬くする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** client の画面の文言を、spec で決めた文体（です・ますのまま、定着した漢語で書く）にそろえる。

**Architecture:** 文体の決まりを `docs/style-profile.md` に書き、`CLAUDE.md` から指す。そのうえで、画面の文言を場所ごとに 1 文ずつ読んで直し、文言を見ている spec を同じコミットで直す。仕組み（定数化・i18n）は変えない。

**Tech Stack:** Angular 22（html テンプレートと ts の文字列）、Jest 30、natural-japanese の lint。

**Spec:** `docs/superpowers/specs/2026-11-18-ui-copy-tone-design.md`

## Global Constraints

- 文末は「です・ます」。「である」調にはしない
- 使う語：表示する・選択する・指定する・移動する・反映する・変更する・推定・目撃情報・充当・箇所・区間・記号・利用者・現在・のみ
- 柔らかすぎて使わない：「出る」（→表示される）、「移る」（→移動する）、「押す」（→選択する）、「入っている」（→充当されている）、「みんなの」（→利用者の）、「〜の人」（→利用者・権限を持つ利用者）、「いま」（→現在）、「替わる」（→変更される・差し替えられる）、「だけ」（→のみ）、「所」（→箇所）、「印」（→記号）
- 硬すぎて使わない：「当該」「該当する」（→その）、「本サイト」「本画面」（→このサイト・この画面）、「経由する」（→通る）、「以後の」、「〜であるほど」
- 読み手がふだん使わない漢語に置き換えて読みにくくなるなら、今の言葉を残す
- 語を一括置換しない。1 文ずつ読んで直す（「だけでなく」「見るだけで」のように「のみ」にすると不自然な使い方がある）
- 変えないもの：コードのコメント、テストの名前、docs/、GA のイベント名と値、ログ、api が返す文言、免責事項、プライバシーポリシー、ライブラリ（`src/app/pages/library/`。ユーザーが自分で書いた文章）、帯の「開く」「畳む」、「運番変更」、ページの名前、ナビの項目名、目撃・運用・列車番号などのサイトの用語、短く定着した 1 語のボタンやラベル（「保存」「検索」「戻る」など。使わない言い方に当たるときだけ直す）
- 文言は今ある html と ts の中で直す。定数化も i18n もしない
- spec の例文の硬さを手本にする（例：「運用番号を押すと、その運用の行路図に移ります。」→「運用番号を選択すると、その運用の行路図へ移動します。」）
- client jest は関係する spec だけを `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=<paths>` で流す。全体は流さない（ターミナルが固まる）
- prettier はファイル単位：`npx prettier --check <files>`
- コミットは署名付き（サンドボックスの外）、メッセージは `.context/` のファイルから `-F` で渡す。末尾に次の 2 行を付ける

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxksuqCpWLTXCFvmXt2nKt
```

## Review Focus

- 文字数が増えたボタン・チップ・タブ・表の見出しが折り返したり、はみ出したりする。狭い画面（幅 375px）でも 1 行に収まるのが期待される
- 「だけ」「所」「印」「出る」を含む別の語（「だけでなく」「場所」「印刷」「出庫」）を誤って直す。意味は元のままが期待される
- `aria-label` や `title` 属性、`matTooltip`、snackbar の文言のように、テンプレートの本文以外にある文言の直し漏れ
- spec が `toContain` などで部分一致を見ていて、文言を直しても通ってしまい、古い文言の確認が残る
- 同じ意味の文言が、ページによって違う言い方に分かれる（例：あるページは「表示します」、別のページは「出ます」のまま）

---

## 全タスクに共通する手順

タスク 2〜7 は、対象のファイルを変えるだけで、手順は同じ。

1. 対象のファイルの、利用者に見える文言と読み上げ用の文言（テンプレートの本文、`aria-label`・`title`・`matTooltip`・`placeholder`、ts の snackbar・ダイアログ・エラーの文字列）を 1 文ずつ読み、Global Constraints に沿って直す。コメントは触らない
2. 直した文言の、直す前の文を探して、spec が見ているかを確かめる：`grep -rlF '<直す前の文の一部>' src --include='*.spec.ts'`
3. 関係する spec を流す。直す前の文を見ている spec は落ちる：`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=<対象の spec>`。Expected：直す前の文を見ている spec だけが FAIL
4. spec の期待値を新しい文言に直し、もう一度流す。Expected：PASS
5. 直した文を書き出し、natural-japanese の lint にかける：`git diff -U0 -- <files> | grep '^+' | grep -v '^+++' > .context/tone-task-N.txt`、`uv run <natural-japanese>/scripts/lint.py --genre tech .context/tone-task-N.txt`。和語に開く方向の指摘は `docs/style-profile.md` に従って退け、それ以外を直す
6. `npx eslint <files>` と `npx prettier --check <files>` が通る
7. 使わない言い方が残っていないかを確かめる：`grep -nE '出ます|出る|移ります|押す|押して|入っている|みんな|の人|いま|替わ|当該|該当|本サイト|本画面|経由' <files>`。残ったものは、コメント・サイトの用語・別の語の一部（「出庫」など）であることを確かめる
8. 署名付きでコミットする。メッセージは `refactor: :pencil2: <場所>の文言の文体を硬くする`

---

### Task 1: 文体の決まりを書く

**Files:**
- Create: `docs/style-profile.md`
- Modify: `CLAUDE.md`（末尾に「## 画面の文言」の節を足す）

**Interfaces:**
- Produces: `docs/style-profile.md`。タスク 2〜7 と、今後の画面の文言はこれに従う

- [ ] **Step 1: `docs/style-profile.md` を書く**

中身は spec の「決めた文体」の決まりと例文の表を写す。冒頭に「client の画面の文言（テンプレート・aria-label・title・meta・通知）の文体。natural-japanese で画面の文言を書く・直すときはこのファイルに従う。和語に開く方向の指摘はこの決まりを優先する」と書く。対象にしないもの（spec の「範囲」）も写す。

- [ ] **Step 2: `CLAUDE.md` に節を足す**

```markdown
## 画面の文言

画面の文言（テンプレート・aria-label・title・meta・通知）は `docs/style-profile.md` の文体で書く。natural-japanese で書く・直すときも、このファイルを文体プロファイルとして読む。
```

- [ ] **Step 3: natural-japanese の lint を `docs/style-profile.md` にかけ、yomiyasu で推敲する**

Expected：lint の指摘を直すか、理由を付けて残す。

- [ ] **Step 4: コミット**

メッセージ：`docs: :memo: 画面の文言の文体の決まりを書く`

### Task 2: 説明文（ヘッダーの「?」・使い方・用語集）

**Files:**
- Modify: `src/app/layout/page-help/page-help.ts`、`src/app/pages/guide/**`、`src/app/pages/glossary/**`（spec を除く。spec は共通の手順 4 で直す）

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1〜8: 共通の手順**

ここが spec の例文の出どころ。page-help.ts の中のリアルタイム運用情報（`/operation/real-time`）の説明文も、このタスクで直してよい（ページ本体ではなく、ヘッダーの説明文なので）。用語集の id（`noriutsuri` など）と見出しの語は変えない。

### Task 3: 閲覧のページ

**Files:**
- Modify: `src/app/pages/timetable/{timetable-all-line,timetable-station,timetable-formation,timetable-operation}/**`、`src/app/pages/operation/{operation-table,operation-route-diagram,operation-past-time}/**`、`src/app/pages/train-diagram/**`、`src/app/pages/train-location/**`、`src/app/pages/dashboard/**`

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1〜8: 共通の手順**

量が多いので、コミットはページごとに分けてよい。`operation-real-time` はここで触らない（Task 7）。

### Task 4: 投稿・アカウント・投稿管理

**Files:**
- Modify: `src/app/pages/timetable/timetable-edit-form/**`、`src/app/pages/login/**`、`src/app/pages/register/**`、`src/app/pages/my-page/**`、`src/app/pages/moderation/**`

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1〜8: 共通の手順**

### Task 5: 共通の部品・通知・エラー・空の表示

**Files:**
- Modify: `src/app/shared/**`、`src/app/core/**`（`core/ssr/page-meta.ts` は Task 6）、`src/app/layout/**`（`page-help` は Task 2）、`src/app/libs/**` と `src/app/global-states/**` の利用者に見える文字列、`src/app/pages/{maintenance,load-error,not-found}/**`

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1〜8: 共通の手順**

libs と global-states は、snackbar やエラーとして画面に出る文字列だけを直す。

### Task 6: title と meta

**Files:**
- Modify: `src/index.html`、`src/app/core/ssr/page-meta.ts`、各 `*.route.ts` の `title` と meta の description

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1〜8: 共通の手順**

ページの名前（title の「編成別時刻表 - Sotetsu Lab. v3」の部分など）は変えない。直すのは description の文だけ。

### Task 7: リアルタイム運用情報（ロック済み）

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/**`

**Interfaces:**
- Consumes: `docs/style-profile.md`

- [ ] **Step 1: 直す案を一覧にする**

ファイルは変えずに、変える文言を「ファイル:行 / 今 / 直した形」の表にして `.context/tone-realtime.md` に書く。

- [ ] **Step 2: ユーザーに一覧を見せ、了承を得る**

了承を得るまで次に進まない（ロック済みのページの決まり）。直せと言われた所は表を直して見せ直す。

- [ ] **Step 3〜8: 共通の手順の 2〜8**

了承された表のとおりに直す。

### Task 8: 全体の確認

- [ ] **Step 1: 使わない言い方を全体で探す**

Run：`grep -rnE '出ます|移ります|押すと|押して|入っている|みんなの|の人は|当該|該当する|本サイト|本画面|経由' src/app src/index.html --include='*.html' --include='*.ts' | grep -v '\.spec\.ts' | grep -v 'pages/library/'`
Expected：残ったものは、すべてコメントか、変えないものに当たる。

- [ ] **Step 2: ビルドと lint**

Run：`npm run lint` と `npm run build:prod`
Expected：どちらもエラーなし。

- [ ] **Step 3: 画面を見る**

手元の ng serve で、Task 2〜7 で触ったページを幅 1280px と 375px で開き、文言の折り返しやはみ出しが無いかを見る。ボタン・チップ・タブ・表の見出しを重点に見る。はみ出しがあれば、文言を短くするか元の語に戻して、そのタスクの場所にコミットを足す。
