/**
 * Centralized Bookings Data & Statistics Helper
 * UrbanNest Hostel Operations CRM
 */

export const demoBookings = [
  {
    id: 'BK-1081',
    name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    email: 'rahul.kumar@gmail.com',
    roomType: 'Double Sharing Room',
    moveInDate: '2026-10-01',
    bookingDate: '2026-09-22',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PARTIAL',
    monthlyRent: 8500,
    securityDeposit: 8500,
    bookingAmount: 2000,
    paidAmount: 2000,
    notes: 'Working professional at Hitec City. Requested 2nd floor bed near window.',
  },
  {
    id: 'BK-1082',
    name: 'Priya Reddy',
    phone: '+91 98123 45678',
    email: 'priya.reddy@outlook.com',
    roomType: 'Single Private Room',
    moveInDate: '2026-09-28',
    bookingDate: '2026-09-23',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    monthlyRent: 14000,
    securityDeposit: 14000,
    bookingAmount: 3000,
    paidAmount: 31000, // Token + Full Deposit + 1st Month Rent
    notes: 'Senior UI Engineer at Deloitte. Requested quiet wing on 3rd floor with study desk.',
  },
  {
    id: 'BK-1083',
    name: 'Arjun Mehta',
    phone: '+91 97654 32109',
    email: 'arjun.mehta@tcs.com',
    roomType: 'Triple Sharing Room',
    moveInDate: '2026-10-05',
    bookingDate: '2026-09-24',
    bookingStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    monthlyRent: 6500,
    securityDeposit: 6500,
    bookingAmount: 1500,
    paidAmount: 0,
    notes: 'Awaiting parent confirmation call. Scheduled hostel walkthrough this weekend.',
  },
  {
    id: 'BK-1084',
    name: 'Siddharth Rao',
    phone: '+91 98450 12345',
    email: 'siddharth.rao@example.com',
    roomType: 'Single Private Room',
    moveInDate: '2026-10-15',
    bookingDate: '2026-09-25',
    bookingStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    monthlyRent: 14000,
    securityDeposit: 14000,
    bookingAmount: 3000,
    paidAmount: 0,
    notes: 'Enquired online via public site. High-speed Wi-Fi required for remote tech work.',
  },
  {
    id: 'BK-1085',
    name: 'Kavita Nair',
    phone: '+91 99012 34567',
    email: 'kavita.nair@wipro.com',
    roomType: 'Double Sharing Room',
    moveInDate: '2026-09-29',
    bookingDate: '2026-09-20',
    bookingStatus: 'CHECKED_IN',
    paymentStatus: 'PAID',
    monthlyRent: 8500,
    securityDeposit: 8500,
    bookingAmount: 2000,
    paidAmount: 19000,
    notes: 'Checked in to Room 202 Bed A. Biometric access and Wi-Fi credentials issued.',
  },
  {
    id: 'BK-1086',
    name: 'Manish Sharma',
    phone: '+91 98711 22334',
    email: 'manish.sharma@gmail.com',
    roomType: 'Four Sharing Room',
    moveInDate: '2026-10-10',
    bookingDate: '2026-09-18',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PARTIAL',
    monthlyRent: 5500,
    securityDeposit: 5500,
    bookingAmount: 1500,
    paidAmount: 1500,
    notes: 'Student at JNTU Hyderabad. Balance rent and deposit due upon physical arrival.',
  },
  {
    id: 'BK-1087',
    name: 'Ananya Verma',
    phone: '+91 97234 56780',
    email: 'ananya.verma@example.com',
    roomType: 'Double Sharing Room',
    moveInDate: '2026-10-02',
    bookingDate: '2026-09-25',
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    monthlyRent: 8500,
    securityDeposit: 8500,
    bookingAmount: 2000,
    paidAmount: 19000,
    notes: 'Physical visit completed. Shift confirmed from Gachibowli PG.',
  },
  {
    id: 'BK-1088',
    name: 'Deepak Chawla',
    phone: '+91 96543 21987',
    email: 'deepak.c@fintech.co',
    roomType: 'Single Private Room',
    moveInDate: '2026-09-20',
    bookingDate: '2026-09-15',
    bookingStatus: 'CANCELLED',
    paymentStatus: 'UNPAID',
    monthlyRent: 14000,
    securityDeposit: 14000,
    bookingAmount: 0,
    paidAmount: 0,
    notes: 'Job transfer moved to Bengaluru before check-in. Booking cancelled with no penalty.',
  },
  {
    id: 'BK-1089',
    name: 'Vikram Joshi',
    phone: '+91 98112 34455',
    email: 'vikram.joshi@accenture.com',
    roomType: 'Triple Sharing Room',
    moveInDate: '2026-09-12',
    bookingDate: '2026-09-08',
    bookingStatus: 'COMPLETED',
    paymentStatus: 'PAID',
    monthlyRent: 6500,
    securityDeposit: 6500,
    bookingAmount: 1500,
    paidAmount: 14500,
    notes: 'Short internship stay completed successfully. Deposit refunded after inspection.',
  },
]

export function getBookingStats(bookingsList = demoBookings) {
  const total = bookingsList.length
  const today = new Date('2026-09-26')

  const upcomingMoveIns = bookingsList.filter((b) => {
    if (b.bookingStatus === 'CANCELLED' || b.bookingStatus === 'COMPLETED' || b.bookingStatus === 'CHECKED_IN') return false
    const mDate = new Date(b.moveInDate)
    return mDate >= today
  }).length

  const pendingConfirmation = bookingsList.filter((b) => b.bookingStatus === 'PENDING').length
  const confirmedBookings = bookingsList.filter((b) => b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN').length

  return {
    totalBookings: total,
    upcomingMoveIns,
    pendingConfirmation,
    confirmedBookings,
  }
}
