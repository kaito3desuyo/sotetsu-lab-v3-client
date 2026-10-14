# 起動時の取得の並べ替えと Material Icons の自前配信 設計

- 日付: 2026-10-14
- ブランチ: `perf/initial-fetch-and-icons`
- 関連: ADR-0007（本作業で書く）・ADR-0006（class-transformer の廃止。この前の段）

## 背景

v2.11.0（class-transformer の廃止）で、スマホの TBT は大きく下がった。ただし LCP は、どのページも 5.6〜7.4 秒のまま変わっていない（本番・Lighthouse のスマホ）。

本番の列車位置情報（スマホ）を、回線を絞らずに測った。そのときの通信の並びは次のとおりだった（ms）。

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

わかったことは 3 つある。

1. **resolver の段は 5 つあるが、本当の順番待ちは 1 か所だけ。** 今日の運用（`TodaysOperationListStateStore`）が `todaysCalendarId` を使うところだ。今日の編成は日付で引くので、今日のダイヤを待つ必要がない。agencies などの 4 本も、今日のダイヤを待つ必要がない。
2. **最初の表示の途中で、確認がもう一度走る。** 運用表・駅別時刻表・全線時刻表・ダイヤグラム・列車位置情報は、開いた直後に `replaceUrl` で URL を書き換える。ルートは `runGuardsAndResolvers: 'always'` なので、そのたびに maintenance・token・profile がもう一度取られる。agencies などの 2 段目以降は `QueryCache` に当たるので、もう一度は飛ばない。
3. **Material Icons のフォントは、アイコンが描かれてから取りに行く。** Google Fonts の CSS は `display=swap` なので、フォントが届くまでアイコン名が文字のまま出る。トップの LCP の要素は、まさにこの「my_location」だった。

スマホの想定回線（遅延 150ms）では、1 往復ごとに数百 ms ずつ遅れが積み上がる。

### 追加: real-time のプログレスバーが消えなくなる（2026-10-14 ユーザー報告）

スマホでブラウザをしばらく裏に回してから戻ると、プログレスバーが出たまま消えなくなる。ブラウザごと再読み込みしないと直らない。

**再現した。** `.context/measure/fail-positions-repro.mjs` で real-time を開き、`/current-positions` の要求だけを 90 秒失敗させた。失敗した要求は 82 件だった。失敗をやめて 10・30・60 秒たっても、`mat-progress-bar` は出たままだった。トークン切れがなくても、要求が 1 回失敗すれば起きる。

**原因。** `OperationRealTimeStore` のプログレスバーは、`loadingQueue` が空でない間出る。`enableLoading()` が 1 つ積み、`disableLoading()` が 1 つ下ろす。次の 4 か所は、取得が失敗すると `disableLoading()` まで進まない。そのため積んだ 1 つが残り続ける。

| 場所 | 中身 |
|---|---|
| `operation-real-time.component.ts` の `interval(1000)` | 1 秒ごとに、古くなった現在位置を取り直す |
| 同 `submitEvent$` | 自分が目撃を投稿した後に取り直す |
| 同 `socketService.on()` | 他人が目撃を投稿した後に取り直す |
| `operation-real-time-controller.component.ts` の `reload()` | 再読み込みボタン |

同じファイルの `fetchData()` は、`try / catch / finally` で必ず `disableLoading()` を呼んでいる。上の 4 か所だけが、この形になっていない。

**裏から戻ると起きやすい理由。** 裏にいる間に、現在位置のほとんどが古くなる。戻ると、1 秒ごとの取得が毎秒要求を出す。戻った直後は通信がまだ戻っていなかったり、トークンが切れていたりする。そこで 1 回でも失敗すると、`loadingQueue` に 1 つ残る。

`app.component.ts` の、10 秒ごとにトークンを取り直す流れにも `catchError` が無い。トークンの取得が 1 回失敗すると、この流れは止まる。ただし期限切れのトークンはインターセプターが要求のたびに取り直すので、プログレスバーが消えない原因ではない。それでも、裏から戻った直後の 1 回の失敗で、そのタブではもう取り直さなくなる。だから同じブランチで直す（ユーザー指示）。

## 目的

- 最初の表示で、ページのデータを取り始めるまでの往復を減らす。
- Material Icons のフォントを、最初の波で取りに行かせる。アイコン名が文字のまま出ないようにする。
- real-time で取得が失敗しても、プログレスバーが残らないようにする。
- トークンの取り直しが 1 回失敗しても、10 秒ごとの取り直しが止まらないようにする。

## 決定事項

