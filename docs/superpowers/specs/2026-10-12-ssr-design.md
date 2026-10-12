# SSR の導入 設計

- 日付: 2026-10-12
- 対象: sotetsu-lab-v3-client / sotetsu-lab-v3-infrastructure
- 状態: 設計合意済み・spec レビュー待ち

## 1. 目的

次の 3 つをすべて満たす。

- A. 検索に載る（駅別時刻表・運用表・列車番号などのページが検索で出る）
- B. SNS で共有したときに、ページごとの題名・説明が出る（OGP）
- C. 最初の表示を速くする（特にスマホ）

## 2. 前提として確かめたこと

### 2.1 これまでの経緯

- 2024-11-02 に SSR を入れ（6442c4eb）、SSR の邪魔になるところを直し（22aeab90）、同じ日に止めた（3ee2de54「一旦SSRを無効化する」）
- 止めた理由（ユーザー談）: **API リクエストが多すぎて、かえって遅くなった**
- 見立て（推測・当時の記録なし）: 全ページを毎回サーバーで描いていた。real-time のようにすぐ古くなるページまでアクセスのたびに API を叩き、SSR と API の Lambda の寝起きが重なった
- 部品は残っている: `angular.json` の `server: src/main.server.ts`、`server.ts`、`app.config.server.ts`（`provideServerRendering()`）、`app.config.ts` の `provideClientHydration(withNoIncrementalHydration())`。`"ssr": false, "prerender": false` で止めてある

### 2.2 今の配り方

- タグを push すると GitHub Actions がビルドし、`aws s3 sync … --cache-control "max-age=31536000"` で S3 に置き、CloudFront を `/*` で失効させる
- CloudFront（Terraform `modules/web/_cloudfront.tf`）: 既定は S3（`spa-routing` 関数で index.html に寄せる）、`/api/*` は BFF
- index.html にも 1 年のブラウザキャッシュが付いている（古い index.html をブラウザが持ち続ける恐れ）

### 2.3 Angular 22 の仕組み（angular.dev）

- ページごとに描き方を選べる（`app.routes.server.ts` の `RenderMode.Server` / `Prerender` / `Client`）
- HttpTransferCache: サーバーで取った GET の結果を HTML に埋め、ブラウザで取り直さない。`provideClientHydration` で標準で効く

### 2.4 置き場所の検討

- Cloudflare Workers: 公式の雛形（create-cloudflare の Angular 用）で Angular SSR が動く。無料プランは 1 リクエスト CPU 10ms まで（SSR には足りない見込み・未実測）、有料は月 $5。API が東京にあるので、利用者の近くで描く利点は日本の利用者には効きにくい。ドメインの付け替えも要る → 見送り
- 常時起動のサーバー（ECS・App Runner）: 誰も来なくても費用がかかる → 見送り
- Lambda@Edge: us-east-1・制限がきつい → 見送り
- **Lambda に決定**。寝起きは CDN に置くことで、ページごとに 1 時間に 1 回ほどに抑える
- 配り方は **osls**（API と同じ。MIT・Serverless Framework v3 をもとにした版。2026-09-25 時点で手入れが続いている）。sls のライセンス問題は osls で避ける

## 3. 全体の形

```
ブラウザ ─→ CloudFront（Terraform）
              ├─ /api/*                         ─→ BFF（今のまま）
              ├─ JS・CSS・フォント・画像・assets/* ─→ S3（今のまま・長く置く）
              └─ それ以外（画面の URL）          ─→ SSR の Lambda（Function URL・OAC）
                                                  └─ API（v3）を呼んで描く
```

- SSR の Lambda: client に `serverless.ts` を置き、osls で配る。`@angular/ssr` の Node 用の仕組みを Lambda で動かす
- CloudFront: web モジュールに、Lambda の Function URL を配り元として足す。CloudFront からだけ呼べるように OAC で守る。既定の振り分けから `spa-routing` 関数を外す
- 配る手順: タグの push で、今の S3 同期・失効に加えて Lambda も配る

## 4. ページごとの描き方

分け目は「中身がどれくらいの速さで古くなるか」。

