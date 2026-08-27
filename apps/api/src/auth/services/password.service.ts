import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Фиктивный bcrypt-хеш (пароль "dummy-password-for-timing-safety", cost 12).
 * Используется, когда пользователь с таким email не найден: без сравнения с ним
 * ответ на несуществующий email приходил бы заметно быстрее, чем на существующий
 * с неверным паролем, что позволяет перебором узнавать зарегистрированные адреса.
 */
const DUMMY_HASH = '$2b$12$lPgvJqT.GIajMcvKL0G6NOzscyZDWgNz.DL.z/ZsgUUu5foFNlXYS';

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** Тратит столько же времени, сколько compare(), но всегда возвращает false. */
  async compareWithDummy(plain: string): Promise<false> {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
}
