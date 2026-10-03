const STATES = [
  { name: 'Abia', capital: 'Umuahia', lat: 5.5320, lng: 7.4860 },
  { name: 'Adamawa', capital: 'Yola', lat: 9.2035, lng: 12.4954 },
  { name: 'Akwa Ibom', capital: 'Uyo', lat: 5.0377, lng: 7.9128 },
  { name: 'Anambra', capital: 'Awka', lat: 6.2100, lng: 7.0700 },
  { name: 'Bauchi', capital: 'Bauchi', lat: 10.3158, lng: 9.8442 },
  { name: 'Bayelsa', capital: 'Yenagoa', lat: 4.9267, lng: 6.2676 },
  { name: 'Benue', capital: 'Makurdi', lat: 7.7337, lng: 8.5214 },
  { name: 'Borno', capital: 'Maiduguri', lat: 11.8333, lng: 13.1500 },
  { name: 'Cross River', capital: 'Calabar', lat: 4.9757, lng: 8.3417 },
  { name: 'Delta', capital: 'Asaba', lat: 6.1980, lng: 6.7340 },
  { name: 'Ebonyi', capital: 'Abakaliki', lat: 6.3249, lng: 8.1137 },
  { name: 'Edo', capital: 'Benin City', lat: 6.3350, lng: 5.6037 },
  { name: 'Ekiti', capital: 'Ado-Ekiti', lat: 7.6211, lng: 5.2214 },
  { name: 'Enugu', capital: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { name: 'FCT', capital: 'Abuja', lat: 9.0765, lng: 7.3986 },
  { name: 'Gombe', capital: 'Gombe', lat: 10.2897, lng: 11.1673 },
  { name: 'Imo', capital: 'Owerri', lat: 5.4836, lng: 7.0333 },
  { name: 'Jigawa', capital: 'Dutse', lat: 11.7560, lng: 9.3380 },
  { name: 'Kaduna', capital: 'Kaduna', lat: 10.5105, lng: 7.4165 },
  { name: 'Kano', capital: 'Kano', lat: 12.0022, lng: 8.5920 },
  { name: 'Katsina', capital: 'Katsina', lat: 12.9908, lng: 7.6018 },
  { name: 'Kebbi', capital: 'Birnin Kebbi', lat: 12.4539, lng: 4.1975 },
  { name: 'Kogi', capital: 'Lokoja', lat: 7.8023, lng: 6.7333 },
  { name: 'Kwara', capital: 'Ilorin', lat: 8.4966, lng: 4.5421 },
  { name: 'Lagos', capital: 'Ikeja', lat: 6.6018, lng: 3.3515 },
  { name: 'Nasarawa', capital: 'Lafia', lat: 8.4939, lng: 8.5153 },
  { name: 'Niger', capital: 'Minna', lat: 9.6139, lng: 6.5569 },
  { name: 'Ogun', capital: 'Abeokuta', lat: 7.1475, lng: 3.3619 },
  { name: 'Ondo', capital: 'Akure', lat: 7.2571, lng: 5.2058 },
  { name: 'Osun', capital: 'Osogbo', lat: 7.7827, lng: 4.5418 },
  { name: 'Oyo', capital: 'Ibadan', lat: 7.3775, lng: 3.9470 },
  { name: 'Plateau', capital: 'Jos', lat: 9.8965, lng: 8.8583 },
  { name: 'Rivers', capital: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { name: 'Sokoto', capital: 'Sokoto', lat: 13.0059, lng: 5.2476 },
  { name: 'Taraba', capital: 'Jalingo', lat: 8.8937, lng: 11.3596 },
  { name: 'Yobe', capital: 'Damaturu', lat: 11.7470, lng: 11.9608 },
  { name: 'Zamfara', capital: 'Gusau', lat: 12.1704, lng: 6.6641 }
].map(s => ({
  ...s,
  slug: s.name.toLowerCase().replace(/\s+/g, '-')   // 'cross-river', 'akwa-ibom', 'fct'
}));

const getStateBySlug = (slug) =>
  STATES.find(s => s.slug === String(slug).toLowerCase());

module.exports = { STATES, getStateBySlug };