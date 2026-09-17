// Unsplash photos (free license, hotlinked). No photo upload feature exists
// yet, so cards show a category/cause-matched stock photo instead of a real
// business or nonprofit photo — a placeholder, not real data.
function unsplash(id) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&h=420&q=70`;
}

const CATEGORY_PHOTOS = {
  "Food and beverage": unsplash("1631692994621-d26f83cf4db8"),
  Restaurant: unsplash("1631692992353-7b7d14640294"),
  Beverage: unsplash("1761839257664-ecba169506c1"),
  Retail: unsplash("1595991209266-5ff5a3a2f008"),
  Wellness: unsplash("1761971975962-9cc397e2ba2a"),
  Services: unsplash("1571624436279-b272aff752b5"),
  Venue: unsplash("1768851142332-75f3d1b47452"),
  "Local media": unsplash("1624269305548-1527ef905ff6"),
};
const CATEGORY_FALLBACK = unsplash("1571974448718-ac26a9af7d8b");

const CAUSE_PHOTOS = {
  Education: unsplash("1577896851231-70ef18881754"),
  Youth: unsplash("1581726707445-75cbe4efc586"),
  Health: unsplash("1774979161296-bb930552543a"),
  Arts: unsplash("1589488766611-08aad2021d8b"),
  Community: unsplash("1628717341663-0007b0ee2597"),
  "Food access": unsplash("1631692994321-600075e7fb1a"),
  "Workforce development": unsplash("1758691736433-4078b93abd72"),
};
const CAUSE_FALLBACK = unsplash("1628717341663-0007b0ee2597");

export function businessPhoto(business) {
  return CATEGORY_PHOTOS[business?.category] || CATEGORY_FALLBACK;
}

export function requestPhoto(request) {
  return CAUSE_PHOTOS[request?.causeArea] || CAUSE_FALLBACK;
}

export const HERO_PHOTO = unsplash("1628717341663-0007b0ee2597");
