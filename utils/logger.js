// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Get current timestamp
const getTimestamp = () => {
  return new Date().toISOString();
};

// Console logging with colors
const consoleLog = (level, message, data = null) => {
  const timestamp = getTimestamp();
  let color = colors.reset;

  switch (level) {
    case 'error':
      color = colors.red;
      break;
    case 'warn':
      color = colors.yellow;
      break;
    case 'info':
      color = colors.blue;
      break;
    case 'success':
      color = colors.green;
      break;
    case 'debug':
      color = colors.cyan;
      break;
  }

  console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
  if (data) {
    console.log(`${color}Data: ${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
};

// Logger class
class Logger {
  static error(message, data = null) {
    consoleLog('error', message, data);
  }

  static warn(message, data = null) {
    consoleLog('warn', message, data);
  }

  static info(message, data = null) {
    consoleLog('info', message, data);
  }

  static success(message, data = null) {
    consoleLog('success', message, data);
  }

  static debug(message, data = null) {
    consoleLog('debug', message, data);
  }

  // Request logging
  static request(req, res, next) {
    const start = Date.now();

    // Log request
    Logger.info('Request received', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      headers: {
        'content-type': req.get('Content-Type'),
        authorization: req.get('Authorization') ? '***' : undefined,
      },
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (data) {
      const duration = Date.now() - start;

      Logger.info('Response sent', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: JSON.stringify(data).length,
        success: data?.success,
      });

      return originalJson.call(this, data);
    };

    next();
  }

  // Error logging
  static errorHandler(err, req, res, next) {
    Logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      body: req.body,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export default Logger;
