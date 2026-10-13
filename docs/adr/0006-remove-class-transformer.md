# ADR-0006: DTO/Model のクラスと class-transformer を廃止し、interface と手書きの builder にする

- **日時**: 2026-10-13
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: refactor/remove-class-transformer

---

## 背景

- 本番を Lighthouse と CPU プロファイル（CPU 4 倍遅延・スマホ想定）で全 10 ページ測ったところ、JS 実行の最大の塊が class-transformer だった。5 ページで 0.7〜1.6 秒を占めていた。

  | ページ | class-transformer の時間（4 倍遅延） |
  |---|---|
  | 列車ダイヤグラム | 1.6 秒 |
  | 列車位置情報 | 1.6 秒 |
  | トップ（ダッシュボード） | 1.5 秒 |
  | 駅別時刻表 | 0.9 秒 |
  | 運用表 | 0.7 秒 |

- どれも trip-blocks（上下）か運用表の `/operations/calendar/:id/trips` を、builder の `plainToClass` に通す所だった。
- class-transformer がしていた仕事は 3 つだけだった。
  1. 各階層の `id` を `tripId`・`timeId` などに付け替える（`@Expose({ name: 'id' })`）
  2. `@Expose` の無いキーを捨てる（`excludeExtraneousValues: true`）
  3. 入れ子もクラスにする（`@Type`）。日付の変換などはしていない
- DTO にはメソッドが無く、`instanceof` も `new XxxDto()` もどこにも無かった。Model（27 個）と DTO（45 個）は、`id` の名前以外ほぼ同じ項目を 2 回書いた写しだった。
- builder の形も 3 通りに分かれていた（`classToPlain` → `plainToClass` の二重変換、`classTransformer()` ヘルパー、`plainToClass` のみ）。

## 決定

設計の原典は `docs/superpowers/specs/2026-10-13-remove-class-transformer-design.md`。

| 論点 | 決定 |
|---|---|
| 進め方 | 2 段に分けず一度にやる。PR は 1 本。コミットは lib ごと |
| 型の名前・置き場所 | 今のまま（`usecase/dtos/*.dto.ts`・`infrastructure/models/*.model.ts`） |
| DTO | class から `interface` に変える。デコレーターは全部消す |
| Model | `interface` で残す。API の応答・送信の形そのもの（主キーは `id`） |
| 読み取りの変換 | スプレッドで写し、`id` と入れ子だけ直す |
| 書き込みの変換 | 送る項目を明示して並べる。スプレッドは使わない |
| builder の形 | `XxxDtoBuilder` / `XxxModelBuilder` のオブジェクトにそろえる |
| 複数形 | 全 DTO builder に `buildFromModels` を置く。別オブジェクトの複数形 builder は消す |
| 書き込みのメソッド名 | 入力の型名で呼ぶ（`buildFromCreateDto`・`buildFromReplaceDto`・`buildFromLoginDto`・`buildFromRegisterUserDto`） |
| 重複した `TripBlockDetailsDto` | `libs/trip-block` に寄せ、`libs/trip` 側を消す |
| 効果の測定 | ローカルで完結させる。master とブランチを同じ条件でビルドして比べる |

### 読み取りの builder

```ts
buildFromModel: ({ id, trip, ...rest }: TimeModel): TimeDetailsDto => ({
    ...rest,
    timeId: id,
    trip: trip && TripDtoBuilder.buildFromModel(trip),
}),
buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
    models.map((model) => TimeDtoBuilder.buildFromModel(model)),
```

- 関数に書くのは「主キーの付け替え」と「入れ子の変換」だけ。残りはスプレッドで写す。API に項目が増えても、interface に 1 行足すだけで済む。
- 入れ子の変換を書き忘れると、`id` しか無いものを `xxxId` 必須の型に入れることになり、型エラーで止まる。キャスト（`as`）で黙らせない。
- 入れ子にしか出てこないエンティティ（time・stop など）にも builder を新設した。

### 書き込みの builder

- API に送る項目を 1 つずつ並べたオブジェクトリテラルにする。入れ子（列車・時刻・運用）も同じ。入力画面の `toTripDtos` も同様。
- Replace は `tripBlockId`・`tripId`・`timeId`・`tripOperationListId` を `id` に付け替える。Create には ID を一切載せない（コピー元の `tripId` がフォームに残っていても載せない）。
- スプレッドを使わないのは、フォームにしか無い項目（`stopType` など）とコピー元の ID を、今まで `excludeExtraneousValues` が捨てていたからだ。API は余分なキーを黙って捨てるが、何を送るかを API 任せにしない。件数が少ないので速さは関係ない。

### 消したもの

- `core/configs/class-transformer.ts`、`core/utils/class-transformer.ts`、`libs/trip/usecase/dtos/trip-block-details.dto.ts`
- `setup-jest.ts` の `import 'reflect-metadata'`
- 依存の `class-transformer`・`reflect-metadata`
- カレンダーの単独関数 `buildCalendarDetailsDto`（`CalendarDtoBuilder.buildFromModel` に吸収）と、別オブジェクトの複数形 builder 5 個

## 理由

