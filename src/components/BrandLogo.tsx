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
    horizontal: "/brand/logo_light.png",
    vertical: "/brand/logo_light_verical.png",
  },
  dark: {
    horizontal: "/brand/logo_dark.png",
    vertical: "/brand/logo_light_verical.png",
  },
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "light",
  orientation = "horizontal",
  className = "",
  imageClassName = "",
}) => {
  return (
    <div className={className}>
      <img
        src={SOURCES[variant][orientation]}
        alt="LogiShift Контроль смен"
        className={imageClassName}
        decoding="async"
      />
    </div>
  );
};

export default BrandLogo;
