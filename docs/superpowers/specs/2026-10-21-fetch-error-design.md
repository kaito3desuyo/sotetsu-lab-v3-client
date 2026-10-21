# HTTP エラーを FetchError にそろえる

- 日付: 2026-10-21
- ブランチ: `refactor/fetch-error`

## 目的

GA の `page_load_error` 58 件（2026-10-14〜10-20）が `[object Object]` としか記録されていない。画面を開く前のデータ取得（`initialDataResolver`）で API が失敗すると、エラーは `HttpErrorResponse` で届く。`HttpErrorResponse` は `Error` を `implements` しているだけで継承していないので、`instanceof Error` が偽になる。そのため `app.component.ts` では `String()` に落ち、`ErrorHandlerService` の `app_error` では捨てられている。

HTTP のエラーを、アプリ全体で `ts-custom-error` の `FetchError` にそろえる。

## 終わったと言える条件

- GA の `page_load_error` と `app_error` に、HTTP エラーのステータス・API の道筋・メッセージが残る。
- 次の振る舞いは変えない。
  - トークンの取り直し（401）
  - ゲストの 401 を `null` として扱うこと
  - ログイン・登録・ログアウト・目撃の取り消しと復元の失敗表示
  - 登録で「ユーザー名が既に使用されています」を出し分けること
  - 目撃の投稿の失敗表示と `sighting_submit_failure`
- 変わってよいのは 1 点だけ: 列車情報の入力画面で保存に失敗した時の通知が、英語の「Http failure response for …」から API の返す日本語のメッセージになる（ユーザー了承済み）。

## 範囲外

- リアルタイム運用情報の CLS の修正（別の作業にする）。
- web-vitals の `reportSoftNavs`。

## 設計

### 1. `FetchError` を広げる（`core/classes/custom-error.ts`）

```ts
export class FetchError extends CustomError {
    constructor(
        readonly statusCode: number,
        readonly message: string,
        readonly context: Record<string, unknown> = {},
        readonly url: string | null = null,
        readonly body: unknown = null,
    ) { ... }

    static fromHttpErrorResponse(error: HttpErrorResponse): FetchError;
}
```

- `statusCode` は `error.status`。通信が切れた時は 0。
- `message` は API 本文の `message` を使う。NestJS の入力検証では配列で来るので、その時は `、` で結ぶ。本文に `message` が無い時（status 0 を含む）は「不明なエラーが発生しました」にする。この文言は、今の目撃の投稿と同じ。
- `url` は `error.url`、`body` は `error.error`（API が返した本文）。
- 今ある `new FetchError(status, message)` の呼び方はそのまま通る。

### 2. 変換だけを受け持つ interceptor（`core/interceptors/fetch-error.interceptor.ts`）

- `catchError` で `HttpErrorResponse` を受けたら `FetchError.fromHttpErrorResponse` にして投げ直す。それ以外のエラーは素通しにする。
- `app.config.ts` の `HTTP_INTERCEPTORS` の**先頭**に登録して、一番外側に置く。こうすると、内側の `AuthInterceptor` は今のまま `HttpErrorResponse` を見て 401 の取り直しができる。取り直しも失敗した時だけ、外で `FetchError` に変わる。`AuthInterceptor` は変えない。
- この並び順の前提は、interceptor を 2 つ重ねたテストで確かめる（「テスト」の節）。

### 3. GA に送る文（`core/errors/to-error-message.ts`）

`page_load_error` と `app_error` で共通の関数にする。

- `FetchError` の時: `FetchError 500 /v3/trip-blocks: メッセージ`。道筋は `url` の pathname で、クエリは落とす。
- それ以外の `Error` の時: `${name}: ${message}`（今と同じ）。
- `Error` でない時: `String()`（今と同じ）。
- どの場合も 100 文字で切る。

`app.component.ts`（`page_load_error`）と `error-handler.service.ts`（`app_error`）はこの関数を呼ぶ。`app_error` は今まで `Error` 以外を捨てていたが、`FetchError` は `Error` なので、これで HTTP の失敗も届くようになる。同じ文を二度送らない仕組みは今のまま残す。

目撃の投稿の `app_error` も、`FetchError: 未来の時刻は〜` から `FetchError 400 /v3/operation-sightings: 未来の時刻は〜` の形に変わる。GA で前の期間と比べる時は、文が違うので注意する。`sighting_submit_failure` はメッセージだけを送っているので変わらない。

### 4. 呼ぶ側の書き換え

| ファイル | 今 | 後 |
|---|---|---|
| `libs/user/infrastructure/queries/user.query.ts` | `instanceof HttpErrorResponse && status === 401` | `instanceof FetchError && statusCode === 401` |
| `layout/components/login-dialog` | `tryCatchAsync<void, HttpErrorResponse>`・`result.error.error` | `FetchError`・`result.error.body` |
| `layout/components/register-dialog` | 同上・`.error.error.message === 'User already exists.'` | `FetchError`・`result.error.message === 'User already exists.'` |
| `layout/components/header`（ログアウト） | `e as HttpErrorResponse`・`.error.error` | `e as FetchError`・`.error.body` |
| `shared/operation-sighting-invalidation-dialog`・`restoration-dialog` | 同上 | 同上 |
| `pages/timetable/timetable-edit-form` | `e as HttpErrorResponse`・`e.message` | `e as FetchError`・`e.message`（日本語のメッセージになる） |
| `core/services/error-handler.service.ts` | `instanceof HttpErrorResponse` でログを出し分け | 出し分けを消す（`FetchError` は `instanceof Error` の側で出る） |
| `libs/operation-sighting/.../operation-sighting.command.ts` | 自前の `catchError` で `FetchError` を作る | `catchError` を消す（interceptor が作る） |

登録の「既に使用されています」の判定は、`message` が API 本文の `message` そのものなので、今と同じ文字列で比べられる。

## テスト

- `FetchError.fromHttpErrorResponse`: 本文の `message` が文字列・配列・無し・status 0 の各場合。
- `fetch-error.interceptor`: `HttpTestingController` で 500 を返し、`FetchError` が届くこと。`AuthInterceptor` と重ねて 401 を返し、取り直しが今のまま走ること（並び順の確認）。
- `to-error-message`: `FetchError`・`Error`・`Error` でないもの・100 文字で切ること。
- 呼ぶ側の既存の spec は、`HttpErrorResponse` で作っている失敗を `FetchError` に置き換える。期待する振る舞いは変えない。
- 確認: `npx jest`（client の決まり）・`npm run lint`・`npm run build`。そのうえで手元の画面で、ゲストで開く（401 で `null`）こと、ログイン失敗、列車情報の保存失敗の通知を目で見る。

## 決めたこと

- 変換は一番外側の専用の interceptor で行う。`AuthInterceptor` の中で変換する案と、呼ぶ所ごとに `catchError` する案は採らない。役目が混ざるのと、変換が漏れるため。
- `HttpErrorResponse` の生の値は `FetchError.body` と `url` に残す。
