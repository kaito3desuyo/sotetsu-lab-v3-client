# 目撃の投稿を登録者だけにする（client）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ログイン・新規登録をページにし、ゲストには投稿の口で案内を出し、socket の合図を `{type}` で受けて自分からは送らない。

**Architecture:** `/login`・`/register` はトップレベルのページ（`src/app/pages/login/`・`src/app/pages/register/`）。今のダイアログの中身をそのまま移し、成功したら `return_to` に戻る。`return_to` の検証は `src/app/core/utils/return-to.ts` の 1 つの関数に集める。投稿フォームはログイン状態で入力欄と案内を出し分ける。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、Angular Material（M2）、Tailwind（`tw-` 接頭辞）、Jest、`@ngneat/elf`

**Spec:** `docs/superpowers/specs/2026-10-23-registered-only-posting-design.md`（全体は api の同名の spec）

## Global Constraints

-   全部 OnPush・standalone・`inject()`。class の切り替えは `[class]`・`[style]` で書く（`[ngClass]` を使わない）
-   CSS は Tailwind（`tw-` 接頭辞）を優先する。枠を付けるなら `tw-border-solid` を併記する。余白は 4px の倍数
-   M2 の Material の部品で表せる UI は Material を使う（手組みしない）
-   jest は `npx jest --testPathPattern <パターン>` で流す（サンドボックスの中の `npm test` は全部落ちる）。lint はサンドボックスの外で `npm run lint`
-   prettier はファイル単位で当てる（ディレクトリ単位の `--write` は既存の未整形ファイルを巻き込む）
-   `main > :empty { display:none }` がある。main 直下に空の要素を置かない
-   画面の言葉: 「目撃の投稿にはログインが必要です」「投稿する権限がありません」「ログイン」「新規登録」
-   コミットは Conventional Commits＋絵文字。サンドボックスの外で署名する
-   出す順は socket（broadcast）→ api → client → socket（`sendSighting` を消す）。client は api の後に出す

## Review Focus

1.  `return_to` が `//evil.example`・`/\evil.example`・`https://evil.example`・`javascript:alert(1)`・`%2F%2Fevil.example`・空・`/login`（自分自身）→ どれも `/` に戻す（外へ飛ばさず、ループもしない）— Task 1 のテスト
2.  ログイン済みで `/login`・`/register` を開いた → フォームを出さず `return_to` に戻す — Task 2 のテスト
3.  ログインしたのに役割が無い利用者（profiles が無いなど）が投稿 → 403 で「投稿する権限がありません」— Task 3 のテスト
4.  socket から古い形（`{action, data}`）・JSON でない文字列・`{type:'other'}` が届く → 例外を出さず無視する（古い socket の `sendSighting` が残っている間に起きる）— Task 4 のテスト
5.  投稿の途中でログアウトした（別タブ）→ フォームが案内に切り替わり、入力途中の値で送信しない — Task 3 のテスト

---

### Task 1: `return_to` の検証

**Files:**
- Create: `src/app/core/utils/return-to.ts`
- Test: `src/app/core/utils/return-to.spec.ts`

