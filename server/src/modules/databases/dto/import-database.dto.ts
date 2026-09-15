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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) dataType!: string;
  @ApiProperty() @IsBoolean() nullable!: boolean;
  @ApiPropertyOptional() @ValidateIf(optional) @IsBoolean() primaryKey?: boolean;
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @MaxLength(2000) defaultValue?: string;
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @MaxLength(2000) comment?: string;
}

class TableDto implements TableMetadata {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @MaxLength(2000) comment?: string;
  @ApiProperty({ type: [ColumnDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ColumnDto)
  columns!: ColumnDto[];
}

class SchemaDto implements SchemaMetadata {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty({ type: [TableDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => TableDto)
  tables!: TableDto[];
}

export class ImportDatabaseDto implements ImportDatabaseInput {
  @ApiProperty({ example: 'commerce' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ enum: ['postgresql', 'mysql', 'mongodb', 'sqlite', 'mssql', 'other'] })
  @IsIn(['postgresql', 'mysql', 'mongodb', 'sqlite', 'mssql', 'other'])
  engine!: DatabaseEngine;
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @MaxLength(2000) description?: string;
  @ApiProperty({ type: [SchemaDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SchemaDto)
  schemas!: SchemaDto[];
}
