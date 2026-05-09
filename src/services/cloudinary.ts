type CloudinaryTransformMode = 'thumb' | 'preview' | 'full';

const CLOUDINARY_HOST_PATTERN = /res\.cloudinary\.com/i;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TRANSFORM_PRESETS: Record<CloudinaryTransformMode, string> = {
  thumb: 'c_fill,w_360,h_360,f_auto,q_auto',
  preview: 'c_limit,w_1200,f_auto,q_auto',
  full: 'c_limit,w_1600,f_auto,q_auto',
};

const stripExistingTransformation = (pathPart: string) => {
  const segments = pathPart.split('/').filter(Boolean);
  if (segments.length === 0) return pathPart;

  const uploadIndex = segments.indexOf('upload');
  if (uploadIndex === -1 || uploadIndex === segments.length - 1) {
    return pathPart;
  }

  const afterUpload = segments.slice(uploadIndex + 1);
  if (afterUpload.length === 0) {
    return pathPart;
  }

  const firstContentSegment = afterUpload[0];
  const looksLikeTransformation = /[=,]/.test(firstContentSegment) || firstContentSegment.includes('_');
  if (!looksLikeTransformation) {
    return pathPart;
  }

  const remainder = afterUpload.findIndex((segment) => /^v\d+$/.test(segment));
  if (remainder === -1) {
    return `/${segments.slice(0, uploadIndex + 1).join('/')}/${afterUpload.slice(1).join('/')}`.replace(/\/{2,}/g, '/');
  }

  return `/${segments.slice(0, uploadIndex + 1).join('/')}/${afterUpload.slice(remainder).join('/')}`.replace(/\/{2,}/g, '/');
};

const insertTransform = (url: string, transform: string) => {
  const parsed = new URL(url);
  if (!CLOUDINARY_HOST_PATTERN.test(parsed.hostname)) {
    return url;
  }

  const normalizedPath = stripExistingTransformation(parsed.pathname);
  const uploadMarker = '/upload/';
  const uploadIndex = normalizedPath.indexOf(uploadMarker);
  if (uploadIndex === -1) {
    return url;
  }

  const prefix = normalizedPath.slice(0, uploadIndex + uploadMarker.length);
  const suffix = normalizedPath.slice(uploadIndex + uploadMarker.length).replace(/^\/+/, '');
  const transformedPath = `${prefix}${transform}/${suffix}`.replace(/\/{2,}/g, '/');

  parsed.pathname = transformedPath;
  return parsed.toString();
};

export const getImageUrl = (rawUrl?: string | null, mode: CloudinaryTransformMode = 'preview') => {
  if (!rawUrl) return '';
  const url = rawUrl.trim();
  if (!url) return '';

  if (/^(blob:|data:)/i.test(url)) {
    return url;
  }

  if (url.startsWith('/')) {
    const baseUrl = API_BASE_URL || window.location.origin;
    const absoluteUrl = `${baseUrl}${url}`;
    return insertTransform(absoluteUrl, TRANSFORM_PRESETS[mode]);
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      return insertTransform(url, TRANSFORM_PRESETS[mode]);
    } catch {
      return url;
    }
  }

  return url;
};