| 種類 | ページ | 描き方 | CDN |
|---|---|---|---|
| 改正のときにしか変わらない | 駅別時刻表・全線時刻表・運用表・運用行路図・列車ダイヤグラム・列車番号 | `Server`。中身まで描く | `public, s-maxage=3600`（1 時間） |
| 刻々と変わる | ダッシュボード・real-time・列車位置情報 | `Server`。枠と題名・説明だけ描き、中身はブラウザで取る | 短く（例 5 分） |
| 入力・ログインが要る | 列車情報の入力など | `Client` | `no-store` |

- Prerender（ビルド時に作る）は使わない。時刻表は駅×ダイヤ×方向でページ数が多く、URL は matrix param（`;calendar_id=…`）で、入力すればすぐ変わる。「描いて 1 時間置く」で入力の反映も 1 時間以内に収まる
- 前回との違い: 全ページを毎回描くのをやめ、描くのは古くならないページだけにし、しかも CDN に置いて使い回す

## 5. サーバーで描くときの約束

### 5.1 題名・説明・OGP

- ページごとに `Title`・`Meta` で、題名・説明・`og:title`・`og:description`・`og:url` を入れる
  - 例: 駅別時刻表「二俣川駅 時刻表（下り・平日）｜相鉄ラボ」
  - 例: real-time「相鉄線 リアルタイム運用情報｜相鉄ラボ」
- `og:image` はサイト共通の 1 枚
- 題名に入れる名前（駅名・運用番号など）は、そのページで取っているデータから作る。題名のためだけに API を叩かない

### 5.2 サーバーで API を叩くのは、中身まで描くページだけ

- 中身まで描くページ: サーバーで取って描く。取った結果は HttpTransferCache で HTML に埋め、ブラウザで取り直さない
- 枠だけのページ: サーバーでは取らない。取得の入り口で「サーバーなら取らない」と分ける
- 目撃のソケット・localStorage・`window` など、ブラウザにしかないものはサーバーで動かさない。2024 年の修正（22aeab90）が今も効いているか確かめ直す

### 5.3 ログイン状態

- HTML は CDN に置くので、**ログインしているかどうかで中身が変わるもの（管理者だけのボタンなど）はサーバーで描かない**。CDN に置いたものが別の人に見える事故を防ぐ
- 該当する箇所は計画のときに洗い出す

## 6. CloudFront

- 振り分け
  - `/api/*` → BFF（今のまま）
  - 拡張子（js・css・フォント・画像など）と `assets/*` → S3（今のまま）
  - それ以外 → SSR の Lambda
- CDN の鍵は「パス（matrix param を含む）＋クエリ」。Cookie・Authorization は鍵にも Lambda にも渡さない
- HTML は Lambda から来るので、index.html の 1 年キャッシュの問題（2.2）は自然に直る。S3 に残す静的ファイルは名前にハッシュが付くので 1 年のままでよい

## 7. 切り戻し

- 振り分けの既定先を S3＋`spa-routing` に戻せば今の形に戻る。Terraform の変数 1 つで切り替えられるようにする
- Lambda が落ちたら S3 の index.html を出す、CloudFront のオリジングループの自動切り替えを付ける

## 8. 確かめ方

- C（速さ）: 入れる前と後で、スマホを真似て、開いてから中身が出るまでの時間を測る（駅別時刻表・運用表・real-time・ダッシュボード）。Lambda と API の起動回数・時間も前後で比べる
- B（プレビュー）: Discord・X に URL を貼り、題名と説明が出ることを確かめる
- A（検索）: リリース後に Google Search Console で、ページが読まれ登録されることを確かめる
- 中身まで描くページで、ブラウザが同じ API を取り直していないこと（HttpTransferCache が効いていること）を、ネットワークの記録で確かめる
- ログインしたまま開いたページが、CDN 経由で別の人に見えないことを確かめる

## 9. やらないこと（この spec の範囲外）

- ページごとの OGP 画像
- Prerender
- Cloudflare Workers への移行
- 臨時列車・車両の行程表（別 spec: sotetsu-lab-v3-api `docs/superpowers/specs/2026-10-12-special-trips-design.md`）
