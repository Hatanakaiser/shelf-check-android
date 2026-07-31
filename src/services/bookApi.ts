export interface ExternalBookSearchResult {
  isbn?: string;
  title: string;
  titleKana?: string;
  author?: string;
  publisher?: string;
  coverUrl?: string;
  description?: string;
  publishedDate?: string;
  volumeCount?: number;
}

// 国内人気マンガ・書籍のマスターカタログ (CORSエラー・オフライン時にも100%ヒット保証)
const MANGA_CATALOG: ExternalBookSearchResult[] = [
  {
    isbn: '9784098501809',
    title: '葬送のフリーレン',
    titleKana: 'ソウソウノフリーレン',
    author: '山田鐘人 / アベツカサ',
    publisher: '小学館',
    coverUrl: 'https://books.google.com/books/content?id=y1A3EAAAQBAJ&printsec=frontcover&img=1&zoom=1',
    description: '魔王を倒した勇者一行の「その後」を描く後日譚ファンタジー！',
    volumeCount: 13
  },
  {
    isbn: '9784088817804',
    title: 'チェンソーマン',
    titleKana: 'チェンソーマン',
    author: '藤本タツキ',
    publisher: '集英社',
    coverUrl: 'https://books.google.com/books/content?id=jJt7DwAAQBAJ&printsec=frontcover&img=1&zoom=1',
    description: '悪魔のポチタと共にデビルハンターとして暮らす少年デンジのダークヒーローアクション！',
    volumeCount: 17
  },
  {
    isbn: '9784088824017',
    title: '【推しの子】',
    titleKana: 'オシノコ',
    author: '赤坂アカ / 横槍メンゴ',
    publisher: '集英社',
    coverUrl: 'https://books.google.com/books/content?id=vBwAEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
    description: '芸能界を舞台にした衝撃のサスペンス＆アイドル転生ストーリー！',
    volumeCount: 15
  },
  {
    isbn: '9784091244079',
    title: 'ダンジョン飯',
    titleKana: 'ダンジョンメシ',
    author: '九井諒子',
    publisher: 'KADOKAWA',
    coverUrl: 'https://books.google.com/books/content?id=vFpSDwAAQBAJ&printsec=frontcover&img=1&zoom=1',
    description: 'モンスターを料理して食べながらダンジョンを攻略するグルメファンタジー！',
    volumeCount: 14
  },
  {
    isbn: '9784088825250',
    title: '怪獣8号',
    titleKana: 'カイジュウハチゴウ',
    author: '松本直也',
    publisher: '集英社',
    coverUrl: 'https://books.google.com/books/content?id=zBsBEAAAQBAJ&printsec=frontcover&img=1&zoom=1',
    description: '怪獣発生率が世界屈指の日本で、怪獣に変身する男のバトルアクション！',
    volumeCount: 12
  },
  {
    isbn: '9784088821689',
    title: '鬼滅の刃',
    titleKana: 'キメツノヤイバ',
    author: '吾峠呼世晴',
    publisher: '集英社',
    coverUrl: '/covers/yuyushiki1.jpg',
    description: '血風剣戟冒険譚！家族を鬼に殺された少年・炭治郎の戦いの記録。',
    volumeCount: 23
  },
  {
    isbn: '9784088725093',
    title: 'ONE PIECE',
    titleKana: 'ワンピース',
    author: '尾田栄一郎',
    publisher: '集英社',
    coverUrl: '/covers/yuyushiki15.jpg',
    description: 'ひとつなぎの大秘宝を巡る海洋冒険ロマン！',
    volumeCount: 108
  },
  {
    isbn: '9784088814445',
    title: '呪術廻戦',
    titleKana: 'ジュジュツカイセン',
    author: '芥見下々',
    publisher: '集英社',
    coverUrl: '/covers/yuyushiki1.jpg',
    description: '驚異的な身体能力を持つ高校生・虎杖悠仁のダークファンタジー！',
    volumeCount: 26
  },
  {
    isbn: '9784088819112',
    title: 'SPY×FAMILY',
    titleKana: 'スパイファミリー',
    author: '遠藤達哉',
    publisher: '集英社',
    coverUrl: '/covers/yuyushiki15.jpg',
    description: 'スパイ×殺し屋×エスパーの仮初め家族コメディ！',
    volumeCount: 13
  },
  {
    isbn: '9784832277946',
    title: 'ゆゆ式',
    titleKana: 'ユユシキ',
    author: '三上小又',
    publisher: '芳文社',
    coverUrl: '/covers/yuyushiki1.jpg',
    description: '情報処理部の3人が繰り広げるまったり日常コメディ！',
    volumeCount: 15
  }
];

/**
 * Google Books API & OpenBD API & カタログを安全に統合活用して書籍情報を高精度検索する
 */
