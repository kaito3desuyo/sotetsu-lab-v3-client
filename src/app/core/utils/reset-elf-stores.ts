import { getRegistry } from '@ngneat/elf';

/**
 * Elf の全ストアを作ったときの中身に戻す。
 * ストアはファイルの中で 1 つだけ作られ、Lambda の実行環境は前のリクエストのまま次を描く。
 * サーバーで描き始める前に呼び、前のページの中身が次の HTML に出ないようにする。
 */
export function resetElfStores(): void {
    getRegistry().forEach((store) => store.reset());
}
