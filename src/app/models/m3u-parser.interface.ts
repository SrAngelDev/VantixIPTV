/**
 * Representa un canal parseado desde un archivo M3U
 */
export interface M3UChannel {
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  groupTitle?: string;
  name: string;
  url: string;
  duration?: number;
}

/**
 * Resultado del parseo de un archivo M3U
 */
export interface M3UParseResult {
  channels: M3UChannel[];
  categories: string[];
  totalChannels: number;
  parseErrors?: string[];
}

/**
 * Atributos de EXTINF en formato M3U
 */
export interface ExtinfAttributes {
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  groupTitle?: string;
  duration: number;
  title: string;
}
