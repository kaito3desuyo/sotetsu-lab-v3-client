import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { ServiceAgenciesDto } from 'src/app/libs/service/usecase/dtos/service-agencies.dto';
import {
    filterAgenciesWithFormations,
    OperationPostCardStore,
} from './operation-post-card.store';

describe('filterAgenciesWithFormations', () => {
    const agencies = [
        { agencyId: 'sotetsu', agencyName: '相鉄' },
        { agencyId: 'jre', agencyName: 'JR東日本' },
        { agencyId: 'tokyu', agencyName: '東急' },
        { agencyId: 'metro', agencyName: '東京メトロ' },
        { agencyId: 'toei', agencyName: '都営' },
    ];

    it('今日の編成を持つ会社だけを、元の並びのまま残す', () => {
        const formations = [
            { agencyId: 'tokyu' },
            { agencyId: 'sotetsu' },
            { agencyId: 'sotetsu' },
            { agencyId: 'jre' },
        ];

        expect(
            filterAgenciesWithFormations(agencies, formations).map(
                (agency) => agency.agencyName,
            ),
        ).toEqual(['相鉄', 'JR東日本', '東急']);
    });

    it('編成をまだ取れていない（空の）ときは絞らない', () => {
        expect(filterAgenciesWithFormations(agencies, [])).toEqual(agencies);
    });
});

describe('OperationPostCardStore', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const serviceAgencies = (names: string[]): ServiceAgenciesDto =>
        ({
            agencies: names.map((agencyName) => ({
                agencyId: agencyName,
                agencyName,
            })),
        }) as ServiceAgenciesDto;

    beforeEach(() => {
        jest.useFakeTimers();
        getItem.mockReset().mockResolvedValue(null);
        setItem.mockReset().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: DeviceStorage, useValue: { getItem, setItem } },
            ],
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('取る前の会社は空', () => {
        expect(TestBed.inject(OperationPostCardStore).agencies()).toEqual([]);
    });

    it('会社は相鉄と直通を始めた順に並ぶ（知らない会社は後ろ・名前順）', () => {
        const store = TestBed.inject(OperationPostCardStore);

        store.setServiceAgencies(
            serviceAgencies(['西武', 'ほか', '東急', '相鉄']),
        );

        expect(store.agencies().map((a) => a.agencyName)).toEqual([
            '相鉄',
            '東急',
            '西武',
            'ほか',
        ]);
    });

    it('保存済みの会社一覧を同じキー・同じ項目名で戻す', async () => {
        const saved = serviceAgencies(['相鉄']);
        getItem.mockResolvedValue({ serviceAgencies: saved });
        const store = TestBed.inject(OperationPostCardStore);

        await jest.advanceTimersByTimeAsync(0);

        expect(getItem).toHaveBeenCalledWith('OperationPostCardStore');
        expect(store.settingsReady()).toBe(true);
        expect(store.serviceAgencies()).toEqual(saved);
    });

    it('会社一覧の変更は 100ms まとめて、serviceAgencies だけを保存する', async () => {
        const store = TestBed.inject(OperationPostCardStore);
        await jest.advanceTimersByTimeAsync(0);

        patchState(unprotected(store), {
            serviceAgencies: serviceAgencies(['相鉄']),
        });
        await jest.advanceTimersByTimeAsync(99);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'OperationPostCardStore',
            value: { serviceAgencies: serviceAgencies(['相鉄']) },
        });
    });
});
