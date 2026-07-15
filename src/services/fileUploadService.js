import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { isDemoBypassActive } from './demoAuthService';

const MAX_FILE_MB = 8;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export const STORAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'site-uploads';

export function isImageMime(type) {
  return type?.startsWith('image/') || IMAGE_TYPES.includes(type);
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** True when files go to Supabase Storage (real login, not localhost demo bypass). */
export function isSupabaseStorageAvailable() {
  return isSupabaseConfigured && supabase && !isDemoBypassActive();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(name) {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
}

async function uploadToSupabaseStorage(file, { folder = 'uploads', projectId } = {}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData?.user) {
    throw new Error('Please sign in to upload files to cloud storage.');
  }

  const userId = authData.user.id;
  const safeName = sanitizeFileName(file.name);
  const pathParts = [folder];
  if (projectId) pathParts.push(projectId);
  pathParts.push(userId, `${Date.now()}-${safeName}`);
  const storagePath = pathParts.join('/');

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('bucket')) {
      throw new Error(
        'Storage bucket not found. Run prisma/storage-setup.sql in Supabase SQL Editor.'
      );
    }
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return {
    name: file.name,
    url: urlData.publicUrl,
    storagePath,
    type: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    storage: 'supabase',
  };
}

async function uploadToLocalDataUrl(file) {
  const url = await readFileAsDataUrl(file);
  return {
    name: file.name,
    url,
    storagePath: null,
    type: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
    storage: 'local',
  };
}

export async function processFileForUpload(file, options = {}) {
  const { maxSizeMB = MAX_FILE_MB, folder = 'uploads', projectId } = options;
  if (!file) throw new Error('No file selected');

  const limit = maxSizeMB * 1024 * 1024;
  if (file.size > limit) {
    throw new Error(`${file.name} is too large. Max ${maxSizeMB} MB.`);
  }

  if (isSupabaseStorageAvailable()) {
    try {
      return await uploadToSupabaseStorage(file, { folder, projectId });
    } catch (err) {
      console.warn('[SiteVerify Upload] Supabase Storage failed, using local fallback:', err.message);
    }
  }

  return uploadToLocalDataUrl(file);
}

export async function processFilesForUpload(files, options = {}) {
  const list = Array.from(files || []);
  const results = [];
  for (const file of list) {
    results.push(await processFileForUpload(file, options));
  }
  return results;
}

const haversineDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function captureGeoMetadata(projectCoords) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ gpsLat: null, gpsLng: null, outsideBoundary: false, geoError: 'Geolocation not available' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let outsideBoundary = false;
        if (projectCoords?.lat && projectCoords?.lng) {
          outsideBoundary = haversineDistanceMeters(latitude, longitude, projectCoords.lat, projectCoords.lng) > 50;
        }
        resolve({
          gpsLat: latitude,
          gpsLng: longitude,
          outsideBoundary,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        resolve({
          gpsLat: null,
          gpsLng: null,
          outsideBoundary: false,
          geoError: err.message,
          timestamp: new Date().toISOString(),
        });
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}
