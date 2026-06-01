'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

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
  ({ filled, strokeWidth, className, title, ...rest }, ref) =>
    filled ? (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="rgb(255, 48, 64)"
        className={cn(className)}
        aria-hidden
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z" />
      </svg>
    ) : (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        className={cn(className)}
        aria-hidden
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" />
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
  ({ filled, strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(filled, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z" />
      ) : (
        <path
          d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      )}
    </svg>
  ),
);
IgHome.displayName = 'IgHome';

/** IG search — active state uses bolder stroke (search-solid), not a filled shape. */
export const IgSearch = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth = 2, className, title, ...rest }, ref) => {
    const sw = filled ? 3 : strokeWidth;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(className)}
        aria-hidden
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {filled ? (
          <>
            <path d="M18.5 10.5a8 8 0 1 1-8-8 8 8 0 0 1 8 8Z" />
            <line x1="16.511" x2="21.643" y1="16.511" y2="21.643" />
          </>
        ) : (
          <>
            <path d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z" />
            <line x1="16.511" x2="22" y1="16.511" y2="22" />
          </>
        )}
      </svg>
    );
  },
);
IgSearch.displayName = 'IgSearch';

/** IG explore / compass tab icon. */
export const IgExplore = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth = 2, className, title, ...rest }, ref) =>
    filled ? (
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
        <path d="m13.173 13.164 1.491-3.829-3.83 1.49ZM12.001.5a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12.001.5Zm5.35 7.443-2.478 6.369a1 1 0 0 1-.57.569l-6.36 2.47a1 1 0 0 1-1.294-1.294l2.48-6.369a1 1 0 0 1 .57-.569l6.359-2.47a1 1 0 0 1 1.294 1.294Z" />
      </svg>
    ) : (
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
        <polygon
          points="13.941 13.953 7.581 16.424 10.06 10.056 16.42 7.585 13.941 13.953"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <polygon fillRule="evenodd" points="10.06 10.056 13.949 13.945 7.581 16.424 10.06 10.056" />
        <circle
          cx="12.001"
          cy="12.005"
          r="10.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
);
IgExplore.displayName = 'IgExplore';

export const IgCreate = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg ref={ref} {...baseProps(false, strokeWidth, className)} {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M2 12v3.45c0 2.849.698 4.005 1.606 4.944.94.909 2.098 1.608 4.946 1.608h6.896c2.848 0 4.006-.7 4.946-1.608C21.302 19.455 22 18.3 22 15.45V8.552c0-2.849-.698-4.006-1.606-4.945C19.454 2.7 18.296 2 15.448 2H8.552c-2.848 0-4.006.699-4.946 1.607C2.698 4.547 2 5.703 2 8.552Z" />
      <line x1="6.545" x2="17.455" y1="12.001" y2="12.001" />
      <line x1="12.003" x2="12.003" y1="6.545" y2="17.455" />
    </svg>
  ),
);
IgCreate.displayName = 'IgCreate';

/** IG reels — 2026 rounded square + play (Figma UI Kit 4.0). */
export const IgReels = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.3086 0.0078125C17.4789 0.168429 20 2.78979 20 6V14L19.9922 14.3086C19.8367 17.3767 17.3767 19.8367 14.3086 19.9922L14 20H6C2.78979 20 0.168429 17.4789 0.0078125 14.3086L0 14V6C1.28855e-07 2.68629 2.68629 1.28851e-07 6 0H14L14.3086 0.0078125ZM8.59961 7.05762C8.34974 6.90468 8.04167 7.07428 8.00391 7.36523L8 7.42578V12.5742L8.00391 12.6348C8.03915 12.9063 8.30975 13.072 8.54883 12.9688L8.59961 12.9424L12.7998 10.3682C13.0665 10.2047 13.0665 9.79531 12.7998 9.63184L8.59961 7.05762Z"
        />
      ) : (
        <>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6 7.42578C6 5.75368 7.86447 4.26074 9.64551 5.35254L13.8457 7.92676L13.9854 8.01953C15.3382 8.97899 15.3382 11.021 13.9854 11.9805L13.8457 12.0732L9.64551 14.6475C7.86446 15.7393 6 14.2463 6 12.5742V7.42578ZM8.59961 7.05762C8.34974 6.90468 8.04167 7.07428 8.00391 7.36523L8 7.42578V12.5742L8.00391 12.6348C8.03915 12.9063 8.30975 13.072 8.54883 12.9688L8.59961 12.9424L12.7998 10.3682C13.0665 10.2047 13.0665 9.79531 12.7998 9.63184L8.59961 7.05762Z"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M14.3086 0.0078125C17.4789 0.168429 20 2.78979 20 6V14L19.9922 14.3086C19.8367 17.3767 17.3767 19.8367 14.3086 19.9922L14 20H6C2.78979 20 0.168429 17.4789 0.0078125 14.3086L0 14V6C1.28855e-07 2.68629 2.68629 1.28851e-07 6 0H14L14.3086 0.0078125ZM6 2C3.79086 2 2 3.79086 2 6V14C2 16.2091 3.79086 18 6 18H14C16.2091 18 18 16.2091 18 14V6C18 3.79086 16.2091 2 14 2H6Z"
          />
        </>
      )}
    </svg>
  ),
);
IgReels.displayName = 'IgReels';

