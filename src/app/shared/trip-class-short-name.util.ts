import { baseTripClassName } from './trip-class-base-name.util';

/**
 * 時刻表の種別行など極小セル向けの短縮種別名マッピング（98 §G5・mockup-05）。
 *
 * 実データは「各駅停車」（相鉄）と「各停」（他社）が混在するため、表示層で
 * 短縮名に正規化する。select ボックス等の選択肢は正式名を維持すること
 * （確定済みユーザー判断）。
 *
 * マッピングは保守的既定: mockup-05 に現れる「各停」への正規化のみ。
 * 「通勤特急」→「通特」等の拡張は新規判断（未確定）のため行わない。
 */
const SHORT_TRIP_CLASS_NAMES: ReadonlyMap<string, string> = new Map([
    ['各駅停車', '各停'],
]);

/**
 * 種別名から系統サフィックスを除き、さらに短縮名マッピングを適用した表示名を返す。
 * 例: `各駅停車` → `各停` / `各駅停車（SO）` → `各停` / `特急（SO→TY）` → `特急`。
 */
export function shortTripClassName(name: string | null | undefined): string {
    const base = baseTripClassName(name);
    return SHORT_TRIP_CLASS_NAMES.get(base) ?? base;
}
