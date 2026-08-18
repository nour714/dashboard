/**
 * AfricaTravel — Master Realistic Mock Dataset
 *
 * Provides seed data for travel agency operations across all entities.
 */

export const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-8924',
    name: 'Ahmed Mohamed',
    email: 'ahmed.m@example.com',
    phone: '+20 100 123 4567',
    passport: 'A12345678',
    nationality: 'Egyptian (EGY)',
    isVip: true,
    memberSince: '2021',
    notes: [
      {
        author: 'Sarah Agent',
        date: '2023-10-12T14:20:00Z',
        text: 'Prefers aisle seats on long-haul flights. Requested vegetarian meal for upcoming trip to DXB.'
      },
      {
        author: 'System',
        date: '2023-09-05T09:00:00Z',
        text: 'Upgraded to VIP status based on lifetime spend.'
      }
    ]
  },
  {
    id: 'CUST-8925',
    name: 'Nourhan Adel',
    email: 'nourhan.adel@example.com',
    phone: '+20 111 987 6543',
    passport: 'A98765432',
    nationality: 'Egyptian (EGY)',
    isVip: false,
    memberSince: '2022',
    notes: [
      {
        author: 'Mohamed Ali',
        date: '2023-10-01T11:00:00Z',
        text: 'Corporate traveler for Acme Corp accounts.'
      }
    ]
  },
  {
    id: 'CUST-8926',
    name: 'Tarek Mahmoud',
    email: 'tarek.m@example.com',
    phone: '+20 122 345 6789',
    passport: 'A55443322',
    nationality: 'Egyptian (EGY)',
    isVip: false,
    memberSince: '2023',
    notes: []
  },
  {
    id: 'CUST-8927',
    name: 'Sarah Jenkins',
    email: 'sarah.j@globex.com',
    phone: '+1 (555) 345-6789',
    passport: 'P98472910',
    nationality: 'American (USA)',
    isVip: true,
    memberSince: '2020',
    notes: [
      {
        author: 'Ahmed Hassan',
        date: '2023-08-15T16:45:00Z',
        text: 'Executive travel coordinator for Globex Inc.'
      }
    ]
  },
  {
    id: 'CUST-8928',
    name: 'Eleanor Vance',
    email: 'eleanor.v@example.com',
    phone: '+44 20 7946 0912',
    passport: 'GB8823419',
    nationality: 'British (GBR)',
    isVip: false,
    memberSince: '2023',
    notes: []
  }
];

export const INITIAL_EMPLOYEES = [
  {
    id: 'EMP-101',
    name: 'Mohamed Raafat',
    email: 'admin@africatravel.com',
    role: 'ADMIN',
    title: 'Senior Operations Director',
    ticketsCount: 1245,
    sales: 142000,
    collected: 138000,
    refunds: 4200,
    outstanding: 0,
    status: 'ACTIVE',
    lastActive: 'Just now'
  },
  {
    id: 'EMP-102',
    name: 'Ahmed Raafat',
    email: 'ahmed.r@africatravel.com',
    role: 'ADMIN',
    title: 'Senior Operations Manager',
    ticketsCount: 3892,
    sales: 312000,
    collected: 290000,
    refunds: 12000,
    outstanding: 22000,
    status: 'ACTIVE',
    lastActive: '5 mins ago'
  },
  {
    id: 'EMP-103',
    name: 'Nour Wael',
    email: 'nour.w@africatravel.com',
    role: 'AGENT',
    title: 'Ticketing Officer',
    ticketsCount: 2104,
    sales: 189000,
    collected: 185000,
    refunds: 3500,
    outstanding: 4000,
    status: 'ACTIVE',
    lastActive: '35 mins ago'
  },
  {
    id: 'EMP-104',
    name: 'Hashem Ahmed',
    email: 'hashem.a@africatravel.com',
    role: 'AGENT',
    title: 'Customer Operations Specialist',
    ticketsCount: 1540,
    sales: 165000,
    collected: 160000,
    refunds: 5000,
    outstanding: 0,
    status: 'ACTIVE',
    lastActive: '12 mins ago'
  }
];

