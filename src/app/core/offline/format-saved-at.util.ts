/**
 * 保存した時刻を「21時5分」（同じ日）または「10月25日 7時30分」（前の日以前）の形にする。
 */
export function formatSavedAt(savedAt: number, now: number): string {
    const saved = new Date(savedAt);
    const current = new Date(now);
    const time = `${saved.getHours()}時${saved.getMinutes()}分`;
    const isSameDay =
        saved.getFullYear() === current.getFullYear() &&
        saved.getMonth() === current.getMonth() &&
        saved.getDate() === current.getDate();

    return isSameDay
        ? time
        : `${saved.getMonth() + 1}月${saved.getDate()}日 ${time}`;
}
