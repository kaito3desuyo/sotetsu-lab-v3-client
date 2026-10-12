# ADR-0004: 使っていないコードを消し、重なったライブラリと仕組みを 1 つに寄せる

- **日時**: 2026-10-08
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: refactor/remove-unused-code

---

## 背景

- ユーザーが、不要なコンポーネント・コード、リファクタリングできるコード、書き方がほかと違うコンポーネントの洗い出しを頼んだ（2026-10-08）。
- 洗い出しの結果を A（消す）・B（まとめる）・C（書き方をそろえる）・D（大きいファイル）に分け、ユーザーが「順にやっていこ」と言った。この ADR は A〜D の記録。
- 寄せる先は、ユーザーが選んだ。

## 決定

### A. 使っていないものを消す

- コンポーネント: operation-real-time-header、旧 operation-number-link。
- パイプ: range・trackBy・tripClassBaseName。
- util: arrayUniqueBy・findLatestAndCirculateOperationSighting・Pagination。
- libs/trip の TripService・TripQuery、TokenDtoBuilder・TimeDtoBuilder。
- 中身の無い scss 32 個と、それを指す styleUrl(s)。
- CalendarListStateQuery.selectByDate。
- 依存: class-validator・just-pipe・qs。
- 「使っていない」は、import パスが 0 件で判定した。シンボル名が他のファイルに無いだけでは足りない。builder は同じファイルの中で使われ、operation-table のパイプは TS で `new` されていた。

### B. まとめる

| もの | 前 | 後 |
|---|---|---|
| パイプの重複 | `antiBrackets` と `newAntiBrackets` など 3 組 | 実装は new 付き、名前は new なし（ユーザー判断） |
| ページのリゾルバー | `*ResolverService` 10 個 | 関数リゾルバー `pageResolver(persistInitialized$?)` 1 個 |
| NgModule | CoreModule・PipesModule | app.config の provide と、パイプの個別の import |
| 便利関数 | lodash-es・es-toolkit・just-* | es-toolkit（lodash と同じ挙動の `es-toolkit/compat`） |
| 日付 | dayjs と date-fns | date-fns |

- AdSense の `forRoot` は、一時停止中で戻す用に残すとユーザーが決めていたので、`importProvidersFrom` で残した。
- 時刻と日オフセットの比較は、`railway-day.ts` に足した `toServiceSeconds(days, time)` にまとめた。時刻が無ければ NaN で、比較はどれも false になる（dayjs の不正な日付と同じ）。
- 目撃からの日数（`calculateDayCountFromToday`）は、`undefined` でも NaN を返すようにした。dayjs では `dayjs(undefined)` が「今」になり、目撃の無い編成が今日の目撃に見えるため、テンプレートで `?? null` を挟んでいた（ADR-0003）。その罠が無くなったので、`?? null` は外した。

### C. 書き方をそろえる

| もの | 前 | 後 |
|---|---|---|
| inject したフィールド | `private x` と `#x` | `#x`（`viewChild` は `#` に付けられないので `private readonly`） |
| 小さな書き方 | `styleUrls`・`standalone: true`・`CommonModule`・`@ViewChild` | `styleUrl`・省略・使う部品だけ・`viewChild()` |
| shared の旧構成 6 組と library-vehicle | `-c`/`-p` 分割、`states/` の `createElfStore`、Subject のイベントサービスと `*_PROVIDERS` | 1 つのコンポーネント |
| 検索カードの選択値 | ページが route の値を card の state に `setXxx` で入れる | ページから `input` で渡す。無ければ今日のダイヤ |
| 検索・投稿カードの「移る」 | card が Subject に流し、5 ページが同じ `router.navigate` を書く | card 自身が `Router` で移る。失敗の通知は `notifyNavigationFailure` |
| ダイアログ | 見出し・本文の `-c`/`-p` と、データを渡すだけの state | `MAT_DIALOG_DATA` を直接読み、`MatDialogRef` で閉じる。サービスは `open` だけ |
| 旧版が消えた部品の名前 | `new-operation-number-link`・`new-operation-post-card` | `operation-number-link`・`operation-post-card`（パイプと同じく「名前は new なし」） |
| `special/` | `libs/trip/special/{enums,constants}`・`timetable-edit-form/special/enums` | `libs/trip/usecase/{enums,constants}`（lib の外から見てよいのは usecase だけ）・`timetable-edit-form/enums` |
| loading | `shared/app-shared/loading/`、1 ファイルにコンポーネントと directive | `shared/loading/`、directive は `remove-mat-animation-noopable.directive.ts` |
| `shared/pipes/` | パイプ 1 個だけ | `core/pipes/`（ドメイン寄りのパイプも、もうそこにある） |

