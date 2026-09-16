import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type {
  ColumnMetadata,
  DatabaseEngine,
  ImportDatabaseInput,
  SchemaMetadata,
  TableMetadata,
} from '../database.types';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const optional = (_object: unknown, value: unknown) => value !== undefined;

class ColumnDto implements ColumnMetadata {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  dataType!: string;

  @IsBoolean()
  nullable!: boolean;

  @ValidateIf(optional)
  @IsBoolean()
  primaryKey?: boolean;

  @ValidateIf(optional)
  @IsString()
  @MaxLength(2000)
  defaultValue?: string;

  @ValidateIf(optional)
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

class TableDto implements TableMetadata {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ValidateIf(optional)
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ColumnDto)
  columns!: ColumnDto[];
}

class SchemaDto implements SchemaMetadata {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => TableDto)
  tables!: TableDto[];
}

export class ImportDatabaseDto implements ImportDatabaseInput {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(['postgresql', 'mysql', 'mongodb', 'sqlite', 'mssql', 'other'])
  engine!: DatabaseEngine;

  @ValidateIf(optional)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SchemaDto)
  schemas!: SchemaDto[];
}
