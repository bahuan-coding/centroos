/**
 * Canonical XML 1.0 (C14N) Implementation
 * 
 * W3C Specification: https://www.w3.org/TR/xml-c14n/
 * 
 * This module implements the Canonical XML algorithm required for XMLDSig.
 * The canonicalization ensures XML documents produce identical byte sequences
 * for equivalent logical structures.
 */

interface XmlNode {
  type: 'element' | 'text' | 'comment' | 'pi' | 'cdata';
  name?: string;
  attributes?: Map<string, string>;
  namespaces?: Map<string, string>;
  children?: XmlNode[];
  value?: string;
}

interface ParseContext {
  pos: number;
  xml: string;
  namespaceStack: Map<string, string>[];
}

/**
 * Normalize line endings to LF (C14N requirement)
 */
function normalizeLineEndings(xml: string): string {
  return xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Normalize attribute value according to C14N
 * - Replace special characters with entity references
 * - Normalize whitespace
 */
function normalizeAttributeValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;');
}

/**
 * Normalize text content according to C14N
 * - Replace special characters with entity references
 */
function normalizeTextContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#xD;');
}

/**
 * Parse XML attributes from a tag string
 */
function parseAttributes(tagContent: string): { 
  attrs: Map<string, string>; 
  namespaces: Map<string, string>;
} {
  const attrs = new Map<string, string>();
  const namespaces = new Map<string, string>();
  
  // Match attribute patterns: name="value" or name='value'
  const attrRegex = /([a-zA-Z_][\w\-.:]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  
  while ((match = attrRegex.exec(tagContent)) !== null) {
    const name = match[1];
    const value = match[2] !== undefined ? match[2] : match[3];
    
    // Decode entities in parsed value
    const decodedValue = value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&amp;/g, '&');
    
    if (name === 'xmlns') {
      namespaces.set('', decodedValue);
    } else if (name.startsWith('xmlns:')) {
      namespaces.set(name.substring(6), decodedValue);
    } else {
      attrs.set(name, decodedValue);
    }
  }
  
  return { attrs, namespaces };
}

/**
 * Parse XML element name
 */
function parseElementName(tagContent: string): string {
  const match = tagContent.match(/^([a-zA-Z_][\w\-.:]*)/);
  return match ? match[1] : '';
}

/**
 * Simple XML parser that builds a node tree
 */
function parseXml(xml: string): XmlNode | null {
  const normalized = normalizeLineEndings(xml);
  const ctx: ParseContext = {
    pos: 0,
    xml: normalized,
    namespaceStack: [new Map()]
  };
  
  // Skip XML declaration
  if (ctx.xml.startsWith('<?xml')) {
    const end = ctx.xml.indexOf('?>');
    if (end !== -1) {
      ctx.pos = end + 2;
    }
  }
  
  // Skip whitespace
  while (ctx.pos < ctx.xml.length && /\s/.test(ctx.xml[ctx.pos])) {
    ctx.pos++;
  }
  
  return parseElement(ctx);
}

/**
 * Parse an XML element and its children
 */
function parseElement(ctx: ParseContext): XmlNode | null {
  // Skip whitespace
  while (ctx.pos < ctx.xml.length && /\s/.test(ctx.xml[ctx.pos])) {
    ctx.pos++;
  }
  
  if (ctx.pos >= ctx.xml.length) return null;
  
  // Check for element start
  if (ctx.xml[ctx.pos] !== '<') {
    // Parse text content
    const textEnd = ctx.xml.indexOf('<', ctx.pos);
    const text = textEnd === -1 
      ? ctx.xml.substring(ctx.pos)
      : ctx.xml.substring(ctx.pos, textEnd);
    
    ctx.pos = textEnd === -1 ? ctx.xml.length : textEnd;
    
    if (text.trim()) {
      return { type: 'text', value: text };
    }
    return null;
  }
  
  // Check for comment
  if (ctx.xml.substring(ctx.pos, ctx.pos + 4) === '<!--') {
    const end = ctx.xml.indexOf('-->', ctx.pos);
    if (end !== -1) {
      ctx.pos = end + 3;
    }
    return null; // Comments are excluded in C14N (unless with-comments)
  }
  
  // Check for CDATA
  if (ctx.xml.substring(ctx.pos, ctx.pos + 9) === '<![CDATA[') {
    const end = ctx.xml.indexOf(']]>', ctx.pos);
    if (end !== -1) {
      const content = ctx.xml.substring(ctx.pos + 9, end);
      ctx.pos = end + 3;
      return { type: 'text', value: content };
    }
    return null;
  }
  
  // Check for processing instruction
  if (ctx.xml.substring(ctx.pos, ctx.pos + 2) === '<?') {
    const end = ctx.xml.indexOf('?>', ctx.pos);
    if (end !== -1) {
      ctx.pos = end + 2;
    }
    return null; // PIs are excluded
  }
  
  // Check for closing tag
  if (ctx.xml.substring(ctx.pos, ctx.pos + 2) === '</') {
    return null;
  }
  
  // Parse opening tag
  const tagEnd = ctx.xml.indexOf('>', ctx.pos);
  if (tagEnd === -1) return null;
  
  const tagContent = ctx.xml.substring(ctx.pos + 1, tagEnd);
  const isSelfClosing = tagContent.endsWith('/');
  const cleanTagContent = isSelfClosing ? tagContent.slice(0, -1) : tagContent;
  
  const name = parseElementName(cleanTagContent);
  const { attrs, namespaces } = parseAttributes(cleanTagContent);
  
  // Push namespace context
  const currentNs = new Map(ctx.namespaceStack[ctx.namespaceStack.length - 1]);
  namespaces.forEach((value, key) => currentNs.set(key, value));
  ctx.namespaceStack.push(currentNs);
  
  const node: XmlNode = {
    type: 'element',
    name,
    attributes: attrs,
    namespaces,
    children: []
  };
  
  ctx.pos = tagEnd + 1;
  
  if (!isSelfClosing) {
    // Parse children
    while (ctx.pos < ctx.xml.length) {
      // Check for closing tag
      const closingTag = `</${name}`;
      if (ctx.xml.substring(ctx.pos, ctx.pos + closingTag.length) === closingTag) {
        const closeEnd = ctx.xml.indexOf('>', ctx.pos);
        if (closeEnd !== -1) {
          ctx.pos = closeEnd + 1;
        }
        break;
      }
      
      const child = parseElement(ctx);
      if (child) {
        node.children!.push(child);
      } else if (ctx.xml[ctx.pos] !== '<') {
        // Parse remaining text
        const textEnd = ctx.xml.indexOf('<', ctx.pos);
        if (textEnd !== -1) {
          const text = ctx.xml.substring(ctx.pos, textEnd);
          if (text) {
            node.children!.push({ type: 'text', value: text });
          }
          ctx.pos = textEnd;
        } else {
          break;
        }
      } else if (ctx.xml.substring(ctx.pos, ctx.pos + 2) === '</') {
        // Closing tag of current or parent element
        break;
      } else {
        // Skip unknown content
        ctx.pos++;
      }
    }
  }
  
  // Pop namespace context
  ctx.namespaceStack.pop();
  
  return node;
}

