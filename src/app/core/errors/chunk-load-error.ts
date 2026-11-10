/** 遅延読み込みの部品（chunk）が取れなかったときの、ブラウザごとの文言 */
const CHUNK_LOAD_ERROR_PATTERNS = [
    // Safari
    /^Importing a module script failed/,
    // Chrome・Edge
    /^Failed to fetch dynamically imported module/,
    // Firefox
    /^error loading dynamically imported module/,
];

/**
 * 部品の読み込みの失敗か。デプロイの後に古い版の画面のまま移ると、古い版の部品はもう無いので取れない。
 */
export function isChunkLoadError(error: unknown): boolean {
    return (
        error instanceof Error &&
        CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(error.message))
    );
}
