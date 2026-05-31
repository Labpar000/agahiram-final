'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/**
 * Pixel-accurate replicas of Instagram's own action-row icons.
 * Use these in place of the Lucide icons for the Instagram-modern look.
 *
 * All icons:
 *   - 24x24 viewBox, currentColor
 *   - default stroke 2px, round joins/caps
 *   - `filled` prop fills with `currentColor` and removes stroke
 *   - extra-large size compatible: pass `className="size-7"` etc.
 */

type IconProps = React.SVGAttributes<SVGSVGElement> & {
  filled?: boolean;
  /** Stroke width (only used when not filled). Default 1.8 to match IG. */
  strokeWidth?: number | string;
  title?: string;
};

const baseProps = (
  filled: boolean | undefined,
  strokeWidth: number | string = 1.8,
  className?: string,
) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: filled ? 'currentColor' : 'none',
  stroke: filled ? 'none' : 'currentColor',
  strokeWidth: filled ? 0 : strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: cn(className),
  'aria-hidden': true as const,
});

export const IgHeart = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938z" />
    </svg>
  ),
);
IgHeart.displayName = 'IgHeart';

export const IgComment = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
    </svg>
  ),
);
IgComment.displayName = 'IgComment';

export const IgShare = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="22" y1="3" x2="9.218" y2="10.083" />
      <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334 11.698 20.334" />
    </svg>
  ),
);
IgShare.displayName = 'IgShare';

export const IgBookmark = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21" />
    </svg>
  ),
);
IgBookmark.displayName = 'IgBookmark';

/** Three-dot "more" menu — matches Instagram's exact dot spacing. */
export const IgMore = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
);
IgMore.displayName = 'IgMore';

/** Verified blue check — exact Instagram badge SVG. */
export const IgVerified = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="currentColor"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="#0095F6"
        d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h6.234L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.04v-6.054L40 25.359 36.905 20 40 14.641l-5.37-3.101v-6.39h-6.04L25.358 0z"
      />
      <path
        fill="#FFFFFF"
        d="m28.658 13.94-1.872-1.872-9.339 9.339-3.834-3.835-1.872 1.872 5.706 5.706z"
      />
    </svg>
  ),
);
IgVerified.displayName = 'IgVerified';

/* ---------- Bottom-nav icons (IG outline / filled via `filled` prop) ---------- */

export const IgHome = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M12 2.1 3 10.2V22h6v-6.5h6V22h6V10.2L12 2.1Z" />
      ) : (
        <>
          <path d="M3 10.2 12 2.1l9 8.1" />
          <path d="M5 10.2V22h5v-6.5h4V22h5V10.2" />
        </>
      )}
    </svg>
  ),
);
IgHome.displayName = 'IgHome';

export const IgSearch = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <>
          <path d="M10.5 3a7.5 7.5 0 1 0 4.8 13.2l4.5 4.5 1.4-1.4-4.5-4.5A7.5 7.5 0 0 0 10.5 3Z" />
        </>
      ) : (
        <>
          <circle cx="11" cy="11" r="7.25" />
          <line x1="16.65" y1="16.65" x2="21" y2="21" />
        </>
      )}
    </svg>
  ),
);
IgSearch.displayName = 'IgSearch';

export const IgCreate = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
);
IgCreate.displayName = 'IgCreate';

export const IgReels = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M12 2.4c-5.3 0-9.6 4.3-9.6 9.6S6.7 21.6 12 21.6s9.6-4.3 9.6-9.6S17.3 2.4 12 2.4Zm-1.1 6.2 6.4 3.7c.4.2.4.8 0 1L10.9 17c-.5.3-1.1-.1-1.1-.7V8.9c0-.6.6-1 1.1-.7Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="9.25" />
          <path d="m10.2 8.2 7.2 4.2a.55.55 0 0 1 0 .95l-7.2 4.2a.6.6 0 0 1-.9-.52V8.72a.6.6 0 0 1 .9-.52Z" />
        </>
      )}
    </svg>
  ),
);
IgReels.displayName = 'IgReels';

export const IgDirect = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M12.003 2.396c-5.298 0-9.607 4.309-9.607 9.607 0 1.683.433 3.263 1.193 4.64L2.4 21.6l5.157-1.189a9.57 9.57 0 0 0 4.446 1.096c5.298 0 9.607-4.309 9.607-9.607 0-5.298-4.309-9.607-9.607-9.607Zm-.9 5.4 4.8 3.2-4.8 3.2V7.796Z" />
      ) : (
        <>
          <path d="M12.003 2.396c-5.298 0-9.607 4.309-9.607 9.607 0 1.683.433 3.263 1.193 4.64L2.4 21.6l5.157-1.189a9.57 9.57 0 0 0 4.446 1.096c5.298 0 9.607-4.309 9.607-9.607 0-5.298-4.309-9.607-9.607-9.607Z" />
          <path d="m10.5 8.2 5.5 3.7-5.5 3.7V8.2Z" />
        </>
      )}
    </svg>
  ),
);
IgDirect.displayName = 'IgDirect';

