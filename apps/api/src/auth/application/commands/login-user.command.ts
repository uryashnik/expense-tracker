export class LoginUserCommand {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {}
}