export const INITIAL_TICKETS = [
  {
    id: 'TK-10254',
    ticketNumber: '077-1234567890',
    pnr: 'MSX92A',
    customerId: 'CUST-8924',
    passengerName: 'Ahmed Mohamed',
    phone: '+20 100 123 4567',
    passport: 'A12345678',
    nationality: 'Egyptian (EGY)',
    dob: '1985-05-15',
    email: 'ahmed.m@example.com',
    airline: 'EgyptAir',
    airlineCode: 'MS',
    flightNumber: 'MS 901',
    returnFlightNumber: 'MS 902',
    origin: 'CAI',
    originTerminal: 'Terminal 3',
    originAirportName: 'Cairo International Airport',
    destination: 'DXB',
    destinationTerminal: 'Terminal 1',
    destinationAirportName: 'Dubai International Airport',
    departureDate: '2023-10-24T10:30:00Z',
    arrivalDate: '2023-10-24T15:45:00Z',
    returnDepartureDate: '2023-11-02T18:00:00Z',
    returnArrivalDate: '2023-11-02T20:15:00Z',
    tripType: 'Round Trip',
    flightDuration: '3h 15m',
    cabinClass: 'Economy (Y)',
    seat: '14B',
    baggage: '2 x 23kg',
    ticketPrice: 18500,
    currency: 'EGP',
    status: 'CONFIRMED',
    createdBy: 'Sarah Jenkins',
    createdById: 'EMP-102',
    createdAt: '2023-10-12T14:32:00Z',
    payments: [
      {
        id: 'PAY-701',
        ticketId: 'TK-10254',
        amount: 10000,
        currency: 'EGP',
        method: 'Bank Transfer',
        reference: 'TRX-CIB-9021',
        date: '2023-10-12T14:40:00Z',
        addedBy: 'Sarah Jenkins',
        notes: 'Initial booking deposit'
      },
      {
        id: 'PAY-702',
        ticketId: 'TK-10254',
        amount: 8500,
        currency: 'EGP',
        method: 'Credit Card',
        reference: 'AUTH-VISA-4491',
        date: '2023-10-18T10:15:00Z',
        addedBy: 'Ahmed Hassan',
        notes: 'Final settlement payment'
      }
    ],
    modifications: [
      {
        id: 'MOD-301',
        ticketId: 'TK-10254',
        title: 'Modification #1',
        originalFlight: {
          flightNumber: 'MS 912',
          date: '2023-11-12T10:00:00Z',
          route: 'Cairo (CAI) → Dubai (DXB)',
          duration: '3h 20m'
        },
        newFlight: {
          flightNumber: 'MS 914',
          date: '2023-11-13T14:45:00Z',
          route: 'Cairo (CAI) → Dubai (DXB)',
          note: '+1 Day, +4h 45m'
        },
        changeFee: 1200,
        currency: 'EGP',
        reason: 'Client requested later departure due to business meeting.',
        requestedBy: 'Ahmed Mohamed',
        processedBy: 'Sarah Jenkins',
        date: '2023-10-24T14:30:00Z',
        status: 'COMPLETED'
      }
    ],
    refunds: []
  },
  {
    id: 'TK-10253',
    ticketNumber: '176-9876543210',
    pnr: 'EK4B2C',
    customerId: 'CUST-8925',
    passengerName: 'Nourhan Adel',
    phone: '+20 111 987 6543',
    passport: 'A98765432',
    nationality: 'Egyptian (EGY)',
    dob: '1992-08-20',
    email: 'nourhan.adel@example.com',
    airline: 'Emirates',
    airlineCode: 'EK',
    flightNumber: 'EK 924',
    origin: 'CAI',
    originTerminal: 'Terminal 2',
    originAirportName: 'Cairo International Airport',
    destination: 'DXB',
    destinationTerminal: 'Terminal 3',
    destinationAirportName: 'Dubai International Airport',
    departureDate: '2023-10-25T14:15:00Z',
    arrivalDate: '2023-10-25T19:30:00Z',
    tripType: 'One Way',
    flightDuration: '3h 15m',
    cabinClass: 'Business (J)',
    seat: '03A',
    baggage: '2 x 32kg',
    ticketPrice: 22000,
    currency: 'EGP',
    status: 'PARTIALLY PAID',
    createdBy: 'Marcus Reed',
    createdById: 'EMP-103',
    createdAt: '2023-10-23T11:20:00Z',
    payments: [
      {
        id: 'PAY-703',
        ticketId: 'TK-10253',
        amount: 10000,
        currency: 'EGP',
        method: 'Cash',
        reference: 'RCP-88910',
        date: '2023-10-23T11:25:00Z',
        addedBy: 'Marcus Reed',
        notes: 'Deposit received in branch'
      }
    ],
    modifications: [],
    refunds: []
  },
  {
    id: 'TK-10252',
    ticketNumber: '077-4561237890',
    pnr: 'MS2P9Z',
    customerId: 'CUST-8926',
    passengerName: 'Tarek Mahmoud',
    phone: '+20 122 345 6789',
    passport: 'A55443322',
    nationality: 'Egyptian (EGY)',
    dob: '1979-11-03',
    email: 'tarek.m@example.com',
    airline: 'EgyptAir',
    airlineCode: 'MS',
    flightNumber: 'MS 671',
    origin: 'CAI',
    originTerminal: 'Terminal 3',
    originAirportName: 'Cairo International Airport',
    destination: 'JED',
    destinationTerminal: 'Terminal 1',
    destinationAirportName: 'King Abdulaziz International Airport',
    departureDate: '2023-10-10T08:00:00Z',
    arrivalDate: '2023-10-10T10:15:00Z',
    tripType: 'One Way',
    flightDuration: '2h 15m',
    cabinClass: 'Economy (Y)',
    seat: '22C',
    baggage: '1 x 23kg',
    ticketPrice: 8500,
    currency: 'EGP',
    status: 'CANCELLED',
    createdBy: 'Ahmed Hassan',
    createdById: 'EMP-101',
    createdAt: '2023-10-05T09:10:00Z',
    payments: [
      {
        id: 'PAY-704',
        ticketId: 'TK-10252',
        amount: 8500,
        currency: 'EGP',
        method: 'Vodafone Cash',
        reference: 'VF-4482910',
        date: '2023-10-05T09:15:00Z',
        addedBy: 'Ahmed Hassan',
        notes: 'Online wallet full payment'
      }
    ],
    modifications: [],
    refunds: [
      {
        id: 'RF-9021',
        ticketId: 'TK-10252',
        originalAmount: 8500,
        totalPaid: 8500,
        amount: 8500,
        currency: 'EGP',
        reason: 'Medical Emergency — Hospitalization certificate provided.',
        status: 'COMPLETED',
        requestedDate: '2023-10-08T11:00:00Z',
        processedDate: '2023-10-09T15:30:00Z',
        processedBy: 'Sarah Jenkins'
      }
    ]
  },
  {
    id: 'TK-10251',
    ticketNumber: '157-8899223344',
    pnr: 'QR981L',
    customerId: 'CUST-8927',
    passengerName: 'Sarah Jenkins',
    phone: '+1 (555) 345-6789',
    passport: 'P98472910',
    nationality: 'American (USA)',
    dob: '1988-03-24',
    email: 'sarah.j@globex.com',
    airline: 'Qatar Airways',
    airlineCode: 'QR',
    flightNumber: 'QR 1302',
    origin: 'CAI',
    originTerminal: 'Terminal 2',
    originAirportName: 'Cairo International Airport',
    destination: 'DOH',
    destinationTerminal: 'Terminal 1',
    destinationAirportName: 'Hamad International Airport',
    departureDate: '2023-11-05T19:00:00Z',
    arrivalDate: '2023-11-05T23:15:00Z',
    tripType: 'One Way',
    flightDuration: '3h 15m',
    cabinClass: 'First (F)',
    seat: '01A',
    baggage: '3 x 32kg',
    ticketPrice: 38000,
    currency: 'EGP',
    status: 'CONFIRMED',
    createdBy: 'Ahmed Hassan',
    createdById: 'EMP-101',
    createdAt: '2023-10-20T16:00:00Z',
    payments: [
      {
        id: 'PAY-705',
        ticketId: 'TK-10251',
        amount: 38000,
        currency: 'EGP',
        method: 'Corporate Account',
        reference: 'CORP-GLBX-091',
        date: '2023-10-20T16:05:00Z',
        addedBy: 'Ahmed Hassan',
        notes: 'Billed to Globex Inc master account'
      }
    ],
    modifications: [],
    refunds: []
  },
  {
    id: 'TK-9824',
    ticketNumber: '006-7788990011',
    pnr: 'DL442A',
    customerId: 'CUST-8928',
    passengerName: 'Eleanor Vance',
    phone: '+44 20 7946 0912',
    passport: 'GB8823419',
    nationality: 'British (GBR)',
    dob: '1990-12-10',
    email: 'eleanor.v@example.com',
    airline: 'British Airways',
    airlineCode: 'BA',
    flightNumber: 'BA 178',
    origin: 'JFK',
    originTerminal: 'Terminal 7',
    originAirportName: 'John F. Kennedy International Airport',
    destination: 'LHR',
    destinationTerminal: 'Terminal 5',
    destinationAirportName: 'London Heathrow Airport',
    departureDate: '2023-10-27T08:30:00Z',
    arrivalDate: '2023-10-27T20:15:00Z',
    tripType: 'One Way',
    flightDuration: '6h 45m',
    cabinClass: 'Economy (Y)',
    seat: '12A',
    baggage: '1 x 23kg',
    ticketPrice: 1250,
    currency: 'USD',
    status: 'PARTIALLY PAID',
    createdBy: 'Sarah Jenkins',
    createdById: 'EMP-102',
    createdAt: '2023-10-22T09:30:00Z',
    payments: [
      {
        id: 'PAY-706',
        ticketId: 'TK-9824',
        amount: 800,
        currency: 'USD',
        method: 'Credit Card (Stripe)',
        reference: 'ch_3M49819284',
        date: '2023-10-22T09:35:00Z',
        addedBy: 'Sarah Jenkins',
        notes: 'Deposit paid via phone authorization'
      }
    ],
    modifications: [],
    refunds: []
  }
];

