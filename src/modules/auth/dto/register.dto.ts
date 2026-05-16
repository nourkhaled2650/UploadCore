import {
    IsEmail,
    IsString,
    IsNotEmpty,
    MinLength,
    Matches,
  } from 'class-validator';
import { REGEX } from 'src/common/constants/regex.constants';
  
  export class RegisterDto {
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(
      REGEX.PASSWORD,
      {
        message:
          'Password must contain uppercase, lowercase, number and special character',
      },
    )
    password: string;
  
    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName: string;
  
    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName: string;
  }