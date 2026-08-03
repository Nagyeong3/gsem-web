import { InMemoryGsemRepository } from './repositories/InMemoryGsemRepository.mjs';
import { GsemService } from './services/GsemService.mjs';

export function createGsemService() {
  return new GsemService(new InMemoryGsemRepository());
}
