import { RegisterUserHandler } from './register-user.handler';
import { LoginUserHandler } from './login-user.handler';

export { RegisterUserCommand } from './register-user.command';
export { LoginUserCommand } from './login-user.command';

export const COMMAND_HANDLERS = [RegisterUserHandler, LoginUserHandler];
