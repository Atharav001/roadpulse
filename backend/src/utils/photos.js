const fs = require('fs');
const path = require('path');
const { uploadDir } = require('../middleware/upload');

function saveBase64Photo(base64Data, mimeType = 'image/jpeg') {
  let data = base64Data;
  let ext = '.jpg';

  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      data = match[2];
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
    }
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
  return `/uploads/${filename}`;
}

function savePhotosFromRequest(photos) {
  if (!photos || !Array.isArray(photos)) return [];

  return photos.map((photo, index) => {
    const timestamp = photo.timestamp || new Date().toISOString();
    const label = photo.label || (index === 0 ? 'closeup' : 'context');

    if (photo.data) {
      return {
        url: saveBase64Photo(photo.data, photo.mimeType),
        timestamp,
        label,
      };
    }

    if (photo.url && !photo.url.startsWith('blob:')) {
      return { url: photo.url, timestamp, label };
    }

    // blob: URLs cannot be read server-side — require base64 data from client
    console.warn(`Photo ${index} missing base64 data; storing placeholder`);
    return {
      url: `/uploads/placeholder-${Date.now()}-${index}.jpg`,
      timestamp,
      label,
    };
  });
}

module.exports = { saveBase64Photo, savePhotosFromRequest };
