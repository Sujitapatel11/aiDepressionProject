/**
 * Pure Utility Service for constructing Avatar URLs.
 * Never executes HTTP network calls.
 */
export const buildAvatarUrl = ({
  style_preset = 'bottts',
  seed_key = 'soulcare_user',
  identity_config = {},
  version = 'v7'
}) => {
  const versionPath = version === 'v7' ? '7.x' : '7.x';
  const style = style_preset || 'bottts';
  const seed = seed_key || 'soulcare_user';

  const params = new URLSearchParams();
  params.set('seed', seed);

  const bgColor = identity_config?.background_color;
  if (bgColor && bgColor !== 'transparent') {
    params.set('backgroundColor', bgColor.replace('#', ''));
  } else if (bgColor === 'transparent') {
    params.set('backgroundColor', 'transparent');
  }

  return `https://api.dicebear.com/${versionPath}/${style}/svg?${params.toString()}`;
};
