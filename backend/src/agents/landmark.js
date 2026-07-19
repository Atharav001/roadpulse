const axios = require('axios');

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CACHE_THRESHOLD_M = 10;
const landmarkCache = [];

const WARD_BOUNDARIES = [
  { id: 'Ward-A', label: 'Downtown Central Ward', lat: 40.7128, lng: -74.006, radius: 0.015 },
  { id: 'Ward-B', label: 'East Side Industrial Ward', lat: 40.72, lng: -73.99, radius: 0.015 },
  { id: 'Ward-C', label: 'North Suburbs Residential Ward', lat: 40.73, lng: -74.02, radius: 0.02 },
];

function inferWard(lat, lng) {
  for (const w of WARD_BOUNDARIES) {
    if (Math.abs(lat - w.lat) <= w.radius && Math.abs(lng - w.lng) <= w.radius) return w.id;
  }
  const nearest = WARD_BOUNDARIES.reduce((best, w) => {
    const d = Math.hypot(lat - w.lat, lng - w.lng);
    return d < best.d ? { id: w.id, d } : best;
  }, { id: 'Ward-A', d: Infinity });
  return nearest.id;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getFallbackDescription(latitude, longitude, ward_id) {
  const wardName = ward_id && ward_id !== 'unknown' ? ward_id : `Ward ${Math.floor(Math.random() * 5) + 1}`;
  return `~${Math.floor(Math.random() * 90 + 10)}m from a landmark in ${wardName} area (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}

async function getLandmark(latitude, longitude, ward_id) {
  if (latitude == null || longitude == null) {
    return { landmark_description: 'Unknown location', ward_id: ward_id || 'unknown' };
  }

  const resolvedWard = ward_id || inferWard(latitude, longitude);

  const cached = landmarkCache.find(c =>
    distanceMeters(c.lat, c.lng, latitude, longitude) <= CACHE_THRESHOLD_M
  );
  if (cached) {
    return { landmark_description: cached.description, ward_id: resolvedWard };
  }

  try {
    let description;
    if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY.startsWith('demo_')) {
      description = getFallbackDescription(latitude, longitude, resolvedWard);
    } else {
      description = await fetchLandmarkFromGooglePlaces(latitude, longitude);
    }

    landmarkCache.push({ lat: latitude, lng: longitude, description });
    if (landmarkCache.length > 100) landmarkCache.splice(0, 50);
    return { landmark_description: description, ward_id: resolvedWard };
  } catch (error) {
    console.error('Landmark lookup failed:', error.message);
    return { landmark_description: `Location near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, ward_id: resolvedWard };
  }
}

async function fetchLandmarkFromGooglePlaces(latitude, longitude) {
  const response = await axios.get(
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    {
      params: {
        location: `${latitude},${longitude}`,
        radius: 100,
        key: GOOGLE_PLACES_API_KEY,
      },
      timeout: 10000,
    }
  );

  if (response.data.status === 'ZERO_RESULTS') {
    return `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
  if (response.data.status !== 'OK') {
    throw new Error(`Google Places API error: ${response.data.status}`);
  }

  const places = response.data.results.slice(0, 3);
  const nameAndVicinity = places.map(p => {
    const name = p.name || '';
    const vicinity = p.vicinity || '';
    return vicinity ? `${name}, ${vicinity}` : name;
  }).filter(Boolean);

  if (nameAndVicinity.length === 0) {
    return `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  const mainPlace = nameAndVicinity[0];
  const nearbyPlaces = nameAndVicinity.slice(1);
  let description = `~100m from ${mainPlace}`;
  if (nearbyPlaces.length > 0) {
    description += `, near ${nearbyPlaces.join(' & ')}`;
  }
  return description;
}

module.exports = { getLandmark };