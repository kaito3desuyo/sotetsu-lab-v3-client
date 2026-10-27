# ADR-0015: 圏外のために、取得に失敗したときだけ端末の保存を戻す

- **日時**: 2026-10-27
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み（`ssr: false` のまま）
- **ブランチ**: feature/ssr-offline
- **関連**: SSR の設計 `docs/superpowers/specs/2026-10-12-ssr-design.md`（7 章・15 章）、ADR-0014（SSR の描き分けの決まり）、ADR-0002（QueryCache）

---

## 背景

- 2026-10-26 に本番（v2.17.5）で測った。Service Worker のデータの保存に入っていたのは BFF の `/api/maintenance` と `/api/auth/token` の 2 件だけで、データの API（`api.sotetsu-lab.com`）は 1 件も保存されていなかった。
- 圏外でも駅別時刻表が出たのは、ブラウザの HTTP キャッシュ（API の `private, max-age=3600`）が答えたため（推測）。1 時間を過ぎると出なくなる。real-time は目撃が `no-store` なので、圏外では全部「不明」になった。
- ストアを丸ごと保存していたのは運用表とダッシュボードだけで、どちらも起動時に戻していた。real-time は設定 5 項目、全線とダイヤグラムは畳み状態だけ。駅別・行路図・過去の運用は保存していなかった。
- 取得に失敗しても読み込み中はどのページでも解けるが、知らせるのは real-time だけだった。real-time の「最終更新」は保存されず、最初は「今」になる（古いデータが新しく見える）。
- 保存の部品（elf-persist-state 1.2.1）は、保存に一度失敗するとそれきり保存しない。起動直後 1 秒の変更を保存しないことがある。版の仕組みも無い。
- SSR を有効にすると、ページの中身は HTML に埋めて渡すので、ブラウザは API を取らない。Service Worker が保存できるのはブラウザが自分で取ったものだけ。

## 決定

- **役割の分け方**: ブラウザが自分で取ったもの（起動時の共通データ・画面の移動で取るデータ）は Service Worker が保存する。SSR で HTML に埋めて渡したページの中身は、ページごとの保存で賄う。
- **Service Worker**（`ngsw-config.json` の `dataGroups`）: データの API を足す。`freshness`・待ち時間 3 秒・期間 7 日・件数 50（1 件が数 MB になるので 100 にしない）。BFF（`/api/**`）は今のまま。
  - **目撃と現在位置は Service Worker に保存させない**（`/v3/operation-sightings/**`・`/v3/operations/current-positions`・`/v3/operations/*/current-position`。ユーザー判断 2026-10-27）。`freshness` は、圏外で fetch が失敗すると保存した応答を「成功」としてページに渡す（`ngsw-worker.js` の `handleFetchWithFreshness`）。するとページ側の「失敗したら保存した中身を戻して知らせる」が働かず、real-time の「最終更新」も今の時刻になって、古い目撃が新しく見える。2026-10-27 に実機で確認した。目撃と現在位置は、worker が素通しでネットワークへ送り、圏外では失敗する形にして、ページの保存（`OfflineSnapshots`）に任せる。
  - 除外のしかた: `dataGroups` の `urls` は否定（`!` 始まり）を解釈しない（`@angular/service-worker` の `config.mjs` は `urls` を `urlToRegex` でそのまま正規表現にする。否定を解釈するのは `assetGroups` の `files` と `navigationUrls` だけ）。そこで `api-data` は `https://api.sotetsu-lab.com/v3/**` ではなく、クライアントが使う v3 の資源（`feature-flags`・`calendars`・`operations/calendar` など）を列挙する。パターンは URL の一部に当たればよいので、末尾に `/**` を付けず、問い合わせ付きも当たる。**v3 に新しい資源を足したときは、保存したいなら `api-data` に足す**（足さなければ素通しで、保存されないだけ）。`src/ngsw-config.spec.ts` が、目撃・現在位置の URL がどの組にも当たらないこと、時刻表などが `api-data` に当たることを、ngsw.json の生成関数（`Generator`）と同じ規則で確かめる。
  - **書き込み後の 1 時間は Service Worker を通さない**: ADR-0002 の `cache: 'reload'`（`QueryInvalidator.requestCache`）を worker は守らず、保存した応答を返しうる。`requestCache` が `'reload'` を返す取得には `ngsw-bypass: true` のヘッダーを付け、worker に素通しさせる（`ngsw-worker.js` は `ngsw-bypass` ヘッダーか問い合わせがあれば何もしない）。query 側は変えず、`NgswBypassInterceptor`（`core/interceptors/ngsw-bypass.interceptor.ts`）が `cache === 'reload'` かつ `/v3/` の要求にまとめて付ける。API の CORS は許可ヘッダーを指定せず、リクエストのヘッダーを反射するので通る。 ただし、この 1 時間の `ngsw-bypass` の取得は worker の保存を更新しないので、その間に圏外になると書き込み前の応答が出うる（窓の後に通信できる状態で一度開けば、`freshness` が上書きする）。
