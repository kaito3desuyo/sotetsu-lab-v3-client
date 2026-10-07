# ブラウザ private キャッシュと画面内キャッシュの失効（クライアント側）設計

- 日付: 2026-10-07
- 対になる spec: API `sotetsu-lab-v3-api/docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`（GET ごとの `Cache-Control` と CloudFront の TTL）
- 状態: レビュー待ち

## 目的

1. API が付ける `Cache-Control: private, max-age=…` のおかげで、同じ GET をブラウザが覚えて取り直さなくなる。そのとき、**書いた本人だけは古いものを見ない**ようにする。
2. 画面内キャッシュ（query クラスの `#obs`）は、今は書き込んでも捨てていない。そのせいで、列車情報を保存した同じタブで運用表などを開くと、保存前の中身が出る。これを直す。
3. 12 個の query クラスに同じ形でコピペされているキャッシュ処理を、1 つの部品にまとめる。

## 今の状態

- 12 個の query クラスはどれも `providedIn: 'root'` で、タブに 1 つしか無い。
  - 対象: agency, calendar, calendar-date, formation, operation, operation-sighting, route, service, station, trip, trip-block, trip-class。
  - どれも `#obs: Record<string, Observable>` を `md5(JSON.stringify(params))` のキーで持ち、`shareReplay` で使い回す。`forceReload: true` が来ると、そのキーを作り直す。
- `TripBlockQuery` にだけ `#worldVersion` と `invalidateAll()` がある（1ddda265、2026-07-04）。`TripBlockService.invalidateAll()` も含めて、呼んでいる所は 1 つも無い。
- クライアントから書き込む手段は次の 2 系統だけだ。
  - 列車情報: `TripBlockService` の `createMany`（POST `/bulk`）、`replaceOne`（PUT `/:id`）、`addTripToTripBlock`（PATCH `/:id/add-trip`）、`deleteTripFromTripBlock`（PATCH `/:id/delete-trip`）。呼ぶのは列車情報の入力（`timetable-edit-form.service.ts`）。
  - 目撃: `OperationSightingService` の `post`、`invalidate`、`restore`。
- `forceReload` を使っているのは real-time だけだ。
- `ngsw-config.json` の dataGroups `api` は `/api/**` に当たる設定だ。本番の API は別オリジン（`https://api.sotetsu-lab.com`）なので当たらない。サービスワーカーは API の返答を覚えておらず、今回の設計には関わらない。
- `app.config.ts` は `provideHttpClient(withFetch(), …)`。HttpClient のリクエストごとの `cache?: RequestCache`（例 `cache: 'reload'`）は fetch の `cache` に渡る（Angular 20.3.14 の型定義で確認）。

## 設計

### 1. 共通部品 `QueryCache`

`src/app/core/query-cache/query-cache.ts` に、注入しない普通のクラスとして置く。

```ts
export class QueryCache {
    /** name ごとに、params の md5 キー → 共有 Observable を持つ */
    get<T>(options: {
        name: string; // キャッシュを捨てる単位（query クラスのメソッド名）
        params: object; // name の中でキーを分ける値
        fetch: () => Observable<T>; // キャッシュに無いときの取り方
        forceReload?: boolean;
    }): Observable<T>;

    /** names を渡せばその name だけ、渡さなければ全部捨てる */
    clear(names?: readonly string[]): void;
}
```

- 中身は、今の各クラスがやっていることと同じだ。`md5(JSON.stringify({ name, ...params }))` をキーにして、`shareReplay` で包んだものを覚える。`forceReload` のときは作り直す。
- 引数は 1 つのオブジェクトで受ける。このコードベースの、メソッドの引数を `params` オブジェクトで受ける書き方に合わせる（2026-10-07 ユーザー指示）。
- 12 クラスを読み比べた。どれも `http.get(...)` の直後に `shareReplay({ bufferSize: 1, refCount: true })` を置き、その後ろに `map` を付けている。`QueryCache` はこの形を保つ（`fetch` の結果を `shareReplay` で包み、`map` は呼び出し側で付ける）。
- name を分けて持つので、「運用の時刻表系だけ捨てて、現在位置は残す」といった捨て方ができる。
- 12 クラスすべてを `QueryCache` に移す。`TripBlockQuery` の `#worldVersion` と、使われていない `invalidateAll()`（service 側も含む）は消す。

### 2. 失効の知らせ `QueryInvalidator`

`src/app/core/query-cache/query-invalidator.ts`（`providedIn: 'root'`）。`QueryCache` と同じディレクトリに置く。名前に `Service` を付けないのは、libs の `usecase/*.service.ts`（ドメインの窓口）と取り違えないためだ（2026-10-07 ユーザー指示）。

```ts
export type QueryInvalidationTag = 'timetable' | 'sighting';

export class QueryInvalidator {
    readonly invalidated$: Observable<QueryInvalidationTag>;
    invalidate(tag: QueryInvalidationTag): void;
}
```

- 書き込みが**成功したとき**に、libs の usecase service が `tap` で `QueryInvalidator.invalidate` を呼ぶ。
  - `TripBlockService` の 4 つの書き込み → `'timetable'`
  - `OperationSightingService` の `post` / `invalidate` / `restore` → `'sighting'`
