'use client';

import * as React from 'react';
import { baseProps } from './shared';
import type { IconProps } from './types';

export const IgStickers = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5L2.5 7.5c-.3.3-.5.7-.5 1.1v12.8c0 .6.4 1 1 1h12.8c.4 0 .8-.2 1.1-.5l5.5-5.5c.3-.3.5-.7.5-1.1V8.6c0-.4-.2-.8-.5-1.1L16.6 2.5c-.3-.3-.7-.5-1.1-.5Z" />
      <path d="M15 2v5c0 .6.4 1 1 1h5" />
    </svg>
  ),
);
IgStickers.displayName = 'IgStickers';

export const IgText = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
);
IgText.displayName = 'IgText';

export const IgPicture = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
);
IgPicture.displayName = 'IgPicture';

export const IgLayoutGrid = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
);
IgLayoutGrid.displayName = 'IgLayoutGrid';

export const IgGrid2x2 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
);
IgGrid2x2.displayName = 'IgGrid2x2';

export const IgImagePlus = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
);
IgImagePlus.displayName = 'IgImagePlus';
