// All 64 districts of Bangladesh with metadata for simulation
const DISTRICTS = [
  { name: "Barguna", division: "Barishal", lat: 22.15, lng: 90.12, population: 892781, baseInfectionRate: 0.032, healthcareCapacity: 0.45 },
  { name: "Barishal", division: "Barishal", lat: 22.70, lng: 90.37, population: 2324310, baseInfectionRate: 0.038, healthcareCapacity: 0.62 },
  { name: "Bhola", division: "Barishal", lat: 22.68, lng: 90.65, population: 1776795, baseInfectionRate: 0.035, healthcareCapacity: 0.40 },
  { name: "Jhalokati", division: "Barishal", lat: 22.64, lng: 90.20, population: 682669, baseInfectionRate: 0.030, healthcareCapacity: 0.42 },
  { name: "Patuakhali", division: "Barishal", lat: 22.35, lng: 90.32, population: 1535854, baseInfectionRate: 0.033, healthcareCapacity: 0.44 },
  { name: "Pirojpur", division: "Barishal", lat: 22.58, lng: 89.97, population: 1113257, baseInfectionRate: 0.031, healthcareCapacity: 0.43 },
  { name: "Bandarban", division: "Chattogram", lat: 22.19, lng: 92.22, population: 388335, baseInfectionRate: 0.025, healthcareCapacity: 0.30 },
  { name: "Brahmanbaria", division: "Chattogram", lat: 23.96, lng: 91.11, population: 2840498, baseInfectionRate: 0.040, healthcareCapacity: 0.52 },
  { name: "Chandpur", division: "Chattogram", lat: 23.23, lng: 90.65, population: 2416018, baseInfectionRate: 0.039, healthcareCapacity: 0.50 },
  { name: "Chattogram", division: "Chattogram", lat: 22.34, lng: 91.78, population: 7616352, baseInfectionRate: 0.045, healthcareCapacity: 0.75 },
  { name: "Cumilla", division: "Chattogram", lat: 23.46, lng: 91.18, population: 5387288, baseInfectionRate: 0.042, healthcareCapacity: 0.65 },
  { name: "Cox's Bazar", division: "Chattogram", lat: 21.44, lng: 91.97, population: 2289990, baseInfectionRate: 0.038, healthcareCapacity: 0.48 },
  { name: "Feni", division: "Chattogram", lat: 23.01, lng: 91.40, population: 1437371, baseInfectionRate: 0.036, healthcareCapacity: 0.55 },
  { name: "Khagrachhari", division: "Chattogram", lat: 23.12, lng: 91.95, population: 613917, baseInfectionRate: 0.026, healthcareCapacity: 0.32 },
  { name: "Lakshmipur", division: "Chattogram", lat: 22.94, lng: 90.84, population: 1729188, baseInfectionRate: 0.037, healthcareCapacity: 0.46 },
  { name: "Noakhali", division: "Chattogram", lat: 22.87, lng: 91.10, population: 3108083, baseInfectionRate: 0.041, healthcareCapacity: 0.53 },
  { name: "Rangamati", division: "Chattogram", lat: 22.73, lng: 92.20, population: 595979, baseInfectionRate: 0.024, healthcareCapacity: 0.35 },
  { name: "Dhaka", division: "Dhaka", lat: 23.81, lng: 90.41, population: 12043977, baseInfectionRate: 0.055, healthcareCapacity: 0.90 },
  { name: "Faridpur", division: "Dhaka", lat: 23.60, lng: 89.84, population: 1912969, baseInfectionRate: 0.036, healthcareCapacity: 0.52 },
  { name: "Gazipur", division: "Dhaka", lat: 24.00, lng: 90.43, population: 3403912, baseInfectionRate: 0.048, healthcareCapacity: 0.70 },
  { name: "Gopalganj", division: "Dhaka", lat: 23.00, lng: 89.83, population: 1172415, baseInfectionRate: 0.032, healthcareCapacity: 0.45 },
  { name: "Kishoreganj", division: "Dhaka", lat: 24.43, lng: 90.78, population: 2911907, baseInfectionRate: 0.041, healthcareCapacity: 0.55 },
  { name: "Madaripur", division: "Dhaka", lat: 23.16, lng: 90.19, population: 1165952, baseInfectionRate: 0.034, healthcareCapacity: 0.44 },
  { name: "Manikganj", division: "Dhaka", lat: 23.86, lng: 90.00, population: 1392867, baseInfectionRate: 0.035, healthcareCapacity: 0.48 },
  { name: "Munshiganj", division: "Dhaka", lat: 23.54, lng: 90.53, population: 1445660, baseInfectionRate: 0.037, healthcareCapacity: 0.56 },
  { name: "Narayanganj", division: "Dhaka", lat: 23.63, lng: 90.50, population: 2948217, baseInfectionRate: 0.047, healthcareCapacity: 0.68 },
  { name: "Narsingdi", division: "Dhaka", lat: 23.92, lng: 90.72, population: 2229642, baseInfectionRate: 0.039, healthcareCapacity: 0.50 },
  { name: "Rajbari", division: "Dhaka", lat: 23.76, lng: 89.64, population: 1049778, baseInfectionRate: 0.033, healthcareCapacity: 0.43 },
  { name: "Shariatpur", division: "Dhaka", lat: 23.24, lng: 90.35, population: 1155824, baseInfectionRate: 0.034, healthcareCapacity: 0.42 },
  { name: "Tangail", division: "Dhaka", lat: 24.25, lng: 89.92, population: 3605083, baseInfectionRate: 0.040, healthcareCapacity: 0.58 },
  { name: "Bagerhat", division: "Khulna", lat: 22.65, lng: 89.79, population: 1476090, baseInfectionRate: 0.033, healthcareCapacity: 0.44 },
  { name: "Chuadanga", division: "Khulna", lat: 23.64, lng: 88.82, population: 1129015, baseInfectionRate: 0.032, healthcareCapacity: 0.43 },
  { name: "Jashore", division: "Khulna", lat: 23.17, lng: 89.21, population: 2764547, baseInfectionRate: 0.039, healthcareCapacity: 0.58 },
  { name: "Jhenaidah", division: "Khulna", lat: 23.54, lng: 89.18, population: 1771304, baseInfectionRate: 0.035, healthcareCapacity: 0.48 },
  { name: "Khulna", division: "Khulna", lat: 22.82, lng: 89.53, population: 2318527, baseInfectionRate: 0.040, healthcareCapacity: 0.65 },
  { name: "Kushtia", division: "Khulna", lat: 23.90, lng: 89.12, population: 1946838, baseInfectionRate: 0.037, healthcareCapacity: 0.52 },
  { name: "Magura", division: "Khulna", lat: 23.49, lng: 89.42, population: 918419, baseInfectionRate: 0.031, healthcareCapacity: 0.41 },
  { name: "Meherpur", division: "Khulna", lat: 23.76, lng: 88.67, population: 655392, baseInfectionRate: 0.029, healthcareCapacity: 0.39 },
  { name: "Narail", division: "Khulna", lat: 23.12, lng: 89.58, population: 721668, baseInfectionRate: 0.030, healthcareCapacity: 0.40 },
  { name: "Satkhira", division: "Khulna", lat: 22.31, lng: 89.07, population: 1985959, baseInfectionRate: 0.036, healthcareCapacity: 0.47 },
  { name: "Jamalpur", division: "Mymensingh", lat: 24.93, lng: 89.95, population: 2292674, baseInfectionRate: 0.038, healthcareCapacity: 0.50 },
  { name: "Mymensingh", division: "Mymensingh", lat: 24.75, lng: 90.40, population: 5110272, baseInfectionRate: 0.043, healthcareCapacity: 0.60 },
  { name: "Netrokona", division: "Mymensingh", lat: 24.88, lng: 90.73, population: 2229642, baseInfectionRate: 0.037, healthcareCapacity: 0.45 },
  { name: "Sherpur", division: "Mymensingh", lat: 25.02, lng: 90.01, population: 1358325, baseInfectionRate: 0.035, healthcareCapacity: 0.43 },
  { name: "Bogura", division: "Rajshahi", lat: 24.85, lng: 89.37, population: 3400874, baseInfectionRate: 0.041, healthcareCapacity: 0.58 },
  { name: "Chapai Nawabganj", division: "Rajshahi", lat: 24.60, lng: 88.28, population: 1647521, baseInfectionRate: 0.036, healthcareCapacity: 0.46 },
  { name: "Joypurhat", division: "Rajshahi", lat: 25.10, lng: 89.02, population: 913768, baseInfectionRate: 0.032, healthcareCapacity: 0.44 },
  { name: "Naogaon", division: "Rajshahi", lat: 24.80, lng: 88.94, population: 2600491, baseInfectionRate: 0.038, healthcareCapacity: 0.50 },
  { name: "Natore", division: "Rajshahi", lat: 24.42, lng: 89.00, population: 1706673, baseInfectionRate: 0.035, healthcareCapacity: 0.48 },
  { name: "Pabna", division: "Rajshahi", lat: 24.01, lng: 89.23, population: 2523179, baseInfectionRate: 0.038, healthcareCapacity: 0.53 },
  { name: "Rajshahi", division: "Rajshahi", lat: 24.37, lng: 88.60, population: 2595197, baseInfectionRate: 0.040, healthcareCapacity: 0.65 },
  { name: "Sirajganj", division: "Rajshahi", lat: 24.45, lng: 89.70, population: 3097489, baseInfectionRate: 0.040, healthcareCapacity: 0.52 },
  { name: "Dinajpur", division: "Rangpur", lat: 25.63, lng: 88.63, population: 2990128, baseInfectionRate: 0.039, healthcareCapacity: 0.55 },
  { name: "Gaibandha", division: "Rangpur", lat: 25.33, lng: 89.53, population: 2379255, baseInfectionRate: 0.037, healthcareCapacity: 0.47 },
  { name: "Kurigram", division: "Rangpur", lat: 25.81, lng: 89.63, population: 2069273, baseInfectionRate: 0.036, healthcareCapacity: 0.40 },
  { name: "Lalmonirhat", division: "Rangpur", lat: 25.92, lng: 89.45, population: 1256099, baseInfectionRate: 0.034, healthcareCapacity: 0.42 },
  { name: "Nilphamari", division: "Rangpur", lat: 25.93, lng: 88.86, population: 1834231, baseInfectionRate: 0.036, healthcareCapacity: 0.46 },
  { name: "Panchagarh", division: "Rangpur", lat: 26.33, lng: 88.55, population: 982990, baseInfectionRate: 0.031, healthcareCapacity: 0.40 },
  { name: "Rangpur", division: "Rangpur", lat: 25.75, lng: 89.25, population: 2881086, baseInfectionRate: 0.040, healthcareCapacity: 0.58 },
  { name: "Thakurgaon", division: "Rangpur", lat: 26.03, lng: 88.46, population: 1390042, baseInfectionRate: 0.034, healthcareCapacity: 0.43 },
  { name: "Habiganj", division: "Sylhet", lat: 24.37, lng: 91.42, population: 2089001, baseInfectionRate: 0.036, healthcareCapacity: 0.46 },
  { name: "Moulvibazar", division: "Sylhet", lat: 24.48, lng: 91.78, population: 1919062, baseInfectionRate: 0.035, healthcareCapacity: 0.45 },
  { name: "Sunamganj", division: "Sylhet", lat: 25.07, lng: 91.40, population: 2467968, baseInfectionRate: 0.037, healthcareCapacity: 0.42 },
  { name: "Sylhet", division: "Sylhet", lat: 24.89, lng: 91.87, population: 3434188, baseInfectionRate: 0.042, healthcareCapacity: 0.62 },
];

// Helper: get district by name (case-insensitive)
export function getDistrict(name) {
  return DISTRICTS.find(d => d.name.toLowerCase() === name.toLowerCase());
}

// Helper: search districts by partial name
export function searchDistricts(query) {
  if (!query) return [];
  const q = query.toLowerCase();
  return DISTRICTS.filter(d => d.name.toLowerCase().includes(q));
}

// Helper: get all district names
export function getAllDistrictNames() {
  return DISTRICTS.map(d => d.name);
}

// Default selected districts
export const DEFAULT_DISTRICTS = ["Chattogram", "Dhaka", "Sylhet"];

// Default coverage percentage when toggling scenarios
export const DEFAULT_COVERAGE_PCT = 90;

// Simulation constants
export const MAX_WEEKS = 52;
export const PLAYBACK_SPEEDS = [1, 2, 4];

export default DISTRICTS;
