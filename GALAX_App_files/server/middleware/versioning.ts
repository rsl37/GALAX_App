/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response, NextFunction } from 'express';

// API Version configuration
export const API_VERSIONS = {
  v1: '1.0.0',
  v2: '2.0.0',
  current: 'v1' as const,
  supported: ['v1'] as const,
  deprecated: [] as string[],
  sunset: [] as string[]
};

export type ApiVersion = keyof typeof API_VERSIONS;

// Extend Request type to include version info
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      apiVersionInfo?: {
        version: string;
        isSupported: boolean;
        isDeprecated: boolean;
        isSunset: boolean;
        sunsetDate?: string;
      };
    }
  }
}

// Version detection middleware
export const detectApiVersion = (req: Request, res: Response, next: NextFunction): void => {
  let version: string = API_VERSIONS.current;
  
  // Method 1: URL path versioning (/api/v1/users)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    version = pathMatch[1];
  }
  // Method 2: Header versioning (API-Version: v1)
  else if (req.headers['api-version']) {
    version = req.headers['api-version'] as string;
  }
  // Method 3: Accept header versioning (Accept: application/vnd.galax.v1+json)
  else if (req.headers.accept) {
    const acceptMatch = req.headers.accept.match(/application\/vnd\.galax\.(v\d+)\+json/);
    if (acceptMatch) {
      version = acceptMatch[1];
    }
  }
  // Method 4: Query parameter versioning (?api_version=v1)
  else if (req.query.api_version) {
    version = req.query.api_version as string;
  }

  // Validate version
  const isValidVersion = (v: string): v is string => {
    return API_VERSIONS.supported.includes(v as any);
  };

  const isSupported = isValidVersion(version) && API_VERSIONS.supported.includes(version as any);
  const isDeprecated = isValidVersion(version) && API_VERSIONS.deprecated.includes(version);
  const isSunset = isValidVersion(version) && API_VERSIONS.sunset.includes(version);
  // Set version info on request
  req.apiVersion = version;
  req.apiVersionInfo = {
    version,
    isSupported,
    isDeprecated,
    isSunset
  };

  // Add version headers to response
  res.setHeader('X-API-Version', version);
  res.setHeader('X-Supported-Versions', API_VERSIONS.supported.join(', '));
  
  if (isDeprecated) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('Warning', `299 - "API version ${version} is deprecated"`);
  }
  
  if (isSunset) {
    res.setHeader('X-API-Sunset', 'true');
    res.setHeader('Sunset', req.apiVersionInfo.sunsetDate || 'TBD');
  }

  next();
};

// Version validation middleware
export const validateApiVersion = (req: Request, res: Response, next: NextFunction): void => {
  const { apiVersionInfo } = req;
  
  if (!apiVersionInfo) {
    res.status(500).json({
      success: false,
      error: {
        message: 'API version detection failed',
        statusCode: 500
      }
    });
    return;
  }

  // Block sunset versions
  if (apiVersionInfo.isSunset) {
    res.status(410).json({
      success: false,
      error: {
        message: `API version ${apiVersionInfo.version} is no longer supported`,
        statusCode: 410,
        details: {
          sunset_date: apiVersionInfo.sunsetDate,
          supported_versions: API_VERSIONS.supported,
          migration_guide: '/docs/api/migration'
        }
      }
    });
    return;
  }

  // Block unsupported versions
  if (!apiVersionInfo.isSupported) {
    res.status(400).json({
      success: false,
      error: {
        message: `API version ${apiVersionInfo.version} is not supported`,
        statusCode: 400,
        details: {
          supported_versions: API_VERSIONS.supported,
          current_version: API_VERSIONS.current,
          requested_version: apiVersionInfo.version
        }
      }
    });
    return;
  }

  next();
};

// Version-specific route wrapper
export const versionedRoute = (
  versions: string[],
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedVersion = req.apiVersion || API_VERSIONS.current;
    
    if (!versions.includes(requestedVersion)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Endpoint not available in API version ${requestedVersion}`,
          statusCode: 400,
          details: {
            available_versions: versions,
            requested_version: requestedVersion
          }
        }
      });
      return;
    }

    // Call the actual handler
    const result = handler(req, res, next);
    
    // Handle promises
    if (result && typeof result.catch === 'function') {
      result.catch(next);
    }
  };
};

// Middleware to add versioning info to all responses
export const addVersioningHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Intercept json method to add versioning info
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Add API version metadata to successful responses
    if (data && typeof data === 'object' && data.success !== false) {
      data.api_version = req.apiVersion || API_VERSIONS.current;
      data.api_metadata = {
        version: req.apiVersion || API_VERSIONS.current,
        supported_versions: API_VERSIONS.supported,
        is_deprecated: req.apiVersionInfo?.isDeprecated || false,
        documentation_url: `/docs/api/${req.apiVersion || API_VERSIONS.current}`,
        timestamp: new Date().toISOString()
      };
    }
    
    return originalJson.call(this, data);
  };

  next();
};

// Version compatibility helpers
export const isVersionSupported = (version: string): boolean => {
  return API_VERSIONS.supported.includes(version as any);
};

export const isVersionDeprecated = (version: string): boolean => {
  return API_VERSIONS.deprecated.includes(version);
};

export const getLatestVersion = (): string => {
  return API_VERSIONS.current;
};

// Route handler for version information
export const getApiVersionInfo = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      current_version: API_VERSIONS.current,
      supported_versions: API_VERSIONS.supported,
      deprecated_versions: API_VERSIONS.deprecated,
      sunset_versions: API_VERSIONS.sunset,
      version_info: {
        v1: {
          version: API_VERSIONS.v1,
          status: 'supported',
          documentation: '/docs/api/v1',
          release_date: '2024-01-01',
          features: ['Authentication', 'Help Requests', 'Crisis Alerts', 'Governance', 'Stablecoin']
        }
      },
      versioning_methods: [
        'URL path: /api/v1/endpoint',
        'Header: API-Version: v1',
        'Accept header: application/vnd.galax.v1+json',
        'Query parameter: ?api_version=v1'
      ]
    }
  });
};