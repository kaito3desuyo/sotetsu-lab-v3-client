/**
 * 運用番号のチップから運用別時刻表へのリンク。
 * 日付のあるページはその日付（日付の形）、ダイヤだけのページは見ているダイヤ（ダイヤの形）を渡す
 * （docs/superpowers/specs/2026-11-18-operation-timetable-design.md）。
 * 今日を出しているページは 'today' を渡す。日付を付けず、運用別時刻表が今日（4 時区切り）を補う
 * （SSR で長く残る HTML に日付を焼き込まないため）。
 * 番号かダイヤ・日付が分からなければリンクにしない。
 */
/** 運用別時刻表のどの形で開くか */
export type OperationTimetableLinkAt =
    | 'today'
    | { date: string | null | undefined }
    | { calendarId: string | null | undefined };

export function operationTimetableLink(
    operationNumber: string | null | undefined,
    at: OperationTimetableLinkAt,
): readonly unknown[] | undefined {
    if (!operationNumber) return undefined;
    if (at === 'today') {
        return [
            '/timetable',
            'operation',
            { operation_number: operationNumber },
        ];
    }
    if ('date' in at) {
        return at.date
            ? [
                  '/timetable',
                  'operation',
                  { operation_number: operationNumber, date: at.date },
              ]
            : undefined;
    }
    return at.calendarId
        ? [
              '/timetable',
              'operation',
              { operation_number: operationNumber, calendar_id: at.calendarId },
          ]
        : undefined;
}
