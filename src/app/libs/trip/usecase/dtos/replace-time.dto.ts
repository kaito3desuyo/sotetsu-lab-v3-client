import { CreateTimeDto } from './create-time.dto';

export interface ReplaceTimeDto extends CreateTimeDto {
    timeId?: string;
}
