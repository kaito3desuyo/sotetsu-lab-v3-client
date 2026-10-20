# 認証基盤を Supabase Auth に移す 実装計画（client のトークンと socket）

> 2026-10-20: api リポジトリの計画（`docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`）から、このリポジトリの Task を移した。Task の番号と本文は当時のまま（全体の Task 1〜3・14・15 と切り替え手順は api の計画にある）。
> 実装のあとで「読み取りもトークン必須・ゲストは匿名セッション・socket もトークン必須」に変えた。この計画の「ゲストは 204」「トークン任意」は当時の記録で、今の形はこのリポジトリの spec（`docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`）が正。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cognito と backend の自前ユーザー・セッションをやめ、利用者ごとの Supabase JWT で api・socket が人と役割を見分けられるようにする（読み取りはトークン不要）。

**Architecture:** client は Supabase を知らない。backend が Supabase Auth にログイン・登録・更新・ログアウトを代わりに行い、トークンは HttpOnly Cookie に入れる（セッションの正本は Supabase の `auth.sessions`）。api・socket は Supabase の JWKS で検証し、`user_role` claim（Custom Access Token Hook が `public.profiles.role` から入れる）で RBAC をかける。切り替えの途中は Cognito も受け付ける。

**Tech Stack:** NestJS 10 + TypeORM（api・osls・nodejs24.x）/ middy（backend は osls・nodejs24.x に上げる。socket は serverless 3・nodejs20.x のまま）/ Angular 22（client）/ `jose` ^6.2.12（Supabase の JWT の検証。ESM 専用だが api の実行環境は Node 24 なので require できる）/ `aws-jwt-verify` 4.0.1（切り替えの途中の Cognito の検証だけ。切り替え手順の 6 で外す）/ `@supabase/supabase-js` ^2.118.0（Node 22 以上が必要）/ jest（api・client）/ vitest（socket・backend）

**Spec:** このリポジトリの `docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`。全体の設計は api リポジトリの同じパスの spec。

## Global Constraints

- Supabase プロジェクト: `nofubcikiabamlnlxpko`。`SUPABASE_URL` = `https://nofubcikiabamlnlxpko.supabase.co`
- access token の `iss` = `${SUPABASE_URL}/auth/v1`、`aud` = `authenticated`、役割は claim `user_role`（`reporter` / `editor` / `manager`）
- ダミーのメールアドレス: `{username を小文字にしたもの}@users.sotetsu-lab.invalid`。変換は backend の `AuthEmail.fromUsername` 1 か所だけ
- Cookie: `sb-access`・`sb-refresh` は `HttpOnly; Secure; SameSite=Lax; Domain=sotetsu-lab.com; Path=/api`。`loggedIn` は今と同じ（`httpOnly: false`）。旧 `sessionId` は login・logout・ゲスト判定のときに消す
- `/api/auth/token`: ログイン中は 200 `{ accessToken, tokenType: 'Bearer', expiresAt }`、ゲストは 204。`Cache-Control: no-store`
- 切れかけの判定: `exp - 60 秒` を過ぎたら更新する
- ユーザー名の重複は 422 `User already exists.`（今と同じ）。ログインの失敗は 401 `Unauthorized.`（今と同じ）。Supabase に届かないときは 503
- socket のゲスト: `token` が `guest`・`null`・`undefined`・空ならゲストとして Allow（API Gateway の identitySource が値無しを 401 にするため、client はゲストで `?token=guest` を送る）
- Supabase の MCP は読み取り専用。Supabase への書き込み（ダッシュボードの設定・`migration:run`）と AWS への書き込み（SSM・デプロイ）は**ユーザーが行うか、ユーザーの承認を得て行う**
- コミットは Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。GPG 署名のためサンドボックスの外でコミットし、`git log --show-signature -1` で署名を確かめる
- client の jest は `npx jest --testPathPattern <path>`（`npm test` は sandbox で落ちる）
- 手元の api・backend は**本番の DB と本番の Supabase** につながる。手元で作る検証用の利用者は 1 人だけにして、終わったら消す
- backend の Lambda は nodejs24.x（api と同じ）。Serverless Framework は `serverless` 3.38（nodejs20.x までしか知らない）から `osls` ^3.61.1（api と同じ・MIT）に替える
- 依存の版上げは、この計画を通すのに要るなら行ってよい（ユーザー承認済み。例: jose の型が読めない TypeScript 4.7、Node 24 で起動しない serverless-offline・esbuild 系のプラグイン）。上げたら build と全テストを通し、`build: :arrow_up: …` の別コミットにする。要らない版上げはしない
- `jose` は api・socket とも `import { createRemoteJWKSet, jwtVerify } from 'jose'` だけを使う。テストでは `jest.mock('jose', factory)`／`vi.mock('jose', factory)` で差し替える（jest は ESM 専用のパッケージを読み込めないため、実物を読ませない）

## Review Focus