| 論点 | 決定 |
|---|---|
| 画面を移るたびの maintenance・token・profile の確認 | **残す**。使っている途中でメンテナンスに入ったり、ログインが切れたりしたら、次の画面移動で気づけるようにしたい（ユーザーの意図） |
| 進め方 | 案 B: resolver の段を詰め、直後の同じ確認は使い回す。ページの描き始めを取得の完了から切り離す案（案 C）は見送る。各ページは、`todaysCalendarId` などが揃っている前提で書かれているから |
| トークンの順番 | token・profile は今までどおり先に取る。トークンは保存されないので、読み込んだ直後の要求には認証ヘッダーが付かない。だから API の要求より先に取る |
| 使い回しの仕組み | 応答のキャッシュ `QueryCache` に期限（`maxAgeMs`）を足して使う。似た仕組みを 2 つ持たないため（新しい部品 `RecentCheck` を作る案はやめた） |
| キャッシュを使う呼び出し | **`maxAgeMs` を渡した呼び出しだけ**。渡さなければ毎回取りに行く。ガードと resolver だけが渡す。ログイン・ログアウト（ダイアログ・ヘッダー）、期限切れのトークンの取り直し（インターセプター・`app.component`）は渡さない。だから必ず新しい値を取る |
| 使い回す時間 | 届いてから 5 秒以内 |
| ゲストの profile（401） | 失敗ではなく「ゲスト」という正常な結果（`null`）としてキャッシュする。見る人のほとんどはゲストだからだ。失敗のままだと `QueryCache` は使い回さないので、毎回取り直してしまう |
| Material Icons | npm の `material-icons@1.13.14`（Apache-2.0）で自前配信する |
| font-display | `block`（パッケージの標準と同じ）。フォントが届くまでは空白にし、アイコン名を出さない |
| Quicksand | 今のまま Google Fonts から読む（今回は範囲外） |
| real-time のプログレスバーの修正 | このブランチで一緒に直す（ユーザー指示）。コミットは `fix: :bug:` で分ける |
| 1 秒ごとの取得が失敗したとき | 通知を出さない。毎秒通知が出てしまうからだ。失敗は捨て、次の 1 秒で取り直す |
| 10 秒ごとのトークンの取り直しが失敗したとき | 通知を出さず捨て、次の 10 秒で取り直す。同じブランチで直す（ユーザー指示） |
| 投稿後・他人の投稿後・再読み込みが失敗したとき | `fetchData()` と同じく、`console.error` と「データの取得に失敗しました」の通知を出す。最終更新時刻は、成功したときだけ進める |

## 設計

### 1. 起動時の取得の並べ方（`core/resolvers/initial-data.resolver.ts`）

```
maintenanceGuard: maintenance
resolver 1 段目:  token・profile（並列）
resolver 2 段目:  agencies・calendars・routes・services・今日のダイヤ・今日の編成（6 本並列）
                   └ 今日のダイヤが届いたら、続けて今日の運用
→ initializeStateStore.markInitialized()
```

- 2 段目は、`Promise.all` の中の 1 本を「今日のダイヤ → 今日の運用」とつないだ形にする。
- 1 本でも失敗したら、今と同じく resolver ごと失敗にする（エラーの扱いは変えない）。

### 2. 直後の同じ確認の使い回し（`QueryCache` の期限）

#### 2-1. `QueryCache.get` に `maxAgeMs` を足す（`core/query-cache/query-cache.ts`）

```ts
get<T>(options: {
    name: string;
    params: object;
    fetch: () => Observable<T>;
    forceReload?: boolean;
    /** 届いてからこの長さを過ぎた値は使わず、取り直す。省略すれば期限なし（今までどおり） */
    maxAgeMs?: number;
}): Observable<T>;
```

| 状態 | 振る舞い |
|---|---|
| 取得の最中 | 今までどおり共有する（`shareReplay`）。期限は見ない |
| 届いてから `maxAgeMs` 以内 | 届いた値を返す |
| 届いてから `maxAgeMs` を過ぎた | 捨てて取り直す |
| `maxAgeMs` を省略 | 今までどおり期限なし |
| 失敗 | 今までどおり使い回さない（次の購読で取り直す） |

- 値が届いた時刻を、エントリーに覚える（`tap` で `Date.now()`）。
- 既存の query は `maxAgeMs` を渡さないので、振る舞いは変わらない。

#### 2-2. token・profile・maintenance を `QueryCache` に通す

3 つとも、引数を省略できる形で `{ maxAgeMs?: number }` を受け取る。

- `maxAgeMs` を渡されたら、`QueryCache.get({ ..., maxAgeMs })` で使い回す。
- 渡されなければ `forceReload: true` で取りに行く。取った値はキャッシュにも入れる。だからログインの直後に取った token は、続く画面移動でも使い回される。

