# DTO/Model のクラスと class-transformer の廃止 設計

- 日付: 2026-10-13
- ブランチ: `refactor/remove-class-transformer`
- 関連: ADR-0006（本作業で書く）

## 背景

本番を Lighthouse と CPU プロファイル（CPU 4 倍遅延・スマホ想定）で全 10 ページ測ったところ、JS 実行の最大の塊が class-transformer だった。

| ページ | class-transformer の時間（4 倍遅延） |
|---|---|
| 列車ダイヤグラム | 1.6 秒 |
| 列車位置情報 | 1.6 秒 |
| トップ（ダッシュボード） | 1.5 秒 |
| 駅別時刻表 | 0.9 秒 |
| 運用表 | 0.7 秒 |

どれも trip-blocks（上下）か運用表の `/operations/calendar/:id/trips` を builder の `plainToClass` に通す所である。本番の trip-blocks 上下（616 ブロック・12,786 時刻）で比べると、`plainToClass` は 338ms、同じ結果を返す手書きの関数は 15ms だった（JSON にしたとき全件一致）。

class-transformer が担っている仕事は次の 3 つしかない。

1. 各階層の `id` を `tripId`・`timeId` などに付け替える（`@Expose({ name: 'id' })`）
2. `@Expose` の無いキーを捨てる（`excludeExtraneousValues: true`）
3. 入れ子もクラスにする（`@Type`）。日付の変換などはしていない

DTO にはメソッドが無く、`instanceof` も `new XxxDto()` もどこにも無い。Model（27 個）と DTO（45 個）は、`id` の名前以外ほぼ同じ項目を 2 回書いた写しである。自前の API を自前の画面が読むだけの client に、クラスとリフレクションの層は要らない。

## 目的

- スマホでの JS 実行時間を減らす（上の 5 ページで 0.7〜1.6 秒）
- Model/DTO の二重定義・デコレーター・class-transformer・reflect-metadata を消し、型と変換を素直にする
- builder の命名と形のブレをそろえる

## 決定事項

| 論点 | 決定 |
|---|---|
| 進め方 | 2 段に分けず一度にやる。PR は 1 本 |
| 型の名前・置き場所 | 今のまま（`TripDetailsDto` は `usecase/dtos`、`TripModel` は `infrastructure/models`） |
| DTO | class から `interface` に変える。デコレーターは全部消す |
| Model | `interface` で残す。API の応答・送信の形そのもの（`id` を持つ） |
| 読み取りの変換 | スプレッドで写し、`id` と入れ子だけ直す（下の「読み取り」） |
| 書き込みの変換 | 送る項目を明示して並べる（下の「書き込み」） |
| builder の形 | `XxxDtoBuilder` / `XxxModelBuilder` のオブジェクトにそろえる |
| 複数形 | 全 DTO builder に `buildFromModels` を置く。別オブジェクトの複数形 builder は消す |
| 書き込みのメソッド名 | 入力の型名で呼ぶ（`buildFromCreateDto`・`buildFromLoginDto` など） |
| 重複した `TripBlockDetailsDto` | `libs/trip-block` に寄せ、`libs/trip/usecase/dtos/trip-block-details.dto.ts` を消す |
| 効果の測定 | ローカルで完結させる。master とブランチを同じ条件でビルドして比べる |

## 設計

### 1. 型

- `usecase/dtos/*.dto.ts` の class を、同じファイル・同じ名前の `interface` にする。`@Expose`・`@Type`・`@Exclude` と `import 'reflect-metadata'` を消す。
- `infrastructure/models/*.model.ts` も同じく `interface` にする。中身は API の JSON の形で、主キーは `id`。
- Create 系 DTO の `@Exclude() tripId: undefined` のような「無いことを示す項目」は、項目ごと消す。Create の型は ID を持たない。Replace の型は `tripId` などを持つ。
- class の `extends` は、interface の `extends` に置き換える（`ServiceRouteDto extends RouteDetailsDto`・`RouteStationDto extends StationDetailsDto`・`RouteStationModel extends StationModel`・`OperationSightingWithCirculatedDto extends OperationSightingDetailsDto`）。
- DTO 型を import している画面側（約 97 ファイル）は、名前も import パスも変わらない。例外は `libs/trip/usecase/dtos/trip-block-details.dto` を import している約 20 ファイルで、`libs/trip-block/usecase/dtos/trip-block-details.dto` に張り替える。

### 2. 読み取りの builder

