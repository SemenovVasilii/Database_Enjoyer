import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SendOtpDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class VerifyOtpDto extends SendOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MaxLength(4096)
  refreshToken!: string;
}
