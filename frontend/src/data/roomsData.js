/**
 * Centralized Rooms & Beds Inventory Data
 * UrbanNest Hostel Operations CRM
 */

export const initialRooms = [
  // --- FLOOR 1 ---
  {
    id: 'RM-101',
    roomNumber: 'Room 101',
    roomType: 'Triple Sharing',
    floor: 'Floor 1',
    monthlyRent: 6500,
    deposit: 6500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Bathroom', 'High-Speed Wi-Fi', 'Study Desks', 'Individual Wardrobes', 'Ceiling Fan'],
    beds: [
      {
        id: '101-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-103',
        tenantName: 'Arjun Mehta',
        moveInDate: '2026-09-01',
        expectedEndDate: '2027-02-28',
      },
      {
        id: '101-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
      {
        id: '101-C',
        bedCode: 'Bed C',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-102',
    roomNumber: 'Room 102',
    roomType: 'Double Sharing',
    floor: 'Floor 1',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Washroom', 'Air Conditioning', 'Geyser', 'Study Desk', 'Balcony View'],
    beds: [
      {
        id: '102-A',
        bedCode: 'Bed A',
        status: 'RESERVED',
        tenantId: 'TEN-113',
        tenantName: 'Ananya Verma',
        moveInDate: '2026-10-02',
        expectedEndDate: '2027-04-02',
      },
      {
        id: '102-B',
        bedCode: 'Bed B',
        status: 'OCCUPIED',
        tenantId: 'TEN-110',
        tenantName: 'Suresh Babu',
        moveInDate: '2026-08-15',
        expectedEndDate: '2026-10-15', // Ending in 19 days
      },
    ],
  },
  {
    id: 'RM-104',
    roomNumber: 'Room 104',
    roomType: 'Triple Sharing',
    floor: 'Floor 1',
    monthlyRent: 6500,
    deposit: 6500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Bathroom', 'High-Speed Wi-Fi', 'Study Table', 'Steel Locker', 'Daily Housekeeping'],
    beds: [
      {
        id: '104-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-107',
        tenantName: 'Rohan Deshmukh',
        moveInDate: '2026-06-01',
        expectedEndDate: '2026-10-20', // Ending in 24 days
      },
      {
        id: '104-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
      {
        id: '104-C',
        bedCode: 'Bed C',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },

  // --- FLOOR 2 ---
  {
    id: 'RM-201',
    roomNumber: 'Room 201',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Air Conditioning', 'Attached Bath', 'Power Backup', 'Personal Wardrobe', 'High-Speed Wi-Fi'],
    beds: [
      {
        id: '201-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-108',
        tenantName: 'Aditya Varma',
        moveInDate: '2026-05-10',
        expectedEndDate: '2027-05-10',
      },
      {
        id: '201-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-202',
    roomNumber: 'Room 202',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Washroom', 'Air Conditioning', 'Geyser', 'Study Desk', 'Individual Cupboard'],
    beds: [
      {
        id: '202-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-104',
        tenantName: 'Kavita Nair',
        moveInDate: '2026-09-20',
        expectedEndDate: '2027-03-20',
      },
      {
        id: '202-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-204',
    roomNumber: 'Room 204',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Air Conditioning', 'Attached Bathroom', 'Corner Balcony', 'Study Desks', 'Wi-Fi 6'],
    beds: [
      {
        id: '204-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-101',
        tenantName: 'Rahul Kumar',
        moveInDate: '2026-07-01',
        expectedEndDate: '2026-10-05', // Ending in 9 days! Notice period
      },
      {
        id: '204-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-205',
    roomNumber: 'Room 205',
    roomType: 'Double Sharing',
    floor: 'Floor 2',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Bath', 'Power Backup', 'Study Table', 'High-Speed Wi-Fi'],
    beds: [
      {
        id: '205-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-106',
        tenantName: 'Sneha Kapoor',
        moveInDate: '2026-04-01',
        expectedEndDate: '2027-04-01',
      },
      {
        id: '205-B',
        bedCode: 'Bed B',
        status: 'MAINTENANCE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-206',
    roomNumber: 'Room 206',
    roomType: 'Triple Sharing',
    floor: 'Floor 2',
    monthlyRent: 6500,
    deposit: 6500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Bathroom', 'Balcony', 'Individual Wardrobes', 'Study Desks'],
    beds: [
      {
        id: '206-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-112',
        tenantName: 'Gaurav Jain',
        moveInDate: '2026-08-01',
        expectedEndDate: '2027-01-31',
      },
      {
        id: '206-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
      {
        id: '206-C',
        bedCode: 'Bed C',
        status: 'MAINTENANCE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },

  // --- FLOOR 3 ---
  {
    id: 'RM-301',
    roomNumber: 'Room 301',
    roomType: 'Single Sharing',
    floor: 'Floor 3',
    monthlyRent: 14000,
    deposit: 14000,
    status: 'AVAILABLE',
    amenities: ['Private Room', 'Attached Washroom', 'Inverter AC', 'Large Work Desk', 'Private Balcony', 'Smart TV'],
    beds: [
      {
        id: '301-A',
        bedCode: 'Bed A',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-302',
    roomNumber: 'Room 302',
    roomType: 'Single Sharing',
    floor: 'Floor 3',
    monthlyRent: 14000,
    deposit: 14000,
    status: 'RESERVED',
    amenities: ['Private Room', 'Attached Washroom', 'Air Conditioning', 'Workstation', 'City View Balcony'],
    beds: [
      {
        id: '302-A',
        bedCode: 'Bed A',
        status: 'RESERVED',
        tenantId: 'TEN-102',
        tenantName: 'Priya Reddy',
        moveInDate: '2026-09-28',
        expectedEndDate: '2027-09-28',
      },
    ],
  },
  {
    id: 'RM-303',
    roomNumber: 'Room 303',
    roomType: 'Double Sharing',
    floor: 'Floor 3',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Washroom', 'Air Conditioning', 'Geyser', 'Study Desks', 'Wi-Fi 6'],
    beds: [
      {
        id: '303-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-109',
        tenantName: 'Anil Teja',
        moveInDate: '2026-06-15',
        expectedEndDate: '2026-10-10', // Ending in 14 days
      },
      {
        id: '303-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
  {
    id: 'RM-304',
    roomNumber: 'Room 304',
    roomType: 'Single Sharing',
    floor: 'Floor 3',
    monthlyRent: 14000,
    deposit: 14000,
    status: 'FULLY_OCCUPIED',
    amenities: ['Private Room', 'Attached Bath', 'Air Conditioning', 'Study Desk', 'Wardrobe with Mirror'],
    beds: [
      {
        id: '304-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-111',
        tenantName: 'Harshita Sen',
        moveInDate: '2026-03-01',
        expectedEndDate: '2026-10-31', // Ending in 35 days
      },
    ],
  },
  {
    id: 'RM-305',
    roomNumber: 'Room 305',
    roomType: 'Double Sharing',
    floor: 'Floor 3',
    monthlyRent: 8500,
    deposit: 8500,
    status: 'PARTIALLY_OCCUPIED',
    amenities: ['Attached Bathroom', 'Air Conditioning', 'Study Table', 'Individual Locker'],
    beds: [
      {
        id: '305-A',
        bedCode: 'Bed A',
        status: 'OCCUPIED',
        tenantId: 'TEN-105',
        tenantName: 'Manish Sharma',
        moveInDate: '2026-07-15',
        expectedEndDate: '2026-12-15',
      },
      {
        id: '305-B',
        bedCode: 'Bed B',
        status: 'AVAILABLE',
        tenantId: null,
        tenantName: null,
        moveInDate: null,
        expectedEndDate: null,
      },
    ],
  },
]

export function getRoomStats(roomsList = initialRooms) {
  let totalBeds = 0
  let occupiedBeds = 0
  let availableBeds = 0
  let reservedBeds = 0
  let maintenanceBeds = 0

  roomsList.forEach((r) => {
    r.beds.forEach((b) => {
      totalBeds += 1
      if (b.status === 'OCCUPIED') occupiedBeds += 1
      else if (b.status === 'AVAILABLE') availableBeds += 1
      else if (b.status === 'RESERVED') reservedBeds += 1
      else if (b.status === 'MAINTENANCE' || b.status === 'UNAVAILABLE') maintenanceBeds += 1
    })
  })

  return {
    totalRooms: roomsList.length,
    totalBeds,
    occupiedBeds,
    availableBeds,
    reservedBeds,
    maintenanceBeds,
  }
}
