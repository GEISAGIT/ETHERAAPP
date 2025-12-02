import type { SVGProps } from 'react';

export function ClinicFlowLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <g fill="currentColor">
        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
        <path d="M189.66 86.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L128 136.69l50.34-50.35a8 8 0 0 1 11.32 0Z" />
        <path d="M152 88H96a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16Z" />
      </g>
    </svg>
  );
}
