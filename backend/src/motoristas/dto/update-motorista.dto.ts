import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateMotoristaDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  @MinLength(4)
  pin?: string;
}
