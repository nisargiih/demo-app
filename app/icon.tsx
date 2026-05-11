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
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
          border: '2px solid #10b981',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagon Outline */}
          <path
            d="M12 2L20.6603 7V17L12 22L3.33975 17V7L12 2Z"
            stroke="#10b981"
            strokeWidth="2"
            fill="rgba(16, 185, 129, 0.1)"
          />
          {/* Inner Vault Box */}
          <rect
            x="8.5"
            y="8.5"
            width="7"
            height="7"
            fill="#ffffff"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
