export type SocketSignalType = 'sighting' | 'timetable';

/**
 * socket から届いた合図を読む。api が保存に成功したときに socket の broadcast が送る {"type": …} だけを相手にする。
 * 古い sendSighting の転送（{action, data}）や壊れた値は null にして無視する。
 */
export function readSocketSignal(ev: unknown): SocketSignalType | null {
    if (typeof ev !== 'object' || ev === null || !('data' in ev)) {
        return null;
    }
    const data = (ev as { data: unknown }).data;
    if (typeof data !== 'string') {
        return null;
    }
    try {
        const parsed: unknown = JSON.parse(data);
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('type' in parsed)
        ) {
            return null;
        }
        const type = (parsed as { type: unknown }).type;
        return type === 'sighting' || type === 'timetable' ? type : null;
    } catch {
        return null;
    }
}
