# ADR-0009: Supabase Auth への移行に合わせたトークンと socket の扱い

- **日時**: 2026-10-20
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: feature/supabase-auth
- **関連**: 認証基盤の Supabase Auth への移行（目撃投稿の登録制マイルストーンの ①）。全体の設計は api リポの `docs/superpowers/specs/2026-10-19-supabase-auth-migration-design.md`

---

## 背景

- 認証基盤を Cognito から Supabase Auth に移す。client は Supabase を知らないままにする。ログイン・登録・トークンは今までどおり backend の `/api/auth/*`・`/api/user/*` を呼ぶ。
- 新しい backend は、ゲストにも Supabase の匿名セッションを作ってトークンを返す。api も socket も、読み取りや接続にトークンを求める。
- 匿名サインインには、Supabase の IP ごとの制限がある。backend は、制限に当たったときや Supabase に届かないとき 503 を返す。
- 今まで `TokenStateStore.fetch()` は失敗をそのまま投げていた。起動の `APP_INITIALIZER` が最初にこれを待つので、投げると画面ごと出ない。

## 決定

- `/api/auth/token` が 204 なら、トークン無しとして扱う（`X-Sotetsu-Lab-Authorization` を付けない）。新しい backend はもう 204 を返さないが、切り替えの途中に備えて残す。
- トークンが取れなかったとき（503 など）は投げず、トークン無しにして先へ進む。API は 401 を返すので、`AuthInterceptor` がそこで 1 回取り直す。
- socket は、トークンが取れてからつなぐ。`TokenStateQuery.accessToken$` を見て、最初に値が入ったときに 1 回だけつなぐ。`token=guest` を送るのはやめた（socket はトークンの無い接続を Deny する。socket の ADR-0001）。
- 匿名のプロフィールは 401 になる（`display_name`・`user_role` が無い）。`UserQuery` は 401 をゲスト（null）として扱うので、画面はゲストのままだ。GA の `logged_in` も false のまま。
- プロフィールの型から、誰も読んでいない `createdAt`・`updatedAt` を外した。backend がトークンの claim から返すようになり、日時を返さなくなったからだ。

## 影響

- ログイン・登録・ログアウトの画面と、呼ぶ先は変わらない。
- socket の接続は、起動時の 1 回きりのまま。トークンの期限が切れても、つないだままの接続は切れない（authorizer は接続のときだけ見る）。
