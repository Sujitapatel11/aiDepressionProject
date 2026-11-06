/**
 * Choose the safe delivery URL for a media asset returned by the API.
 *
 * Publicly visible media (`is_public: true`) uses the stable `url` field so a
 * cached feed never depends on an expiring signed token. Owner-only surfaces
 * (draft posts, fresh uploads, private journal media) use the short-lived
 * signed `preview_url`, because <img>/<video> cannot send an Authorization
 * header. Older API responses without `is_public` keep the legacy behaviour.
 */
export const pickMediaUrl = (asset) => {
  if (!asset) return null;
  if (asset.is_public && asset.url) return asset.url;
  return asset.preview_url || asset.url || null;
};