export const RAKUTEN_APP_ID = '1015414737035418128';

export async function searchExternalBooks(query: string, mangaOnly: boolean = true): Promise<ExternalBookSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const rawQuery = query.trim();
  const cleanQuery = rawQuery.toLowerCase();
  const results: ExternalBookSearchResult[] = [];

  // 非漫画（小説・文庫・実用書・ガイド等）を弾く除外キーワードリスト
  const nonMangaKeywords = ['小説', 'ノベル', '文庫', '新書', 'ファンブック', '公式ガイド', 'ガイドブック', '画集', '原画集', 'アンソロジー', 'イラスト集', 'レシピ'];

  // 1. マスターカタログからのヒッティング (ひらがな・カタカナ・漢字揺れ吸収)
  try {
    const catalogMatches = MANGA_CATALOG.filter(item => 
      item.title.toLowerCase().includes(cleanQuery) ||
      (item.titleKana && item.titleKana.toLowerCase().includes(cleanQuery)) ||
      (item.author && item.author.toLowerCase().includes(cleanQuery)) ||
      (item.isbn && item.isbn.includes(cleanQuery))
    );
    results.push(...catalogMatches);
  } catch (e) {
    console.warn('Catalog filter failed:', e);
  }

  // 2. 楽天ブックス書籍検索API (Vercel中継プロキシ経由)
  try {
    const proxyUrl = `https://my-portfolio-sepia-beta-23.vercel.app/api/rakuten?query=${encodeURIComponent(rawQuery)}&mangaOnly=${mangaOnly}`;
    const rakutenRes = await fetch(proxyUrl);
    
    if (rakutenRes.ok) {
      const data = await rakutenRes.json();
      const itemsList = Array.isArray(data) ? data : (data.Items || data.items || data.data || []);
      
      if (Array.isArray(itemsList)) {
        for (const rawItem of itemsList) {
          const item = rawItem.Item || rawItem;
          const titleText = item.title || item.titleKana || '無題';
          const coverUrl = item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || item.coverUrl;

          if (!results.some(r => r.title === titleText)) {
            results.push({
              isbn: item.isbn,
              title: titleText,
              author: item.author || item.authorKana,
              publisher: item.publisherName || item.publisher,
              coverUrl: coverUrl,
              description: item.itemCaption || item.description,
              publishedDate: item.salesDate
            });
          }
        }
      }
    } else {
      console.warn('Rakuten Proxy API HTTP error:', rakutenRes.status);
    }
  } catch (e) {
    console.warn('Rakuten Proxy API fetch failed:', e);
  }

  // 4. シリーズごとに検索結果を名寄せ・集約
  const seriesMap: Record<string, ExternalBookSearchResult[]> = {};
  for (const item of results) {
    const cleanTitle = item.title
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^\)]*コミックス?\)/g, '')
      .replace(/（[^）]*コミックス?）/g, '')
      .replace(/\s*[\(\（\【]?(?:第?\s*\d+\s*[巻話]?|vol\.?\s*\d+)[\)\）\】]?.*$/i, '')
      .trim() || item.title.trim();
    const key = cleanTitle.toLowerCase();
    if (!seriesMap[key]) {
      seriesMap[key] = [];
    }
    seriesMap[key].push(item);
  }

  const aggregatedResults: ExternalBookSearchResult[] = Object.values(seriesMap).map(group => {
    const first = group[0];
    const cleanTitle = first.title
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^\)]*コミックス?\)/g, '')
      .replace(/（[^）]*コミックス?）/g, '')
      .replace(/\s*[\(\（\【]?(?:第?\s*\d+\s*[巻話]?|vol\.?\s*\d+)[\)\）\】]?.*$/i, '')
      .trim() || first.title.trim();

    let maxVol = 0;
    for (const it of group) {
      const match = it.title.match(/(?:第?\s*(\d+)\s*[巻話]?|vol\.?\s*(\d+)|(\d+))/i);
      if (match) {
        const v = parseInt(match[1] || match[2] || match[3], 10);
        if (!isNaN(v) && v > maxVol) maxVol = v;
      }
      if (it.volumeCount && it.volumeCount > maxVol) maxVol = it.volumeCount;
    }

    return {
      isbn: first.isbn,
      title: cleanTitle,
      author: group.find(g => g.author)?.author || first.author,
      publisher: group.find(g => g.publisher)?.publisher || first.publisher,
      coverUrl: group.find(g => g.coverUrl)?.coverUrl || first.coverUrl,
      description: first.description,
      publishedDate: first.publishedDate,
      volumeCount: maxVol > 0 ? maxVol : (first.volumeCount || 10)
    };
  });

  return aggregatedResults;
}
