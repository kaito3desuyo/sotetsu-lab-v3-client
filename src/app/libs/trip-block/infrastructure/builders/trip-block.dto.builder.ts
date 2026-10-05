import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export const TripBlockDtoBuilder = {
    /**
     * model は HTTP の応答（素の JSON）なので、そのまま DTO に変換する。
     * 以前は classToPlain で一度複製していたが、素の JSON に対しては全キーの深い複製に
     * しかならず、全線時刻表（約 600 ブロック）で変換時間の半分を占めていた。
     */
    buildFromModel: (model: TripBlockModel): TripBlockDetailsDto => {
        return plainToClass(
            TripBlockDetailsDto,
            model,
            classTransformerOptions,
        );
    },
} as const;
