import { UserRegisteredHandler } from './user-registered.handler';
import { UserLoggedInHandler } from './user-logged-in.handler';

export { UserRegisteredEvent } from './user-registered.event';
export { UserLoggedInEvent } from './user-logged-in.event';

export const EVENT_HANDLERS = [UserRegisteredHandler, UserLoggedInHandler];
