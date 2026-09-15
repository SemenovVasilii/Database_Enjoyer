import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SendOtpDto {
  @ApiProperty({ example: 'you@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class VerifyOtpDto extends SendOtpDto {
  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  refreshToken!: string;
}
