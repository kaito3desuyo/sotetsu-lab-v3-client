# M19 障害の見張り（client の SSR の分）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 本番の SSR の Lambda に 2 本のアラームを掛ける。

**Architecture:** api と同じ `serverless-alarms.ts` を置き、`serverless.ts` の `resources` に混ぜる。既存の `Conditions`（`SsrOn`・`HasAliases`）に `IsProd` を足す。

**Tech Stack:** osls 3.x

**Spec:** `docs/superpowers/specs/2026-11-10-m19-monitoring-design.md`（全体は monitoring リポの同名の spec）

## Global Constraints

- `serverless-alarms.ts` は api の計画の Task 3 の Interfaces と同じ中身。ARN は `${ssm:sotetsu-lab-v3-monitoring-alarm-topic-arn, ''}`、Condition は `IsProd`。
- アラームの値は api の計画の Global Constraints と同じ。
- prettier はファイル単位で当てる（client のメモ）。
- コミットの形と末尾の 2 行は monitoring の計画と同じ。

## Review Focus

- stg のデプロイ（`--stage stg`）→ アラームは作られず、SSM が無くても通る。Task 1 の Step 2 で押さえる。
- `ssr=off` のとき → SSR の Lambda はあるので、アラームはそのまま（呼ばれないので鳴らない）。追加の分岐は要らない。
- 既存の `Conditions`・`Resources`・`extensions` を消さない。Task 1 の Step 2 で押さえる。

---

### Task 1: アラーム

**Files:**
- Create: `serverless-alarms.ts`
- Modify: `serverless.ts`

- [ ] **Step 1: 書く。** 関数は `ssr` なので `functionLogicalId: 'SsrLambdaFunction'`。
  - `SsrUrl5xxAlarm`：`sotetsu-lab-v3-prod-client-ssr-url5xx`・`Url5xxCount`・5・「SSR が 1 時間に 5xx を 5 件以上返した」
  - `SsrErrorsAlarm`：`sotetsu-lab-v3-prod-client-ssr-errors`・`Errors`・3・「SSR の Lambda が 1 時間に 3 回以上エラーで終わった（タイムアウトを含む）」
- [ ] **Step 2: 確かめる** — SSR のビルド（`dist/build-by-ci/server`）が無くても package が通るなら、`aws-vault exec administrator -- npx osls package --stage prod` と `--stage stg`。テンプレートに 2 本のアラーム、既存の `SsrOn`・`HasAliases` と新しい `IsProd`、`Ref` の先 `SsrLambdaFunction` がある。ビルドが要るなら `npx osls print --stage prod` で `resources` を見るだけにする。
- [ ] **Step 3: コミット** — `feat: :sparkles: SSR の Lambda にアラームを掛ける`

### Task 2: ADR・デプロイ・実地の確かめ

- [ ] **Step 1: ADR を書く**（`docs/adr/` の次の番号）。「アラームを client のスタックに置く」「ブラウザのエラーは Discord に流さない」。
- [ ] **Step 2: コミット** — `docs: :memo: ADR に M19 の判断を書く`
- [ ] **Step 3: デプロイ**（tag の手順。push とデプロイはユーザーの明示の指示を待つ）。monitoring が先にデプロイ済みであること。
- [ ] **Step 4: 実地で確かめる** — `set-alarm-state` で `sotetsu-lab-v3-prod-client-ssr-url5xx` を ALARM → Discord に届く。
