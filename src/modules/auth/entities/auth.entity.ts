import { UserEntity } from '../../users/entities/user.entity';

export class AuthEntity {
  accessToken: string;
  user: UserEntity;

  constructor(accessToken: string, user: UserEntity) {
    this.accessToken = accessToken;
    this.user = user;
  }
}