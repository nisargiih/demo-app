import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'IdenVault Logo';
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          position: 'relative',
        }}
      >
        {/* Hexagon Substrate - Filling the space with a thick green stroke */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="rgba(16, 185, 129, 0.1)"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinejoin="round"
          style={{ position: 'absolute' }}
        >
          <path d="M12 2L20.6603 7V17L12 22L3.33975 17V7L12 2Z" />
        </svg>

        {/* Central Vault Box - Bold white interior for contrast */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute' }}
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