export const INITIAL_ACTIVITY_LOGS = [
  {
    id: 'ACT-901',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    user: 'Ahmed Hassan',
    action: 'CREATE_TICKET',
    ticketId: 'TK-10254',
    customerId: 'CUST-8924',
    description: 'Created new round-trip booking CAI ✈ DXB for Ahmed Mohamed.'
  },
  {
    id: 'ACT-902',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: 'Mohamed Ali',
    action: 'ADD_PAYMENT',
    ticketId: 'TK-10254',
    customerId: 'CUST-8924',
    description: 'Added payment of 8,500 EGP via Credit Card (AUTH-VISA-4491).'
  },
  {
    id: 'ACT-903',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    user: 'Sarah Jenkins',
    action: 'MODIFY_FLIGHT',
    ticketId: 'TK-10254',
    customerId: 'CUST-8924',
    description: 'Modified departure schedule from Oct 24 to Nov 13 with 1,200 EGP change fee.'
  },
  {
    id: 'ACT-904',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    user: 'Lena Chen',
    action: 'UPDATE_CUSTOMER',
    ticketId: null,
    customerId: 'CUST-8924',
    description: 'Updated customer passport expiration and dietary preferences.'
  },
  {
    id: 'ACT-905',
    timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    user: 'Sarah Jenkins',
    action: 'COMPLETE_REFUND',
    ticketId: 'TK-10252',
    customerId: 'CUST-8926',
    description: 'Completed medical cancellation refund of 8,500 EGP for Tarek Mahmoud.'
  }
];

export const INITIAL_SETTINGS = {
  profile: {
    name: 'Mohamed Raafat',
    fullName: 'Mohamed Raafat',
    email: 'admin@africatravel.com',
    role: 'Senior Operations Director',
    title: 'Senior Operations Director',
    phone: '+20 100 000 1122'
  },
  company: {
    name: 'AfricaTravel Travel Operations Ltd.',
    iataNumber: '12-3 4567 8',
    taxId: 'EG-904-881-229',
    baseCurrency: 'EGP',
    address: '14 Al-Thawra Street, Heliopolis, Cairo, Egypt',
    phone: '+20 2 2415 8800'
  },
  currencies: ['EGP', 'USD', 'EUR', 'SAR', 'AED'],
  paymentMethods: ['Cash', 'Credit Card', 'Bank Transfer', 'Vodafone Cash', 'InstaPay', 'Corporate Account'],
  ticketStatuses: ['CONFIRMED', 'PENDING PAY', 'PARTIALLY PAID', 'PAID', 'MODIFIED', 'REFUNDED', 'CANCELLED'],
  notifications: {
    emailOnNewTicket: true,
    emailOnRefundRequest: true,
    emailOnFlightDelay: true,
    dailySummaryReport: true
  }
};
