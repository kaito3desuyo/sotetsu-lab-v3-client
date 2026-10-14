# ADR-0007: 起動時の取得の並べ替えと、直後の確認の使い回し、Material Icons の自前配信

- **日時**: 2026-10-14
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: perf/initial-fetch-and-icons

---

## 背景

- v2.11.0（ADR-0006）で、スマホの TBT は大きく下がった。ただし LCP は、どのページも 5.6〜7.4 秒のまま変わらなかった（本番・Lighthouse のスマホ）。
- 本番の列車位置情報（スマホ）を、回線を絞らずに測った。通信の並びは次のとおりだった（ms）。

  ```
    209→ 268  /api/maintenance                 ← maintenanceGuard
    273→ 331  /api/auth/token・/api/user/profile
    384→ 539  agencies・calendars・routes・services（4 本並列）
    591→ 651  calendars/as/of（今日のダイヤ）
    683→ 928  今日の運用・今日の編成
    938→ 972  ページの chunk
   1079→1229  /api/maintenance（2 回目）
   1233→1289  token・profile（2 回目）
   1326→      ページのデータ（trip-blocks は 1423→2564）
   1109       Material Icons のフォント（125KB）をここで初めて取りに行く
  ```

- resolver は 5 段の順番待ちになっていた。しかし本当に順番を待つ必要があるのは、今日の運用だけだった。今日の運用は、今日のダイヤの ID で引くからだ。
- 運用表・駅別時刻表・全線時刻表・ダイヤグラム・列車位置情報は、開いた直後に `replaceUrl` で URL を書き換える。ルートは `runGuardsAndResolvers: 'always'` なので、maintenance・token・profile がもう一度取られていた。
- Material Icons は Google Fonts の `display=swap` で読んでいた。フォントが届くまで、アイコン名が文字のまま出る。トップの LCP の要素は、まさにその「my_location」だった。

## 決定

### 起動時の取得の並べ方

```
maintenanceGuard: maintenance
resolver 1 段目:  token・profile（並列）
resolver 2 段目:  agencies・calendars・routes・services・今日のダイヤ・今日の編成（6 本並列）
                   └ 今日のダイヤが届いたら、続けて今日の運用
→ initializeStateStore.markInitialized()
```

- token は今までどおり先に取る。トークンは保存されないので、読み込んだ直後の要求には認証ヘッダーが付かないからだ。
- 1 本でも失敗したら、今までどおり resolver ごと失敗にする。

### 直後の確認の使い回し

- `QueryCache.get` に `maxAgeMs` を足した。届いてからその長さを過ぎた値は使わず、取り直す。期限は取り始めでなく、届いた時刻から数える。取得の最中は、今までどおり共有する。
- 期限付きで使うのは、**呼ぶ側が `maxAgeMs` を指定したときだけ**だ。token・profile・maintenance は、指定がなければ必ず取りに行く（`forceReload`）。取った値はキャッシュにも入る。だからログインの直後に取った token・profile は、続く画面移動でも使い回される。
- 指定するのは `maintenanceGuard` と resolver の 1 段目だけで、長さは `ROUTE_CHECK_MAX_AGE_MS = 5_000`（`core/query-cache/route-check-max-age.ts`）。
- 画面を移るたびの確認そのものは**残す**。使っている途中でメンテナンスに入ったり、ログインが切れたりしたら、次の画面移動で気づけるようにしたいというユーザーの意図だ。使い回すのは、開いた直後の `replaceUrl` で二度走る分だけになる。
- ログイン・ログアウト（ダイアログ・ヘッダー）、インターセプター、`app.component` の期限切れの取り直しは、引数なしで呼ぶ。だから必ず新しい値を取る。
- ゲストの profile は 401 になる。これを失敗ではなく「ゲスト」という正常な結果（`null`）としてキャッシュする。見る人のほとんどはゲストだからだ。失敗のままだと `QueryCache` は使い回さないので、毎回取り直してしまう。401 以外の失敗は、今までどおり使い回さない。

### Material Icons

- npm の `@fontsource/material-icons`（Apache-2.0）を依存に足した。
- `angular.json` の `assets` で、`material-icons-latin-400-normal.woff2` と `.woff` をハッシュの付かない `/assets/fonts/` に写す。
- `@font-face` と `.material-icons` は `src/_material-icons-font.scss` に自前で書く。fontsource の CSS は `font-display: swap` で、`.material-icons` のクラスも無いからだ（Sass の mixin は非推奨）。
- `styles.scss` では、これを tailwind より前に `@use` する。後ろに置くと `.material-icons { font-size: 24px }` がアプリ側の `tw-text-*` を上書きする。
- `index.html` で woff2 を `preload` する。ビルドがファイル名にハッシュを付けると、先読みの URL と合わなくなる。だから固定の場所に写した。
- `font-display` は `block` にした。フォントが届くまでは空白にし、アイコン名を出さない。
- フォントの中身は、Google Fonts が今配っている v145 の woff2 と同じだ（SHA-256 が一致。Chrome の UA で確認）。Material Icons 自体の更新は止まっているので、版の違いで見た目がずれる心配はない。
- 見送った候補:
  - npm の `material-icons`: 中身は同じだが、パッケージが 2 年ほど更新されていない。
  - `material-symbols`: outlined だけで 4.0MB あり、`clear`・`info_outline` が無く、見た目も変わる。
  - `@mui/icons-material`: React 用で Angular では使えない。

