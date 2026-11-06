import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SoulTubePage from './SoulTubePage';
import { createRoom, joinRoom, listRooms, listMyVideos } from '../services/soulTubeApi';

vi.mock('../services/soulTubeApi', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  listRooms: vi.fn(),
  listMyVideos: vi.fn(),
}));

const room = {
  code: 'ABC123',
  name: 'Friday movie night',
  visibility: 'public',
  status: 'active',
  host_username: 'river_light',
  participant_count: 3,
  max_participants: 10,
  is_host: false,
  joined: false,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/soultube']}>
      <Routes>
        <Route path="/soultube" element={<SoulTubePage />} />
        <Route path="/soultube/rooms/:code" element={<p>Room destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listRooms.mockResolvedValue({ ok: true, status: 200, data: { results: [room], next: null } });
  listMyVideos.mockResolvedValue({ ok: true, status: 200, data: { results: [], next: null } });
});

describe('SoulTubePage', () => {
  it('lists public rooms from the API', async () => {
    renderPage();
    expect(await screen.findByText('Friday movie night')).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText(/hosted by river_light/i)).toBeInTheDocument();
  });

  it('shows an honest empty state when no public rooms are open', async () => {
    listRooms.mockResolvedValue({ ok: true, status: 200, data: { results: [], next: null } });
    renderPage();
    expect(await screen.findByText(/no public rooms are open right now/i)).toBeInTheDocument();
  });

  it('shows an error state and retries', async () => {
    listRooms.mockResolvedValueOnce({
      ok: false,
      status: 503,
      data: null,
      error: 'Room service is unavailable.',
    });
    renderPage();
    expect(await screen.findByText(/rooms could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByText('Room service is unavailable.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(listRooms).toHaveBeenCalledTimes(2));
  });

  it('creates a room and navigates to it', async () => {
    createRoom.mockResolvedValue({ ok: true, status: 201, data: { ...room, code: 'NEW123' } });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /create a room/i }));
    await userEvent.type(screen.getByLabelText(/room name/i), 'Study session');
    await userEvent.selectOptions(screen.getByLabelText(/visibility/i), 'private');
    await userEvent.click(screen.getByRole('button', { name: /create room →/i }));

    await waitFor(() => expect(createRoom).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Study session',
      visibility: 'private',
      video_asset_id: null,
    })));
    expect(await screen.findByText('Room destination')).toBeInTheDocument();
  });

  it('joins a room by code and navigates to it', async () => {
    joinRoom.mockResolvedValue({ ok: true, status: 200, data: { ...room, joined: true } });
    renderPage();

    await screen.findByText('Friday movie night');
    await userEvent.type(screen.getByLabelText(/join with a room code/i), 'abc123');
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }));

    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith('ABC123'));
    expect(await screen.findByText('Room destination')).toBeInTheDocument();
  });

  it('surfaces join errors instead of navigating', async () => {
    joinRoom.mockResolvedValue({
      ok: false,
      status: 409,
      data: null,
      error: 'This room is full.',
    });
    renderPage();

    await screen.findByText('Friday movie night');
    await userEvent.type(screen.getByLabelText(/join with a room code/i), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }));

    expect(await screen.findByText('This room is full.')).toBeInTheDocument();
    expect(screen.queryByText('Room destination')).not.toBeInTheDocument();
  });
});
