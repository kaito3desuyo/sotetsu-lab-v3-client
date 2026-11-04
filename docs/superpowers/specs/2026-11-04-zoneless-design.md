# zoneless 化 設計

2026-11-04。M2 SSR の残り。ブランチ `refactor/zoneless`（client）。

## 狙い

ユーザーの言葉で「両方」:

1. **重さを減らす。** 2026-10-28 の試し（`spike/zoneless`・CPU 4x・各 2 回）では、駅別の TBT 1.21 → 1.00 s、hydration は駅別 547 → 352 ms・運用表 312 → 207 ms。他のページは誤差。初期転送 gzip は 292.6 → 280.7 kB（polyfills 11.7 kB が消える）。
2. **土台を新しくする。** Angular v21 から zoneless が既定（公式ガイド `adev/src/content/guide/zoneless.md`、2026-11-04 に context7 で確認）。今は `main.ts`・`main.server.ts` が `provideZoneChangeDetection()` で既定を打ち消して zone.js を使っている。

## 避けること（anti-goal）

- **毎秒書き換わる画面が、エラーも出さずに止まること。** リアルタイム運用情報・列車位置・時計など。ユーザーが挙げた失敗はこれだけで、いちばん重く見る。
- SSR の HTML が変わること（データが入る前の HTML を返す等）。

## やること

- `main.ts`・`main.server.ts` から `provideZoneChangeDetection()` を外す（v22 の既定＝zoneless に戻す）。`provideZonelessChangeDetection()` は書かない（既定なので要らない。ガイドの v21+ の手順どおり）。
- `angular.json` の `polyfills` から `zone.js` を外す（build・test の両方。今は build に 1 か所）。`package.json` から `zone.js` を消す（`npm uninstall zone.js`）。`src/polyfills.ts`（`import 'zone.js'` だけの雛形）を消し、`tsconfig.app.json` の `files` からも外す（残すと tsc が落ちる）。
- polyfills のチャンクが出なくなる。デプロイの `.github/workflows/deploy-on-push-version-tags.yml` は `--include "polyfills-*.js"` で長いキャッシュを付けるだけなので、該当が無くても害は無い（直さない）。
- `core/utils/run-interval-in-browser.ts` の `NgZone.run` を外す。tick はストアの signal を書くので、zone が無くても描き直しは signal から予約される。コメントも今の仕組みに合わせて直す。
- jest を zoneless に: `setup-jest.ts` の `jest-preset-angular/setup-env/zone` を `.../zoneless`（jest-preset-angular 16.2.0 に有る）に替える。`fakeAsync`・`waitForAsync` を使う spec 4 本（運用行路図の描画・免責事項・プライバシーポリシー・ライブラリ車両）を zone 無しで書き直す。他に落ちる spec は全体を流して洗い出し、1 本ずつ直す（`fixture.detectChanges()` 頼みの所など）。
- ADR-0022 を書く（zone.js を外した理由・確かめたこと・計測）。

## 今のコードの下調べ（2026-11-04・master 17f0fbc3）

- 部品 92 個すべて `OnPush`。`| async` は 0。状態は signal ストア。
- `NgZone` を使うのは `run-interval-in-browser.ts` だけ。
- `markForCheck` は時刻表入力の trips 部品に 3 か所（zoneless でも効く）。
- `setTimeout` は長押しメニュー（メニューを開くだけ）・ダイヤグラムのスクロール待ち（`emit` だけ）・設定保存の間引き・GA・スクロール位置・`wait()`。どれも画面の値を signal の外で書いていない見込み（実装で 1 つずつ確かめる）。
- SSR の待ち: v22 の `whenStable()` は PendingTasks で決まる。HttpClient とルーターの遷移（guard・resolver）は PendingTasks に乗る。supabase の `fetch` や localforage は乗らないので、**guard・resolver の外で待っている非同期**があれば、SSR がそれを待たずに描く。ここは下の「確かめ方」で全ページの HTML を比べて見る。

## 確かめ方（完了の条件）

jest が緑なだけでは完了にしない（M29 で jest 緑でも本番ビルドでしか出ないバグがあった）。

1. `npx jest` 全体・`tsc`・`npm run lint`・`npm run build:prod` が通る。
2. **毎秒の画面が止まらない:** 本番ビルドを手元で実データにつなぎ、リアルタイム運用情報・列車位置（ほかに `runIntervalInBrowser` を使う所すべて）を数分開いたまま、時刻・在線が進むことを見る。タブを裏に回して戻したときも見る。
3. **操作で画面が変わる:** 全ページを一通り操作する（絞り込み・ダイアログ・投稿・長押しメニュー・時刻表入力の行の追加と削除・ダイヤグラムのスクロール・マイページのもっと見る）。
4. **SSR の HTML が同じ:** sitemap の公開 10 ページ＋主なページを、master のビルドと zoneless のビルドで SSR させ、HTML を比べる（ハッシュの付く属性やトークンなど毎回変わる所は除く）。手元は本番 DB を読むので、API の応答は固定しない。2 つのビルドを同じ API に向けて立て、1 ページずつ master → zoneless と続けて取る（時刻で変わる所の差を小さくする）。差が出たら 1 つずつ見て、データの動きか、zoneless のせいかを分ける。
   - **zoneless のせいで差が出たら（データが入る前の HTML など）、この PR の中で直す。** 待たせたい非同期を `PendingTasks`（`inject(PendingTasks).run(...)`）に乗せて、SSR がそれを待つようにする。zone.js が今していた「描く前に待つ」を明示に置き換えるだけなので、範囲内とする（私の判断）。直せない差が残ったら、PR を止めてユーザーに相談する。
5. **圏外:** Service Worker を有効にして、圏外で開いたときに保存から戻した表示が出る（M29 と同じ手順）。
6. **計測:** 試しと同じ台（`sotetsu-lab-v3-client/.context/ssr-enable/prof/`）で、駅別・運用表の TBT と hydration、初期転送量を master と比べる。悪くなっていないこと。

## やらないこと

- 部品の書き換え（signal 化・`OnPush` 化）は、上の確かめで止まる所が見つかったときだけ、その部品に限って行う。
- SSR の `renderQueue`（server.ts）は触らない。

## 出し方

PR 1 本・M2 マイルストーン。版は refactor/perf だけなので patch。デプロイ後に本番でリアルタイムを数分見る。

## 作り手に任せること

- spec の書き直しの細かいやり方（`fakeAsync` を `jest.useFakeTimers` にするか、`await fixture.whenStable()` にするか）。
- HTML 比べのスクリプトの書き方（置き場は `.context/`）。
