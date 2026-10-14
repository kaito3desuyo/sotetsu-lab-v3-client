# ADR-0008: v3 API への preconnect、ページの chunk の先読み、gtag の後回し

- **日時**: 2026-10-14
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: perf/preconnect-chunk-preload-defer-gtag

---

## 背景

- v2.12.0（ADR-0007）を出した後に、本番の Lighthouse（スマホ・推定）を測った。差は誤差の範囲だった。
- 本番の要求の時系列（運用表）を読むと、次のように直列に並んでいた。
  ```
  HTML → JS → maintenance（guard）→ token・profile → 2 段目の 6 本
  → ページの chunk → ページの API
  ```
  - ページの chunk を取りに行くのは、2 段目が終わった後だった（formations の完了 1000ms → chunk 1011ms）。Angular の router は、resolver が全部終わってから `loadComponent` を呼ぶからだ（`@angular/router` の `_router-chunk.mjs` で、`resolveData` の次の `switchTap`）。
  - v3 API は別 origin（`https://api.sotetsu-lab.com`）なのに、preconnect が無かった。
  - gtag.js（転送 159KB、展開 460KB）は `async` で、起動と同時に取りに行き、実行されていた。別 origin なので Service Worker には入らない。だから再訪でも毎回かかる。
- GA の web vitals を見ると、利用者はほぼ全員が再訪だった（LCP 82 件中 80 件）。Service Worker（ngsw）が、JS と index.html を端末の中から返している。
  - スマホの LCP: good 38 件（平均 約 1.3 s）、needs-improvement 8 件（約 3.1 s）、poor 8 件（約 6.8 s）。
  - Lighthouse の推定（初回訪問、6〜7 s）とは別物だ。

## 決定

### v3 API への preconnect

- `index.html` に `<link rel="preconnect" href="https://api.sotetsu-lab.com" crossorigin />` を足した。
- `crossorigin` は外せない。v3 API は、認証ヘッダー付きの CORS の fetch で呼んでいる。これが無いと、作った接続が使われない。
- `fonts.gstatic.com` には書かない。Quicksand の CSS を index.html に埋め込むとき、ビルドが自分で preconnect を足す（master の出力にもすでにある）。

### ページの chunk の先読み

- `core/resolvers/preload-route-components.ts` の `preloadRouteComponents(snapshot)` を新しく作った。行き先のルートを子孫まで辿り、`loadComponent()` を待たずに呼ぶ。
- `initialDataResolver` の先頭で、`state.root` を渡して呼ぶ。`loadChildren` は resolver より前の段で読み終わっている。なので、この時点で行き先の葉のルートまでそろっている。
- `import()` は、ブラウザがモジュールを使い回す。router が後で呼んでも、すぐ返る。
- 失敗（reject・同期の例外）は握りつぶす。router が自分で取り直し、いつもどおりのエラーになる。

### gtag の後回し

- `index.html` の `<script async src=".../gtag/js?id=...">` をやめた。代わりに、`load` の後の `requestIdleCallback`（`timeout: 3000`、無ければ `setTimeout`）で差し込む。
- `dataLayer` と `gtag()` の形は今のままにした。読み込み前の `gtag()` は `dataLayer` に積まれ、読み込まれたときにまとめて送られる。

## 見送ったこと

- **maintenance の確認を token・profile と同時に投げる**: guard の 1 往復は減る。ユーザーの判断で見送った。
- **SSR を速さのために入れる**: Service Worker が index.html を返すので、サーバーで描いた HTML は再訪では使われない。SSR は、検索・OGP・初回訪問のための別の判断にする。

## 結果

### 計測

master とこのブランチを、ADR-0007 と同じ設定でビルドした（`--configuration development --optimization`）。手元の API と backend につないで、3 回の中央値を取った。

- API が localhost なので、**preconnect の効果は手元では測れない**。本番の GA で見る。
- 手元の配信は圧縮していないので、絶対値は本番より大きい。比べるのは差だけにする。

**ページの chunk の取得開始（実ネットワーク、ms）**: 5 ページとも、2 段目の取得より前に移った。

| ページ | master | branch |
|---|---|---|
| top | 800 | 303 |
| table | 789 | 323 |
| station | 803 | 309 |
| train-diagram | 780 | 327 |
| train-location | 800 | 309 |

**gtag.js の取得開始（ms）**: master 10〜47 → branch 101〜144。`load` の後に移った。

**実際の LCP（絞りなし、ms）**: 5 ページとも 35〜75 ms 縮んだ。手元の回線は速いので、chunk を待つ時間がもともと短い。

| ページ | master | branch |
|---|---|---|
| top | 1047 | 972 |
| table | 984 | 948 |
| station | 2365 | 2313 |
| train-diagram | 1007 | 951 |
| train-location | 985 | 910 |

**Lighthouse スマホ、devtools で実際に回線と CPU を絞った LCP（ms）**: ページの chunk を、遅い回線で 2 段目の取得と同時に落とせるようになり、約 2.7 s 縮んだ。

| ページ | master | branch |
|---|---|---|
| train-diagram | 23717 | 21016 |
| train-location | 23632 | 20966 |

- top・table・station は、どちらかの側で描けずに終わった回（NO_FCP・セッション切れ）が多く、比べられなかった。ADR-0007 のときと同じで、手元の非圧縮の配信と絞りの組み合わせのせいだ。

**TBT（推定の回、ms）**: ほとんどのページで、差は揺れの範囲だった（top 823→785、station 1112→1094、train-diagram 1559→1542、train-location 699→713）。table だけ 489→601 と毎回 100 ms ほど多く出たが、原因は突き止めていない。

### デプロイ後に確かめること

- GA のリアルタイムで、page_view と LCP・INP・CLS が今までどおり届いていること。手元では master も branch も `/g/collect` が出なかったので、本番でしか確かめられない。
- デプロイ後 1 週間の GA の LCP（スマホ・rating 別・ページ別）を、v2.12.0 の週と比べる。
- gtag.js の読み込み前にタブを閉じた人のイベントは落ちる。page_view と LCP の件数が、少しだけ減るかもしれない。
