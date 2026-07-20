import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    MINI_DIAGRAM_VIEW_H,
    MINI_DIAGRAM_VIEW_W,
    buildDashboardMiniDiagram,
} from './build-dashboard-mini-diagram.util';

function stationAxis(stationIds: string[]): RouteStationDto[] {
    return stationIds.map((stationId) => ({ stationId }) as RouteStationDto);
}

function time(overrides: Partial<TimeDetailsDto>): TimeDetailsDto {
    return overrides as TimeDetailsDto;
}

function trip(times: TimeDetailsDto[]): TripDetailsDto {
    return { tripId: 't', times } as TripDetailsDto;
}

function tripBlock(trips: TripDetailsDto[]): TripBlockDetailsDto {
    return { tripBlockId: 'b', trips } as TripBlockDetailsDto;
}

describe('buildDashboardMiniDiagram', () => {
    it('窓（現在±30分）に完全に収まる区間は始点・終点そのままの座標で線分化する', () => {
        const now = new Date(2026, 6, 20, 12, 0); // 12:00
        const axis = stationAxis(['A', 'B']);
        const trips = [
            trip([
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '12:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '12:10',
                    arrivalDays: 1,
                }),
            ]),
        ];

        const lines = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);

        expect(lines).toHaveLength(1);
        // 12:00 は窓の開始（現在-30分=11:30 起点）から30分経過=中央(x=W/2)
        expect(lines[0].x1).toBeCloseTo(MINI_DIAGRAM_VIEW_W / 2);
        expect(lines[0].y1).toBe(0);
        // 12:10 は中央から10/60 window 分進んだ位置
        expect(lines[0].x2).toBeCloseTo(
            MINI_DIAGRAM_VIEW_W / 2 + (10 / 60) * MINI_DIAGRAM_VIEW_W,
        );
        expect(lines[0].y2).toBe(MINI_DIAGRAM_VIEW_H);
    });

    it('窓（現在±30分）を完全に外れる区間は除外する', () => {
        const now = new Date(2026, 6, 20, 12, 0); // 12:00 → 窓 11:30〜12:30
        const axis = stationAxis(['A', 'B']);
        const trips = [
            trip([
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '13:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '13:10',
                    arrivalDays: 1,
                }),
            ]),
        ];

        const lines = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);

        expect(lines).toEqual([]);
    });

    it('窓の一方の端だけ外れる区間は窓端にクランプして描画する（境界をまたぐ列車を欠損させない）', () => {
        const now = new Date(2026, 6, 20, 12, 0); // 窓 11:30〜12:30
        const axis = stationAxis(['A', 'B']);
        const trips = [
            trip([
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '11:20',
                    departureDays: 1,
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '11:40',
                    arrivalDays: 1,
                }),
            ]),
        ];

        const lines = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);

        expect(lines).toHaveLength(1);
        // 11:20 は窓開始(11:30)より前 → x=0 にクランプ
        expect(lines[0].x1).toBe(0);
        expect(lines[0].x2).toBeGreaterThan(0);
        expect(lines[0].x2).toBeLessThan(MINI_DIAGRAM_VIEW_W);
    });

    it('日跨ぎ（4時境界・day2扱い）でも窓判定と now の絶対分基準が一致する', () => {
        // 現在時刻が 0:10（4時未満）→ nowToAbsoluteMinutes は前日からの続きとして 24*60+10 扱い
        const now = new Date(2026, 6, 20, 0, 10);
        const axis = stationAxis(['A', 'B']);
        const trips = [
            trip([
                // day2 の 00:05 は絶対分 (2-1)*1440+5 = 1445（窓 1410〜1470 内）
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '00:05',
                    departureDays: 2,
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    arrivalTime: '00:15',
                    arrivalDays: 2,
                }),
            ]),
        ];

        const lines = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);

        expect(lines).toHaveLength(1);
        expect(lines[0].x1).toBeGreaterThanOrEqual(0);
        expect(lines[0].x1).toBeLessThanOrEqual(MINI_DIAGRAM_VIEW_W);
    });

    it('駅軸が1駅以下では空配列を返す', () => {
        const now = new Date(2026, 6, 20, 12, 0);
        const lines = buildDashboardMiniDiagram(
            [tripBlock([trip([])])],
            stationAxis(['A']),
            now,
        );

        expect(lines).toEqual([]);
    });

    it('majorStationIds 指定時は主要駅のみで線を結びセグメント数を減らす', () => {
        const now = new Date(2026, 6, 20, 12, 0);
        const axis = stationAxis(['A', 'B', 'C', 'D', 'E']);
        const trips = [
            trip([
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '12:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    departureTime: '12:03',
                    departureDays: 1,
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    departureTime: '12:06',
                    departureDays: 1,
                }),
                time({
                    stationId: 'D',
                    stopSequence: 4,
                    departureTime: '12:09',
                    departureDays: 1,
                }),
                time({
                    stationId: 'E',
                    stopSequence: 5,
                    arrivalTime: '12:12',
                    arrivalDays: 1,
                }),
            ]),
        ];

        // 全駅軸なら 5 駅 → 4 セグメント。
        const full = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);
        expect(full).toHaveLength(4);

        // 主要駅を起終点 A/E のみに間引くと 1 セグメントに激減する。
        const coarse = buildDashboardMiniDiagram(
            [tripBlock(trips)],
            axis,
            now,
            new Set(['A', 'E']),
        );
        expect(coarse).toHaveLength(1);
        // A(12:00) と E(12:12) を直接結ぶ（中間 B/C/D は省く）。
        expect(coarse[0].y1).toBe(0);
        expect(coarse[0].y2).toBe(MINI_DIAGRAM_VIEW_H);
    });

    it('時刻情報が欠けた停車点は無視し、有効な連続区間のみ線分化する', () => {
        const now = new Date(2026, 6, 20, 12, 0);
        const axis = stationAxis(['A', 'B', 'C']);
        const trips = [
            trip([
                time({ stationId: 'A', stopSequence: 1 }), // 時刻なし
                time({
                    stationId: 'B',
                    stopSequence: 2,
                    departureTime: '12:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    arrivalTime: '12:05',
                    arrivalDays: 1,
                }),
            ]),
        ];

        const lines = buildDashboardMiniDiagram([tripBlock(trips)], axis, now);

        expect(lines).toHaveLength(1);
        expect(lines[0].y1).toBe(MINI_DIAGRAM_VIEW_H / 2);
        expect(lines[0].y2).toBe(MINI_DIAGRAM_VIEW_H);
    });
});
