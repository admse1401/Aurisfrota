import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVeiculoDto {
  @IsString()
  @IsNotEmpty()
  prefixo: string;

  @IsString()
  @IsNotEmpty()
  placa: string;
}
