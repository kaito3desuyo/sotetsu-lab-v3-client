import { areArrayValuesEqual } from 'src/app/core/utils/are-array-values-equal';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';

export function getViewMode(
    station: StationDetailsDto,
    tripDirection: 0 | 1,
): ETimetableAllLineStationViewMode {
    if (tripDirection === 0) {
        const departureAndArrival = [
            { routeName: ['川越線', '埼京線'], stationName: '大宮' },
            { routeName: ['埼京線'], stationName: '新宿' },
            {
                routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                stationName: '大崎',
            },
            {
                routeName: ['三田線', '南北線', '目黒線'],
                stationName: '目黒',
            },
            {
                routeName: ['東上本線'],
                stationName: '川越市',
            },
            {
                routeName: ['東上本線', '副都心線', '有楽町線'],
                stationName: '和光市',
            },
            {
                routeName: ['池袋線'],
                stationName: '飯能',
            },
            {
                routeName: ['池袋線'],
                stationName: '所沢',
            },
            {
                routeName: ['池袋線', '西武有楽町線'],
                stationName: '練馬',
            },
            {
                routeName: ['副都心線', '有楽町線', '西武有楽町線'],
                stationName: '小竹向原',
            },
            {
                routeName: ['副都心線'],
                stationName: '新宿三丁目',
            },
            { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
            {
                routeName: ['東横線', '目黒線', '東急新横浜線'],
                stationName: '日吉',
            },
            {
                routeName: ['東横線', 'みなとみらい線'],
                stationName: '横浜',
            },
            {
                routeName: ['本線', '新横浜線'],
                //  routeName: ['本線', '相鉄新横浜線'],
                stationName: '西谷',
            },
            { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
            { routeName: ['いずみ野線'], stationName: 'いずみ野' },
            { routeName: ['本線'], stationName: '大和' },
        ];

        if (
            departureAndArrival.some(
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
            return ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL;
        }

        const onlyInboundArrival = [
            { routeName: ['川越線'], stationName: '川越' },
            { routeName: ['三田線'], stationName: '西高島平' },
            { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
            { routeName: ['秩父線'], stationName: '西武秩父' },
            { routeName: ['東上本線'], stationName: '小川町' },
            { routeName: ['本線'], stationName: '横浜' },
        ];

        if (
            onlyInboundArrival.some(
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
            return ETimetableAllLineStationViewMode.ONLY_INBOUND_ARRIVAL;
        }

        return ETimetableAllLineStationViewMode.ONLY_DEPARTURE;
    } else if (tripDirection === 1) {
        const departureAndArrival = [
            { routeName: ['川越線', '埼京線'], stationName: '大宮' },
            { routeName: ['埼京線'], stationName: '新宿' },
            {
                routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                stationName: '大崎',
            },
            {
                routeName: ['三田線', '南北線', '目黒線'],
                stationName: '目黒',
            },
            {
                routeName: ['東上本線'],
                stationName: '川越市',
            },
            {
                routeName: ['東上本線', '副都心線', '有楽町線'],
                stationName: '和光市',
            },
            {
                routeName: ['池袋線'],
                stationName: '飯能',
            },
            {
                routeName: ['池袋線'],
                stationName: '所沢',
            },
            {
                routeName: ['池袋線', '西武有楽町線'],
                stationName: '練馬',
            },
            {
                routeName: ['副都心線', '有楽町線', '西武有楽町線'],
                stationName: '小竹向原',
            },
            {
                routeName: ['副都心線'],
                stationName: '新宿三丁目',
            },
            { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
            {
                routeName: ['東横線', '目黒線', '東急新横浜線'],
                stationName: '日吉',
            },
            {
                routeName: ['東横線', 'みなとみらい線'],
                stationName: '横浜',
            },
            {
                routeName: ['本線', '新横浜線'],
                // routeName: ['本線', '相鉄新横浜線'],
                stationName: '西谷',
            },
            { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
            { routeName: ['いずみ野線'], stationName: 'いずみ野' },
            { routeName: ['本線'], stationName: '大和' },
        ];

        if (
            departureAndArrival.some(
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
            return ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL;
        }

        const onlyOutboundArrival = [
            { routeName: ['りんかい線'], stationName: '新木場' },
            { routeName: ['池袋線'], stationName: '池袋' },
            { routeName: ['東上本線'], stationName: '池袋' },
            { routeName: ['有楽町線'], stationName: '新木場' },
            { routeName: ['みなとみらい線'], stationName: '元町・中華街' },
            { routeName: ['いずみ野線'], stationName: '湘南台' },
            { routeName: ['本線'], stationName: '海老名' },
            { routeName: ['厚木線'], stationName: '厚木' },
        ];

        if (
            onlyOutboundArrival.some(
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
            return ETimetableAllLineStationViewMode.ONLY_OUTBOUND_ARRIVAL;
        }

        return ETimetableAllLineStationViewMode.ONLY_DEPARTURE;
    } else {
        return null;
    }
}
