/**
 * A small helper for building the page's elements in code, so the structure
 * reads like the HTML it makes.
 */

/** Attribute values: a string sets the attribute, true sets it empty, false or undefined leaves it out. */
export type Attributes = Record<string, string | boolean | undefined>;

/**
 * Creates an element with attributes and children. Strings become text
 * nodes, so text is never parsed as HTML.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue;
    element.setAttribute(name, value === true ? '' : value);
  }
  element.append(...children);
  return element;
}
