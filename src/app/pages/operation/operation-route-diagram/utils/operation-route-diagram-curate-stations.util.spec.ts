import { curateRouteDiagramStations } from './operation-route-diagram-curate-stations.util';

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
        const ebinaWithExtraRoute = makeStation('海老名', [
            '本線',
            '厚木線',
        ]);

        const result = curateRouteDiagramStations([ebinaWithExtraRoute]);

        expect(result).not.toContain(ebinaWithExtraRoute);
    });

    it('見つからない対象駅は結果から除かれる（undefined を含まない）', () => {
        const result = curateRouteDiagramStations([]);

        expect(result.every((s) => !!s)).toBe(true);
        expect(result.length).toBe(0);
    });
});
