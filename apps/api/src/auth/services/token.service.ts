import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../generated/prisma/client';
import type { JwtPayload } from '../types/jwt-payload';

export interface IssuedToken {
  accessToken: string;
  /** Время жизни токена в секундах, вычисленное из его собственных iat/exp. */
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  async issue(user: Pick<User, 'id' | 'email'>): Promise<IssuedToken> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    // exp/iat в секундах ставит сам JwtModule (signOptions.expiresIn из конфига) —
    // считаем expiresIn из них, а не парсим строку "7d" повторно.
    const decoded = this.jwtService.decode<{ iat: number; exp: number }>(accessToken);
    const expiresIn = decoded.exp - decoded.iat;

    return { accessToken, expiresIn };
  }
}
