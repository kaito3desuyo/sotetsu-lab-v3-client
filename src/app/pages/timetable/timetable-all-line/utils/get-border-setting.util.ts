import { areArrayValuesEqual } from 'src/app/core/utils/are-array-values-equal';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

export function getBorderSetting(
    station: StationDetailsDto,
    tripDirection: 0 | 1,
): boolean {
    if (tripDirection === 0) {
        const target = [
            { routeName: ['りんかい線'], stationName: '大井町' },
            { routeName: ['三田線'], stationName: '西高島平' },
            { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
            { routeName: ['東上本線'], stationName: '小川町' },
            { routeName: ['秩父線'], stationName: '西武秩父' },
            { routeName: ['西武有楽町線'], stationName: '新桜台' },
            { routeName: ['有楽町線', '副都心線'], stationName: '地下鉄成増' },
            { routeName: ['東横線'], stationName: '綱島' },
            { routeName: ['本線'], stationName: '横浜' },
            { routeName: ['本線'], stationName: '希望ヶ丘' },
            { routeName: ['厚木線'], stationName: '厚木' },
        ];

        if (
            target.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return true;
        }

        return false;
    } else if (tripDirection === 1) {
        const target = [
            { routeName: ['相鉄・JR直通線'], stationName: '武蔵小杉' },
            { routeName: ['りんかい線'], stationName: '新木場' },
            { routeName: ['三田線'], stationName: '三田' },
            { routeName: ['目黒線'], stationName: '奥沢' },
            { routeName: ['東上本線'], stationName: '池袋' },
            { routeName: ['池袋線'], stationName: '池袋' },
            { routeName: ['西武有楽町線'], stationName: '新桜台' },
            { routeName: ['有楽町線'], stationName: '新木場' },
            {
                routeName: ['新横浜線', '相鉄・JR直通線'],
                // routeName: ['相鉄新横浜線', '相鉄・JR直通線'],
                stationName: '羽沢横浜国大',
            },
            {
                routeName: ['みなとみらい線'],
                stationName: '元町・中華街',
            },
            { routeName: ['いずみ野線'], stationName: '湘南台' },
            { routeName: ['本線'], stationName: '海老名' },
        ];

        if (
            target.some(
                (o) =>
                    station.stationName === o.stationName &&
                    areArrayValuesEqual(
                        station.routeStationLists.map(
                            (rsl) => rsl.route.routeName,
                        ),
                        o.routeName,
                    ),
            )
        ) {
            return true;
        }

        return false;
    } else {
        return false;
    }
}
