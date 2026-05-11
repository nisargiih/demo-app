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
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagon Outline */}
          <path
            d="M12 2L20.6603 7V17L12 22L3.33975 17V7L12 2Z"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill="#0a0a0a"
          />
          {/* Central Vault Symbol (Simplified Box) */}
          <rect
            x="9"
            y="9"
            width="6"
            height="6"
            stroke="#10b981"
            strokeWidth="1.5"
            fill="none"
          />
          <rect
            x="11.5"
            y="11.5"
            width="1"
            height="1"
            fill="#10b981"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
