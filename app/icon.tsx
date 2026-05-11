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
          position: 'relative',
          background: 'transparent',
        }}
      >
        {/* Hexagon Substrate - Matches Lucide Hexagon */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute' }}
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>

        {/* Central Asset: Protocol Box - Matches Lucide Box */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute' }}
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>

        {/* Precision Pulse Dot */}
        <div 
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '6px',
            height: '6px',
            background: '#10b981',
            borderRadius: '50%',
            border: '1.5px solid #0a0a0a',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