| 取得 | 置き場所 | 中身 |
|---|---|---|
| token | `libs/auth/infrastructure/queries/token.query.ts` の `getToken` | `#cache = new QueryCache()` を持たせる（`calendar.query.ts` と同じ） |
| profile | `libs/user/infrastructure/queries/user.query.ts` の `getProfile` | 同上。401 は `catchError` で `null` に変えてからキャッシュに入れる。401 以外の失敗はそのまま返す。戻り値の型は `Observable<UserDetailsDto \| null>` になる |
| maintenance | `global-states/maintenance.state.ts` の `MaintenanceStateStore.fetch` | HttpClient を直接呼んでいるので、ストアに `#cache = new QueryCache()` を持たせる |

引数を通す所は次のとおり。

- `AuthService.getToken(options?)`・`UserService.getProfile(options?)` は、そのまま query に渡す。
- `TokenStateStore.fetch(options?)`・`UserStateStore.fetch(options?)`・`MaintenanceStateStore.fetch(options?)` は、そのまま下に渡す。
- `UserStateStore.fetch` は、`null` が来たら `state.reset()` する。今の 401 のときと同じ振る舞いだ。401 以外の失敗は、今までどおり `catchError` で `state.reset()` する。

呼ぶ側は次のとおり。

- `maintenanceGuard`: `maintenanceStateStore.fetch({ maxAgeMs: 5000 })`。使い回したときも、ストアに残っている `isMaintenance` で判定する。
- resolver の 1 段目: `tokenStateStore.fetch({ maxAgeMs: 5000 })`・`userStateStore.fetch({ maxAgeMs: 5000 })`。
- 5000 は `core/query-cache/` に `ROUTE_CHECK_MAX_AGE_MS` として置き、ガードと resolver から読む。
- 2 段目は今までどおり毎回呼ぶ。中身は期限なしの `QueryCache` に当たるので、ネットワークには出ない。
- ダイアログ・ヘッダー・インターセプター・`app.component` は、`fetch()` の呼び方を変えない（`app.component` の失敗の扱いは設計 5 で直す）。

### 3. Material Icons の自前配信

- `material-icons@1.13.14` を dependencies に足す。
- `angular.json` の build の `assets` に、次の写しを足す。woff2 と woff を、ハッシュの付かない固定の場所に置くためだ。ビルドがファイル名にハッシュを付けると、先読みの URL と合わなくなる。

  ```json
  { "glob": "material-icons.woff*", "input": "node_modules/material-icons/iconfont", "output": "assets/fonts" }
  ```
- `styles.scss` で、置き場所を変えて塗りつぶし版だけを読み込む。

  ```scss
  @use 'material-icons/iconfont/filled' with ($material-icons-font-path: '/assets/fonts/');
  ```

  `with` が使えない形（`@import` 前提のファイル）なら、`@font-face` と `.material-icons` を自分で書く。中身はパッケージの `filled.css` と同じにし、パスだけ変える。どちらで書くかは、ビルドが通る方を実装時に選ぶ。
- `index.html` は次のように変える。
  - Google の Material Icons の `<link rel="stylesheet">` を外す。
  - `<link rel="preload" href="/assets/fonts/material-icons.woff2" as="font" type="font/woff2" crossorigin>` を足す。
- `styles.scss` の 80 行目にある、コメントアウト済みの `@import url('...Material+Icons')` も消す。

### 4. real-time の読み込み中を必ず下ろす

背景の表にある 4 か所を、`enableLoading()` の後ろを `try` にし、`finally` で `disableLoading()` を呼ぶ形にする（`fetchData()` と同じ形）。

| 場所 | `catch` の中身 | 成功したときだけ行うこと |
|---|---|---|
| `interval(1000)` | 何もしない（次の 1 秒で取り直す） | なし |
| `submitEvent$` | `console.error`・「データの取得に失敗しました」の通知 | `setFinalUpdateTime()` |
| `socketService.on()` | 同上 | `setFinalUpdateTime()`・「データが更新されました」の通知 |
| controller の `reload()` | 同上（controller に `NotificationService` を注入する） | `setFinalUpdateTime()` |

- 「更新中...」の通知は、今までどおり取得の前に出す。
- 取得の順番と、`forceReload: true` はそのまま。

### 5. トークンの取り直しを止めない（`app.component.ts`）

10 秒ごとの流れの `switchMap` の中で、`tokenStateStore.fetch()` に `catchError(() => EMPTY)` を付ける。失敗はその回だけで捨てられ、外側の `interval` は生き続ける。

