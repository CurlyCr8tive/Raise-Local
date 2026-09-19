// Unsplash photos (free license, hotlinked). No photo upload feature exists
// yet, so cards show a stock photo instead of a real business or nonprofit
// photo — a placeholder, not real data. Each category/cause has a pool of
// several photos, and a specific entity (by id, falling back to name) always
// picks the same one deterministically — so two businesses in the same
// category never show the identical photo, but a given business's photo
// never changes across renders/reloads either.
function unsplash(id) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&h=420&q=70`;
}

// Stable, non-cryptographic string hash (djb2) used only to pick a pool index.
function hashKey(key) {
  let hash = 5381;
  const str = String(key || "");
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function pick(pool, key) {
  return pool[hashKey(key) % pool.length];
}

const CATEGORY_PHOTOS = {
  "Food and beverage": ["1474979266404-7eaacbcd87c5", "1707827914998-0d56ee13c161", "1690642109230-29a1cb675c47"].map(unsplash),
  Restaurant: ["1667388969250-1c7220bf3f37", "1613274554329-70f997f5789f", "1570560258879-af7f8e1447ac"].map(unsplash),
  Beverage: ["1695605302406-e51a7f0785ff", "1568906876615-5c36ba516a22", "1625495060866-c68afea67948"].map(unsplash),
  Retail: ["1441984904996-e0b6ba687e04", "1718985342149-7178154e0aee", "1521335629791-ce4aec67dd15"].map(unsplash),
  Wellness: ["1600334089648-b0d9d3028eb2", "1696841212541-449ca29397cc", "1630595271375-5073a6c0638b"].map(unsplash),
  Services: ["1535957998253-26ae1ef29506", "1560264280-88b68371db39", "1577412647305-991150c7d163"].map(unsplash),
  Venue: ["1759477274116-e3cb02d2b9d8", "1768851142332-75f3d1b47452", "1768851244529-39180171a168"].map(unsplash),
  "Local media": ["1504711434969-e33886168f5c", "1566378246598-5b11a0d486cc", "1624269305548-1527ef905ff6"].map(unsplash),
};
const CATEGORY_FALLBACK = ["1571974448718-ac26a9af7d8b", "1516321318423-f06f85e504b3", "1556740738-b6a63e27c4df"].map(unsplash);

const CAUSE_PHOTOS = {
  Education: ["1580582932707-520aed937b7b", "1577896851231-70ef18881754", "1581726707445-75cbe4efc586"].map(unsplash),
  Youth: ["1594913543505-e4fdd1d021e4", "1758525860435-502240649c59", "1758691462119-792279713969"].map(unsplash),
  Health: ["1774979161296-bb930552543a", "1759768313058-02218212c9f5", "1691341114517-e61d8e2e2298"].map(unsplash),
  Arts: ["1589488766611-08aad2021d8b", "1621379282411-62964e75a502", "1619286788462-6a0532701c9b"].map(unsplash),
  Community: ["1550096141-7263640aa48c", "1517457373958-b7bdd4587205", "1594971455405-4f20fb78c5f5"].map(unsplash),
  "Food access": ["1615897570582-285ffe259530", "1615897570286-da936a5dfb81", "1782423996504-b7d58b8f2440"].map(unsplash),
  "Workforce development": ["1758691736433-4078b93abd72", "1758691736722-cda1858056e0", "1758691736067-b309ee3ef7b9"].map(unsplash),
};
const CAUSE_FALLBACK = ["1628717341663-0007b0ee2597", "1517457373958-b7bdd4587205", "1550096141-7263640aa48c"].map(unsplash);

// Real business-supplied photos, keyed by id — checked before the stock pool.
const BUSINESS_PHOTO_OVERRIDES = {
  "biz-yamaas": "assets/yamaas-hero.png",
  "biz-eyeland-vibes": "assets/eyeland-vibes.webp",
  "biz-first-choice-brew": "assets/first-choice-brew.webp",
  "biz-sofia-grace": "assets/sofia-grace.png",
};

const REQUEST_PHOTO_OVERRIDES = {
  "request-young-excellence": "assets/young-excellence-society.png",
  "request-grove-park": "assets/grove-park-foundation.jpg",
  "request-unity-now": "assets/unity-now-supplied.png",
};

export function isBrandAsset(photo) {
  return ["assets/eyeland-vibes.webp", "assets/first-choice-brew.webp", "assets/grove-park-foundation.jpg", "assets/sofia-grace.png", "assets/unity-now-supplied.png"].includes(photo);
}

export function businessPhoto(business) {
  const override = BUSINESS_PHOTO_OVERRIDES[business?.id];
  if (override) return override;
  const pool = CATEGORY_PHOTOS[business?.category] || CATEGORY_FALLBACK;
  return pick(pool, business?.id || business?.name);
}

export function requestPhoto(request) {
  const override = REQUEST_PHOTO_OVERRIDES[request?.id];
  if (override) return override;
  const pool = CAUSE_PHOTOS[request?.causeArea] || CAUSE_FALLBACK;
  return pick(pool, request?.id || request?.organizationName);
}

export const HERO_PHOTO = unsplash("1628717341663-0007b0ee2597");
