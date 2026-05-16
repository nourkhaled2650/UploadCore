import {
    Injectable,
    ConflictException,
    NotFoundException,
  } from '@nestjs/common';
  import * as bcrypt from 'bcrypt';
  import { PrismaService } from '../../prisma/prisma.service';
  import { CreateUserDto } from './dto/create-user.dto';
  import { UserEntity } from './entities/user.entity';
  
  @Injectable()
  export class UsersService {
    constructor(private readonly prisma: PrismaService) {}
  
    async create(dto: CreateUserDto): Promise<UserEntity> {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
  
      if (existing) {
        throw new ConflictException('Email already in use');
      }
  
      const hashedPassword = await bcrypt.hash(dto.password, 12);
  
      const user = await this.prisma.user.create({
        data: {
          ...dto,
          password: hashedPassword,
        },
      });
  
      return new UserEntity(user);
    }
  
    async findById(id: string): Promise<UserEntity> {
      const user = await this.prisma.user.findUnique({
        where: { id, deletedAt: null },
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      return new UserEntity(user);
    }
  }