```ts
switchMap(() =>
    this.#tokenStateStore.fetch().pipe(catchError(() => EMPTY)),
),
```

- `fetch()` は今までどおり引数なしで呼ぶ（期限なし・必ず新しい値を取る）。
- 通知は出さない。期限切れのトークンは、インターセプターも要求のたびに取り直すからだ。

## 範囲外

- ページの描き始めを、起動時の取得の完了から切り離すこと（案 C）。今回の効果を測ってから考える。
- Quicksand の自前配信。
- trip-blocks・運用表 trips の応答を軽くすること（`fields`）。別の作業にする。
- `replaceUrl` で URL を書き換えること自体をやめること。
- 他のページの `enableLoading()`。目で見た範囲では、どれも `try` の中で取っている。

## テスト

- `core/query-cache/query-cache.spec.ts`（足す）
  - `maxAgeMs` 以内は取り直さない。
  - 届いてから `maxAgeMs` を過ぎたら取り直す。
  - 最中は、`maxAgeMs` に関係なく共有する。
  - `maxAgeMs` を省略したら、時間がたっても取り直さない（今までどおり）。
- `token.query`・`user.query`・`MaintenanceStateStore` の spec
  - `maxAgeMs` を渡すと、5 秒以内の 2 回目は要求を出さない。
  - 渡さないと、毎回要求を出す。渡さずに取った値は、続く `maxAgeMs` 付きの呼び出しで使い回される。
  - profile の 401 は `null` になり、5 秒以内の 2 回目は要求を出さない。401 以外の失敗は使い回さない。
- `UserStateStore` の spec
  - `null` が来たら状態を空に戻す。
- `core/resolvers/initial-data.resolver.spec.ts`（新規）
  - 今日の運用は、今日のダイヤが届くまで呼ばれない。
  - agencies・calendars・routes・services・今日の編成は、今日のダイヤを待たずに呼ばれる。
  - 2 段目は、token・profile が終わってから呼ばれる。
  - すぐ 2 回呼ぶと、token・profile は 1 回しか取らない。
  - 最後に `markInitialized()` が呼ばれる。
- `core/guards/maintenance.guard.spec.ts`（新規）
  - すぐ 2 回呼ぶと、maintenance は 1 回しか取らない。
  - メンテナンス中なら `/maintenance` に飛ばす（使い回したときも同じ）。
- `operation-real-time.component.spec.ts`（足す）
  - 1 秒ごとの現在位置の取得が続けて失敗しても、読み込み中が残らない。通知も出ない。
  - 投稿後の取り直しが失敗したら、読み込み中が残らず、失敗の通知が出る。最終更新時刻は進まない。
  - 他人の投稿後の取り直しが失敗したら、読み込み中が残らず、失敗の通知が出る。「データが更新されました」は出ない。
- `operation-real-time-controller.component.spec.ts`（足す）
  - 再読み込みが失敗したら、読み込み中が残らず、失敗の通知が出る。最終更新時刻は進まない。
- `app.component.spec.ts`（足す）
  - トークンの取り直しが 1 回失敗しても、次の 10 秒でまた取り直す。

## 計測

- master とこのブランチを本番ビルドにしてローカルに置き、同じ条件で Lighthouse のスマホを測る（ADR-0006 の時と同じやり方）。
  - 対象: トップ・列車位置情報・駅別時刻表・運用表・ダイヤグラム。
  - 見るもの: LCP と FCP、ページのデータを取り始める時刻、maintenance・token の回数。
- 目視: アイコンが文字のまま出ないこと。アイコンが全ページで同じ形で出ること。スマホと PC で、master と並べて撮る。
- デプロイしたら、本番でも全 10 ページを測り直す（`.context/lighthouse/run-all.sh`）。
- real-time: `.context/measure/fail-positions-repro.mjs` を、このブランチの開発サーバーに流し直す。失敗をやめて 10 秒後には、プログレスバーが消えていること。
- デプロイしたら、スマホの実機で real-time を開いたまま裏に回し、しばらくたってから戻す。プログレスバーが残らないことを確かめる（ユーザーに頼む）。

## ADR-0007 に書くこと

- 起動時の取得の並べ方と、その理由（本当の順番待ちは 1 か所だけ）。
- 直後の確認を 5 秒使い回すことと、画面を移るたびの確認は残すという意図。
- `QueryCache` に期限（`maxAgeMs`）を足したこと。期限付きで使うのは、呼ぶ側が指定したときだけであること。ADR-0002 にも一言足す。
- ゲストの profile の 401 を、正常な結果としてキャッシュすること。
- `material-icons` を依存に足したこと。固定の場所に写して先読みすること。`block` にしたこと。
