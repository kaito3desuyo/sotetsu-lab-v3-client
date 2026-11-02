const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

/** ISO 8601 の時刻を、閲覧する端末の時刻帯によらず日本時間の「月/日 時:分:秒」にする（例: 11/3 00:04:05） */
export function formatTokyoDateTime(iso: string): string {
    const parts = Object.fromEntries(
        formatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
    );
    return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
