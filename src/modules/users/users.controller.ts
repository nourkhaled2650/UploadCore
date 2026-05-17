import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { ApiSuccessResponse } from 'src/common/decorators/response.decorator';
import { UserEntity } from 'src/modules/users/entities/user.entity';
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiSuccessResponse(UserEntity)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiSuccessResponse(UserEntity)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