全エンティティの DTO builder を次の形にそろえる。

```ts
export const TimeDtoBuilder = {
    buildFromModel: ({
        id,
        trip,
        station,
        stop,
        startTripOperationLists,
        endTripOperationLists,
        ...rest
    }: TimeModel): TimeDetailsDto => ({
        ...rest,
        timeId: id,
        trip: trip && TripDtoBuilder.buildFromModel(trip),
        station: station && StationDtoBuilder.buildFromModel(station),
        stop: stop && StopDtoBuilder.buildFromModel(stop),
        startTripOperationLists:
            startTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(startTripOperationLists),
        endTripOperationLists:
            endTripOperationLists &&
            TripOperationListDtoBuilder.buildFromModels(endTripOperationLists),
    }),
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
```

- 関数に書くのは「主キーの付け替え」と「入れ子の変換」だけ。残りの項目はスプレッドで写す。API に項目が増えても、interface に 1 行足すだけで済む。
- 入れ子の変換を書き忘れると、`id` しか無いものを `xxxId` 必須の型に入れることになり、型エラーで止まる。
- 入れ子にしか出てこないエンティティ（time・stop など）にも builder を新設する。置き場所はそのエンティティの lib（time は `libs/trip`、stop は `libs/station`）。
- 既存の読み取り builder（`libs/*/infrastructure/builders/*.dto.builder.ts`）は全部この形に作り直す。今の中身は 3 通りに分かれていて、どれもこの形に置き換わる。
  - `classToPlain` → `plainToClass` の二重変換：12 個（service・formation・calendar・trip-class・operation-group・operation-sighting・agency・station・operation・user・trip-operation-list・route）
  - `core/utils/class-transformer.ts` の `classTransformer()`：7 個（calendar・calendar-date・service-agencies・service-routes・operation-current-position・route-stations・operation-sighting-time-cross-section）
  - `plainToClass` だけ：trip-block・trip
- 形をそろえるため、次も片付ける。
  - カレンダーの単独関数 `buildCalendarDetailsDto`。`CalendarDtoBuilder.buildFromModel` に吸収し、呼び出し 2 か所を書き換える
  - 別オブジェクトの複数形 builder 5 個（`FormationsDtoBuilder`・`OperationSightingsDtoBuilder`・`OperationGroupsDtoBuilder`・`OperationsDtoBuilder`・`TripClassesDtoBuilder`）。単数側の `buildFromModels` に吸収し、呼び出し 7 か所を書き換える
- trip ↔ time のように互いを呼ぶ builder は、ファイル同士の import が循環する。関数は呼ばれた時に解決されるので動くが、spec で実際に呼んで確かめる。

### 3. 書き込みの builder

- `TripBlockModelBuilder.buildFromCreateDto` / `buildFromReplaceDto`、`LoginModelBuilder.buildFromLoginDto`（旧 `buildFromDto`）、`UserModelBuilder.buildFromRegisterUserDto`（旧 `buildFromDto`）。
- 中身は、API に送る項目を 1 つずつ明示して並べたオブジェクトリテラルにする。入れ子（列車・時刻・運用）も同じ。
  - Replace は `tripBlockId`・`tripId`・`timeId`・`tripOperationListId` を `id` に付け替える。
  - Create には ID を一切載せない。コピーで作る列車はフォームにコピー元の `tripId` が残っているが、それも載せない。
- 書き込みでスプレッドを使わない理由：今は `excludeExtraneousValues` が、フォームにしか無い項目（`stopType` など）とコピー元の ID を捨てている。API は `whitelist: true`・`forbidNonWhitelisted: false` なので余分なキーは黙って捨てるが、何を送るかを API 任せにしない。件数が少ないので速さも関係ない。
- 入力画面の `toTripDtos`（`pages/timetable/timetable-edit-form/utils/timetable-edit-form-to-trip-dtos.util.ts`）も、`...trip`・`...time` のスプレッドと `plainToClass` をやめ、Create/Replace の項目を並べたオブジェクトリテラルを返す。
- 目撃の投稿・無効化・復元（`OperationSightingCommand`）は DTO をそのまま送っていて、変換を通らない。型を interface にするだけで済む。

### 4. 消すもの

- `src/app/core/configs/class-transformer.ts`
- `src/app/core/utils/class-transformer.ts`
- `src/app/libs/trip/usecase/dtos/trip-block-details.dto.ts`
- `setup-jest.ts` の `import 'reflect-metadata'`
- package.json の `class-transformer`・`reflect-metadata`

