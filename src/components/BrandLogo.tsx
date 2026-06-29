import React from "react";
import logoDarkHorizontal320Png from "../assets/brand/logo_dark_horizontal_320.png";
import logoDarkHorizontal320Webp from "../assets/brand/logo_dark_horizontal_320.webp";
import logoDarkHorizontal640Png from "../assets/brand/logo_dark_horizontal_640.png";
import logoDarkHorizontal640Webp from "../assets/brand/logo_dark_horizontal_640.webp";
import logoLightHorizontal320Png from "../assets/brand/logo_light_horizontal_320.png";
import logoLightHorizontal320Webp from "../assets/brand/logo_light_horizontal_320.webp";
import logoLightHorizontal640Png from "../assets/brand/logo_light_horizontal_640.png";
import logoLightHorizontal640Webp from "../assets/brand/logo_light_horizontal_640.webp";
import logoLightVertical from "../assets/brand/logo_light_vertical.png";

type BrandLogoVariant = "light" | "dark";
type BrandLogoOrientation = "horizontal" | "vertical";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  orientation?: BrandLogoOrientation;
  loading?: React.ImgHTMLAttributes<HTMLImageElement>["loading"];
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  imageClassName?: string;
}

const HORIZONTAL_SOURCES: Record<
  BrandLogoVariant,
  {
    webp320: string;
    webp640: string;
    png320: string;
    png640: string;
    width: number;
    height: number;
  }
> = {
  light: {
    webp320: logoLightHorizontal320Webp,
    webp640: logoLightHorizontal640Webp,
    png320: logoLightHorizontal320Png,
    png640: logoLightHorizontal640Png,
    width: 640,
    height: 197,
  },
  dark: {
    webp320: logoDarkHorizontal320Webp,
    webp640: logoDarkHorizontal640Webp,
    png320: logoDarkHorizontal320Png,
    png640: logoDarkHorizontal640Png,
    width: 640,
    height: 194,
  },
};

const DIMENSIONS: Record<
  BrandLogoVariant,
  Record<BrandLogoOrientation, { width: number; height: number }>
> = {
  light: {
    horizontal: { width: 640, height: 197 },
    vertical: { width: 1254, height: 1254 },
  },
  dark: {
    horizontal: { width: 640, height: 194 },
    vertical: { width: 1254, height: 1254 },
  },
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "light",
  orientation = "horizontal",
  loading = "eager",
  fetchPriority,
  className = "",
  imageClassName = "",
}) => {
  const dimensions = DIMENSIONS[variant][orientation];
  const fetchPriorityAttribute = fetchPriority
    ? ({ fetchpriority: fetchPriority } as Record<string, string>)
    : {};

  if (orientation === "horizontal") {
    const sources = HORIZONTAL_SOURCES[variant];

    return (
      <div className={className}>
        <picture>
          <source
            type="image/webp"
            srcSet={`${sources.webp320} 320w, ${sources.webp640} 640w`}
            sizes="(max-width: 640px) 216px, 272px"
          />
          <img
            src={sources.png640}
            srcSet={`${sources.png320} 320w, ${sources.png640} 640w`}
            sizes="(max-width: 640px) 216px, 272px"
            alt="LogiShift Контроль смен"
            width={sources.width}
            height={sources.height}
            className={imageClassName}
            loading={loading}
            decoding="async"
            {...fetchPriorityAttribute}
          />
        </picture>
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={logoLightVertical}
        alt="LogiShift Контроль смен"
        width={dimensions.width}
        height={dimensions.height}
        className={imageClassName}
        loading={loading}
        decoding="async"
        {...fetchPriorityAttribute}
      />
    </div>
  );
};

export default BrandLogo;