**Interfaces:**
- Produces: `safeReturnTo(value: string | null | undefined): string`（サイト内の相対パスならそれを、そうでなければ `'/'` を返す）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/app/core/utils/return-to.spec.ts
import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
    it.each([
        ['/operation/real-time', '/operation/real-time'],
        ['/timetable/station?stationId=1#a', '/timetable/station?stationId=1#a'],
        ['/', '/'],
    ])('サイト内の相対パス %s はそのまま', (input, expected) => {
        expect(safeReturnTo(input)).toBe(expected);
    });

    it.each([
        [null],
        [undefined],
        [''],
        ['operation'],
        ['//evil.example'],
        ['/\\evil.example'],
        ['https://evil.example'],
        ['javascript:alert(1)'],
        ['%2F%2Fevil.example'],
        ['/login'],
        ['/login?return_to=/'],
        ['/register'],
    ])('%s は / に戻す', (input) => {
        expect(safeReturnTo(input)).toBe('/');
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPattern core/utils/return-to`
Expected: FAIL（`./return-to` が無い）

- [ ] **Step 3: 実装する**

```ts
// src/app/core/utils/return-to.ts

/**
 * ログイン・登録の後に戻る先。サイト内の相対パスだけを通し、それ以外は '/' に戻す（オープンリダイレクト対策）。
 * '//' や '/\' で始まるものはブラウザが外のホストとして扱うので弾く。ログイン・登録のページ自身も、戻るとループするので弾く。
 */
export function safeReturnTo(value: string | null | undefined): string {
    if (!value || !value.startsWith('/')) {
        return '/';
    }
    if (value.startsWith('//') || value.startsWith('/\\')) {
        return '/';
    }
    const path = value.split(/[?#]/)[0];
    if (path === '/login' || path === '/register') {
        return '/';
    }
    return value;
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern core/utils/return-to`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/core/utils/return-to.ts src/app/core/utils/return-to.spec.ts
git commit -m "feat: :sparkles: ログイン後に戻る先の検証を足す"
```

---

### Task 2: ログイン・新規登録のページ

**Files:**
- Create: `src/app/pages/login/login.route.ts`・`login.component.ts`・`login.component.html`・`login.component.spec.ts`
- Create: `src/app/pages/register/register.route.ts`・`register.component.ts`・`register.component.html`・`register.component.spec.ts`
- Modify: `src/app/app.route.ts`
- Modify: `src/app/layout/components/header/header.component.ts`・`header.component.html`
- Delete: `src/app/layout/components/login-dialog/`・`src/app/layout/components/register-dialog/`

**Interfaces:**
- Consumes: `safeReturnTo`（Task 1）、`AuthService.login({ username, password })`・`UserService.registerUser({ username, password })`・`TokenStateStore.fetch()`・`UserStateStore.fetch()`・`UserStateQuery.isLoggedIn$`（既存）
- Produces: ルート `/login`・`/register`（クエリ `return_to`）

- [ ] **Step 1: ログインのページのテストを書く（失敗する）**

`login-dialog.component.spec.ts` の組み立て（mock の AuthService・TokenStateStore・UserStateStore・MatSnackBar）を写し、`MatDialogRef` の代わりに `Router` の mock と `ActivatedRoute`（`snapshot.queryParamMap` に `return_to`）を渡す。次を確かめる:

```ts
    it('ログインに成功したら return_to に戻る', async () => {
        setup({ returnTo: '/operation/real-time', loggedIn: false });
        authService.login.mockResolvedValue(undefined);
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/operation/real-time');
    });

    it('return_to が外の URL なら / に戻る', async () => {
        setup({ returnTo: '//evil.example', loggedIn: false });
        authService.login.mockResolvedValue(undefined);
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('ログインに失敗したらページに留まり、知らせる', async () => {
        setup({ returnTo: '/', loggedIn: false });
        authService.login.mockRejectedValue(new FetchError(401, 'Unauthorized'));
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledWith('ログインに失敗しました', '閉じる', { duration: 3000 });
    });

    it('ログイン済みで開いたら、すぐ return_to に戻る', () => {
        setup({ returnTo: '/timetable', loggedIn: true });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/timetable');
    });
```

（`setup` は TestBed を組んで `component` を作るテスト内の関数。`loggedIn` は `UserStateQuery.isLoggedIn$` を `of(true/false)` にする）

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPattern pages/login`
Expected: FAIL（`./login.component` が無い）

- [ ] **Step 3: ログインのページを作る**

`login-dialog.component.ts` の form・`passwordVisible`・`submitting`・`onClickSubmit`・`togglePasswordVisibility` をそのまま移し、次を変える:
- `MatDialogRef` と `onClickClose` を消す
- `readonly #returnTo = safeReturnTo(inject(ActivatedRoute).snapshot.queryParamMap.get('return_to'));`
- constructor で、`UserStateQuery.isLoggedIn$` が `true` なら `this.#router.navigateByUrl(this.#returnTo)`（`take(1)`）
- 成功したら `this.#dialogRef.close()` の代わりに `await this.#router.navigateByUrl(this.#returnTo)`
- 新規登録へのリンクは `routerLink="/register"`＋`[queryParams]="{ return_to: returnToParam }"`（`returnToParam` は `#returnTo` を公開した読み取り専用の値）

テンプレートは `login-dialog.component.html` を写し、ヘッダーの閉じるボタンを消す。外側は `<div class="tw-mx-auto tw-flex tw-max-w-md tw-flex-col tw-gap-4 tw-px-4 tw-py-8">` に `<mat-card>` を入れ、その中にフォームを置く。フォームの下に「アカウントをお持ちでない方は」＋新規登録へのリンク（`mat-button`）を置く。

```ts
// src/app/pages/login/login.route.ts
import { Route } from '@angular/router';

export const LOGIN_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./login.component').then((mod) => mod.LoginComponent),
        title: 'ログイン',
    },
];
```

（`title` の付け方は既存のページの route に合わせる。既存が Title サービスで付けているならそれに従う）

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern pages/login`
Expected: PASS

- [ ] **Step 5: 新規登録のページを同じ形で作る**

`register-dialog.component.ts` の中身（`#passwordsNotMatchValidator`・form・`onClickSubmit`・2 つの表示切り替え）を `src/app/pages/register/register.component.ts` に移し、ログインのページと同じく `MatDialogRef` を消して `return_to` に対応させる。登録に成功したら「ユーザー登録が完了しました」を出し、`/login` に `return_to` を引き継いで送る（`router.navigate(['/login'], { queryParams: { return_to: this.returnToParam } })`）。テストは `register-dialog.component.spec.ts` を写して、成功で `/login?return_to=…` に行くこと、「ユーザー名が既に使用されています」の分岐、ログイン済みならすぐ戻ることを確かめる。

Run: `npx jest --testPathPattern pages/register`
Expected: PASS

- [ ] **Step 6: ルートを足す**

`src/app/app.route.ts` の `library` の後に足す（メンテナンス中も入れなくてよいので `canActivate: [maintenanceGuard]` を付ける。データの事前取得は要らないので `resolve` は付けない）:

```ts
    {
        path: 'login',
        loadChildren: () =>
            import('./pages/login/login.route').then((mod) => mod.LOGIN_ROUTES),
        canActivate: [maintenanceGuard],
    },
    {
        path: 'register',
        loadChildren: () =>
            import('./pages/register/register.route').then(
                (mod) => mod.REGISTER_ROUTES,
            ),
        canActivate: [maintenanceGuard],
    },
```

- [ ] **Step 7: ヘッダーをページへのリンクにする**

`header.component.ts` の `onClickRegister`・`onClickLogin` を、ダイアログを開く代わりに次へ替える:

```ts
    onClickRegister(): void {
        void this.#router.navigate(['/register'], {
            queryParams: { return_to: safeReturnTo(this.#router.url) },
        });
    }

    onClickLogin(): void {
        void this.#router.navigate(['/login'], {
            queryParams: { return_to: safeReturnTo(this.#router.url) },
        });
    }
```

`LoginDialogComponent`・`RegisterDialogComponent` の import と、使わなくなった `MatDialog`・`MatDialogModule` を外す。header の spec が `MatDialog.open` を確かめていたら、`router.navigate` を確かめる形に直す。

- [ ] **Step 8: ダイアログを消す**

`src/app/layout/components/login-dialog/` と `register-dialog/` を消す。`grep -rn "LoginDialogComponent\|RegisterDialogComponent" src` が 0 件であること。

- [ ] **Step 9: 関わるテストを流す**

Run: `npx jest --testPathPattern "pages/login|pages/register|layout/components/header"`
Expected: PASS

- [ ] **Step 10: コミット**

```bash
git add -A src/app/pages/login src/app/pages/register src/app/app.route.ts src/app/layout/components
git commit -m "feat: :sparkles: ログインと新規登録をページにする"
```

---

### Task 3: 投稿フォームのゲスト向け案内と 403・emit の削除

**Files:**
- Modify: `src/app/shared/operation-post-card/operation-post-form.component.ts`
- Modify: `src/app/shared/operation-post-card/operation-post-form.component.html`
- Test: `src/app/shared/operation-post-card/operation-post-form.component.spec.ts`

**Interfaces:**
- Consumes: `UserStateQuery.isLoggedIn$`、`safeReturnTo`（Task 1）、`FetchError.statusCode`

- [ ] **Step 1: テストを足す（失敗する）**

既存の spec の組み立てに `UserStateQuery`（`isLoggedIn$` を `BehaviorSubject<boolean>` で差し替えられる mock）と `Router`（`url` を持つ mock）を足し、次を確かめる:

```ts
    it('ゲストには入力欄の代わりに案内とログイン・新規登録のボタンを出す', () => {
        loggedIn$.next(false);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.textContent).toContain('目撃の投稿にはログインが必要です');
        expect(el.querySelector('form')).toBeNull();
        const links = Array.from(el.querySelectorAll('a')).map((a) =>
            decodeURIComponent(a.getAttribute('href') ?? ''),
        );
        expect(links).toContain('/login?return_to=/operation/real-time');
        expect(links).toContain('/register?return_to=/operation/real-time');
    });

    it('ログイン済みならフォームを出す', () => {
        loggedIn$.next(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('投稿中にログアウトしたら案内に切り替わる', () => {
        loggedIn$.next(true);
        fixture.detectChanges();
        loggedIn$.next(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('403 なら「投稿する権限がありません」と出す', async () => {
        loggedIn$.next(true);
        postOperationSighting.mockRejectedValue(new FetchError(403, 'Forbidden resource'));
        // 既存の成功ケースと同じく、有効な値を入れて submit する
        await submitValidForm();
        expect(snackBar.open).toHaveBeenCalledWith('投稿する権限がありません', 'OK', { duration: 3000 });
    });

    it('投稿に成功しても socket に送らない', async () => {
        loggedIn$.next(true);
        postOperationSighting.mockResolvedValue(undefined);
        await submitValidForm();
        expect(socket.emit).not.toHaveBeenCalled();
    });
```

（`router.url` は `'/operation/real-time'`。`submitValidForm` は既存の成功ケースの手順をまとめたテスト内の関数。既存の「投稿後に emit する」テストがあれば消す）

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPattern shared/operation-post-card/operation-post-form`
Expected: FAIL

- [ ] **Step 3: 実装する**

`operation-post-form.component.ts`:
- `readonly isLoggedIn = toSignal(inject(UserStateQuery).isLoggedIn$, { initialValue: false });`
- `returnTo(): string { return safeReturnTo(this.#router.url); }`（`#router = inject(Router)`。`router.url` は signal ではないので `computed` にしない。日付などのクエリが変わっても、描き直しのたびに今の URL を読む）
- `imports` に `RouterLink`・`MatButtonModule` を足す
- 失敗の分岐を次に替える:

```ts
        if (result.isFailure()) {
            this.#ga.sendEvent('sighting_submit_failure', {
                // GA のイベントの値は 100 文字まで
                error_message: result.error.message.slice(0, 100),
            });
            this.#error.handleError(result.error);
            this.#snackBar.open(
                result.error.statusCode === 403
                    ? '投稿する権限がありません'
                    : result.error.message,
                'OK',
                { duration: 3000 },
            );
            return;
        }
```

- 成功の分岐の `this.#socket.emit('sendSighting', result);` を消し、`#socket` の inject と `SocketService` の import も消す

`operation-post-form.component.html` は、今の `<form>…</form>` 全体を `@if (isLoggedIn()) { … } @else { … }` で包み、`@else` に次を置く:

```html
    <div class="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-py-4">
        <p class="tw-m-0">目撃の投稿にはログインが必要です</p>
        <div class="tw-flex tw-flex-row tw-gap-2">
            <a
                mat-stroked-button
                routerLink="/register"
                [queryParams]="{ return_to: returnTo() }"
            >
                新規登録
            </a>
            <a
                mat-flat-button
                color="primary"
                routerLink="/login"
                [queryParams]="{ return_to: returnTo() }"
            >
                ログイン
            </a>
        </div>
    </div>
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern shared/operation-post`
Expected: PASS（カードとダイアログの spec も含む）

- [ ] **Step 5: コミット**

```bash
git add src/app/shared/operation-post-card
git commit -m "feat: :lock: ゲストには投稿の代わりにログインを案内する"
```

---

### Task 4: socket の合図を type で受ける

**Files:**
- Create: `src/app/core/services/socket-signal.ts`
- Test: `src/app/core/services/socket-signal.spec.ts`
- Modify: `src/app/app.component.ts`
- Test: `src/app/app.component.spec.ts`

**Interfaces:**
- Produces: `readSocketSignal(ev: unknown): 'sighting' | 'timetable' | null`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// src/app/core/services/socket-signal.spec.ts
import { readSocketSignal } from './socket-signal';

const message = (data: unknown) => ({ data }) as MessageEvent;

describe('readSocketSignal', () => {
    it('sighting と timetable を読む', () => {
        expect(readSocketSignal(message('{"type":"sighting"}'))).toBe('sighting');
        expect(readSocketSignal(message('{"type":"timetable"}'))).toBe('timetable');
    });

    it.each([
        ['{"type":"other"}'],
        ['{"action":"sendSighting","data":"{}"}'],
        ['"{\\"action\\":\\"sendSighting\\"}"'],
        ['not json'],
        [''],
        [null],
    ])('%s は null（無視する）', (data) => {
        expect(readSocketSignal(message(data))).toBeNull();
    });

    it('MessageEvent でないものは null', () => {
        expect(readSocketSignal(undefined)).toBeNull();
        expect(readSocketSignal('sighting')).toBeNull();
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPattern core/services/socket-signal`
Expected: FAIL

- [ ] **Step 3: 実装する**

```ts
// src/app/core/services/socket-signal.ts
export type SocketSignalType = 'sighting' | 'timetable';

/**
 * socket から届いた合図を読む。api が保存に成功したときに socket の broadcast が送る {"type": …} だけを相手にする。
 * 古い sendSighting の転送（{action, data}）や壊れた値は null にして無視する。
 */
export function readSocketSignal(ev: unknown): SocketSignalType | null {
    if (typeof ev !== 'object' || ev === null || !('data' in ev)) {
        return null;
    }
    const data = (ev as { data: unknown }).data;
    if (typeof data !== 'string') {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(data);
        if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
            return null;
        }
        const type = (parsed as { type: unknown }).type;
        return type === 'sighting' || type === 'timetable' ? type : null;
    } catch {
        return null;
    }
}
```

`app.component.ts` の購読を替える:

```ts
        // api が保存に成功したら、socket が {"type": …} を送ってくる。その種類の画面内キャッシュを捨てる
        this.#socketService
            .on()
            .pipe(
                map(readSocketSignal),
                filter((type): type is SocketSignalType => type !== null),
                takeUntilDestroyed(),
            )
            .subscribe((type) => this.#queryInvalidator.invalidateLocal(type));
```

（`QueryInvalidationTag` に `'sighting'`・`'timetable'` があることを確かめる。無ければ止めて報告）

- [ ] **Step 4: app.component の spec を直す**

今の「何か届いたら sighting を捨てる」テストを、`{"type":"sighting"}` で sighting、`{"type":"timetable"}` で timetable、`{"action":"sendSighting"}` では何も捨てない、の 3 つに替える。

Run: `npx jest --testPathPattern "core/services/socket-signal|app.component"`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/core/services/socket-signal.ts src/app/core/services/socket-signal.spec.ts src/app/app.component.ts src/app/app.component.spec.ts
git commit -m "feat: :sparkles: socket の合図を種類ごとに受けてキャッシュを捨てる"
```

---

### Task 5: 無効化・復元で userId を送らない

**Files:**
- Modify: `src/app/libs/operation-sighting/usecase/dtos/invalidate-operation-sighting.dto.ts`
- Modify: `src/app/libs/operation-sighting/usecase/dtos/restore-operation-sighting.dto.ts`
- Modify: `src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.component.ts`
- Modify: `src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.component.ts`
- Test: 2 つのダイアログの spec

- [ ] **Step 1: テストを直す（失敗する）**

2 つのダイアログの spec で、`invalidate`／`restore` に渡す値が `{ operationSightingId, reason }` だけ（`userId` を含まない）であることを確かめる形にする。

Run: `npx jest --testPathPattern "operation-sighting-invalidation-dialog|operation-sighting-restoration-dialog"`
Expected: FAIL（`userId` が入っている）

- [ ] **Step 2: 直す**

DTO 2 つから `userId` を消す（api が JWT の `sub` を使うため）。2 つのダイアログの `userId: this.#userQuery.userId,` を消し、使わなくなった `#userQuery` の inject と import も消す。

Run: 同じコマンド
Expected: PASS

- [ ] **Step 3: コミット**

```bash
git add src/app/libs/operation-sighting/usecase/dtos src/app/shared/operation-sighting-invalidation-dialog src/app/shared/operation-sighting-restoration-dialog
git commit -m "refactor: :recycle: 目撃の無効化と復元で利用者 ID を送らない"
```

---

### Task 6: 全体の確認・目視・ADR

**Files:**
- Create: `docs/adr/<次の番号>-login-pages.md`

- [ ] **Step 1: 全テスト・lint・ビルド**

Run: `npx jest`（結果は `> .context/jest.txt` にファイルで取り、`Tests:` の行を見る）、サンドボックスの外で `npm run lint`、`npm run build`
Expected: どれも成功

- [ ] **Step 2: 画面で確かめる**

開発サーバー（client 直下で `ng serve`、api はローカル）を開き、Playwright で 375 幅と 1440 幅について:
- ゲストで real-time の FAB を開くと案内が出る。ダッシュボードの投稿カードも同じ案内になる
- 案内の「ログイン」で `/login?return_to=%2Foperation%2Freal-time` に行き、ログインすると real-time に戻ってフォームが出る
- ヘッダーの「新規登録」で `/register` に行き、`return_to` が今のページになっている
- `/login?return_to=//evil.example` でログインすると `/` に戻る
- ログインと登録のページの見た目（カードの幅・余白・ボタンの並び）を目視し、他のページの余白（スマホ横 16px）とそろっていることを確かめる。スクリーンショットを `.context/` に保存する

- [ ] **Step 3: ADR を書く**

`docs/adr/` の既存の書式にならい、ログイン・登録をダイアログからページに移した理由（M4 の同意ページから同じ入口に送れる・`return_to` で元の画面に戻れる）と、`return_to` を相対パスだけにしたことを記録する。

- [ ] **Step 4: コミット**

```bash
git add docs/adr
git commit -m "docs: :memo: ログインと登録をページにした ADR を追加する"
```

- [ ] **Step 5: 本番での確認（デプロイ後）**

- ゲストで案内が出る
- 登録者で投稿すると、別の端末の real-time が更新される（socket の broadcast 経由）
- 編集者で時刻表を保存すると、別の端末の時刻表が取り直される
