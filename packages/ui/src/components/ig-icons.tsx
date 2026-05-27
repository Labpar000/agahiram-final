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