/** IG share / DM — 2026 curved forward icon (Figma UI Kit 4.0). */
export const IgShare2026 = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20.6226 17.8587"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M6.74585 8.99951L12.7458 5.49951M6.74585 8.99951L8.17789 15.3005C8.57248 17.0367 10.8684 17.4306 11.8191 15.9253L19.3081 4.06801C20.1492 2.73627 19.1986 1 17.6234 1C13.8847 1 7.92095 1 3.00344 1C1.16437 1 0.303234 3.27309 1.6778 4.49486L6.74585 8.99951Z" />
    </svg>
  ),
);
IgShare2026.displayName = 'IgShare2026';

/** Reels rail — horizontal three-dot options (Figma UI Kit 4.0). */
export const IgOptions = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 13 3"
      fill="currentColor"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="1.5" cy="1.5" r="1.5" />
      <circle cx="6.5" cy="1.5" r="1.5" />
      <circle cx="11.5" cy="1.5" r="1.5" />
    </svg>
  ),
);
IgOptions.displayName = 'IgOptions';

/** Reels rail — music note icon. */
export const IgMusic = React.forwardRef<SVGSVGElement, IconProps>(
  ({ strokeWidth = 2, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
);
IgMusic.displayName = 'IgMusic';

export const IgDirect = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth = 1.739, className, title, ...rest }, ref) =>
    filled ? (
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
        <path d="M12.003 1.131a10.487 10.487 0 0 0-10.87 10.57 10.194 10.194 0 0 0 3.412 7.771l.054 1.78a1.67 1.67 0 0 0 2.342 1.476l1.935-.872a11.767 11.767 0 0 0 3.127.416 10.488 10.488 0 0 0 10.87-10.57 10.487 10.487 0 0 0-10.87-10.57Zm5.786 9.001-2.566 3.983a1.577 1.577 0 0 1-2.278.42l-2.452-1.84a.63.63 0 0 0-.759.002l-2.556 2.049a.659.659 0 0 1-.96-.874L8.783 9.89a1.576 1.576 0 0 1 2.277-.42l2.453 1.84a.63.63 0 0 0 .758-.003l2.556-2.05a.659.659 0 0 1 .961.874Z" />
      </svg>
    ) : (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeMiterlimit={10}
        className={cn(className)}
        aria-hidden
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <path d="M12.003 2.001a9.705 9.705 0 1 1 0 19.4 10.876 10.876 0 0 1-2.895-.384.798.798 0 0 0-.533.04l-1.984.876a.801.801 0 0 1-1.123-.708l-.054-1.78a.806.806 0 0 0-.27-.569 9.49 9.49 0 0 1-3.14-7.175 9.65 9.65 0 0 1 10-9.7Z" />
        <path
          d="M17.79 10.132a.659.659 0 0 0-.962-.873l-2.556 2.05a.63.63 0 0 1-.758.002L11.06 9.47a1.576 1.576 0 0 0-2.277.42l-2.567 3.98a.659.659 0 0 0 .961.875l2.556-2.049a.63.63 0 0 1 .759-.002l2.452 1.84a1.576 1.576 0 0 0 2.278-.42Z"
          fill="currentColor"
          fillRule="evenodd"
          stroke="none"
        />
      </svg>
    ),
);
IgDirect.displayName = 'IgDirect';

export const IgUser = React.forwardRef<SVGSVGElement, IconProps>(
  ({ filled, strokeWidth = 1.5, className, title, ...rest }, ref) =>
    filled ? (
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
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        />
      </svg>
    ) : (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(className)}
        aria-hidden
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <path d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
  ({ filled, className, title, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={cn(className)}
      aria-hidden
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {filled ? (
        <path d="M17.075 1.987a5.852 5.852 0 0 0-5.07 2.66l-.008.012-.01-.014a5.878 5.878 0 0 0-5.062-2.658A6.719 6.719 0 0 0 .5 8.952c0 3.514 2.581 5.757 5.077 7.927.302.262.607.527.91.797l1.089.973c2.112 1.89 3.149 2.813 3.642 3.133a1.438 1.438 0 0 0 1.564 0c.472-.306 1.334-1.07 3.755-3.234l.978-.874c.314-.28.631-.555.945-.827 2.478-2.15 5.04-4.372 5.04-7.895a6.719 6.719 0 0 0-6.425-6.965Z" />
      ) : (
        <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z" />
      )}
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
