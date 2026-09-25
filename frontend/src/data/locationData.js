import { siteConfig } from './siteConfig'

export const hostelLocation = {
  city: siteConfig.city,
  state: siteConfig.state,
  area: siteConfig.area,
  address: siteConfig.address,
  directionsUrl:
    'https://www.google.com/maps/search/?api=1&query=Hyderabad+Telangana',
  mapEmbedPlaceholder:
    'https://maps.google.com/maps?q=Hyderabad,Telangana&t=&z=13&ie=UTF8&iwloc=&output=embed',
}

export const nearbyPlaces = [
  {
    id: 'college',
    name: 'College / University',
    time: '10 min',
    desc: 'Close to major colleges and institutions',
    iconType: 'college',
  },
  {
    id: 'metro',
    name: 'Metro / Public Transport',
    time: '8 min',
    desc: 'Quick access to Hyderabad metro & bus routes',
    iconType: 'transit',
  },
  {
    id: 'hospital',
    name: 'Hospital / Healthcare',
    time: '5 min',
    desc: '24/7 clinics and multi-specialty hospitals nearby',
    iconType: 'hospital',
  },
  {
    id: 'supermarket',
    name: 'Supermarket & Stores',
    time: '3 min',
    desc: 'Convenience stores and groceries within walking distance',
    iconType: 'market',
  },
  {
    id: 'food',
    name: 'Restaurants & Food',
    time: '5 min',
    desc: 'Diners, cafes, and local eateries around the corner',
    iconType: 'food',
  },
]

export const contactInfo = {
  phone: siteConfig.phone,
  whatsapp: siteConfig.whatsapp,
  email: siteConfig.email,
  callUrl: siteConfig.callUrl,
  whatsappUrl: siteConfig.whatsappUrl,
  operatingHours: siteConfig.operatingHours,
  visitingHours: siteConfig.visitingHours,
}
