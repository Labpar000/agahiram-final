'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { baseProps } from './shared';
import type { IconProps } from './types';

export const IgThreads = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M12 2C6.477 2 2 6.134 2 11.25c0 2.898 1.445 5.476 3.707 7.098L5 22l3.94-1.314A10.8 10.8 0 0 0 12 20.5c5.523 0 10-4.134 10-9.25S17.523 2 12 2Z" />
    </svg>
  ),
);
IgThreads.displayName = 'IgThreads';

export const IgTag = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
);
IgTag.displayName = 'IgTag';

export const IgAddUser = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  ),
);
IgAddUser.displayName = 'IgAddUser';

export const IgRepost = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
);
IgRepost.displayName = 'IgRepost';

export const IgLink = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
);
IgLink.displayName = 'IgLink';

export const IgMention = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  ),
);
IgMention.displayName = 'IgMention';

export const IgFilters = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  ),
);
IgFilters.displayName = 'IgFilters';

export const IgLocation = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  ),
);
IgLocation.displayName = 'IgLocation';

export const IgHashtag = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
);
IgHashtag.displayName = 'IgHashtag';

export const IgStar = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
);
IgStar.displayName = 'IgStar';

export const IgGift = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8s2.5-5 4.5-5a2.5 2.5 0 0 1 0 5H7.5Z" />
    </svg>
  ),
);
IgGift.displayName = 'IgGift';

export const IgShop = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
);
IgShop.displayName = 'IgShop';

export const IgMenu = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
);
IgMenu.displayName = 'IgMenu';

export const IgDownload = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
);
IgDownload.displayName = 'IgDownload';

export const IgPause = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
);
IgPause.displayName = 'IgPause';
