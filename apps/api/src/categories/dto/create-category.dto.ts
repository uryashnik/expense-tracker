import { IsHexColor, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsHexColor()
  color: string;

  @IsString()
  @Length(1, 50)
  icon: string;
}
