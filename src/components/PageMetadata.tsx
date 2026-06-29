import React, { useEffect } from "react";

type MetaProperty = {
  selector: string;
  tagName: "meta" | "link";
  attributes: Record<string, string>;
};

type PageMetadataProps = {
  title: string;
  meta: MetaProperty[];
  structuredData?: Array<Record<string, unknown>>;
};

type RestorableNode = {
  node: HTMLMetaElement | HTMLLinkElement;
  existed: boolean;
  previousAttributes: Record<string, string | null>;
};

const PageMetadata: React.FC<PageMetadataProps> = ({
  title,
  meta,
  structuredData = [],
}) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const restorableNodes: RestorableNode[] = meta.map(
      ({ selector, tagName, attributes }) => {
        const existingNode = document.head.querySelector(selector) as
          | HTMLMetaElement
          | HTMLLinkElement
          | null;
        const node = existingNode || document.createElement(tagName);
        const previousAttributes = Object.fromEntries(
          Object.keys(attributes).map((attribute) => [
            attribute,
            node.getAttribute(attribute),
          ])
        );

        Object.entries(attributes).forEach(([attribute, value]) => {
          node.setAttribute(attribute, value);
        });

        if (!existingNode) {
          document.head.appendChild(node);
        }

        return {
          node,
          existed: Boolean(existingNode),
          previousAttributes,
        };
      }
    );

    const scripts = structuredData.map((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(entry);
      script.dataset.pageMetadata = "landing";
      document.head.appendChild(script);
      return script;
    });

    return () => {
      document.title = previousTitle;

      restorableNodes.forEach(({ node, existed, previousAttributes }) => {
        if (!existed) {
          node.remove();
          return;
        }

        Object.entries(previousAttributes).forEach(([attribute, value]) => {
          if (value == null) {
            node.removeAttribute(attribute);
          } else {
            node.setAttribute(attribute, value);
          }
        });
      });

      scripts.forEach((script) => script.remove());
    };
  }, [meta, structuredData, title]);

  return null;
};

export default PageMetadata;
