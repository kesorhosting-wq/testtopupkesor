// Centralized error handling utility for secure error messages

// Generic user-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // Database errors
  'PGRST116': 'Item not found',
  '42501': 'Permission denied',
  '23505': 'This item already exists',
  '23503': 'Related item not found',
  '42P01': 'Operation failed',
  // Auth errors
  'invalid_credentials': 'Invalid email or password',
  'email_not_confirmed': 'Please confirm your email address',
  'user_not_found': 'Account not found',
  // Storage errors
  'storage/object-not-found': 'File not found',
  'storage/unauthorized': 'Permission denied',
  // Default
  'default': 'An error occurred. Please try again later.',
};

/**
 * Handles API errors safely without exposing internal details
 * Logs full error details for debugging (in dev mode only)
 * Returns a user-friendly message
 */
export const handleApiError = (error: unknown, context: string): string => {
  // Log full error in development only
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }

  // Extract error code if available
  const errorObj = error as { code?: string; message?: string };
  const errorCode = errorObj?.code;

  // Return mapped message or generic fallback
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  return ERROR_MESSAGES['default'];
};

/**
 * Validates image file by checking magic numbers (file signatures)
 * Returns true if the file is a valid image format
 */
export const isValidImageFile = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      
      // Check file signatures (magic numbers)
      // JPEG: FF D8 FF
      if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
        resolve(true);
        return;
      }
      
      // PNG: 89 50 4E 47
      if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
        resolve(true);
        return;
      }
      
      // GIF: 47 49 46
      if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
        resolve(true);
        return;
      }
      
      // WebP: 52 49 46 46 ... 57 45 42 50
      if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
          arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
        resolve(true);
        return;
      }
      
      // BMP: 42 4D
      if (arr[0] === 0x42 && arr[1] === 0x4D) {
        resolve(true);
        return;
      }
      
      // ICO: 00 00 01 00
      if (arr[0] === 0x00 && arr[1] === 0x00 && arr[2] === 0x01 && arr[3] === 0x00) {
        resolve(true);
        return;
      }
      
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
};

// Maximum file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validates file size
 */
export const isValidFileSize = (file: File, maxSize: number = MAX_FILE_SIZE): boolean => {
  return file.size <= maxSize;
};
