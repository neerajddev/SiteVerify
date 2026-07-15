/**
 * Parse optional pasted Google Maps links for lat/lng.
 * No Google API — free local regex only.
 * Supports:
 *   https://www.google.com/maps?q=10.52,76.21
 *   https://maps.google.com/?q=10.52,76.21
 *   https://www.google.com/maps/@10.52,76.21,17z
 *   https://www.google.com/maps/place/.../@10.52,76.21,17z
 *   https://maps.app.goo.gl/... (coords not embedded — store link only)
 */
export function parseGoogleMapsLink(raw) {
  const text = (raw || '').trim();
  if (!text) return { mapsUrl: '', coordinates: null };

  const coordMatch =
    text.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/) ||
    text.match(/[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/) ||
    text.match(/[?&]ll=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/) ||
    text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);

  let coordinates = null;
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      coordinates = { lat, lng };
    }
  }

  const looksLikeUrl = /^https?:\/\//i.test(text) || /maps\.|goo\.gl/i.test(text);
  return {
    mapsUrl: looksLikeUrl ? text : text,
    coordinates,
  };
}