- 失敗したときは知らせない。
- query クラスは constructor で `invalidated$` を購読し、自分に関係する tag のときだけ `QueryCache.clear(...)` する。query クラスは root なので、購読はアプリが終わるまで続いてよい。

| tag | 捨てるキャッシュ |
|---|---|
| `'timetable'` | `TripBlockQuery` の全部。`OperationQuery` の `findManyByCalendarId`、`findManyWithTrips`、`findOneWithTrips`、`findManyBySpecificPeriod` |
| `'sighting'` | `OperationSightingQuery` の全部。`OperationQuery` の `findOneWithCurrentPosition`、`findManyWithCurrentPosition` |

- マスタ（路線・駅・種別・事業者・系統・ダイヤ・ダイヤの日付・編成）は対象にしない。アプリから書く手段が無く、知らせを出す書き込みが存在しないからだ。DB を直に直したときは、タブを開き直すか、ブラウザキャッシュの期限（1 時間）で入れ替わる。
- `TripQuery.findManyByStationId` は、今のクライアントでは使っていない（API の spec で対象外にした GET）。表には入れない。
- **表の `'timetable'` の行は、実装の前に実データで確かめる。** 保存テスト用の渋谷工事臨時ダイヤ（2021 年 10 月版）で列車を 1 本保存し、同じタブで運用表・運用行路図・駅別時刻表・全線時刻表・列車ダイヤグラム・列車位置情報を開く。保存が反映されるべき画面が、どの query メソッドを使っているかを確かめる。

### 3. 書いた本人は、しばらくブラウザキャッシュを使わない

API は C 分類（時刻表）を `private, max-age=600` で返す。画面内キャッシュを捨てても、ブラウザの HTTP キャッシュに保存前の返答が最大 10 分残る。そのため、書いた本人は次のようにする。

- `'timetable'` を知らせたときに、時刻を `localStorage` に書く（キーは `sotetsu-lab:timetable-written-at`）。
- そこから 10 分のあいだは、C 分類の GET に `cache: 'reload'` を付ける。
  - 対象の GET: `TripBlockQuery` の全メソッドと、上の表の `OperationQuery` の 4 メソッド。
  - `reload` はブラウザのキャッシュを見ずにサーバーへ取りに行き、新しい返答でキャッシュを上書きする。だから、同じブラウザのほかのタブも、次に取るときは新しい返答を使う。
- `localStorage` を使う理由は 2 つ。ページを読み込み直しても、別のタブで開いても、10 分の窓を引き継げるからだ。
- 読み書きは try/catch で囲む。`localStorage` が使えないときは、そのタブのメモリだけで覚える。
- 10 分という長さは API の `max-age=600` と同じ値でなければならない。定数のそばに、API の spec を指すコメントを書く。

目撃（`'sighting'`）の GET は、API が `no-store` で返すのでブラウザに残らない。画面内キャッシュを捨てるだけでよい。

### 振る舞いが変わる所

- 列車情報を保存した後、同じタブで時刻表系の画面を開くと、保存後の中身が出る。今は保存前の中身が出ている。
- 目撃を投稿した後、同じタブでダッシュボードや過去の運用情報を開くと、投稿が反映されている。real-time は今も `forceReload` で取り直しているので、変わらない。
- それ以外の画面の見た目と取得の回数は変わらない（ブラウザキャッシュに当たって速くなるのは API 側の効果）。

## テスト

- `QueryCache` の spec:
  - 同じ name と params なら fetch を 1 回しか呼ばない。
  - `forceReload` のときは呼び直す。
  - `clear(['a'])` は name `a` だけを捨て、`b` は残す。
  - `clear()` は全部捨てる。
- `QueryInvalidator` と各 usecase service の spec:
  - 書き込みが成功したら tag を 1 回知らせる。
  - 失敗したら知らせない。
- `TripBlockQuery` と `OperationQuery` の spec（`HttpTestingController`）:
  - `'timetable'` の後は、同じ取得がもう一度 HTTP を出す。
  - 書き込みから 10 分以内は `request.cache` が `'reload'`、10 分を過ぎたら `'default'`（時刻は fake timers で進める）。
  - `'sighting'` で `OperationQuery` の時刻表系は捨てない。
- 既存の 12 クラスの spec は、移した後もそのまま通ること。
- 実データでの確認（必須）:
  - 上の渋谷工事臨時ダイヤで保存し、同じタブで反映を目で見る。
  - DevTools の Network で、10 分以内の取得が `(disk cache)` にならないことを見る。
  - 後始末の SQL はユーザーに流してもらう。

## 順番

1. このクライアントの spec を実装してデプロイする。
2. API の spec を実装してデプロイする（Cache-Control と CloudFront の TTL）。

- 先にクライアントを出す。クライアントだけが入った状態でも害は無い（`cache: 'reload'` は、キャッシュが無ければ普通の取得と同じ）。
- 逆に API だけが先に入ると、書いた本人が最大 10 分古い時刻表を見てしまう。

## 決まっていないこと

- なし。12 クラスの作りは同じだった（上の「共通部品 `QueryCache`」を参照）。
