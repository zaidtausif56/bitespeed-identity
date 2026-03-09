import { IsEmail, IsOptional, IsString } from 'class-validator';

export class IdentifyDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
