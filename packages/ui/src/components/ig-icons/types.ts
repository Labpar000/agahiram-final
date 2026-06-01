import type * as React from 'react';

export type IconProps = React.SVGAttributes<SVGSVGElement> & {
  filled?: boolean;
  strokeWidth?: number | string;
  title?: string;
};

export type ChevronProps = IconProps & {
  direction?: 'left' | 'right' | 'down' | 'up';
};