- **ページの保存は `core/offline/offline-snapshots.ts` の `OfflineSnapshots` で行い、取得に失敗したときだけ戻す**。
  - 取得に成功したら、そのときの中身（読み込み中の印などを除く）を、取った条件（ダイヤ・駅・向きなど）と時刻を添えて localforage に保存する。保存はページごとに最新の 1 件。キーは `offline-snapshot:<ページ>`。
  - 起動時には戻さない。取得に失敗し、保存した条件が今の条件と合うときだけ、保存した中身をストアに入れる。
  - 保存した形には版（`OFFLINE_SNAPSHOT_VERSION = 1`）を付け、版が違えば捨てる。
  - 保存の失敗は握りつぶし、次の成功でまた保存する。読み込みの失敗も、戻さず（null を返して）何もしない。部品の保存の仕組みは使わない。
  - サーバー（`isPlatformServer`）では保存も読み込みもしない。
- **取ったデータは全部ページの保存に入れる**（ユーザー判断 2026-10-27）。そのページで取ったデータは、ページの保存（`OfflineSnapshots`）にすべて入れる。目撃と現在位置は Service Worker に入らない（上）ので、ページの保存に入れ漏らすと、圏外でどこにも残らない。
  - **例外は起動時の全体のデータ**（`initialDataResolver`・`global-states`）。これは Service Worker（`api-data`）に任せたまま、ページの保存には入れない。
  - **受け入れた限界**: 時刻表系のページは、圏外でも Service Worker に保存があればそれが成功として出るので、ページの保存を戻す知らせは出ない（出るのは worker に保存が無い・追い出されたとき）。これは変えない。
  - **目撃は日付つきの別 key で保存する**。目撃（充当編成の根拠）は時刻表と違い「今日」で変わるので、時刻表の保存とは別の key に、条件へ鉄道の日付（`getRailwayDate` を `yyyy-MM-dd` にしたもの。4 時までは前日）を足して保存する。日付が違う保存は戻さない。key は、駅別時刻表の `TimetableStationSightings`（条件 `calendarId`・`stationId`・`tripDirection`・`date`）、列車ダイヤグラムの `TrainDiagramSightings`（`calendarId`・`routeIds`（sort して join）・`date`）、列車位置情報の `TrainLocationSightings`（`calendarId`・`routeId`・`date`）。取れたら保存し、取れなかったら戻して知らせる。列車ダイヤグラムと列車位置情報は、列車を選んだ・動いている列車が変わったときに足りない分だけ取るので、戻すときは、すでに取れている目撃を保存で上書きしない。駅別時刻表は全部の運用の目撃を 1 回で取るので、戻すときは保存で丸ごと置き換える。保存は、どのページも取れた記録の全体を最新の 1 件として上書きする。
  - **受け入れた限界（目撃）**:
    - 列車ダイヤグラム・列車位置情報は、選んだ（動いている）運用が保存に無くても、条件（日付を含む）が合えば保存を戻して知らせが出る。
    - 保存はその時点の記録全体を最新の 1 件として上書きするので、再読込のあとは、前の起動で取った目撃が落ちる。
    - 駅別時刻表で、時刻表をページの保存から戻したとき（worker に時刻表が無いとき）は、充当編成は取りにも戻しにも行かない。
- **知らせ方は全ページ共通**: 戻したら `通信できないため、{時刻}に保存した内容を表示しています`（action は `OK`）を出す。`{時刻}` は、保存した日が今日なら `H時m分`、違えば `M月d日 H時m分`（端末の時刻帯。`format-saved-at.util.ts`）。 ただし時刻表系のページは、圏外でも Service Worker に保存があればそれが成功として出るので、この知らせは出ない（出るのは worker に保存が無い・追い出されたとき）。
- **画面の設定は今のまま `persistState` で起動時に戻す**: real-time の 5 項目・全線とダイヤグラムの畳み状態・運用表の運用群・ダッシュボードの `hasVisitedBefore`。

### 実装で決めた、新しいページに守らせる規則