export const IgUser = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <>
          <circle cx="12" cy="8.25" r="4.25" />
          <path d="M4.5 20.5c0-4.1 3.4-6.75 7.5-6.75s7.5 2.65 7.5 6.75" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8.25" r="4" />
          <path d="M5 20.5c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
        </>
      )}
    </svg>
  ),
);
IgUser.displayName = 'IgUser';

export const IgGrid = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1" />
    </svg>
  ),
);
IgGrid.displayName = 'IgGrid';

/* ---------- Chrome / utility icons ---------- */

/** Activity / notifications (IG top-bar heart — outline or filled). */
export const IgActivity = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938z" />
    </svg>
  ),
);
IgActivity.displayName = 'IgActivity';

export const IgBell = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      ) : (
        <>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      )}
    </svg>
  ),
);
IgBell.displayName = 'IgBell';

export const IgSettings = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="3.25" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
);
IgSettings.displayName = 'IgSettings';

type ChevronProps = IconProps & { direction?: 'left' | 'right' | 'down' | 'up' };

export const IgChevron = React.forwardRef<SVGSVGElement, ChevronProps>(
  ({ direction = 'down', strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {direction === 'down' ? (
        <path d="M6 9l6 6 6-6" />
      ) : direction === 'up' ? (
        <path d="M18 15l-6-6-6 6" />
      ) : direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  ),
);
IgChevron.displayName = 'IgChevron';

export const IgClose = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
);
IgClose.displayName = 'IgClose';

export const IgCamera = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
);
IgCamera.displayName = 'IgCamera';

export const IgGallery = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
);
IgGallery.displayName = 'IgGallery';

export const IgInfo = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
);
IgInfo.displayName = 'IgInfo';

export const IgVideoCall = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M23 7l-7 5 7 5V7Z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
);
IgVideoCall.displayName = 'IgVideoCall';

export const IgPlus = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
);
IgPlus.displayName = 'IgPlus';

export const IgMoon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  ),
);
IgMoon.displayName = 'IgMoon';

export const IgSun = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
);
IgSun.displayName = 'IgSun';

export const IgCheck = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
);
IgCheck.displayName = 'IgCheck';

export const IgCheckDouble = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7 7-3-3" />
    </svg>
  ),
);
IgCheckDouble.displayName = 'IgCheckDouble';

export const IgSliders = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
);
IgSliders.displayName = 'IgSliders';

export const IgPhone = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  ),
);
IgPhone.displayName = 'IgPhone';

export const IgPlay = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
);
IgPlay.displayName = 'IgPlay';

export const IgVolume = React.forwardRef<SVGSVGElement, IconProps & { muted?: boolean }>(
  ({ muted, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
      )}
    </svg>
  ),
);
IgVolume.displayName = 'IgVolume';

export const IgArrowBack = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
);
IgArrowBack.displayName = 'IgArrowBack';

export const IgCopy = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
);
IgCopy.displayName = 'IgCopy';

export const IgSend = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
);
IgSend.displayName = 'IgSend';

export const IgMic = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
);
IgMic.displayName = 'IgMic';

export const IgTrash = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
);
IgTrash.displayName = 'IgTrash';

export const IgEye = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
);
IgEye.displayName = 'IgEye';

export const IgExternalLink = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
);
IgExternalLink.displayName = 'IgExternalLink';

export const IgPencil = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
);
IgPencil.displayName = 'IgPencil';

export const IgLogout = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
);
IgLogout.displayName = 'IgLogout';

export const IgFlag = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
);
IgFlag.displayName = 'IgFlag';

export const IgBlock = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
);
IgBlock.displayName = 'IgBlock';

export const IgRotate = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
);
IgRotate.displayName = 'IgRotate';

export const IgHelp = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
);
IgHelp.displayName = 'IgHelp';

export const IgShield = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  ),
);
IgShield.displayName = 'IgShield';

export const IgLock = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
);
IgLock.displayName = 'IgLock';

export const IgWallet = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15V7H3Z" />
    </svg>
  ),
);
IgWallet.displayName = 'IgWallet';

export const IgPin = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  ),
);
IgPin.displayName = 'IgPin';

export const IgLayers = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
);
IgLayers.displayName = 'IgLayers';
