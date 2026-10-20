# 認証基盤を Supabase Auth に移す（client）設計

- 日付: 2026-10-19（2026-10-20 に、ゲストの匿名セッションと socket のトークン必須に合わせて改めた）
- ブランチ: `feature/supabase-auth`
- 全体の設計: api リポジトリの `docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`（目的・Supabase の設定・切り替えの順番）
- 計画: `docs/superpowers/plans/2026-10-19-supabase-auth-migration.md`
- ADR: `docs/adr/0009-supabase-auth.md`

## 1. 目的

- 認証基盤が Cognito から Supabase Auth に替わっても、client は Supabase を知らないままにする。ログイン・登録・トークン・プロフィールは今までどおり backend の `/api/auth/*`・`/api/user/*` を呼ぶ
- api と socket が、読み取りや接続にもトークンを求めるようになる。ゲストでも、backend から受け取ったトークンで API と socket を使えるようにする

## 2. backend と api・socket の振る舞い（client から見たもの）

- `/api/auth/token`: ログイン中もゲストも 200 `{ accessToken, tokenType, expiresAt }`。ゲストには Supabase の匿名セッションのトークンが返る。Supabase に届かない・匿名サインインの制限に当たったときは 503
- `/api/user/profile`: ログイン中は 200 `{ userId, username, displayName, role }`。匿名やトークン無しは 401。`createdAt`・`updatedAt` は返さない
- api: トークンが無い・壊れていれば 401。役割が足りなければ 403
- socket: トークンが無い・JWT でない接続は拒否する（`token=guest` は通らない）

## 3. 変更

### 3.1 トークン

- `/api/auth/token` が 204 なら、トークン無しとして扱う（`X-Sotetsu-Lab-Authorization` を付けない）。新しい backend はもう 204 を返さないが、切り替えの途中（古い backend）に備えて残す
- `TokenStateStore.fetch()` は、取れなかったとき（503 など）に投げない。トークン無しにして先へ進む。起動の `APP_INITIALIZER` が最初にこれを待つので、投げると画面ごと出なくなるからだ
- トークン無しで API を呼ぶと 401 になる。`AuthInterceptor` がそこで 1 回だけ取り直す（今の動きのまま）

### 3.2 socket

- トークンが取れてからつなぐ。`TokenStateQuery.accessToken$` を見て、最初に値が入ったときに 1 回だけつなぐ
- `token=guest` を送るのはやめる
- 接続は起動時の 1 回きりのまま。authorizer は接続のときだけトークンを見るので、トークンの期限が切れても、つないだままの接続は切れない

### 3.3 プロフィール

- 匿名のプロフィールは 401 になる。`UserQuery` は 401 をゲスト（null）として扱うので、画面はゲストのまま。GA の `logged_in` も false のまま
- プロフィールの型から、誰も読んでいない `createdAt`・`updatedAt` を外す

## 4. 変えないもの

- ログイン・登録・ログアウトの画面と、呼ぶ先

## 5. テスト

- `TokenStateStore`: トークン無し（204）なら状態を空にする、取れなければ（503 など）投げずに状態を空にする
- `TokenQuery`: 乱数付きの取り直しなど既存の動き
- `SocketService`: トークンがあればそのトークンでつなぐ、無ければつながず、取れたときに 1 回だけつなぐ
- user まわりの builder・query のテストから日時を外す
- 手元（api・backend は本番の DB と Supabase につながる）: ゲストで real-time が出る（匿名のトークンで API・socket とも）、ログインすると表示名が出て、ログアウトでゲストに戻る

## 6. 切り替え

- api・socket のデプロイの後、backend より前に出す（全体の spec 9 章の 3）。204 も受け入れる形なので、backend が Cognito のままの間に出しても問題ない
- Service Worker に残った古い client は、socket に `token=guest`・`token=null` を送って拒否される。目撃の即時の更新が届かないだけで、画面は API から読める。新しい版に替われば直る
