# ADR-0002: 画面内キャッシュを `QueryCache` に一本化し、書き込み後に `QueryInvalidator` で捨てる

- **日時**: 2026-10-07
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feat/browser-private-cache

---

## 背景

- API が v3 の GET に `Cache-Control: private, max-age=…` を付ける（マスタ 1 時間・時刻表 10 分・リアルタイムは `no-store`）。
  - CloudFront の共有キャッシュは採らなかった。キャッシュキーに認証が入らず、当たった返答が認証を素通りするから（2026-10-07 ユーザー判断）。
  - 共有キャッシュでない代わりに、利用者本人のブラウザが返答を覚える。そのため、列車情報を書いた本人が、ブラウザに残った保存前の時刻表を最大 10 分見てしまうおそれがある。
- libs の query クラス 12 個は、どれも同じ形の画面内キャッシュ（`#obs` + md5 のキー + `shareReplay`）をコピーして持っていた。
- 画面内キャッシュは、書き込んでも捨てていなかった。列車情報を保存した同じタブで運用表を開くと、保存前の中身が出ていた。
  - `TripBlockQuery.invalidateAll()` はあったが、どこからも呼ばれていなかった。

## 決定

### 1. `QueryCache` に一本化する

- 12 個の query クラスのキャッシュ処理を、`core/query-cache/query-cache.ts` の `QueryCache` にまとめる。
- 引数は 1 つのオブジェクトで受ける: `get({ name, params, fetch, forceReload })`。
- キャッシュはメソッド名（`name`）ごとに覚えるので、`clear(names)` で一部のメソッドの分だけを捨てられる。
- 振る舞いは今までと同じにする。`fetch` の結果を `shareReplay({ bufferSize: 1, refCount: true })` で包み、`map` は呼び出し側で付ける。エラーになったら、次の購読で取り直す。

### 2. 書き込みが成功したら `QueryInvalidator` の tag で捨てる

- libs の usecase service は、書き込みが成功したときに `QueryInvalidator.invalidate(tag)` を呼ぶ。
- query クラスは `invalidated$` を購読し、自分に関係する tag のときだけ捨てる。

| tag | 書き込み | 捨てるもの |
|---|---|---|
| `'timetable'` | `TripBlockService` の 4 つの書き込み | `TripBlockQuery` の全部。`OperationQuery` の時刻表系 4 メソッド |
| `'sighting'` | `OperationSightingService` の `post` / `invalidate` / `restore` | `OperationSightingQuery` の全部。`OperationQuery` の現在位置 2 メソッド |

- マスタは対象にしない。アプリから書く手段が無いからだ。

### 3. 列車情報を書いた後の 10 分は `cache: 'reload'` で取る

- 書いた時刻を `localStorage`（`sotetsu-lab:timetable-written-at`）に置く。
- そこから 10 分は、時刻表系の GET に `cache: 'reload'` を付ける。ブラウザのキャッシュを見ずに取り直し、ついでにブラウザのキャッシュも新しい返答で上書きする。
- 10 分は API の `private, max-age=600` と同じ長さでなければならない。
- 窓は tag ごとに `RELOAD_WINDOW_MS` で持ち、query は `requestCache(tag)` で `cache` を決める。目撃は API が `no-store` を返すので窓は 0（常に `'default'`）。API が目撃に `max-age` を付けたら、この値をそろえるだけでよい。
- 別のタブには `storage` イベントで知らせ、そのタブの画面内キャッシュも捨てる。目撃を書いたときも `localStorage`（`sotetsu-lab:sighting-written-at`）に時刻を書き、別のタブで `'sighting'` を流す（目撃に 10 分の窓は無い）。
- 他人の目撃投稿は、既存の WebSocket（`sendSighting` の転送）で届く。届いたら `invalidateLocal('sighting')` で、そのタブだけで `'sighting'` を流す（localStorage には書かない。ほかのタブにもソケットから届くため）。列車情報はソケットで知らせない。受け取った全員を 10 分の reload に入れることになり、ブラウザキャッシュが効かなくなるため。

### 4. 置き場と名前

- `QueryCache` と `QueryInvalidator` は `core/query-cache/` に置く。
- 名前に `Service` を付けない。libs の `usecase/*.service.ts`（ドメインの窓口）と取り違えないためだ。
- **方針として、`core/` に新しく足す部品は、役目ごとのディレクトリに置き、`Service` を付けない。**
  - 既存の `core/services/` の 6 個（`AppUpdateService`、`ErrorHandlerService`、`TitleService`、`NotificationService`、`GoogleAnalyticsService`、`SocketService`）は、別のリファクタで寄せる。
  - 名前の候補は `AppUpdater`、`AppErrorHandler`、`PageTitle`、`Notifier`、`PageViewTracker`、`SocketClient`（2026-10-07 ユーザー了承）。

細かな表や理由は、設計書 `docs/superpowers/specs/2026-10-07-browser-private-cache-design.md` に書いた。API 側は `sotetsu-lab-v3-api` の同名の設計書にある。

## 結果

- 書いた本人は、保存後の時刻表をすぐ見られる。他の利用者は最大 10 分遅れる。
- 目撃を投稿した後、同じタブのダッシュボードや過去の運用情報にも投稿が反映される。
- query クラスにコピーで散らばっていたキャッシュ処理が、1 か所になった。
- 出す順に縛りがある。クライアントを先に出し、API を後に出す。API が先に入ると、書いた本人が古い時刻表を見てしまう。

## 検討した代案

- **CloudFront で共有キャッシュする**: Lambda も DB も一番軽くなるが、認証を素通りするので却下した。
- **書き込み後は全部の query を捨てる**: 簡単だが、目撃を 1 件投稿するたびに運用表の 3.5MB を取り直すことになる。
- **マスタも失効の対象にする**: 知らせを出す書き込みが存在しないので、意味が無い。
