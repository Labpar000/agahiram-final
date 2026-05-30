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