## 理由

- 2 段目をまとめると、resolver の往復が 5 段から 3 段（今日のダイヤ→今日の運用を含む）に減る。スマホの想定回線（遅延 150ms）では、1 往復ごとに数百 ms ずつ遅れが積み上がる。
- 直後の確認を使い回すと、開いた直後の maintenance・token・profile が 2 回から 1 回になる。
- アイコンのフォントを先読みすると、ページの JS と同じ最初の波で取りに行ける。アイコン名が文字のまま出ることも、それが LCP の要素になることもなくなる。

## 同じブランチで直した不具合

- **real-time のプログレスバーが消えない**: スマホでブラウザを裏に回してから戻ると、プログレスバーが出たままになっていた。1 秒ごとの現在位置の取得、自分と他人の投稿後の取り直し、再読み込みボタンの 4 か所で、取得が失敗すると `disableLoading()` まで進まなかった。そのため `loadingQueue` に 1 つ残り続けた。4 か所とも `try / finally` で必ず下ろす形にした。1 秒ごとの取得は、失敗しても通知せず、次の 1 秒で取り直す。ほかの 3 か所は「データの取得に失敗しました」と知らせ、最終更新時刻は成功したときだけ進める。
- **トークンの取り直しが止まる**: `app.component` で 10 秒ごとにトークンを取り直す流れには、`catchError` が無かった。1 回失敗すると、そのタブでは二度と取り直さなくなっていた。その回だけ捨てて、流れは止めないようにした。

## 結果

### 計測

master とこのブランチを同じ設定で本番相当にビルドし、手元で配って Lighthouse のスマホで測った（3 回の中央値）。手元の配信は圧縮していないので、絶対値は本番より大きい。比べるのは差だけにする。

**実際の通信の並び（列車位置情報・1 回目）**

| | master | branch |
|---|---|---|
| ページのデータ（trip-blocks）を取り始める時刻 | 1622 ms | 981 ms |
| maintenance・token・profile | 2 回ずつ | 1 回ずつ |
| 今日の編成を取り始める時刻 | 873 ms（今日のダイヤの後） | 557 ms（今日のダイヤと同時） |
| 最後の要求が終わる時刻 | 4579 ms | 3710 ms |

**実際に描いた LCP（Lighthouse の observedLargestContentfulPaint・回線を絞らない）**

| ページ | master | branch |
|---|---|---|
| トップ | 1059 | 1032 |
| リアルタイム | 1022 | 967 |
| 過去の運用情報 | 1050 | 1004 |
| 運用表 | 1145 | 1009 |
| 運用行路図 | 1039 | 955 |
| 全線時刻表 | 1085 | 969 |
| 駅別時刻表 | 2947 | 2388 |
| ダイヤグラム | 1099 | 992 |
| 列車位置情報 | 1000 | 973 |
| 車両 | 276 | 293 |

**回線と CPU を実際に絞った LCP（`--throttling-method=devtools`）**

| ページ | master | branch |
|---|---|---|
| トップ | 24309 | 23149 |
| 列車位置情報 | 24473 | 23593 |
| 運用表 | 30 秒以内に描けず（3 回とも） | 24127 |
| ダイヤグラム | 30 秒以内に描けず（3 回とも） | 23965 |
| 駅別時刻表 | 30 秒以内に描けず | 30 秒以内に描けず |

3 回の値はどれも ±0.3 秒以内に収まり、向きはすべて同じだった。

**Lighthouse の推定値（既定の simulate）は逆に出た。** スマホの LCP の推定値は、駅別時刻表を除く 9 ページで +0.6〜1.2 秒になった。推定値は、実際に LCP より前に起きた通信を、絞った回線の上で並べ直して計算する。取得を前に寄せると、LCP より前に入る通信が増えるので、推定値は伸びる。実際に絞った計測では速くなっているので、推定のしかたによる見かけの悪化と判断した。

- フォントの先読みを外した版でも測った。推定値は 0.3 秒しか戻らず、FCP の推定値はかえって 1.5 秒ほど悪くなった。だから先読みは残した。
- 本番は圧縮して配るので、推定値の出方は手元と違いうる。デプロイしたら、本番の全 10 ページを測り直して確かめる。

**目視**: master と並べて、スマホと PC の 10 ページずつを撮った。最初は Material Icons の `@use` を tailwind の後ろに置いていた。そのため `.material-icons { font-size: 24px }` がアプリ側の `tw-text-*` を上書きし、トップのタイルのアイコンが小さく出た。16px の矢印も箱から切れていた。`@use` を `styles.scss` の先頭に移して直した。直した後は、全 10 ページで、アイコン名・font-size・描かれた大きさが master と一致した。

## 検討した代案

- **ページの描き始めを、起動時の取得の完了から切り離す**: 一番速くなりうる。しかし各ページは、`todaysCalendarId` などが揃っている前提で書かれている。今回の効果を測ってから考える。
- **新しい部品 `RecentCheck` を作る**: 似た仕組みを 2 つ持つことになる。`QueryCache` に期限を足して寄せた（ユーザーの提案）。
- **Google Fonts のまま `preconnect` だけ足す**: CSS を取ってからフォントを取る 2 段は残り、`display=swap` でアイコン名も出たままになる。
- **画面を移るたびの確認をやめる**: 往復はさらに減るが、使っている途中のメンテナンス入りやログイン切れに気づけなくなる。ユーザーの意図に反する。
