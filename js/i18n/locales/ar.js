/**
 * AfricaTravel — Arabic Localization Dictionary
 */

export const ar = {
  // Brand & Metadata (Official brand name remains AfricaTravel)
  brand: {
    name: 'AfricaTravel',
    tagline: 'إدارة عمليات السفر',
    platform: 'منصة عمليات السفر وحجوزات الطيران',
    terminal: 'نظام إدارة وكالات السفر وحجوزات الطيران'
  },

  // Navigation
  nav: {
    dashboard: 'لوحة التحكم',
    tickets: 'التذاكر',
    customers: 'العملاء',
    payments: 'المدفوعات',
    refunds: 'الاستردادات',
    reports: 'التقارير',
    administration: 'الإدارة',
    employees: 'الموظفون',
    activity: 'سجل النشاط',
    settings: 'الإعدادات',
    more: 'المزيد',
    newTicket: 'تذكرة جديدة'
  },

  // Common UI Actions & Labels
  common: {
    search: 'بحث',
    searchPlaceholder: 'ابحث عن التذاكر، رموز الحجز (PNR)، أو العملاء...',
    filter: 'تصفية',
    filterBy: 'تصفية حسب',
    all: 'الكل',
    viewAll: 'عرض الكل',
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    actions: 'الإجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    time: 'الوقت',
    amount: 'المبلغ',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    balance: 'الرصيد',
    fee: 'الرسوم',
    fees: 'الرسوم',
    notes: 'ملاحظات',
    reason: 'السبب',
    reference: 'المرجع',
    type: 'النوع',
    method: 'طريقة الدفع',
    user: 'المستخدم',
    loading: 'جاري التحميل...',
    noData: 'لا توجد سجلات',
    showing: 'عرض',
    of: 'من أصل',
    results: 'نتائج',
    currency: 'جنيه مصري',
    currencyFull: 'جنيه مصري',
    required: 'مطلوب',
    optional: 'اختياري',
    confirm: 'تأكيد',
    apply: 'تطبيق',
    reset: 'إعادة ضبط',
    export: 'تصدير',
    print: 'طباعة',
    details: 'التفاصيل',
    overview: 'نظرة عامة',
    history: 'السجل',
    system: 'النظام',
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    switchLanguage: 'تغيير اللغة',
    profile: 'الملف الشخصي',
    signOut: 'تسجيل الخروج',
    active: 'نشط',
    inactive: 'غير نشط',
    enabled: 'مفعّل',
    disabled: 'معطّل'
  },

  // User Roles
  roles: {
    admin: 'مسؤول النظام',
    agent: 'وكيل حجز تذاكر',
    ADMIN: 'مسؤول النظام',
    AGENT: 'وكيل حجز تذاكر',
    operationsDirector: 'مدير أول العمليات',
    'Senior Operations Director': 'مدير أول العمليات'
  },

  // Status Labels
  status: {
    CONFIRMED: 'مؤكدة',
    PAID: 'مدفوعة',
    'PAID IN FULL': 'مدفوعة بالكامل',
    'PARTIALLY PAID': 'مدفوعة جزئيًا',
    PARTIALLY_PAID: 'مدفوعة جزئيًا',
    UNPAID: 'غير مدفوعة',
    BOOKED: 'محجوزة',
    ISSUED: 'مصدرة',
    MODIFIED: 'معدلة',
    'REFUND REQUESTED': 'طلب استرداد',
    REFUND_REQUESTED: 'طلب استرداد',
    'PARTIALLY REFUNDED': 'مستردة جزئيًا',
    PARTIALLY_REFUNDED: 'مستردة جزئيًا',
    REFUNDED: 'مستردة',
    CANCELLED: 'ملغاة',
    COMPLETED: 'مكتملة',
    PENDING: 'قيد الانتظار',
    'PENDING PAY': 'قيد الدفع',
    'PENDING PAYMENT': 'في انتظار الدفع',
    ACTIVE: 'نشط',
    INACTIVE: 'غير نشط',
    VIP: 'VIP',
    REGULAR: 'عادي',
    STANDARD: 'قياسي',
    CASH: 'نقدًا',
    BANK_TRANSFER: 'تحويل بنكي',
    CREDIT_CARD: 'بطاقة ائتمان',
    VODAFONE_CASH: 'فودافون كاش',
    INSTAPAY: 'إنستاباي'
  },

  // Dashboard Page
  dashboard: {
    title: 'لوحة التحكم',
    subtitle: 'نظرة عامة مباشرة على عمليات إصدار التذاكر، الإيرادات، والأداء اليومي.',
    kpi: {
      totalSales: 'إجمالي مبيعات التذاكر',
      totalCollected: 'إجمالي المحصل',
      remainingBalance: 'الرصيد المتبقي للتحصيل',
      activeTickets: 'التذاكر النشطة',
      salesSubtitle: 'إجمالي القيمة الإجمالية للحجوزات المصدرة',
      collectedSubtitle: 'المدفوعات المستلمة والمحققة من العملاء',
      remainingSubtitle: 'المبالغ المستحقة قيد التحصيل من المسافرين',
      activeSubtitle: 'الحجوزات المؤكدة والمدفوعة جزئيًا'
    },
    quickActions: {
      title: 'عمليات سريعة',
      newTicket: 'إصدار تذكرة جديدة',
      addCustomer: 'تسجيل عميل جديد',
      viewReports: 'التقارير المالية',
      auditLog: 'عرض سجل التدقيق'
    },
    recentTickets: {
      title: 'أحدث التذاكر',
      subtitle: 'آخر الحجوزات التي تمت معالجتها اليوم',
      viewAll: 'عرض جميع التذاكر'
    },
    airlineBreakdown: {
      title: 'المبيعات حسب شركة الطيران',
      subtitle: 'توزيع حجم المبيعات الإجمالي'
    },
    recentActivity: {
      title: 'سجل النشاط المباشر',
      subtitle: 'أحدث إجراءات الوكلاء وأحداث النظام'
    }
  },

  // Tickets Page & Module
  tickets: {
    title: 'التذاكر',
    subtitle: 'إدارة الحجوزات، إصدار التذاكر، تسجيل الدفعات، ومتابعة جداول الرحلات.',
    createTicket: 'إنشاء تذكرة',
    searchPlaceholder: 'ابحث باسم المسافر، رمز PNR، رقم التذكرة أو شركة الطيران...',
    filterStatus: 'الحالة',
    filterAirline: 'شركة الطيران',
    table: {
      ticketNumber: 'رقم التذكرة',
      passenger: 'المسافر',
      airline: 'شركة الطيران',
      route: 'المسار',
      flight: 'الرحلة',
      travelDate: 'تاريخ السفر',
      price: 'السعر',
      paid: 'المدفوع',
      remaining: 'المتبقي',
      status: 'الحالة',
      actions: 'الإجراءات'
    },
    empty: {
      title: 'لم يتم العثور على تذاكر',
      description: 'لا توجد تذاكر تطابق معايير البحث أو التصفية الحالية.',
      createAction: 'إنشاء تذكرة جديدة'
    }
  },

  // Ticket Create Page
  ticketCreate: {
    title: 'إنشاء تذكرة',
    subtitle: 'إصدار حجز طيران جديد للمسافر وتحديد الجدولة المالية.',
    backToTickets: 'العودة إلى التذاكر',
    passengerInfo: {
      title: 'بيانات المسافر والعميل',
      subtitle: 'اختر عميلاً مسجلاً مسبقاً أو أدخل بيانات المسافر مباشرة.',
      existingCustomer: 'عميل مسجل (اختياري)',
      selectCustomer: '-- اختر عميلاً مسجلاً --',
      passengerName: 'الاسم الكامل للمسافر',
      passengerNamePlaceholder: 'مثال: طارق محمود حسن',
      phone: 'رقم الهاتف',
      phonePlaceholder: '+20 100 123 4567',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'passenger@example.com',
      passport: 'رقم جواز السفر',
      passportPlaceholder: 'A12345678'
    },
    flightInfo: {
      title: 'تفاصيل الرحلة والمسار',
      subtitle: 'شركة الطيران، أرقام الرحلات، خط السير ومواعيد المغادرة.',
      airline: 'شركة الطيران',
      pnr: 'رمز الحجز PNR (٦ خانات)',
      pnrPlaceholder: 'مثال: AB7K92',
      ticketNumber: 'رقم التذكرة الإلكترونية (١٣ رقمًا)',
      ticketNumberPlaceholder: 'مثال: 0771234567890',
      flightNumber: 'رقم الرحلة',
      flightNumberPlaceholder: 'مثال: MS777',
      tripType: 'نوع الرحلة',
      oneWay: 'ذهاب فقط',
      roundTrip: 'ذهاب وعودة',
      origin: 'مطار الإقلاع (المصدر)',
      destination: 'مطار الوصول (الوجهة)',
      departureDate: 'تاريخ المغادرة',
      arrivalDate: 'تاريخ ووقت الوصول',
      returnDate: 'تاريخ ووقت العودة',
      seatClass: 'درجة السفر',
      cabinClass: 'درجة السفر',
      economy: 'الدرجة السياحية (Economy)',
      business: 'درجة رجال الأعمال (Business)',
      first: 'الدرجة الأولى (First)'
    },
    returnFlight: {
      title: 'رحلة العودة',
      subtitle: 'جدول ومسار رحلة العودة.',
      optionalHint: 'اتركها فارغة لتذكرة ذهاب فقط',
      flightNumber: 'رقم رحلة العودة',
      flightNumberPlaceholder: 'مثال: MS 987',
      departureDate: 'تاريخ المغادرة للعودة',
      arrivalDate: 'تاريخ ووقت الوصول للعودة'
    },
    financials: {
      title: 'التسعير والدفعة المقدمة',
      subtitle: 'تحديد سعر التذكرة والضرائب وتسجيل أي دفعة مقدمة مستلمة.',
      ticketPrice: 'إجمالي سعر التذكرة',
      costPrice: 'سعر التكلفة (شركة الطيران)',
      netProfit: 'صافي الربح',
      initialPayment: 'الدفعة المقدمة المستلمة',
      paymentMethod: 'طريقة الدفع',
      paymentRef: 'مرجع الدفعة / رقم المعاملة',
      paymentRefPlaceholder: 'مثال: CASH-001 أو TXN-998822',
      remainingNotice: 'الرصيد المتبقي المحسوب:'
    },
    buttons: {
      submit: 'إصدار التذكرة',
      submitting: 'جاري إصدار التذكرة...',
      cancel: 'إلغاء'
    }
  },

  // Ticket Details Page
  ticketDetails: {
    title: 'تفاصيل التذكرة',
    pnrLabel: 'رمز الحجز PNR',
    tabs: {
      overview: 'نظرة عامة',
      payments: 'المدفوعات والرصيد',
      modifications: 'تعديلات الرحلة',
      refunds: 'طلبات الاسترداد',
      activity: 'سجل العمليات'
    },
    actions: {
      addPayment: 'إضافة دفعة',
      modifyFlight: 'تعديل الرحلة',
      requestRefund: 'طلب استرداد',
      cancelTicket: 'إلغاء التذكرة',
      printTicket: 'طباعة خط السير'
    },
    overview: {
      itineraryCard: 'خط سير الرحلة',
      passengerCard: 'بيانات المسافر',
      financialSummary: 'الملخص المالي',
      ticketPrice: 'سعر التذكرة الإجمالي',
      costPrice: 'سعر التكلفة (شركة الطيران)',
      netProfit: 'صافي الربح',
      totalPaid: 'إجمالي المدفوع',
      remainingBalance: 'الرصيد المتبقي',
      modificationFees: 'رسوم التعديل',
      netAmount: 'القيمة الصافية المحققة',
      paymentProgress: 'نسبة سداد التذكرة'
    },
    paymentsTab: {
      title: 'المدفوعات المسجلة',
      subtitle: 'سجل مالي ثابت وموثق لجميع معاملات العميل',
      addPaymentBtn: 'تسجيل دفعة جديدة',
      table: {
        id: 'رقم الدفعة',
        date: 'التاريخ والوقت',
        amount: 'المبلغ',
        method: 'طريقة الدفع',
        reference: 'رقم المرجع',
        receivedBy: 'المستلم بواسطة',
        notes: 'ملاحظات'
      },
      empty: 'لم يتم تسجيل أي مدفوعات لهذه التذكرة حتى الآن.'
    },
    modificationsTab: {
      title: 'سجل تعديلات الرحلة',
      subtitle: 'تغييرات المواعيد والمسار ورسوم التعديل الإضافية',
      modifyBtn: 'تسجيل تعديل',
      table: {
        id: 'رقم التعديل',
        date: 'التاريخ',
        previousSchedule: 'الجدول السابق',
        newSchedule: 'الجدول الجديد',
        fee: 'رسوم التعديل',
        reason: 'السبب / الملاحظات',
        processedBy: 'تمت المعالجة بواسطة'
      },
      empty: 'لم يتم إجراء أي تعديلات على خط سير هذه التذكرة.'
    },
    refundsTab: {
      title: 'الاستردادات والتسويات',
      subtitle: 'المبالغ المستردة للعميل من رصيده المدفوع',
      requestBtn: 'إجراء استرداد',
      table: {
        id: 'رقم الاسترداد',
        date: 'التاريخ',
        amount: 'مبلغ الاسترداد',
        fee: 'رسوم الإلغاء',
        netRefund: 'صافي المسترد',
        reason: 'السبب',
        processedBy: 'تمت المعالجة بواسطة',
        status: 'الحالة'
      },
      empty: 'لا توجد طلبات استرداد مسجلة لهذه التذكرة.'
    },
    activityTab: {
      title: 'سجل تدقيق التذكرة',
      subtitle: 'سجل زمني ثابت لجميع العمليات والإجراءات التي تمت على هذه التذكرة'
    }
  },

  // Customers Page
  customers: {
    title: 'العملاء',
    subtitle: 'إدارة ملفات المسافرين، دليل جهات الاتصال، وسجلات الحجوزات التاريخية.',
    newCustomer: 'تسجيل عميل جديد',
    searchPlaceholder: 'ابحث عن العملاء بالاسم، رقم الهاتف، البريد أو جواز السفر...',
    table: {
      name: 'اسم العميل',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      passport: 'رقم الجواز',
      totalSpent: 'إجمالي الحجوزات',
      activeTickets: 'التذاكر النشطة',
      status: 'الحالة',
      actions: 'الإجراءات'
    },
    empty: {
      title: 'لم يتم العثور على عملاء',
      description: 'لا توجد ملفات عملاء تطابق معايير البحث الحالية.'
    }
  },

  // Customer Details Page
  customerDetails: {
    title: 'ملف العميل',
    backToCustomers: 'العودة إلى العملاء',
    editProfile: 'تعديل الملف',
    contactInfo: 'معلومات الاتصال',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    passport: 'رقم جواز السفر',
    nationality: 'الجنسية',
    notes: 'ملاحظات داخلية',
    addNote: 'إضافة ملاحظة',
    notePlaceholder: 'اكتب ملاحظة داخلية حول هذا العميل...',
    bookingHistory: 'سجل حجوزات التذاكر',
    totalSpent: 'إجمالي المبيعات',
    totalTickets: 'التذاكر المصدرة',
    emptyTickets: 'لا توجد تذاكر مسجلة لهذا العميل.'
  },

  // Payments Page
  payments: {
    title: 'المدفوعات',
    subtitle: 'السجل العام لجميع مدفوعات العملاء، المعاملات، وطرق التحصيل.',
    recordPayment: 'تسجيل دفعة',
    searchPlaceholder: 'ابحث برقم الدفعة، التذكرة، العميل، أو المرجع...',
    table: {
      id: 'رقم الدفعة',
      date: 'التاريخ',
      ticketId: 'رقم التذكرة',
      passenger: 'المسافر',
      amount: 'المبلغ',
      method: 'طريقة الدفع',
      reference: 'رقم المرجع',
      collectedBy: 'المحصل بواسطة'
    },
    summary: {
      totalCollected: 'إجمالي المحصل لهذه الفترة',
      cashVolume: 'المعاملات النقدية',
      digitalVolume: 'التحويلات البنكية والإلكترونية'
    }
  },

  // Refunds Page
  refunds: {
    title: 'الاستردادات',
    subtitle: 'معالجة وتدقيق طلبات استرداد العملاء، إلغاء التذاكر، ورسوم الغرامات.',
    newRefund: 'إجراء استرداد',
    searchPlaceholder: 'ابحث برقم الاسترداد، التذكرة، أو اسم المسافر...',
    table: {
      id: 'رقم الاسترداد',
      date: 'التاريخ',
      ticketId: 'رقم التذكرة',
      passenger: 'المسافر',
      refundAmount: 'مبلغ الاسترداد',
      penaltyFee: 'رسوم الغرامة',
      status: 'الحالة',
      processedBy: 'تمت المعالجة بواسطة'
    }
  },

  // Reports Page
  reports: {
    title: 'التقارير',
    subtitle: 'التحليلات المالية، اتجاهات الإيرادات، توزيع شركات الطيران، وأداء الوكلاء.',
    exportCsv: 'تصدير CSV',
    exportPdf: 'طباعة التقرير',
    kpi: {
      grossRevenue: 'إجمالي الإيرادات',
      netCollected: 'صافي النقد المحصل',
      totalOutstanding: 'إجمالي المستحقات قيد التحصيل',
      refundsTotal: 'إجمالي المبالغ المستردة',
      margin: 'هامش التشغيل التقديري'
    },
    salesByAirline: 'حجم المبيعات حسب شركة الطيران',
    agentPerformance: 'أداء مبيعات الوكلاء',
    adminOnlyEmployees: 'بيانات أداء الموظفين تتطلب صلاحيات المسؤول (Administrator).',
    monthlyTrends: 'تطور الإيرادات الشهرية',
    customerPayments: {
      title: 'مدفوعات العملاء',
      customerTicket: 'العميل / رقم التذكرة',
      oneWay: 'ذهاب فقط',
      roundTrip: 'ذهاب وعودة'
    }
  },

  // Employees Page
  employees: {
    title: 'الموظفون',
    subtitle: 'إدارة فريق العمل، وكلاء إصدار التذاكر، الأدوار التشغيلية، وصلاحيات النظام.',
    accessRestricted: 'الوصول مقيد',
    adminOnlyMessage: 'هذه الصفحة متاحة فقط للمسؤولين (Administrators).',
    addEmployee: 'إضافة موظف',
    searchPlaceholder: 'ابحث باسم الموظف، المسمى الوظيفي، أو البريد الإلكتروني...',
    table: {
      name: 'اسم الموظف',
      role: 'المسمى الوظيفي / الدور',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      branch: 'فرع العمل',
      status: 'الحالة',
      actions: 'الإجراءات'
    },
    passwordTooShort: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    createFailed: 'فشل إنشاء الموظف',
    credentialsWarning: 'شارك بيانات الدخول هذه بأمان مع الموظف الجديد. لن تظهر مرة أخرى.',
    newEmployeeCredentials: 'بيانات دخول الموظف الجديد',
    password: 'كلمة المرور',
    titleLabel: 'المسمى الوظيفي',
    generate: 'إنشاء',
    show: 'إظهار',
    hide: 'إخفاء',
    copy: 'نسخ',
    copied: 'تم النسخ',
    copyFailed: 'تعذر نسخ بيانات الدخول',
    done: 'تم',
    roles: {
      admin: 'مسؤول النظام',
      agent: 'وكيل حجز تذاكر',
      ticketOnly: 'إنشاء تذاكر فقط'
    }
  },

  // Activity Page
  activity: {
    title: 'سجل النشاط',
    subtitle: 'سجل تدقيق شامل وغير قابل للتعديل يوثق جميع عمليات الوكلاء والأحداث الأمنية.',
    filterAction: 'تصفية الإجراء',
    searchPlaceholder: 'ابحث في سجل التدقيق...',
    table: {
      timestamp: 'الوقت والتاريخ',
      user: 'الوكيل / المستخدم',
      action: 'الإجراء',
      entity: 'العنصر المستهدف',
      description: 'تفاصيل العملية'
    }
  },

  // Settings Page
  settings: {
    title: 'الإعدادات',
    subtitle: 'تفضيلات مساحة العمل، بيانات الملف الشخصي، الأمان، اللغة، والتهيئة المالية.',
    tabs: {
      profile: 'الملف الشخصي',
      language: 'اللغة والمنطقة',
      security: 'الأمان والجلسات',
      company: 'بيانات الوكالة',
      currency: 'العملات والمدفوعات',
      notifications: 'الإشعارات',
      statuses: 'حالات التذاكر'
    },
    profile: {
      title: 'المعلومات الشخصية',
      subtitle: 'تحديث صورتك الشخصية وبيانات التواصل الخاصة بك.',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      roleTitle: 'المسمى الوظيفي',
      changePhoto: 'تغيير الصورة',
      changePassword: 'تغيير كلمة المرور',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      confirmPassword: 'تأكيد كلمة المرور الجديدة',
      updatePassword: 'تحديث كلمة المرور'
    },
    languageSection: {
      title: 'تفضيلات اللغة واتجاه الواجهة',
      subtitle: 'اختر لغة الواجهة المفضلة واتجاه القراءة المناسب لك.',
      currentLang: 'لغة الواجهة النشطة',
      englishOption: 'English (LTR — من اليسار إلى اليمين)',
      arabicOption: 'العربية (RTL — من اليمين إلى اليسار)',
      description: 'اختيار اللغة العربية سيفعّل تلقائيًا التخطيط من اليمين إلى اليسار وتنسيقات التواريخ والمبالغ المالية المعتمدة.'
    },
    securitySection: {
      title: 'الأمان وإدارة الجلسات',
      twoFactor: 'المصادقة الثنائية (2FA)',
      twoFactorDesc: 'إضافة طبقة أمان إضافية لحسابك التشغيلي.',
      activeSessions: 'الجلسات النشطة',
      activeSessionsDesc: 'متصفح Chrome على Windows • القاهرة، مصر (الجلسة الحالية)',
      revokeOthers: 'إنهاء الجلسات الأخرى',
      signOutAccount: 'تسجيل الخروج من الحساب',
      signOutDesc: 'إنهاء جلستك الحالية على هذا الجهاز والعودة لصفحة الدخول.'
    },
    companySection: {
      title: 'ملف الوكالة والشركة',
      agencyName: 'الاسم القانوني للوكالة',
      iataNumber: 'رمز أياتا الرقمي (IATA)',
      taxId: 'الرقم الضريبي / السجل التجاري',
      address: 'عنوان المقر الرئيسي المسجل',
      saveCompany: 'حفظ بيانات الوكالة'
    },
    currencySection: {
      title: 'العملة وطرق الدفع',
      baseCurrency: 'عملة التشغيل الأساسية',
      acceptedMethods: 'طرق الدفع المعتمدة'
    }
  },

  // Login Page
  login: {
    title: 'تسجيل الدخول إلى AfricaTravel',
    subtitle: 'نظام إدارة وكالات السفر وحجوزات الطيران',
    emailLabel: 'البريد الإلكتروني للعمل',
    emailPlaceholder: 'agent@africatravel.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    rememberMe: 'تذكر هذا الجهاز',
    signInBtn: 'دخول إلى النظام',
    signingIn: 'جاري التحقق...',
    switchLanguage: 'Language / اللغة'
  },

  // Modals & Action Dialogs
  modals: {
    addPayment: {
      title: 'تسجيل دفعة',
      subtitle: 'إضافة دفعة مالية محققة من العميل لحجز هذه التذكرة.',
      amount: 'مبلغ الدفعة (جنيه مصري)',
      method: 'طريقة الدفع',
      ref: 'مرجع المعاملة / رقم الإيصال',
      refPlaceholder: 'مثال: CASH-992 أو POS-1188',
      notes: 'ملاحظات داخلية (اختياري)',
      submit: 'تسجيل الدفعة',
      remainingIs: 'الرصيد المتبقي المستحق:'
    },
    modifyFlight: {
      title: 'تعديل جدول الرحلة',
      subtitle: 'تسجيل تعديل في خط السير، موعد الإقلاع الجديد، ورسوم التعديل.',
      newFlightNumber: 'رقم الرحلة الجديد',
      newDeparture: 'تاريخ ووقت الإقلاع الجديد',
      newArrival: 'تاريخ ووقت الوصول الجديد',
      modFee: 'رسوم التعديل (جنيه مصري)',
      reason: 'سبب التعديل',
      submit: 'حفظ تعديل الرحلة'
    },
    processRefund: {
      title: 'معالجة استرداد التذكرة',
      subtitle: 'التحقق من الرصيد المتاح للاسترداد وإصدار المبلغ للمسافر.',
      availableRefundable: 'المبلغ المتاح للاسترداد:',
      refundAmount: 'مبلغ الاسترداد (جنيه مصري)',
      penaltyFee: 'رسوم الإلغاء / غرامة الوكالة (جنيه مصري)',
      reason: 'سبب الاسترداد',
      submit: 'إجراء الاسترداد'
    },
    deleteTicket: {
      title: 'حذف التذكرة',
      warningPermanent: 'تحذير: حذف نهائي لا يمكن التراجع عنه',
      explanationPermanent: 'سيتم حذف التذكرة نهائيًا بالإضافة إلى جميع المدفوعات والاستردادات المرتبطة بها. لن يمكن استرجاعها بعد ذلك، وسيتم الاحتفاظ فقط بسجل مختصر في سجل النشاط.',
      typeToConfirm: 'اكتب رقم التذكرة للتأكيد'
    },
    notifications: {
      title: 'الإشعارات والتنبيهات',
      subtitle: 'أحدث العمليات التشغيلية وتحديثات التذاكر في النظام',
      viewAll: 'عرض سجل التدقيق الكامل',
      departureSoon: 'موعد السفر يقرب',
      returnSoon: 'موعد العودة يقرب'
    },
    help: {
      title: 'دليل التشغيل لنظام AfricaTravel',
      subtitle: 'إرشادات الاستخدام والتوثيق التشغيلي للنظام',
      workflows: 'أبرز دورات العمل التشغيلية',
      issueTicketDesc: 'انتقل إلى /tickets/new، أدخل بيانات العميل والرحلة والمبالغ المالية. يتم حساب الرصيد المتبقي تلقائيًا.',
      recordPaymentDesc: 'في تفاصيل التذكرة، انقر على "+ إضافة دفعة". المدفوعات متراكمة ويتم التحقق من الرصيد بدقة.',
      modifyFlightDesc: 'في تفاصيل التذكرة، انقر على "تعديل الرحلة". يتم أرشفة الرحلات السابقة في السجل.',
      refundDesc: 'يتم التحقق الصارم من المبالغ القابلة للاسترداد قبل التنفيذ.',
      techSupport: 'الدعم الفني'
    }
  },

  // Validation Errors & Business Rule Messages
  validation: {
    requiredField: 'هذا الحقل مطلوب.',
    paymentExceedsRemaining: 'قيمة الدفعة تتجاوز الرصيد المتبقي.',
    refundExceedsAvailable: 'قيمة الاسترداد تتجاوز المبلغ المتاح للاسترداد.',
    invalidFlightSchedule: 'بيانات مواعيد الرحلة غير صحيحة.',
    invalidDates: 'يجب أن يكون وقت الوصول بعد وقت الإقلاع.',
    zeroOrNegativeAmount: 'يجب أن يكون المبلغ أكبر من الصفر.',
    negativeFee: 'لا يمكن أن تكون الرسوم سالبة.',
    emptyPassenger: 'اسم المسافر مطلوب.',
    invalidTicketPrice: 'يجب أن يكون سعر التذكرة أكبر من الصفر.',
    initialPaymentExceedsPrice: 'لا يمكن أن تتجاوز الدفعة الأولى سعر التذكرة الإجمالي.',
    ticketNotFound: 'التذكرة غير موجودة.',
    customerNotFound: 'العميل غير موجود.',
    invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح.',
    invalidPhone: 'يرجى إدخال رقم هاتف صحيح.',
    returnFlightRequired: 'يرجى ملء جميع تفاصيل رحلة العودة لتذكرة الذهاب والعودة.',
    returnDateAfterDeparture: 'تاريخ ووقت العودة يجب أن يكون بعد تاريخ ووقت الذهاب.',
    returnFlightIncomplete: 'يرجى إكمال جميع بيانات رحلة العودة أو تركها فارغة بالكامل.',
    flightNumberRequired: 'رقم الرحلة مطلوب.'
  },

  // Toast Notification Messages
  toasts: {
    ticketCreated: 'تم إنشاء التذكرة بنجاح.',
    paymentAdded: 'تمت إضافة الدفعة بنجاح.',
    flightModified: 'تم حفظ تعديل الرحلة.',
    refundCreated: 'تم إنشاء طلب الاسترداد.',
    customerCreated: 'تم تسجيل ملف العميل بنجاح.',
    customerUpdated: 'تم تحديث بيانات العميل بنجاح.',
    noteAdded: 'تمت إضافة الملاحظة بنجاح.',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح!',
    passwordChanged: 'تم تغيير كلمة المرور بنجاح!',
    companyUpdated: 'تم تحديث بيانات الوكالة بنجاح!',
    sessionsRevoked: 'تم إنهاء جميع الجلسات النشطة الأخرى',
    signedOut: 'تم تسجيل الخروج بنجاح',
    languageChanged: 'تم تحديث لغة الواجهة بنجاح.',
    ticketCancelled: 'تم إلغاء التذكرة بنجاح.'
  },

  // Time & Relative Formatting
  time: {
    justNow: 'الآن',
    minsAgo: 'منذ {n} دقيقة',
    hoursAgo: 'منذ {n} ساعة',
    daysAgo: 'منذ {n} يوم'
  },

  // Flight Reminders & In-App Notifications
  notifications: {
    departureSoon: 'موعد السفر يقرب',
    returnSoon: 'موعد العودة يقرب'
  }
};
