/**
 * ログイン・登録の後に戻る先。サイト内の相対パスだけを通し、それ以外は '/' に戻す（オープンリダイレクト対策）。
 * '//' や '/\' で始まるものはブラウザが外のホストとして扱うので弾く。ログイン・登録のページ自身も、戻るとループするので弾く。
 */
export function safeReturnTo(value: string | null | undefined): string {
    if (!value || !value.startsWith('/')) {
        return '/';
    }
    if (value.startsWith('//') || value.startsWith('/\\')) {
        return '/';
    }
    const path = value.split(/[?#]/)[0];
    if (path === '/login' || path === '/register') {
        return '/';
    }
    return value;
}