/**
 * Sort attributes according to C14N rules:
 * 1. Namespace declarations first, sorted by prefix
 * 2. Then regular attributes sorted by namespace URI, then local name
 */
function sortAttributes(
  attrs: Map<string, string>,
  namespaces: Map<string, string>
): { name: string; value: string }[] {
  const result: { name: string; value: string }[] = [];
  
  // Add namespace declarations (sorted by prefix)
  const nsPrefixes = Array.from(namespaces.keys()).sort((a, b) => {
    // Default namespace comes first
    if (a === '') return -1;
    if (b === '') return 1;
    return a.localeCompare(b);
  });
  
  for (const prefix of nsPrefixes) {
    const uri = namespaces.get(prefix)!;
    const name = prefix === '' ? 'xmlns' : `xmlns:${prefix}`;
    result.push({ name, value: uri });
  }
  
  // Add regular attributes (sorted by namespace URI then local name)
  const attrEntries = Array.from(attrs.entries()).sort((a, b) => {
    // For now, simple lexicographic sort by name
    // Full C14N would sort by namespace URI first
    return a[0].localeCompare(b[0]);
  });
  
  for (const [name, value] of attrEntries) {
    result.push({ name, value });
  }
  
  return result;
}

/**
 * Serialize a node to canonical XML string
 */
function serializeNode(
  node: XmlNode,
  inheritedNamespaces: Map<string, string>
): string {
  if (node.type === 'text') {
    return normalizeTextContent(node.value || '');
  }
  
  if (node.type !== 'element') {
    return '';
  }
  
  // Build new namespace context
  const visibleNamespaces = new Map<string, string>();
  
  // Only include namespaces that are new or different from inherited
  if (node.namespaces) {
    node.namespaces.forEach((uri, prefix) => {
      const inherited = inheritedNamespaces.get(prefix);
      if (inherited !== uri) {
        visibleNamespaces.set(prefix, uri);
      }
    });
  }
  
  // Merge for children
  const childNamespaces = new Map(inheritedNamespaces);
  if (node.namespaces) {
    node.namespaces.forEach((uri, prefix) => childNamespaces.set(prefix, uri));
  }
  
  // Sort and serialize attributes
  const sortedAttrs = sortAttributes(
    node.attributes || new Map(),
    visibleNamespaces
  );
  
  let result = `<${node.name}`;
  
  for (const attr of sortedAttrs) {
    result += ` ${attr.name}="${normalizeAttributeValue(attr.value)}"`;
  }
  
  result += '>';
  
  // Serialize children
  if (node.children) {
    for (const child of node.children) {
      result += serializeNode(child, childNamespaces);
    }
  }
  
  result += `</${node.name}>`;
  
  return result;
}

/**
 * Canonicalize XML document according to C14N 1.0
 * 
 * @param xml - The XML string to canonicalize
 * @returns Canonical XML string
 */
export function canonicalize(xml: string): string {
  const root = parseXml(xml);
  if (!root) {
    throw new Error('Failed to parse XML for canonicalization');
  }
  
  return serializeNode(root, new Map());
}

/**
 * Remove the Signature element from XML (for DigestValue calculation)
 * The enveloped signature transform removes the Signature element
 */
export function removeSignatureElement(xml: string): string {
  // Remove entire Signature element (with namespace prefix handling)
  return xml
    .replace(/<(?:ds:)?Signature[^>]*>[\s\S]*?<\/(?:ds:)?Signature>/gi, '')
    .replace(/<Signature\s+xmlns="[^"]*"[^>]*>[\s\S]*?<\/Signature>/gi, '');
}

/**
 * Apply enveloped signature transform + C14N
 * This is the standard transform chain for XMLDSig
 */
export function applyTransforms(xml: string): string {
  const withoutSignature = removeSignatureElement(xml);
  return canonicalize(withoutSignature);
}

/**
 * Canonicalize just the SignedInfo element
 * This is needed before calculating the signature value
 */
export function canonicalizeSignedInfo(signedInfoXml: string): string {
  return canonicalize(signedInfoXml);
}




