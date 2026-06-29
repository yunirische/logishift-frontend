import React from "react";

type BrandLogoVariant = "light" | "dark";
type BrandLogoOrientation = "horizontal" | "vertical";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  orientation?: BrandLogoOrientation;
  className?: string;
  imageClassName?: string;
}

const SOURCES: Record<BrandLogoVariant, Record<BrandLogoOrientation, string>> = {
  light: {
    horizontal: "/brand/logo_light_transparent.png",
    vertical: "/brand/logo_light_verical.png",
  },
  dark: {
    horizontal: "/brand/logo_dark_transparent.png",
    vertical: "/brand/logo_light_verical.png",
  },
};

const DIMENSIONS: Record<
  BrandLogoVariant,
  Record<BrandLogoOrientation, { width: number; height: number }>
> = {
  light: {
    horizontal: { width: 1386, height: 426 },
    vertical: { width: 1254, height: 1254 },
  },
  dark: {
    horizontal: { width: 1377, height: 417 },
    vertical: { width: 1254, height: 1254 },
  },
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "light",
  orientation = "horizontal",
  className = "",
  imageClassName = "",
}) => {
  const dimensions = DIMENSIONS[variant][orientation];

  return (
    <div className={className}>
      <img
        src={SOURCES[variant][orientation]}
        alt="LogiShift Контроль смен"
        width={dimensions.width}
        height={dimensions.height}
        className={imageClassName}
        decoding="async"
      />
    </div>
  );
};

export default BrandLogo;
