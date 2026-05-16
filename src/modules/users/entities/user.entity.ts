import { Exclude } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class UserEntity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
