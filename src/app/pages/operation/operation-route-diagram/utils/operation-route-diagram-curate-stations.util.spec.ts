import {
    applyRouteDiagramStationAliases,
    curateRouteDiagramStations,
    curateRouteDiagramStationsWithAliases,
} from './operation-route-diagram-curate-stations.util';

function makeStation(stationName: string, routeNames: string[]): any {
    return {
        stationId: stationName,
        stationName,
        routeStationLists: routeNames.map((routeName) => ({
            routeStationListId: `${stationName}-${routeName}`,
            route: { routeId: routeName, routeName },
        })),
    };
}

describe('curateRouteDiagramStations', () => {
    it('対象駅リストに含まれる駅のみを、所属路線の組み合わせが一致する場合に抽出する', () => {
        const kashiwadai = makeStation('かしわ台', ['本線', '厚木線']);
        const ebina = makeStation('海老名', ['本線']);
        const notTarget = makeStation('存在しない駅', ['本線']);

        const result = curateRouteDiagramStations([
            ebina,
            kashiwadai,
            notTarget,
        ]);

        expect(result).toContain(ebina);
        expect(result).toContain(kashiwadai);
        expect(result).not.toContain(notTarget);
    });

    it('所属路線の組み合わせが対象と異なる場合（余分な路線に所属）は除外する', () => {
        // 「海老名」は本線のみが対象。他路線にも所属している場合は一致しない。
        const ebinaWithExtraRoute = makeStation('海老名', ['本線', '厚木線']);

        const result = curateRouteDiagramStations([ebinaWithExtraRoute]);

        expect(result).not.toContain(ebinaWithExtraRoute);
    });

    it('見つからない対象駅は結果から除かれる（undefined を含まない）', () => {
        const result = curateRouteDiagramStations([]);

        expect(result.every((s) => !!s)).toBe(true);
        expect(result.length).toBe(0);
    });
});

describe('curateRouteDiagramStationsWithAliases', () => {
    // 千川は副都心線と有楽町線で別の駅として登録されている（2026-10-07 本番 DB）
    const senkawaYurakucho = {
        ...makeStation('千川', ['有楽町線']),
        stationId: 'senkawa-yurakucho',
    };
    const senkawaFukutoshin = {
        ...makeStation('千川', ['副都心線']),
        stationId: 'senkawa-fukutoshin',
    };

    it('同じ対象に当てはまる駅が複数あれば 1 列にまとめ、所属路線を合わせる', () => {
        const { stations } = curateRouteDiagramStationsWithAliases([
            senkawaYurakucho,
            senkawaFukutoshin,
        ]);

        expect(stations).toHaveLength(1);
        expect(stations[0].stationId).toBe('senkawa-yurakucho');
        expect(
            stations[0].routeStationLists?.map((rsl) => rsl.route?.routeName),
        ).toEqual(['有楽町線', '副都心線']);
    });

    it('まとめた駅の ID は、代表の駅 ID の別名として返す', () => {
        const { aliases } = curateRouteDiagramStationsWithAliases([
            senkawaYurakucho,
            senkawaFukutoshin,
        ]);

        expect(aliases).toEqual({ 'senkawa-fukutoshin': 'senkawa-yurakucho' });
    });

    it('1 つしか当てはまらない対象は、元の駅をそのまま使い別名を作らない', () => {
        const ebina = makeStation('海老名', ['本線']);

        const { stations, aliases } = curateRouteDiagramStationsWithAliases([
            ebina,
        ]);

        expect(stations).toEqual([ebina]);
        expect(aliases).toEqual({});
    });
});

describe('applyRouteDiagramStationAliases', () => {
    it('始発・終着の駅 ID を代表の駅 ID に読み替え、ほかの値は変えない', () => {
        const trip: any = {
            tripOperationListId: 't1',
            startTime: { stationId: 'kotake', departureTime: '08:47:00' },
            endTime: {
                stationId: 'senkawa-fukutoshin',
                arrivalTime: '08:49:00',
            },
        };

        const [result] = applyRouteDiagramStationAliases([trip], {
            'senkawa-fukutoshin': 'senkawa-yurakucho',
        });

        expect(result.startTime.stationId).toBe('kotake');
        expect(result.endTime.stationId).toBe('senkawa-yurakucho');
        expect(result.endTime.arrivalTime).toBe('08:49:00');
        expect(trip.endTime.stationId).toBe('senkawa-fukutoshin');
    });

    it('別名が無ければ同じ配列をそのまま返す', () => {
        const trips: any[] = [{ tripOperationListId: 't1' }];

        expect(applyRouteDiagramStationAliases(trips, {})).toBe(trips);
    });
});
