export class UserRegisteredEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
