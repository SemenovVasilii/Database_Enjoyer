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
import type { ConnectionEngine, ConnectionInput } from '../databases/database.types';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ConnectionDto implements ConnectionInput {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(['postgresql', 'mysql', 'mongodb'])
  engine!: ConnectionEngine;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(253)
  @Matches(/^[a-zA-Z0-9.\-:[\]_]+$/)
  host!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  databaseName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  username!: string;

  @IsString()
  @MaxLength(2000)
  password!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  authDatabase?: string;

  @IsOptional()
  @IsBoolean()
  tls?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class RowsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  offset = 0;
}

export class ExecuteSqlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  @Matches(/\S/, { message: 'sql must contain a non-whitespace character' })
  sql!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxRows = 500;
}
