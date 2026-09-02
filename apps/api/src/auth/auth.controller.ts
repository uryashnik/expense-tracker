import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthResponse, AuthUser } from '@expense-tracker/shared';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/jwt-payload';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserCommand } from './application/commands/register-user.command';
import { LoginUserCommand } from './application/commands/login-user.command';
import { GetCurrentUserQuery } from './application/queries/get-current-user.query';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.commandBus.execute(new RegisterUserCommand(dto.name, dto.email, dto.password));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.commandBus.execute(new LoginUserCommand(dto.email, dto.password));
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUser> {
    return this.queryBus.execute(new GetCurrentUserQuery(user.id));
  }
}