- どれもユーザーが寄せる先を選んだ（2026-10-08）。
- `createElfStore` と、それだけが使っていた `nanoid` は、利用者が無くなったので消した。
- 運用行路図では、取得し直す間も前のダイヤと運用をカードに出し続ける（以前の `filter(!!)` と同じ）。
- `new-operation-number-link-context-menu.type.ts` は誰も import しておらず、コンポーネントの中に同じ型があったので消した。
- `ngOnInit` が残るのは app.component（ソケット接続）と confirm-dialog（フォーカス）だけで、どちらも初期化時にやる処理なので残した。

### D. 大きいファイルを分ける

ユーザーが選んだのは 3 つ（運用行路図の描画部品・edit-form-trips・駅名の対応表）と、ロジックを持つ部品の spec。

| もの | 前 | 後 |
|---|---|---|
| 運用行路図の描画 | `-c`/`-p` の 2 部品（619 行）。遷移は Subject のイベントサービス | 1 つの `operation-route-diagram-drawing`（328 行）。ストアはページが読んで `input` で渡し、時刻表への遷移はページが `Router` で行う |
| 行路図のラベル配置・帯の行 | 部品の中 | `utils/operation-route-diagram-band-labels.util.ts`・`utils/operation-route-diagram-build-band-rows.util.ts`。定数は `ROUTE_DIAGRAM_` 付きで、使う util に置く |
| 列車情報の入力フォーム | edit-form-trips（613 行）がフォームの組み立てと DTO への変換を持つ | `utils/timetable-edit-form-trip-form.util.ts`・`utils/timetable-edit-form-to-trip-dtos.util.ts`（中身はそのまま移した）。部品は 433 行 |
| 駅 ID → 駅名 | train-diagram と train-location が同じ組み立てを持つ | `shared/station-name-by-id.util.ts` の `buildStationNameById` |
| 目撃の無効化・復元ダイアログ | サービスがデータと開いた参照を持ち、API も閉じるのも担う。部品は `MAT_DIALOG_DATA` を受けて使わない | C のダイアログと同じ。部品が `MAT_DIALOG_DATA` と `MatDialogRef` を使い、`OperationSightingService` に直接頼む。サービスは `open` だけ（ユーザー判断） |

- spec を足したのは、リアルタイム運用情報の操作部・表・カード、目撃投稿カード、ログイン・ユーザー登録ダイアログ、過去の運用情報の検索フォーム、目撃の無効化・復元ダイアログ。どれも、わざと壊して落ちることを確かめた。
- ログインダイアログの使っていない `HttpClient` の注入を消した。
- 目撃投稿カードの `submitEvent$`（投稿後にリアルタイム運用情報を取り直す通知）は、遷移ではないので残した。

## 結果

- jest 1204 件・lint・tsc（本体と spec）・本番ビルドが通る。
- ローカル（date-fns）と本番（dayjs）で、駅別時刻表とリアルタイム運用情報の文字を比べ、同じだった（日数・太字・推測の「?」を含む）。
- C の後、ダッシュボード・運用表・運用行路図・過去の運用情報・全線時刻表・駅別時刻表・車両ページで、カードとページの要素の位置・色・選択値を本番と比べ、同じだった。ダイヤ選択ダイアログも同じ。確認ダイアログは本番ではログインしないと開けないので、ローカルで寸法・フォーカス・色だけ確かめた。
- C の後の jest は 1208 件。
- D の後、運用行路図の SVG は本番と同じ（正規化したマークアップのハッシュが一致）。空の状態の位置も同じ。列車情報の追加・更新画面は、要素の位置・文字・入力値が本番と同じ。目撃の無効化・復元ダイアログは本番ではログインしないと開けないので、ローカルで変更前と文字・寸法・ボタン・閉じ方を比べ、同じだった。
- D の後の jest は 1272 件。
- 依存は 10 個減った（class-validator・just-pipe・qs・just-has・just-safe-get・just-safe-set・just-extend・lodash-es・@types/lodash-es・dayjs）。

## 検討した代案

- **パイプは new 付きの名前に寄せる**: 差分は小さいが、旧版が消えると「new」が何も指さなくなる。
- **日付は今回触らない**: 18 ファイルずつと広い。ユーザーが date-fns に寄せる方を選んだ。
- **interceptor も関数にする**: 今回は provide の移し替えだけにして、挙動を変えなかった。
