import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateMotoristaDto {
  @IsString()
  @IsNotEmpty()
  matricula: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @MinLength(4)
  pin: string;
}
