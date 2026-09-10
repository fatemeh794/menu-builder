/** Generic, restaurant-agnostic photo per common ingredient keyword, used
 * by the build-your-own builder so ingredient cards look like real food
 * without requiring every restaurant to upload a photo of "lettuce"
 * themselves. Free, keyword-matched stock photography (loremflickr.com);
 * falls back to a food emoji when nothing matches. */
interface IconEntry {
  keywords: string[];
  url: string;
  emoji: string;
}

const ICONS: IconEntry[] = [
  { keywords: ['whole wheat', 'wheat', 'سبوس'], url: 'https://loremflickr.com/300/300/wholewheat,bread?lock=8', emoji: '🍞' },
  { keywords: ['gluten', 'گلوتن'], url: 'https://loremflickr.com/300/300/glutenfree,bread?lock=6', emoji: '🍞' },
  { keywords: ['regular', 'bun', 'bread', 'معمولی', 'نان'], url: 'https://loremflickr.com/300/300/bread,bun?lock=12', emoji: '🍞' },
  { keywords: ['garlic mayo', 'aioli', 'سس سیر', 'سیر'], url: 'https://loremflickr.com/300/300/aioli,sauce?lock=2', emoji: '🥣' },
  { keywords: ['spicy', 'hot sauce', 'تند'], url: 'https://loremflickr.com/300/300/hotsauce?lock=21', emoji: '🌶️' },
  { keywords: ['bbq', 'باربیکیو'], url: 'https://loremflickr.com/300/300/bbqsauce?lock=7', emoji: '🍖' },
  { keywords: ['ketchup', 'tomato sauce', 'کچاپ'], url: 'https://loremflickr.com/300/300/tomatosauce,condiment?lock=4', emoji: '🍅' },
  { keywords: ['mayo', 'مایونز'], url: 'https://loremflickr.com/300/300/aioli,sauce?lock=2', emoji: '🥣' },
  { keywords: ['tomato', 'گوجه'], url: 'https://loremflickr.com/300/300/tomato,fresh?lock=31', emoji: '🍅' },
  { keywords: ['lettuce', 'salad', 'greens', 'کاهو', 'سالاد'], url: 'https://loremflickr.com/300/300/lettuce,salad?lock=23', emoji: '🥬' },
  { keywords: ['cheese', 'mozzarella', 'cheddar', 'parmesan', 'پنیر', 'موزارلا', 'پارمزان'], url: 'https://loremflickr.com/300/300/cheese,food?lock=17', emoji: '🧀' },
  { keywords: ['chicken', 'مرغ'], url: 'https://loremflickr.com/300/300/grilledchicken?lock=11', emoji: '🍗' },
  { keywords: ['rice', 'برنج'], url: 'https://loremflickr.com/300/300/steamedrice?lock=13', emoji: '🍚' },
];

const FALLBACK_EMOJI = '🍽️';

export function ingredientImageUrl(name: string): string | null {
  const lower = name.toLowerCase();
  const match = ICONS.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  return match?.url ?? null;
}

export function ingredientEmoji(name: string): string {
  const lower = name.toLowerCase();
  const match = ICONS.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  return match?.emoji ?? FALLBACK_EMOJI;
}
