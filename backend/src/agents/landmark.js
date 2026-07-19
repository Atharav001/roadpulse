const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CACHE_THRESHOLD_M = 10;
const landmarkCache = [];

const FALLBACK_WARDS = [
  { id: 'Ward-A', name: 'Tiger Circle & MIT Campus, Manipal', lat: 13.3520, lng: 74.7869, radius: 0.012 },
  { id: 'Ward-B', name: 'End Point Road, Manipal', lat: 13.3400, lng: 74.7800, radius: 0.012 },
  { id: 'Ward-C', name: 'KMC Hospital & Madhav Nagar, Manipal', lat: 13.3550, lng: 74.7920, radius: 0.012 },
  { id: 'Ward-D', name: 'Udupi-Manipal Highway (NH-169A)', lat: 13.3600, lng: 74.8000, radius: 0.015 },
  { id: 'Ward-E', name: 'Malpe Beach Road, Udupi', lat: 13.3300, lng: 74.7500, radius: 0.015 },
];

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadWards(pool) {
  if (!pool) return FALLBACK_WARDS;
  try {
    const result = await pool.query(
      'SELECT id, name, center_lat AS lat, center_lng AS lng FROM wards WHERE center_lat IS NOT NULL'
    );
    if (result.rows.length > 0) {
      return result.rows.map(w => ({ ...w, lat: parseFloat(w.lat), lng: parseFloat(w.lng), radius: 0.012 }));
    }
  } catch {
    /* use fallback */
  }
  return FALLBACK_WARDS;
}

function inferWard(lat, lng, wards) {
  for (const w of wards) {
    if (Math.abs(lat - w.lat) <= w.radius && Math.abs(lng - w.lng) <= w.radius) return w.id;
  }
  const nearest = wards.reduce(
    (best, w) => {
      const d = Math.hypot(lat - w.lat, lng - w.lng);
      return d < best.d ? { id: w.id, d } : best;
    },
    { id: wards[0]?.id || 'unknown', d: Infinity }
  );
  return nearest.id;
}

function getFallbackDescription(latitude, longitude, ward_id, wards) {
  const ward = wards.find(w => w.id === ward_id);
  const wardLabel = ward?.name || ward_id || 'Unknown ward';
  return `Near ${wardLabel} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}

async function getLandmark(latitude, longitude, ward_id, pool) {
  if (latitude == null || longitude == null) {
    return { landmark_description: 'Unknown location', ward_id: ward_id || 'unknown', nearby_landmarks: [] };
  }

  const wards = await loadWards(pool);
  const resolvedWard = ward_id && ward_id !== 'unknown' ? ward_id : inferWard(latitude, longitude, wards);

  const cached = landmarkCache.find(c => distanceMeters(c.lat, c.lng, latitude, longitude) <= CACHE_THRESHOLD_M);
  if (cached) {
    return { landmark_description: cached.description, ward_id: resolvedWard, nearby_landmarks: cached.rawPlaces || [] };
  }

  try {
    let description;
    let rawPlaces = [];

    if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.startsWith('demo_')) {
      description = getFallbackDescription(latitude, longitude, resolvedWard, wards);
    } else {
      const result = await fetchLandmarkFromGooglePlaces(latitude, longitude);
      description = result.description;
      rawPlaces = result.rawPlaces;
    }

    landmarkCache.push({ lat: latitude, lng: longitude, description, rawPlaces });
    if (landmarkCache.length > 100) landmarkCache.splice(0, 50);

    return { landmark_description: description, ward_id: resolvedWard, nearby_landmarks: rawPlaces };
  } catch (error) {
    console.error('Landmark lookup failed:', error.message);
    return {
      landmark_description: getFallbackDescription(latitude, longitude, resolvedWard, wards),
      ward_id: resolvedWard,
      nearby_landmarks: [],
    };
  }
}

async function fetchLandmarkFromGooglePlaces(latitude, longitude) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
    params: { location: `${latitude},${longitude}`, radius: 100, key: GOOGLE_PLACES_API_KEY },
    timeout: 10000,
  });

  if (response.data.status === 'ZERO_RESULTS') {
    return { description: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, rawPlaces: [] };
  }
  if (response.data.status !== 'OK') {
    throw new Error(`Google Places API error: ${response.data.status}`);
  }

  const places = response.data.results.slice(0, 3);
  const rawPlaces = places.map(p => ({
    name: p.name || '',
    vicinity: p.vicinity || '',
    place_id: p.place_id || '',
    types: p.types || [],
  }));

  const nameAndVicinity = places
    .map(p => {
      const name = p.name || '';
      const vicinity = p.vicinity || '';
      return vicinity ? `${name}, ${vicinity}` : name;
    })
    .filter(Boolean);

  if (nameAndVicinity.length === 0) {
    return { description: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, rawPlaces: [] };
  }

  let description = `~100m from ${nameAndVicinity[0]}`;
  if (nameAndVicinity.length > 1) {
    description += `, near ${nameAndVicinity.slice(1).join(' & ')}`;
  }
  return { description, rawPlaces };
}

module.exports = { getLandmark, FALLBACK_WARDS };
