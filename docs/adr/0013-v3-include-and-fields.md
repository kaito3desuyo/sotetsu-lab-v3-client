# ADR-0013: v3 の読み取りで include・fields を送り、使う項目だけを運ばせる

- **日時**: 2026-10-26
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: perf/include-fields-initial-data（#283）、perf/include-fields-operation-table（#284）、perf/include-fields-rest
- **関連**: API の docs/adr/0010-v3-include-and-fields.md（口の側の決めごと）、ADR-0002（QueryCache）

---

## 背景

- API v4.2.0 で、v3 の読み取りの口が `include`（結合する関連の道筋。空なら関連なし）と `fields[資源]=項目,項目`（返す列）を受けるようになった。どちらも送らなければ応答は前と同じ全部入りのまま。
- 指定があると、値が null の項目は応答から省かれる。`fields[資源]=` を空で送ると、その資源は id だけになる。
- client は全部入りを受け取り、使わない関連（編成の号車・車両など）や時刻印まで運んでいた。重いのは起動のたびに取る編成と、運用表の列車つき運用（3.2〜3.7MB）だった。

## 決定

- 口ごとに、client が読む項目を `libs/<ドメイン>/usecase/*-fields.ts` の定数に書き、query が `include` と `fields` を送る。`fields[資源]` の組み立ては `core/utils/to-fields-params.ts` の `toFieldsParams` で行う。
- 返させる項目は、builder の後で画面・ストア・usecase が読む項目を洗い出して決める。調べた範囲に自信が無い資源は、時刻印だけを外して全項目を残す（路線一覧の路線・駅がこれ。RouteStationListState が駅の項目を広く使う）。
- QueryCache のキーには、`include`・`fields` を含めない。ただし、そうしてよいのは、その query を呼ぶ場所が 1 つで、応答の形が 1 通りしかない場合だけだ。同じ query を形を変えて呼ぶようになったら、形の違いをキーに入れる。
- 返させない項目が null と「無い」で区別されないよう、client で値を読むときは `=== null` で比べない（`!!`・`??`・真偽で見る）。切り替えの時点で、対象の項目を `=== null` で比べている所は無かった。
- 保存するストア（localForage）の形が変わっても、版は上げない。新しい形は古い形の部分集合なので、前回の全部入りを読み戻しても読む項目はそろっている。次に取ったときに上書きされる。

| PR | 口 | 送るもの | 実測（本番 DB） |
|---|---|---|---|
| A（#283） | `GET /v3/formations/as/of/:date` | `include=`・編成の 6 項目 | 605KB → 21KB |
| A（#283） | `GET /v3/routes` | `include=routeStationLists.station`・時刻印を除く全項目 | 140KB → 90KB |
| B（#284） | `GET /v3/operations/calendar/:calendarId/trips` | `include=trips.trip,trips.startTime,trips.endTime`・運番・列車の 6 項目・時刻の 3 項目・区間は id だけ | 3.18MB → 889KB（土休日）、3.67MB → 1.03MB（平日） |
| C | `GET /v3/operation-sightings/time-cross-section/operation-numbers`・`formation-numbers` | 運用・編成の時刻印を除く項目（`include` は受けない口） | 132KB → 93KB（93 運番）、168KB → 119KB（126 編成） |

- 運用表では種別（tripClass）とダイヤ（calendar）を結合しない。種別は別に取った一覧から引いている。
- 時刻断面では、中の運用・編成の時刻印だけを外す。目撃そのものの時刻印は、リアルタイムの「更新」の表示に使うので残す。calendarId・agencyId なども外せば約 45% 減るが、agencyId は会社名を引くのに使い、他の列も読む画面（リアルタイム・駅別時刻表・列車位置情報）が多いので外さない。リアルタイムは自動更新のたびにこの 2 本を取るので、1 回あたり約 88KB 減る。
- 時刻断面 1 件ずつの口（ダイヤグラムが使う。1.5KB）は切り替えない。

### 切り替えない口（2026-10-26 の本番の実測）

| 口 | 大きさ | 切り替えない理由 |
|---|---|---|
| `GET /v3/formations/from/:from/to/:to` | 83KB | 削れるのは時刻印と事業者の一部だけ |
| `GET /v3/operation-sightings/from/:from/to/:to` | 37KB（1 日）、289KB（7 日＋引き継ぎ） | 時刻印を「更新」の表示に使うので、削れるものがほぼ無い。ダッシュボード・リアルタイム・過去の運用が同じキャッシュを共有する |
| `GET /v3/stations` | 68KB | 削れるのは時刻印くらい |
| `GET /v3/trip-classes` | 9.7KB | 削れるのは時刻印くらい |

- 目撃の期間を将来絞るなら、過去の運用の表（operation-past-time-table）が `sighting.invalidation !== null`・`=== null` で比べているのを先に直す。`fields` を付けると null の `invalidation` は応答から省かれ、undefined になる。

### 運行系統の駅一覧（PR D）

- 口は `GET /v3/services/:id/stations`（`ServiceQuery.findOneWithStations`）。全部入りだと 249 駅のそれぞれに路線の中身・停留所・時刻印が付いて 621KB あった。
- 選んだ組は `include=stations.routeStationLists.route`・`fields[station]=stationName`・`fields[routeStationList]=routeId,stationSequence,stationNumbering`・`fields[route]=routeName,agencyId`（`libs/service/usecase/service-stations-fields.ts`）。実測は 621KB → 94KB。駅の並びと読む項目の値は、全部入りと一致することを本番で確かめた。
- 呼び出し元は 5 ページ（全線時刻表・時刻表の編集・行路図・real-time・ダイヤグラム）で、読む項目が少しずつ違う。ページごとに組を変えず、5 ページの読む項目の和集合を 1 つの形にした。形が 1 つなので QueryCache のキー（`{ serviceId }`）は変えない。
- この形では応答に `service` が付かない。どのページも読まないので、`ServiceStationsDto.service` を `ServiceDetailsDto | null` にした（付かないときは null）。
- 保存するストアの版は上げない。新しい形は古い形の部分集合で、前回の全部入りを読み戻しても読む項目はそろっている。
- trip-blocks の口は、既に `fields` で絞ってある。残りは時刻（駅の UUID）が大半なので、切り替えない。
- 注意: 駅の中の `routeStationLists` の順番は、API が並べ替えておらず、取り方（include・fields）で変わりうる。全部入りでも順番の保証は無い。順番に頼って読む所を足すときは、読む側で並べ替える。

## 影響

- 起動 1 回あたりの取得は約 745KB から約 111KB に、運用表は約 3.4MB から約 1MB に、リアルタイムが更新のたびに取る時刻断面のまとめ 2 本は約 300KB から約 212KB になる。運用表のストアを localForage に書く量も同じだけ減る。
- 画面が新しい項目を読むようになったら、その口の `*-fields.ts` に項目を足す必要がある。足し忘れると、その項目は常に undefined になる。各 query の spec で、送る `include`・`fields` を固定している。
