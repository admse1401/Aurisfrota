import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryEventosDto {
  @IsOptional()
  @IsString()
  matricula?: string;

  @IsOptional()
  @IsString()
  prefixo?: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;
}
