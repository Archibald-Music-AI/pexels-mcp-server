import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    // Ensure logs directory exists
    const logDir = path.join(process.cwd(), 'logs');
    fs.ensureDirSync(logDir);

    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFile = process.env.LOG_FILE || './logs/pexels-mcp-server.log';

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'pexels-mcp-server' },
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
        }),
        new winston.transports.File({
          filename: logFile,
        }),
      ],
    });

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }));
    }
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any) {
    this.logger.error(message, { error: error?.message || error, stack: error?.stack });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}