import { IsString, IsNotEmpty } from 'class-validator';

export class LoginMotoristaDto {
  @IsString()
  @IsNotEmpty()
  matricula: string;

  @IsString()
  @IsNotEmpty()
  pin: string;
}