### 5. 今と変わる所

- 読み取りの結果が、クラスのインスタンスから素のオブジェクトになる。`instanceof`・メソッド・`new` を使う所は無い。
- 読み取りで、API が返した DTO に無いキーが捨てられずに素通しになる。キーの有無で分岐するコードは無いことを確かめ済み。
- 永続化しているストア（localStorage）は今も素の JSON で保存しているので、保存済みデータとの互換は変わらない。

## 確かめ方

1. **builder ごとの spec**：小さな入力（入れ子あり・項目が欠けたもの・`null`）で出力を固定する。
   - 読み取り：主キーの付け替えと、入れ子の各階層の付け替え
   - 書き込み：Create に ID が載らない、Replace は `xxxId` → `id`、フォームにしか無い項目が載らない
2. **本番データでの新旧比較（読み取り）**：手元のブラウザで閲覧用の全ページを回り、API の応答を `.context/` に保存する。それを master の builder（旧）とブランチの builder（新）の両方に通す。そして「旧の出力にあるキーと値が、新の出力に全部ある」ことを包含で確かめる。新は余分なキーを素通しにするので、完全一致ではなく包含で見る。
3. **新旧比較（書き込み）**：入力画面の spec にある列車の値を、旧と新の `toTripDtos` → `TripBlockModelBuilder` に通す。API に送る本文が JSON で一致することを確かめる。登録・更新・コピーの 3 通りでやる。
4. **実際の保存テスト**：手元の画面から「2021年10月JR渋谷駅工事臨時ダイヤ」（`27792766-0031-4b89-9c32-23eea267cbbc`）に登録・更新・コピーを行い、保存された中身を DB で確かめる。列番は `9999T` などそのダイヤに無いものを使う。後始末の SQL（`trip_operation_lists` → `trips` → `trip_blocks` の順）はユーザーに渡して流してもらう。
5. **全体**：`npx jest` 全件、`ng build`、`npm run lint` が通る。
6. **効果の測定（ローカルで完結）**
   - master とブランチを、本番と同じ最適化（`optimization` 有効・source map なし）でビルドする。API の向き先はどちらも手元の API（`http://localhost:3000`、本番 DB を読む）にそろえる。ビルドの仕方（CLI フラグで上書きするか、計測用の構成を足すか）は計画で決める。
   - 同じ手元の Chrome で、閲覧用の全 10 ページを測る。
     - CPU プロファイル（4 倍遅延）：class-transformer の時間と、JS 実行の合計
     - Lighthouse（スマホ・PC）：TBT・LCP・Performance
   - 各 3 回測って中央値で比べる。計測スクリプトは `.context/lighthouse/` の `run-all.sh`・`profile.mjs`・`summarize.mjs` を、URL を差し替えられるように直して使う。
7. **目視**：手元で全ページを開き、表示が変わっていないことを目で確かめる。特に走行本数・列車の位置・ダイヤグラム・駅別時刻表・運用表・リアルタイム運用情報を見る。

## 進め方

- コミットは lib ごとに区切る。各コミットの時点で `ng build` と jest が通る状態を保つ。ある lib が interface になり、別の lib がまだ class でも、入れ子の型は混在できる。
- 依存の向きに沿って葉の lib（agency・station・trip-class など）から始め、trip・trip-block・operation を後にする。
- 最後のコミットで「4. 消すもの」を消す。
- ADR-0006「DTO/Model のクラスと class-transformer を廃止する」を書く。

## 危ない所と対策

| 危ない所 | 対策 |
|---|---|
| 書き込みの本文が変わり、本番データを壊す | 新旧比較（確かめ方 3）と実際の保存テスト（確かめ方 4）を両方やる |
| 入れ子の付け替え漏れで、画面に `undefined` が出る | 型が止める。加えて、本番データでの包含比較（確かめ方 2）で全キーを見る |
| 互いを呼ぶ builder の循環 import | spec で実際に呼ぶ。ビルドの警告も見る |
| 66 ファイル超を一度に変える | lib ごとのコミットにして、レビューと切り戻しを小さくする |

## やらないこと

- 型の改名（`TripDetailsDto` → `Trip` など）と置き場所の変更
- API の返す形の変更
- 運用表の trips 3.6MB への `fields` 追加、起動時の直列取得の解消、運用表の空表示の不具合など、今回の計測で見つかった別件
