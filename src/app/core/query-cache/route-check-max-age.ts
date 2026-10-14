/**
 * 画面を移るたびの確認（maintenance・token・profile）を使い回す長さ。
 * 開いた直後の replaceUrl で同じ確認が二度走るのを 1 回にする。
 * 画面を移るたびの確認そのものは残す（使っている途中のメンテナンス入り・ログイン切れに気づくため。docs/adr/0007）。
 */
export const ROUTE_CHECK_MAX_AGE_MS = 5_000;
