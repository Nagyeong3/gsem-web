import { createStubApiServer } from '../tools/stub-api.mjs';
import { createGsemService } from './createService.mjs';

export function createGsemApiServer(options = {}) {
  return createStubApiServer({
    service: options.service ?? createGsemService(),
    logger: options.logger,
  });
}
