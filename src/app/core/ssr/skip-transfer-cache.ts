import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * true の要求は、サーバーで取った応答を HttpTransferCache に積まない（`isTransferableRequest` が見る）。
 * 描くのに要る分だけを別の TransferState の鍵に積むために、全量の応答を HTML に載せたくない要求に付ける。
 */
export const SKIP_TRANSFER_CACHE = new HttpContextToken<boolean>(() => false);

export function skipTransferCacheContext(): HttpContext {
    return new HttpContext().set(SKIP_TRANSFER_CACHE, true);
}
