/** Small stroke icons shared by the sidebar, tree and developer tools. */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FilePlusIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
    <path d="M14 3v5h4.5M12 11v6M9 14h6" />
  </Icon>;
}

export function FolderPlusIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    <path d="M12 11v6M9 14h6" />
  </Icon>;
}

export function FolderIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
  </Icon>;
}

export function FileIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
    <path d="M14 3v5h4.5M8.5 12h7M8.5 16h5" />
  </Icon>;
}

export function TrashIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />
  </Icon>;
}

export function RestoreIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M4 5v5h5" />
    <path d="M4.8 10A8 8 0 1 1 5 15" />
  </Icon>;
}

export function PencilIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
    <path d="m13.5 5.5 3 3" />
  </Icon>;
}

export function CloseIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="m5 5 14 14M19 5 5 19" />
  </Icon>;
}

export function FilesIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M8 3h8l4 4v11a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 18V4.5A1.5 1.5 0 0 1 8 3Z" />
    <path d="M15.5 3v4.5H20M4 7v13a2 2 0 0 0 2 2h9" />
  </Icon>;
}

export function OutlineIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
  </Icon>;
}

export function SlidersIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M4 7h7M15 7h5M4 17h5M13 17h7" />
    <circle cx="13" cy="7" r="2" />
    <circle cx="11" cy="17" r="2" />
  </Icon>;
}

export function ChevronRightIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="m9 5 7 7-7 7" />
  </Icon>;
}

export function DownloadIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </Icon>;
}

export function UploadIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M12 21V9M7 14l5-5 5 5M4 4h16" />
  </Icon>;
}

export function PanelLeftIcon(props: IconProps) {
  return <Icon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Icon>;
}

export function PlayIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M8 5.5v13l10-6.5Z" />
  </Icon>;
}

export function CopyIcon(props: IconProps) {
  return <Icon {...props}>
    <rect x="8" y="8" width="12" height="12" rx="1.5" />
    <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-10A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8" />
  </Icon>;
}

export function CodeIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />
  </Icon>;
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Icon>;
}

export function PuzzleIcon(props: IconProps) {
  return <Icon {...props}>
    <path d="M10 4.5a2 2 0 1 1 4 0V6h3.5A1.5 1.5 0 0 1 19 7.5V11h-1.5a2 2 0 1 0 0 4H19v3.5a1.5 1.5 0 0 1-1.5 1.5H14v-1.5a2 2 0 1 0-4 0V20H6.5A1.5 1.5 0 0 1 5 18.5V15h1.5a2 2 0 1 0 0-4H5V7.5A1.5 1.5 0 0 1 6.5 6H10Z" />
  </Icon>;
}

export function InfoIcon(props: IconProps) {
  return <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5h.01" />
  </Icon>;
}
