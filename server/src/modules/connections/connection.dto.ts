import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConnectionEngine, ConnectionInput } from '../databases/database.types';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class ConnectionDto implements ConnectionInput {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty({ enum: ['postgresql', 'mysql', 'mongodb'] })
  @IsIn(['postgresql', 'mysql', 'mongodb'])
  engine!: ConnectionEngine;
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(253)
  @Matches(/^[a-zA-Z0-9.\-:[\]_]+$/)
  host!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(65535) port!: number;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) databaseName!: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) username!: string;
  @ApiProperty({ writeOnly: true }) @IsString() @MaxLength(2000) password!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  authDatabase?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tls?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
export class RowsQueryDto {
  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
  @ApiPropertyOptional({ default: 0, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  offset = 0;
}

export class ExecuteSqlDto {
  @ApiProperty({ description: 'SQL statement or PostgreSQL statement batch', maxLength: 100000 })
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  @Matches(/\S/, { message: 'sql must contain a non-whitespace character' })
  sql!: string;

  @ApiPropertyOptional({ default: 500, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxRows = 500;
}
