import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;
}