- 期限切れの `sb-access` だけが残り `sb-refresh` が無い Cookie → ゲスト（204）にして Cookie を消す（Task 7 のテストで固定）
- 同じ refresh token で 2 タブが同時に `/api/auth/token` を呼ぶ → Supabase の 10 秒の猶予で両方 200 になる前提。backend 側で失効扱いにしない（一時的な失敗＝503 と、無効＝204 を分ける。Task 7）
- SW に残った古い client が socket に `token=null` を送る → ゲストとして Allow（Task 4）
- 大文字を含むユーザー名でのログイン・登録 → 小文字のメールアドレスで照合し、表示名は元の書き方（Task 6・Task 9・Task 10）
- api の GET に壊れた・Cognito の古いトークンが付いてくる → 途中期間は Cognito を通す・壊れたものは 401（client は 1 回取り直す既存の動き）（Task 3）

---

## ブランチ

| リポジトリ | ブランチ                                                                                                                                                          | 元                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| api        | `feature/supabase-auth`（作成済み）                                                                                                                               | master             |
| socket     | `feature/supabase-auth`（作成済み。未マージだった `refactor/phase-0-to-4` の名前を変えて再利用。vitest の基盤・pino の 2 コミットも一緒に出る。ユーザー承認済み） | master＋2 コミット |
| backend    | `feature/supabase-auth`                                                                                                                                           | master             |
| client     | `feature/supabase-auth`                                                                                                                                           | master             |

backend・client は master から切り、最初に `git commit --allow-empty -m "first commit"` を置く（サンドボックスの外で）。api・socket は作成済み。

---

### Task 5: client がゲスト（204）を受け入れる

**Files:**（client リポジトリ）

- Modify: `src/app/libs/auth/usecase/dtos/token-details.dto.ts`
- Modify: `src/app/libs/auth/infrastructure/queries/token.query.ts`
- Modify: `src/app/libs/auth/usecase/auth.service.ts`
- Modify: `src/app/global-states/token.state.ts`
- Modify: `src/app/core/services/socket.service.ts`
- Test: `src/app/global-states/token.state.spec.ts`・`src/app/libs/auth/infrastructure/queries/token.query.spec.ts`

**Interfaces:**

- Consumes: backend `GET /api/auth/token` が 200 `TokenDetailsDto` か 204（本文無し）
- Produces: `TokenStateQuery.accessToken` はゲストで `null`。interceptor は既に `accessToken` が無ければヘッダーを付けない（変更不要）

- [ ] **Step 1: 失敗するテストを足す**

`token.state.spec.ts` の既存の書き方（AuthService のモック）に合わせて、次の 2 件を足す:

```ts
it('トークン無し（204）なら状態を空にし、ヘッダーを付けない側に倒す', async () => {
    authService.getToken.mockReturnValueOnce(
        of({ accessToken: 'a', tokenType: 'Bearer', expiresAt: 9999999999 }),
    );
    await lastValueFrom(store.fetch());
    authService.getToken.mockReturnValueOnce(of(null));
    await lastValueFrom(store.fetch());
    expect(query.accessToken).toBeNull();
    expect(query.isExpired).toBe(false);
});
```

`token.query.spec.ts` に（`HttpTestingController` の既存の書き方に合わせる）:

```ts
it('204 なら null を返す', async () => {
    const result = lastValueFrom(query.getToken());
    httpMock
        .expectOne((req) => req.url.endsWith('/auth/token'))
        .flush(null, { status: 204, statusText: 'No Content' });
    await expect(result).resolves.toBeNull();
});
```

既存の spec の変数名（`authService`・`store`・`query`・`httpMock`）が違う場合は、その spec の名前に合わせる。

Run: `npx jest --testPathPattern 'global-states/token.state|auth/infrastructure/queries/token.query'`
Expected: FAIL

- [ ] **Step 2: 型と取得を直す**

```ts
// src/app/libs/auth/usecase/dtos/token-details.dto.ts
export interface TokenDetailsDto {
    accessToken: string;

    tokenType: string;

    expiresAt: number;
}

/** ゲスト（未ログイン）は backend が 204 を返すので null */
export type TokenResult = TokenDetailsDto | null;
```

`token.query.ts` の `getToken` の戻り値を `Observable<TokenResult>` に、`this.#http.get<TokenDetailsDto>` を `this.#http.get<TokenResult>` に変える（204 は本文が null で届く）。`auth.service.ts` の `getToken` の戻り値も `Observable<TokenResult>` にする。

`token.state.ts` の `fetch` の `tap` を次にする:

```ts
            tap((v) => {
                state.update(
                    setProps(
                        v ?? { accessToken: null, tokenType: null, expiresAt: null },
                    ),
                );
            }),
```

- [ ] **Step 3: socket のゲストを `token=guest` にする**

`socket.service.ts` の `connect` の URL を次にする:

```ts
// API Gateway は token が無いと 401 にするので、ゲストは guest を送る（socket の authorizer がゲストとして通す）
this._conn = new WebSocket(
    `${this._url}?token=${this.#tokenStateQuery.accessToken ?? 'guest'}`,
);
```

- [ ] **Step 4: テスト・型**

Run: `npx jest --testPathPattern 'global-states/token.state|auth/infrastructure/queries/token.query|core/interceptors/auth-interceptor|core/services/socket'`
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS・エラー無し

- [ ] **Step 5: Commit**

```bash
git add src/app/libs/auth src/app/global-states/token.state.ts src/app/global-states/token.state.spec.ts src/app/core/services/socket.service.ts
git commit -m "feat: :sparkles: ログインしていないときはトークン無しで API と socket につなぐ"
```
