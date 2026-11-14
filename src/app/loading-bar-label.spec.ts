/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 読み込み中のバー（mat-progress-bar）は、スクリーンリーダーに「読み込み中」と伝わる名前を持つ。
 * 名前が無いと、ただの進捗バーとして名前なしで読まれる。
 */
const APP_DIR = __dirname;

const TEMPLATES = [
    'shared/train-picker/train-picker.component.html',
    'pages/dashboard/dashboard.component.html',
    'pages/timetable/timetable-all-line/timetable-all-line.component.html',
    'pages/timetable/timetable-station/timetable-station.component.html',
    'pages/timetable/timetable-formation/timetable-formation.component.html',
    'pages/operation/operation-table/operation-table.component.html',
    'pages/operation/operation-route-diagram/operation-route-diagram.component.html',
    'pages/operation/operation-real-time/operation-real-time.component.html',
    'pages/train-diagram/train-diagram.component.html',
    'pages/timetable/timetable-edit-form/timetable-edit-form.component.html',
    'pages/train-location/train-location.component.html',
    'pages/operation/operation-past-time/operation-past-time.component.html',
];

/** `<mat-progress-bar` から `>` までの開きタグ */
function progressBarTags(source: string): string[] {
    return Array.from(source.matchAll(/<mat-progress-bar\b[^>]*>/g)).map(
        (m) => m[0],
    );
}

describe('読み込み中のバーの名前', () => {
    it.each(TEMPLATES)(
        '%s の mat-progress-bar は「読み込み中」の名前を持つ',
        (file) => {
            const tags = progressBarTags(
                readFileSync(join(APP_DIR, file), 'utf8'),
            );

            expect(tags.length).toBeGreaterThan(0);
            for (const tag of tags) {
                expect(tag).toContain('aria-label="読み込み中"');
            }
        },
    );
});