- `restore` の `apply` は `(data: T, savedAt: number) => void`。保存した時刻を real-time の「最終更新」に使うため。
- 運用表とダッシュボードの `persistState` が、設定以外（取得した中身）を起動時に戻さないようにする。「設定以外を捨てる」関数をストアのファイルから名前付きで export し、`persistState` の `preStoreInit` に渡し、単体でテストする。
- `fetchSeq` で古い取得を捨てているページは、古い取得の失敗では戻さない（`seq === fetchSeq` のときだけ `restore`）。
- 戻すのは、取得がすべて終わってから（`Promise.allSettled` などで全部の終了を待ち、1 本でも失敗なら `restore`）。遅れて届いた成功分が、戻した中身を部分的に上書きしないため。
- 握りつぶして空で済ませている取得のうち、□ の表示に使う `itineraryLinks`（train-diagram・real-time・train-location）は、失敗したら保存しない。劣化した中身が、良い保存を上書きして残るのを避ける。ダッシュボードの今日のダイヤ名と目撃位置の個別失敗は、画面の表示と同じ劣化なので、そのまま保存してよい。
- 路線だけ・ダイヤだけを取り直すページ（列車位置情報）は、前の取得が失敗したあとの片方だけの取り直しでは保存しない。ストアのダイヤと路線が新旧混ざった中身を、今の条件で保存してしまうため。
- 列車位置情報の目撃は、圏外の間は 10 秒ごとに取得に失敗するので、同じ条件（日付を含む）では戻すのも知らせも 1 回に限る（インスタンスごとの印）。目撃が取れたら印を消し、次に圏外になったらまた 1 回だけ知らせる。
- 日付などの条件が取れず中身が空のとき（過去の運用の素の URL で日付が無いときなど）は保存しない。
- real-time とダッシュボードは、ストアに今回より前の取得済みの中身（`hasFetched` 系が true）があるときは `restore` しない。メモリの方が新しく、画面の移動で戻ってきたときに古い保存へ巻き戻さないため。

## 退けた案

- **起動時に保存を戻す（運用表・ダッシュボードの従来の形）**: SSR の HTML と古い中身が食い違って hydration がずれる。通信できるときにも古い中身が一瞬出る。
- **部品（elf-persist-state）の保存の仕組みをページの中身にも使う**: 一度失敗すると止まる。起動直後 1 秒の変更を落とす。版の仕組みが無く、形を変えたときに古い中身を捨てられない。
- **Service Worker だけで賄う**: SSR で HTML に埋めたページの中身は、ブラウザが取らないので保存されない。
- **目撃と現在位置も Service Worker に保存する（待ち時間 10 秒・期間 1 日の組。当初の案）**: 圏外で保存した応答が成功として返り、ページの知らせと保存時刻が働かない（上の決定）。

## 結果

- `OfflineSnapshots` を使うページは次の 9 つ: 駅別時刻表・全線時刻表・運用行路図・運用表・過去の運用情報・列車ダイヤグラム・real-time・ダッシュボード・列車位置情報（2026-10-27 に追加。条件は `calendarId`・`routeId`）。ページごとに最新の 1 件だけ持つ（目撃は別 key でもう 1 件）。
- 保存と読み込みはサーバーでは何もしないので、SSR を有効にした後もそのまま使える。ページの中身は起動時に戻さないので、hydration への影響も無い。
- 新しくページを足すときは、取得の成功で `save`、失敗で `restore` を書く。上の規則を守る。保存する形が変わって読めなくなるときは `OFFLINE_SNAPSHOT_VERSION` を上げる（古い保存は捨てられる）。
- 時刻表などのデータの API が Service Worker に保存されるので、通信が遅いだけの回線でも 3 秒待った後は保存した応答が出る。目撃と現在位置は保存されず、圏外では取得が失敗してページの保存から出る。
- real-time だけでなくダッシュボードも、取得に失敗して保存した中身を戻さなかった（手元に中身がある・保存が無い・戻せなかった）ときは `データの取得に失敗しました` を出す。戻せたときは戻した旨の知らせだけを出す。
- 2026-10-27 の Elf からの移行（ADR-0016）で、保存と復元の呼び出しは、コンポーネントが `OfflineSnapshots` を inject して呼ぶ形から、ストアの部品 `withOfflineSnapshots`（`core/store-features/`）が持つ `saveOfflineSnapshot(name, conditions)` と `restoreOfflineSnapshot(name, conditions)` に移った。何を保存するか（`key`・`select`・`apply`）はストアの定義に並ぶ。保存先・キー（`offline-snapshot:<key>`）・形・版・戻す決まりは変えていない。localforage の読み書きは `DeviceStorage` に寄せた。
- 殻（`index.csr.html`）と `ngsw-config.json` の `index` は SSR のビルドで初めて要るので、計画 2c で行う。
