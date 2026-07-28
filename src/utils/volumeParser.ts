export function parseVolumeSortKey(volumeStr: string): number {
  if (!volumeStr) return 0;
  
  const trimmed = volumeStr.trim();
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num;
  }

  const matchFloat = trimmed.match(/^(\d+(?:\.\d+)?)/);
  if (matchFloat) {
    return parseFloat(matchFloat[1]);
  }

  if (trimmed.includes('0') || trimmed === '零' || trimmed === 'ゼロ') return 0;
  if (trimmed.includes('上')) return 1001.0;
  if (trimmed.includes('中')) return 1002.0;
  if (trimmed.includes('下')) return 1003.0;
  if (trimmed.includes('外伝') || trimmed.includes('Ex') || trimmed.includes('EX')) return 2000.0;
  if (trimmed.includes('画集') || trimmed.includes('ファンブック')) return 3000.0;

  return 9999.0;
}
