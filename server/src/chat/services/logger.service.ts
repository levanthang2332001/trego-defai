import {
  Injectable,
  Logger,
  LoggerService as NestLoggerService,
} from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private context?: string;

  constructor(context?: string) {
    this.logger = new Logger();
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context || this.context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context || this.context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context || this.context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context || this.context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context || this.context);
  }

  setContext(context: string): void {
    this.context = context;
  }
}
