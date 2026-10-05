/**
 * 種別名から系統サフィックス「（…）」を除いたベース種別名を返す。
 * 例: `特急（SO→TY）` → `特急` / `各停（SO）` → `各停`。
 *
 * 系統付きの正式名はセレクトボックスの選択肢（ユーザーが厳密に選ぶ場面）でのみ用い、
 * カード・時刻表・凡例など通常の表示ではこのベース名を使う（ユーザー指示 2026-07-08）。
 */
export function baseTripClassName(name: string | null | undefined): string {
    if (!name) {
        return '';
    }
    return name.split(/[（(]/)[0].trim() || name;
}
