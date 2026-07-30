import { fetchMyIdentity, updateMyIdentity } from '../api/identityApi';

describe('identityApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  test('fetchMyIdentity calls /api/identity/me/ with Auth headers', async () => {
    localStorage.setItem('sc_token', 'mock_jwt_token');

    const mockResponse = {
      user_id: 1,
      style_preset: 'bottts',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=user'
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await fetchMyIdentity();
    expect(global.fetch).toHaveBeenCalledWith('/api/identity/me/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_jwt_token'
      }
    });
    expect(result).toEqual(mockResponse);
  });

  test('updateMyIdentity sends PATCH payload correctly', async () => {
    localStorage.setItem('sc_token', 'mock_jwt_token');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' })
    });

    await updateMyIdentity({ style_preset: 'adventurer' });

    expect(global.fetch).toHaveBeenCalledWith('/api/identity/me/', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_jwt_token'
      },
      body: JSON.stringify({ style_preset: 'adventurer' })
    });
  });
});
