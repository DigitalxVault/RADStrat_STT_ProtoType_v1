import { Request, Response, NextFunction } from 'express';

export interface RequestLogData {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  userAgent?: string;
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData: RequestLogData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp,
      userAgent: req.get('user-agent'),
    };

    // Color-code based on status
    const statusColor = getStatusColor(res.statusCode);
    const logMessage = `${logData.method} ${logData.path} ${statusColor}${logData.statusCode}\x1b[0m ${logData.duration}ms`;

    // Only log non-health endpoints or errors
    if (!req.path.includes('/health') || res.statusCode >= 400) {
      console.log(`[${timestamp}] ${logMessage}`);
    }
  });

  next();
};

function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m'; // Red
  if (status >= 400) return '\x1b[33m'; // Yellow
  if (status >= 300) return '\x1b[36m'; // Cyan
  if (status >= 200) return '\x1b[32m'; // Green
  return '\x1b[0m'; // Default
}
