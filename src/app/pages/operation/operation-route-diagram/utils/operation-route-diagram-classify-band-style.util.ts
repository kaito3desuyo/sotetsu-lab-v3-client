import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';

export type OperationRouteDiagramBandStyle = 'nonRevenue' | 'standard';

/**
 * G6（モック04）: 行路帯の塗り分類。
 *
 * モック04を実ピクセル拡大で裁定した結果、優等（急行/特急）帯も
 * 「白地＋種別色の角丸枠＋種別色の太字」で描かれており、紺塗り白字の帯は
 * 存在しない（98 §G6 の「優等=紺塗り白字」は gap 文書の記述誤り。
 * 2026-07-16 coordinator 裁定）。よって種別の区別は枠色/文字色
 * （`tripClassColor` データ駆動）のみで表現し、塗り分けは行わない。
 *
 * - 回送 = 'nonRevenue'（点線灰。旅客列車と視覚的に区別する唯一の分岐）
 * - それ以外（各停・快速・急行・特急すべて）= 'standard'（白地+種別色枠）
 *
 * 帯の実際の色は常に呼び出し側で `trip.tripClass.tripClassColor`
 * （データ駆動）を使うこと（UI ハードコード禁止）。系統サフィックス
 * 「（SO→TY）」等は `baseTripClassName` で除去してから判定する。
 */
export function classifyBandStyle(
    tripClassName: string | null | undefined,
): OperationRouteDiagramBandStyle {
    const base = baseTripClassName(tripClassName);

    if (base === '回送') return 'nonRevenue';

    return 'standard';
}
