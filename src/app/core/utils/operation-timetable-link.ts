/**
 * 運用番号のチップから運用別時刻表へのリンク。
 * 日付のあるページはその日付（日付の形）、ダイヤだけのページは見ているダイヤ（ダイヤの形）を渡す
 * （docs/superpowers/specs/2026-11-18-operation-timetable-design.md）。
 * 番号かダイヤ・日付が分からなければリンクにしない。
 */
export function operationTimetableLink(
    operationNumber: string | null | undefined,
    at:
        | { date: string | null | undefined }
        | { calendarId: string | null | undefined },
): readonly unknown[] | undefined {
    if (!operationNumber) return undefined;
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
