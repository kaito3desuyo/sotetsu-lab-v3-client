/**
 * 列車位置情報の端末ごとの覚え書き（前回選んだ駅・スマホの駅の欄の開閉）。
 * 読めない環境（プライベートウィンドウ等）でも既定値で動くよう、すべて try/catch で包む。
 */
const STATION_KEY_PREFIX = 'train-location:station:';
const PANEL_OPEN_KEY = 'train-location:panel-open';

export function readRememberedStationId(routeId: string): string | null {
    try {
        return localStorage.getItem(STATION_KEY_PREFIX + routeId);
    } catch {
        return null;
    }
}

export function writeRememberedStationId(
    routeId: string,
    stationId: string,
): void {
    try {
        localStorage.setItem(STATION_KEY_PREFIX + routeId, stationId);
    } catch {
        // 覚えられなくても選択自体は URL で保たれる
    }
}

export function readStationPanelOpen(): boolean {
    try {
        return localStorage.getItem(PANEL_OPEN_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function writeStationPanelOpen(open: boolean): void {
    try {
        localStorage.setItem(PANEL_OPEN_KEY, String(open));
    } catch {
        // 覚えられなくても開閉自体は動く
    }
}