- 自前の API を自前の画面が読むだけの client に、同じ形の二重定義とリフレクションの層は要らない。interface なら 1 行足すだけで済み、デコレーターの付け忘れも無い。
- 速さ。この branch で、本番の trip-blocks（616 ブロック）に手書きの `TripBlockDtoBuilder.buildFromModels` を通した中央値は 5.5 ms だった。class-transformer 版は同じデータで約 338 ms かかった（Node、CPU 制限なし）。
- 画面ごとの効果は、ローカルで master とブランチを同じ条件でビルドして測った。

| ページ | CPU 合計 ms（master→branch） | うち class-transformer ms | スマホ TBT ms | スマホ LCP ms | スマホ Perf | PC TBT ms | PC Perf |
|---|---|---|---|---|---|---|---|
| top | 2951 → 1724 | 1544 → 0 | 860 → 1063 | 16558 → 16327 | 36 → 34 | 127 → 138 | 74 → 74 |
| real-time | 4195 → 4120 | 315 → 0 | 1231 → 1062 | 16926 → 16769 | 13 → 14 | 89 → 76 | 48 → 49 |
| past-time | 1239 → 1142 | 106 → 0 | 359 → 337 | 16497 → 16322 | 48 → 48 | 34 → 35 | 72 → 73 |
| table | 2211 → 1589 | 741 → 0 | 935 → 513 | 17525 → 17218 | 12 → 20 | 112 → 32 | 46 → 48 |
| route-diagram | 998 → 920 | 102 → 0 | 494 → 458 | 15875 → 15720 | 44 → 45 | 31 → 33 | 76 → 77 |
| all-line | 1103 → 1021 | 98 → 0 | 320 → 312 | 16476 → 16326 | 49 → 49 | 40 → 41 | 75 → 76 |
| station | 3005 → 2295 | 915 → 0 | 2438 → 1191 | 29141 → 28689 | 9 → 14 | 484 → 199 | 26 → 41 |
| train-diagram | 4278 → 2828 | 1658 → 0 | 2764 → 1481 | 16111 → 15956 | 18 → 22 | 557 → 298 | 45 → 57 |
| train-location | 3151 → 1879 | 1644 → 0 | 1772 → 571 | 15955 → 15956 | 29 → 41 | 345 → 64 | 56 → 71 |
| vehicle | 552 → 543 | 0 → 0 | 167 → 163 | 10681 → 10680 | 55 → 55 | 4 → 3 | 81 → 82 |

条件: ローカルで `--optimization` つきのビルド、Lighthouse と CPU プロファイル（4 倍のスロットリング）、3 回の中央値、2026-10-13。

top のスマホ TBT は 860 → 1063 ms と増えたが、2 回目と 3 回目が高かっただけで、CPU 合計は 2951 → 1724 ms、class-transformer の時間は 1544 → 0 ms と下がっている。Lighthouse のばらつきと判断した。

## 結果

- 読み取りの結果が、クラスのインスタンスから素のオブジェクトになった。`instanceof`・メソッド・`new` を使う所は無い。
- 読み取りでは、DTO が宣言していない API のキーが、スプレッドで素通しになる。キーの有無で分岐するコードは無いことを確かめた。
- `OperationCurrentPositionDto.position` は、これまで捨てられていた。今は写される。
- 実データで素通しになると分かったキーは、ほかに次の 3 つがある。`formations[].vehicleFormations`（約 0.56 MB）、`services/:id/stations` の `service.operatingSystems`（約 0.38 MB）、`operation-sightings[].managementLogs`（今は空）。どれも UI は参照せず、永続化もしない。
- Model の任意（`?`）は、対応する DTO の任意にそろえる。`strict: false` でも、Model で任意・DTO で必須だと TS2322 になる。
- Create は ID を送らない。Replace は運用区間（trip-operation-list）の `id` を送る。
- 更新で運用区間の `id` が落ちていた不具合を、同じブランチで直した（コミット 200cffc3）。`TripOperationListModel` の `@Expose({ name: 'tripOperationListId' })` が、`id` というキーを拾えなかったのが原因だった。API は `id` があることを前提に区間を更新するので、届かないと区間を作り直し、ほかの区間からの「次の運用」のつながりが切れうる。本番で実害が出たかは調べていない。
- 永続化しているストア（localforage、IndexedDB）は素の JSON のままなので、保存済みデータとの互換は変わらない。

## 新しく DTO を足すときの決まり

- DTO・Model は `interface` で書く。class とデコレーターは使わず、class-transformer も入れない。
- 読み取りの builder は `XxxDtoBuilder` に `buildFromModel` と `buildFromModels` を置く。`id` を `xxxId` に付け替え、入れ子だけ別の builder に通し、残りは `...rest` で写す。
- 書き込みの builder は `XxxModelBuilder.buildFromXxxDto` とし、送る項目を明示して並べる。Create に ID を載せない。
- trip と time のように builder が互いを呼ぶときは、import が循環する。関数は呼ばれたときに解決されるので動くが、spec で実際に呼んで確かめる。

## 検討した代案

- **2 段に分ける（先に builder だけ手書きにし、あとで class をやめる）**: 同じファイルを 2 回触る。型が interface になれば builder は手書きしかないので、一度にやった。
- **書き込みもスプレッドで写す**: 短くなるが、フォームにしか無い項目とコピー元の ID が API に届く。API の whitelist に頼ることになる。
- **型の改名（`TripDetailsDto` → `Trip` など）**: 約 97 ファイルの import が変わる。今回の目的ではないので、やらない。
