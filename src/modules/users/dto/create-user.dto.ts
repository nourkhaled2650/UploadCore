import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { REGEX } from 'src/common/constants/regex.constants';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @Matches(
    REGEX.PASSWORD,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}