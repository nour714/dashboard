/**
 * AfricaTravel — Hotel Bookings & AI Voucher Management Page
 */

import { HotelService } from '../services/hotel-service.js';
import { CustomerService } from '../services/customer-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/security.js';
import { t, i18n } from '../i18n/i18n.js';

let cachedBookings = [];
let currentSearch = '';
let currentGeneratedBooking = null;
let isGenerating = false;
let isSaving = false;

/**
 * PDF Voucher translations for multi-language support (EN / FR / AR)
 */
const PDF_LANG = {
  en: {
    dir: 'ltr',
    fontFamily: 'Arial, Helvetica, sans-serif',
    bookingConfirmation: 'Booking Confirmation',
    confirmationNumber: 'CONFIRMATION NUMBER',
    pinCode: 'PIN CODE',
    checkIn: 'CHECK-IN',
    checkOut: 'CHECK-OUT',
    rooms: 'ROOMS',
    nights: 'NIGHTS',
    yourGroup: 'YOUR GROUP',
    adult: '1 adult',
    price: 'PRICE',
    room: '1 room',
    approx: 'approx.',
    subtotal: 'Subtotal',
    forGuest: '(for 1 guest)',
    additionalCharges: 'Additional charges',
    additionalChargesDesc: "The price you see below is an approximate that may include fees based on the maximum occupancy. This can include taxes set by local governments or charges set by the property.",
    vat: 'VAT',
    tourismFee: 'Tourism fee',
    perNights: 'nights',
    propertyServiceCharge: 'Property service charge',
    youllPay: "You'll pay",
    tourismFeeNote: '* Tourism Fee (if applicable) refers to the local Tourism Tax',
    finalPriceNote: "The final price shown is the amount you'll pay to the property.",
    bookingNoCharge: "Booking.com doesn't charge guests any reservation, administration, or other fees.",
    foreignTransaction: 'Your card issuer may charge you a foreign transaction fee.',
    paymentInfo: 'Payment Info',
    handlesPayments: 'handles all payments.',
    acceptedPayments: 'This property accepts the following forms of payment: Cash, Credit Card',
    currencyExchange: 'Currency & Exchange Rate Info',
    youllPayIn: "You'll pay",
    inCurrency: 'in',
    exchangeRateNote: 'according to the exchange rate on the day of payment.',
    estimateNote: 'The amount displayed in EGP is just an estimate based on today\'s exchange rate for',
    additionalInfo: 'Additional Info',
    extraBedNote: "Note that additional supplements (e.g. an extra bed) aren't added in this total.",
    cancelTaxNote: 'If you cancel, applicable taxes may still be charged by the property.',
    noShowNote: "If you don't show up for this booking, and you don't cancel beforehand, the property is liable to charge you the full reservation amount.",
    readImportant: 'Remember to read the Important info below – it could contain important details not mentioned here.',
    guestName: 'Guest name:',
    numberOfGuests: 'Number of guests:',
    mealPlan: 'Meal plan:',
    bedSize: 'Bed Size(s):',
    bedDesc: '1 king bed (181-210 cm wide)',
    prepayment: 'Prepayment :',
    noPrepayment: 'No prepayment is needed.',
    cancellationCost: 'Cancellation cost:',
    cancellationDeadline: "Cancellation deadlines are in the property's local time.",
    importantInfo: 'Important Information',
    noParties: 'This property does not accommodate bachelor(ette) or similar parties.',
    damageDeposit: 'A damage deposit of',
    isRequired: 'is required on arrival.',
    thatsAbout: "That's about",
    depositCash: 'This will be collected as a cash payment. You should be reimbursed on check-out. Your deposit will be refunded in full, in cash, subject to an inspection of the property.',
    hotelPolicies: 'Hotel Policies',
    guestParking: 'Guest parking',
    parkingNote: '• Private parking is possible on site (reservation is not needed) and costs',
    perDay: 'per day.',
    wifiNote: '• WiFi is available in the rooms and is free of charge.',
    needHelp: 'Need Help?',
    viewChange: 'You can always view, change or cancel your booking online at:',
    contactProperty: 'For any questions related to the property, you can contact',
    directlyAt: 'directly at:',
    contactUs: "Or contact us by phone - we're available 24 hours a day:",
    localNumber: 'Local number:',
    whenAbroad: 'When abroad or from',
    travelPeace: 'Travel with peace of mind',
    safetyInfo: 'Looking for info about traveling safely? The safety resource center can help you prepare for your trip and enjoy a safe, relaxing stay.',
    seeSafety: 'See safety resource center',
    emergencyInfo: "We've gathered the most important local phone numbers to help give you complete peace of mind during your stay in",
    seeEmergency: 'See local emergency services',
    printBtn: '🖨️ Print / Save as PDF',
    address: 'Address:',
    phone: 'Phone:',
    gpsCoordinates: 'GPS Coordinates:',
    amenities: 'Private bathroom • Balcony • Garden view • Mountain view • City view • Free toiletries • Shower • Air conditioning • Kitchen • Washing machine • Toilet • Sofa • Towels • Cleaning products • Tile/marble floor • Desk • Soundproofing • TV • Slippers • Refrigerator • Iron • Microwave • Flat-screen TV • Hairdryer • Kitchenware • Kitchenette • Towels/sheets (extra fee) • Wake-up service/Alarm clock • Electric kettle • Dishwasher • Wake-up service • Alarm clock • Wardrobe or closet • Oven • Dining area • Dining table • Clothes rack • Toilet paper • Sofa bed • Carbon monoxide detector • Air purifiers • Hand sanitizer • Single-room AC for guest accommodation',
    dateLocale: 'en-US',
  },
  fr: {
    dir: 'ltr',
    fontFamily: 'Arial, Helvetica, sans-serif',
    bookingConfirmation: 'Confirmation de réservation',
    confirmationNumber: 'NUMÉRO DE CONFIRMATION',
    pinCode: 'CODE PIN',
    checkIn: 'ARRIVÉE',
    checkOut: 'DÉPART',
    rooms: 'CHAMBRES',
    nights: 'NUITS',
    yourGroup: 'VOTRE GROUPE',
    adult: '1 adulte',
    price: 'PRIX',
    room: '1 chambre',
    approx: 'env.',
    subtotal: 'Sous-total',
    forGuest: '(pour 1 voyageur)',
    additionalCharges: 'Frais supplémentaires',
    additionalChargesDesc: "Le prix ci-dessous est une estimation qui peut inclure des frais basés sur l'occupation maximale. Il peut inclure des taxes fixées par les gouvernements locaux ou des frais fixés par l'établissement.",
    vat: 'TVA',
    tourismFee: 'Taxe de séjour',
    perNights: 'nuits',
    propertyServiceCharge: "Frais de service de l'établissement",
    youllPay: 'Vous paierez',
    tourismFeeNote: "* La taxe de séjour (le cas échéant) fait référence à la taxe de séjour locale",
    finalPriceNote: "Le prix final affiché est le montant que vous paierez à l'établissement.",
    bookingNoCharge: "Booking.com ne facture aucun frais de réservation, d'administration ou autre à ses clients.",
    foreignTransaction: "L'émetteur de votre carte peut vous facturer des frais de transaction à l'étranger.",
    paymentInfo: 'Informations de paiement',
    handlesPayments: 'gère tous les paiements.',
    acceptedPayments: "Cet établissement accepte les modes de paiement suivants : Espèces, Carte de crédit",
    currencyExchange: 'Devise et taux de change',
    youllPayIn: 'Vous paierez',
    inCurrency: 'en',
    exchangeRateNote: "selon le taux de change du jour du paiement.",
    estimateNote: "Le montant affiché en EGP est une estimation basée sur le taux de change actuel pour",
    additionalInfo: 'Informations complémentaires',
    extraBedNote: "Notez que les suppléments éventuels (par ex. un lit d'appoint) ne sont pas inclus dans ce total.",
    cancelTaxNote: "En cas d'annulation, les taxes applicables peuvent toujours être facturées par l'établissement.",
    noShowNote: "Si vous ne vous présentez pas pour cette réservation et que vous ne l'annulez pas au préalable, l'établissement est en droit de vous facturer le montant total de la réservation.",
    readImportant: "N'oubliez pas de lire les informations importantes ci-dessous – elles pourraient contenir des détails importants non mentionnés ici.",
    guestName: 'Nom du client :',
    numberOfGuests: 'Nombre de voyageurs :',
    mealPlan: 'Formule repas :',
    bedSize: 'Taille du lit :',
    bedDesc: '1 lit king-size (181-210 cm de large)',
    prepayment: 'Prépaiement :',
    noPrepayment: 'Aucun prépaiement nécessaire.',
    cancellationCost: "Frais d'annulation :",
    cancellationDeadline: "Les délais d'annulation sont dans le fuseau horaire de l'établissement.",
    importantInfo: 'Informations importantes',
    noParties: "Cet établissement n'accueille pas les enterrements de vie de garçon/jeune fille ou événements similaires.",
    damageDeposit: 'Un dépôt de garantie de',
    isRequired: "est requis à l'arrivée.",
    thatsAbout: "Soit environ",
    depositCash: "Ce montant sera collecté en espèces. Vous serez remboursé(e) lors du départ. Votre dépôt sera intégralement remboursé en espèces, sous réserve d'une inspection de l'établissement.",
    hotelPolicies: "Règlement de l'établissement",
    guestParking: 'Parking',
    parkingNote: "• Un parking privé est disponible sur place (sans réservation) et coûte",
    perDay: 'par jour.',
    wifiNote: '• Le WiFi est disponible dans les chambres gratuitement.',
    needHelp: "Besoin d'aide ?",
    viewChange: 'Vous pouvez toujours consulter, modifier ou annuler votre réservation en ligne sur :',
    contactProperty: "Pour toute question relative à l'établissement, vous pouvez contacter",
    directlyAt: 'directement au :',
    contactUs: 'Ou contactez-nous par téléphone - nous sommes disponibles 24h/24 :',
    localNumber: 'Numéro local :',
    whenAbroad: "Depuis l'étranger ou depuis",
    travelPeace: 'Voyagez l\'esprit tranquille',
    safetyInfo: "Vous cherchez des informations pour voyager en toute sécurité ? Le centre de ressources de sécurité peut vous aider à préparer votre voyage et à profiter d'un séjour sûr et relaxant.",
    seeSafety: 'Voir le centre de ressources de sécurité',
    emergencyInfo: "Nous avons rassemblé les numéros de téléphone locaux les plus importants pour vous garantir une tranquillité totale pendant votre séjour en",
    seeEmergency: "Voir les services d'urgence locaux",
    printBtn: '🖨️ Imprimer / Enregistrer en PDF',
    address: 'Adresse :',
    phone: 'Téléphone :',
    gpsCoordinates: 'Coordonnées GPS :',
    amenities: "Salle de bains privative • Balcon • Vue sur le jardin • Vue sur la montagne • Vue sur la ville • Articles de toilette gratuits • Douche • Climatisation • Cuisine • Lave-linge • Toilettes • Canapé • Serviettes • Produits d'entretien • Sol en carrelage/marbre • Bureau • Insonorisation • TV • Chaussons • Réfrigérateur • Fer à repasser • Micro-ondes • TV à écran plat • Sèche-cheveux • Ustensiles de cuisine • Kitchenette • Serviettes/draps (frais supplémentaires) • Réveil • Bouilloire électrique • Lave-vaisselle • Service de réveil • Réveil • Armoire ou placard • Four • Coin repas • Table à manger • Portant • Papier toilette • Canapé-lit • Détecteur de monoxyde de carbone • Purificateurs d'air • Désinfectant pour les mains • Climatisation individuelle pour le logement",
    dateLocale: 'fr-FR',
  },
  ar: {
    dir: 'rtl',
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    bookingConfirmation: 'تأكيد الحجز',
    confirmationNumber: 'رقم التأكيد',
    pinCode: 'الرقم السري',
    checkIn: 'تسجيل الوصول',
    checkOut: 'تسجيل المغادرة',
    rooms: 'الغرف',
    nights: 'الليالي',
    yourGroup: 'مجموعتك',
    adult: 'بالغ واحد',
    price: 'السعر',
    room: 'غرفة واحدة',
    approx: 'تقريباً',
    subtotal: 'المجموع الفرعي',
    forGuest: '(لضيف واحد)',
    additionalCharges: 'رسوم إضافية',
    additionalChargesDesc: 'السعر الذي تراه أدناه هو تقدير تقريبي قد يشمل رسومًا بناءً على الإشغال الأقصى. يمكن أن يشمل ذلك ضرائب تفرضها الحكومات المحلية أو رسوم يحددها مكان الإقامة.',
    vat: 'ضريبة القيمة المضافة',
    tourismFee: 'رسوم السياحة',
    perNights: 'ليالي',
    propertyServiceCharge: 'رسوم خدمة مكان الإقامة',
    youllPay: 'ستدفع',
    tourismFeeNote: '* رسوم السياحة (إن وجدت) تشير إلى ضريبة السياحة المحلية',
    finalPriceNote: 'السعر النهائي المعروض هو المبلغ الذي ستدفعه لمكان الإقامة.',
    bookingNoCharge: 'لا تفرض Booking.com أي رسوم حجز أو إدارية أو أي رسوم أخرى على النزلاء.',
    foreignTransaction: 'قد يفرض مصدر بطاقتك رسوم معاملات أجنبية.',
    paymentInfo: 'معلومات الدفع',
    handlesPayments: 'يتولى جميع المدفوعات.',
    acceptedPayments: 'يقبل مكان الإقامة وسائل الدفع التالية: نقداً، بطاقة ائتمان',
    currencyExchange: 'معلومات العملة وسعر الصرف',
    youllPayIn: 'ستدفع',
    inCurrency: 'بعملة',
    exchangeRateNote: 'وفقاً لسعر الصرف في يوم الدفع.',
    estimateNote: 'المبلغ المعروض بالجنيه المصري هو مجرد تقدير بناءً على سعر الصرف الحالي لـ',
    additionalInfo: 'معلومات إضافية',
    extraBedNote: 'يرجى ملاحظة أن الإضافات (مثل سرير إضافي) غير مدرجة في هذا الإجمالي.',
    cancelTaxNote: 'في حالة الإلغاء، قد يتم تحصيل الضرائب المطبقة من قبل مكان الإقامة.',
    noShowNote: 'إذا لم تحضر لهذا الحجز ولم تقم بإلغائه مسبقاً، يحق لمكان الإقامة تحصيل المبلغ الكامل للحجز.',
    readImportant: 'تذكر قراءة المعلومات المهمة أدناه – قد تحتوي على تفاصيل مهمة غير مذكورة هنا.',
    guestName: 'اسم الضيف:',
    numberOfGuests: 'عدد الضيوف:',
    mealPlan: 'خطة الوجبات:',
    bedSize: 'حجم السرير:',
    bedDesc: 'سرير كينج واحد (عرض 181-210 سم)',
    prepayment: 'الدفع المسبق:',
    noPrepayment: 'لا حاجة للدفع المسبق.',
    cancellationCost: 'تكلفة الإلغاء:',
    cancellationDeadline: 'مواعيد الإلغاء بالتوقيت المحلي لمكان الإقامة.',
    importantInfo: 'معلومات مهمة',
    noParties: 'لا يستضيف مكان الإقامة هذا حفلات توديع العزوبية أو ما شابهها.',
    damageDeposit: 'مبلغ تأمين ضد الأضرار بقيمة',
    isRequired: 'مطلوب عند الوصول.',
    thatsAbout: 'أي ما يعادل تقريباً',
    depositCash: 'سيتم تحصيله نقداً. سيتم رد المبلغ عند المغادرة. سيتم رد التأمين بالكامل نقداً، بعد فحص مكان الإقامة.',
    hotelPolicies: 'سياسات الفندق',
    guestParking: 'موقف السيارات',
    parkingNote: '• يتوفر موقف سيارات خاص في الموقع (بدون حجز مسبق) بتكلفة',
    perDay: 'في اليوم.',
    wifiNote: '• خدمة الواي فاي متوفرة في الغرف مجاناً.',
    needHelp: 'هل تحتاج مساعدة؟',
    viewChange: 'يمكنك دائماً عرض أو تعديل أو إلغاء حجزك عبر الإنترنت على:',
    contactProperty: 'لأي أسئلة متعلقة بمكان الإقامة، يمكنك التواصل مع',
    directlyAt: 'مباشرة على:',
    contactUs: 'أو تواصل معنا هاتفياً - نحن متاحون على مدار الساعة:',
    localNumber: 'الرقم المحلي:',
    whenAbroad: 'عند التواجد خارج البلاد أو من',
    travelPeace: 'سافر بأمان وراحة بال',
    safetyInfo: 'هل تبحث عن معلومات للسفر بأمان؟ يمكن لمركز موارد السلامة مساعدتك في التحضير لرحلتك والاستمتاع بإقامة آمنة ومريحة.',
    seeSafety: 'اطلع على مركز موارد السلامة',
    emergencyInfo: 'لقد جمعنا أهم أرقام الهواتف المحلية لمنحك راحة بال كاملة أثناء إقامتك في',
    seeEmergency: 'اطلع على خدمات الطوارئ المحلية',
    printBtn: '🖨️ طباعة / حفظ كـ PDF',
    address: 'العنوان:',
    phone: 'الهاتف:',
    gpsCoordinates: 'إحداثيات GPS:',
    amenities: 'حمام خاص • شرفة • إطلالة على الحديقة • إطلالة على الجبل • إطلالة على المدينة • أدوات نظافة مجانية • دش • تكييف هواء • مطبخ • غسالة ملابس • مرحاض • أريكة • مناشف • مواد تنظيف • أرضيات بلاط/رخام • مكتب • عزل صوتي • تلفزيون • شباشب • ثلاجة • مكواة • ميكروويف • تلفزيون بشاشة مسطحة • مجفف شعر • أدوات مطبخ • مطبخ صغير • مناشف/ملاءات (برسوم إضافية) • خدمة إيقاظ/منبه • غلاية كهربائية • غسالة أطباق • خدمة إيقاظ • منبه • خزانة ملابس • فرن • منطقة طعام • طاولة طعام • علاقة ملابس • ورق تواليت • أريكة سرير • كاشف أول أكسيد الكربون • أجهزة تنقية الهواء • معقم يدين • تكييف هواء فردي لسكن الضيوف',
    dateLocale: 'ar-EG',
  },
  de: {
    dir: 'ltr',
    fontFamily: 'Arial, Helvetica, sans-serif',
    bookingConfirmation: 'Buchungsbestätigung',
    confirmationNumber: 'BUCHUNGSNUMMER',
    pinCode: 'PIN-CODE',
    checkIn: 'ANREISE',
    checkOut: 'ABREISE',
    rooms: 'ZIMMER',
    nights: 'NÄCHTE',
    yourGroup: 'IHRE GRUPPE',
    adult: '1 Erwachsener',
    price: 'PREIS',
    room: '1 Zimmer',
    approx: 'ca.',
    subtotal: 'Zwischensumme',
    forGuest: '(für 1 Gast)',
    additionalCharges: 'Zusätzliche Kosten',
    additionalChargesDesc: 'Der unten angezeigte Preis ist ein Richtwert, der möglicherweise Gebühren für die Maximalbelegung enthält.',
    vat: 'Mehrwertsteuer (MwSt.)',
    tourismFee: 'Tourismusabgabe / Kurtaxe',
    perNights: 'Nächte',
    propertyServiceCharge: 'Servicegebühr der Unterkunft',
    youllPay: 'Sie zahlen',
    tourismFeeNote: '* Tourismusabgabe (falls zutreffend) bezieht sich auf die lokale Kurtaxe',
    finalPriceNote: 'Der angezeigte Endpreis ist der Betrag, den Sie an die Unterkunft zahlen.',
    bookingNoCharge: 'Booking.com erhebt von Gästen keine Reservierungs-, Verwaltungs- oder sonstigen Gebühren.',
    foreignTransaction: 'Ihr Kartenaussteller kann Ihnen eine Auslandseinsatzgebühr berechnen.',
    paymentInfo: 'Zahlungsinformationen',
    handlesPayments: 'wickelt alle Zahlungen ab.',
    acceptedPayments: 'Diese Unterkunft akzeptiert folgende Zahlungsarten: Barzahlung, Kreditkarte',
    currencyExchange: 'Währung & Wechselkurs',
    youllPayIn: 'Sie zahlen an',
    inCurrency: 'in',
    exchangeRateNote: 'nach dem Wechselkurs am Tag der Zahlung.',
    estimateNote: 'Der in EGP angezeigte Betrag ist eine Schätzung basierend auf dem heutigen Wechselkurs für',
    additionalInfo: 'Zusätzliche Informationen',
    extraBedNote: 'Zusätzliche Leistungen (z. B. Zustellbett) sind nicht in diesem Gesamtbetrag enthalten.',
    cancelTaxNote: 'Im Falle einer Stornierung können von der Unterkunft Steuern erhoben werden.',
    noShowNote: 'Wenn Sie nicht anreisen und nicht vorher stornieren, kann Ihnen der volle Betrag berechnet werden.',
    readImportant: 'Bitte lesen Sie die wichtigen Informationen unten – sie enthalten wichtige Details.',
    guestName: 'Name des Gastes:',
    numberOfGuests: 'Anzahl der Gäste:',
    mealPlan: 'Verpflegung:',
    bedSize: 'Bettengröße(n):',
    bedDesc: '1 großes Doppelbett (Kingsize, 181-210 cm breit)',
    prepayment: 'Vorauszahlung:',
    noPrepayment: 'Keine Vorauszahlung erforderlich.',
    cancellationCost: 'Stornierungskosten:',
    cancellationDeadline: 'Stornierungsfristen richten sich nach der Ortszeit der Unterkunft.',
    importantInfo: 'Wichtige Informationen',
    noParties: 'In dieser Unterkunft sind Junggesellen-/Junggesellinnenabschiede nicht gestattet.',
    damageDeposit: 'Eine Schadenskaution in Höhe von',
    isRequired: 'ist bei der Ankunft fällig.',
    thatsAbout: 'Das sind etwa',
    depositCash: 'Die Kaution wird in bar hinterlegt und beim Check-out nach beanstandungsloser Abnahme erstattet.',
    hotelPolicies: 'Richtlinien der Unterkunft',
    guestParking: 'Parkmöglichkeiten',
    parkingNote: '• Private Parkplätze stehen an der Unterkunft zur Verfügung und kosten',
    perDay: 'pro Tag.',
    wifiNote: '• WLAN ist in allen Zimmern nutzbar und ist kostenfrei.',
    needHelp: 'Brauchen Sie Hilfe?',
    viewChange: 'Sie können Ihre Buchung jederzeit online einsehen, ändern oder stornieren unter:',
    contactProperty: 'Bei Fragen zur Unterkunft können Sie',
    directlyAt: 'direkt kontaktieren unter:',
    contactUs: 'Oder kontaktieren Sie uns telefonisch rund um die Uhr:',
    localNumber: 'Lokale Nummer:',
    whenAbroad: 'Aus dem Ausland oder von',
    travelPeace: 'Sorgenfrei reisen',
    safetyInfo: 'Möchten Sie sich über sicheres Reisen informieren? Unser Sicherheitszentrum hilft Ihnen dabei.',
    seeSafety: 'Zum Sicherheitszentrum',
    emergencyInfo: 'Wir haben die wichtigsten Notrufnummern für Ihren Aufenthalt zusammengestellt in',
    seeEmergency: 'Notdienste vor Ort ansehen',
    printBtn: '🖨️ Drucken / Als PDF speichern',
    address: 'Adresse:',
    phone: 'Telefon:',
    gpsCoordinates: 'GPS-Koordinaten:',
    amenities: 'Eigenes Badezimmer • Balkon • Gartenblick • Bergblick • Stadtblick • Kostenlose Pflegeprodukte • Dusche • Klimaanlage • Küche • Waschmaschine • WC • Sofa • Handtücher • Fliesen-/Marmorboden • Schreibtisch • Schallisolierung • TV • Hausschuhe • Kühlschrank • Bügeleisen • Mikrowelle • Flachbild-TV • Haartrockner • Küchenutensilien • Tee-/Kaffeekocher • Spülmaschine • Weckservice • Kleiderschrank • Backofen • Essbereich • Esstisch • Wäscheständer • Toilettenpapier • Schlafsofa • Luftreiniger • Händedesinfektionsmittel',
    dateLocale: 'de-DE'
  },
  es: {
    dir: 'ltr',
    fontFamily: 'Arial, Helvetica, sans-serif',
    bookingConfirmation: 'Confirmación de la reserva',
    confirmationNumber: 'NÚMERO DE CONFIRMACIÓN',
    pinCode: 'CÓDIGO PIN',
    checkIn: 'ENTRADA',
    checkOut: 'SALIDA',
    rooms: 'HABITACIONES',
    nights: 'NOCHES',
    yourGroup: 'TU GRUPO',
    adult: '1 adulto',
    price: 'PRECIO',
    room: '1 habitación',
    approx: 'aprox.',
    subtotal: 'Subtotal',
    forGuest: '(para 1 persona)',
    additionalCharges: 'Cargos adicionales',
    additionalChargesDesc: 'El precio indicado a continuación es aproximado y puede incluir suplementos según la ocupación máxima.',
    vat: 'IVA',
    tourismFee: 'Tasa turística',
    perNights: 'noches',
    propertyServiceCharge: 'Cargo por servicio del alojamiento',
    youllPay: 'Pagarás',
    tourismFeeNote: '* La tasa turística se refiere al impuesto turístico local aplicable',
    finalPriceNote: 'El precio final mostrado es el importe que abonarás al alojamiento.',
    bookingNoCharge: 'Booking.com no cobra a los clientes gastos de gestión ni comisiones de reserva.',
    foreignTransaction: 'La entidad emisora de tu tarjeta puede cobrarte una comisión por transacciones internacionales.',
    paymentInfo: 'Información sobre el pago',
    handlesPayments: 'gestiona todos los pagos.',
    acceptedPayments: 'Este alojamiento acepta las siguientes formas de pago: Efectivo, Tarjeta de crédito',
    currencyExchange: 'Información de divisa y tipo de cambio',
    youllPayIn: 'Pagarás a',
    inCurrency: 'en',
    exchangeRateNote: 'según el tipo de cambio del día en que se efectúe el pago.',
    estimateNote: 'El importe mostrado en EGP es una estimación basada en el tipo de cambio de hoy para',
    additionalInfo: 'Información adicional',
    extraBedNote: 'Ten en cuenta que los suplementos (p. ej., camas supletorias) no están incluidos en el total.',
    cancelTaxNote: 'En caso de cancelación, el alojamiento puede aplicar impuestos correspondientes.',
    noShowNote: 'Si no te presentas y no cancelas antes, el alojamiento te cobrará el importe íntegro.',
    readImportant: 'Recuerda leer la Información importante más abajo para más detalles.',
    guestName: 'Nombre del huésped:',
    numberOfGuests: 'Número de huéspedes:',
    mealPlan: 'Régimen de comidas:',
    bedSize: 'Tamaño de cama(s):',
    bedDesc: '1 cama extragrande (ancho: 181-210 cm)',
    prepayment: 'Pago por adelantado:',
    noPrepayment: 'No se requiere pago por adelantado.',
    cancellationCost: 'Gastos de cancelación:',
    cancellationDeadline: 'Las fechas límite de cancelación se rigen por la hora local del alojamiento.',
    importantInfo: 'Información importante',
    noParties: 'En este alojamiento no se pueden celebrar despedidas de soltero o soltera ni fiestas similares.',
    damageDeposit: 'Se requiere un depósito por daños de',
    isRequired: 'a la llegada.',
    thatsAbout: 'Equivale a unos',
    depositCash: 'Se cobrará en efectivo y se devolverá íntegramente al hacer el check-out tras revisar el alojamiento.',
    hotelPolicies: 'Condiciones del alojamiento',
    guestParking: 'Aparcamiento para huéspedes',
    parkingNote: '• Hay parking privado en el establecimiento (no es necesario reservar) por',
    perDay: 'al día.',
    wifiNote: '• Hay conexión a internet Wi-Fi disponible en las habitaciones gratis.',
    needHelp: '¿Necesitas ayuda?',
    viewChange: 'Puedes ver, modificar o cancelar tu reserva por internet en:',
    contactProperty: 'Para cualquier duda sobre el alojamiento, contacta con',
    directlyAt: 'directamente en:',
    contactUs: 'O llámanos las 24 horas del día:',
    localNumber: 'Número local:',
    whenAbroad: 'Desde el extranjero o desde',
    travelPeace: 'Viaja con total tranquilidad',
    safetyInfo: '¿Buscas información para viajar con seguridad? El centro de recursos te ayuda a preparar tu estancia.',
    seeSafety: 'Ver centro de recursos de seguridad',
    emergencyInfo: 'Hemos reunido los teléfonos locales más importantes durante tu estancia en',
    seeEmergency: 'Ver teléfonos de emergencia locales',
    printBtn: '🖨️ Imprimir / Guardar como PDF',
    address: 'Dirección:',
    phone: 'Teléfono:',
    gpsCoordinates: 'Coordenadas GPS:',
    amenities: 'Baño privado • Balcón • Vistas al jardín • Vistas a la montaña • Vistas a la ciudad • Artículos de aseo gratis • Ducha • Aire acondicionado • Cocina • Lavadora • WC • Sofá • Toallas • Suelo de baldosa/mármol • Escritorio • Insonorización • TV • Zapatillas • Nevera • Plancha • Microondas • TV de pantalla plana • Secador de pelo • Utensilios de cocina • Zona de cocina • Hervidor eléctrico • Lavavajillas • Servicio de despertador • Armario • Horno • Zona de comedor • Mesa de comedor • Tendedero • Papel higiénico • Sofá cama • Purificadores de aire • Desinfectante de manos',
    dateLocale: 'es-ES'
  },
  tr: {
    dir: 'ltr',
    fontFamily: 'Arial, Helvetica, sans-serif',
    bookingConfirmation: 'Rezervasyon Onayı',
    confirmationNumber: 'ONAY NUMARASI',
    pinCode: 'PIN KODU',
    checkIn: 'GİRİŞ',
    checkOut: 'ÇIKIŞ',
    rooms: 'ODALAR',
    nights: 'GECE',
    yourGroup: 'GRUBUNUZ',
    adult: '1 yetişkin',
    price: 'FİYAT',
    room: '1 oda',
    approx: 'yaklaşık',
    subtotal: 'Ara toplam',
    forGuest: '(1 kişi için)',
    additionalCharges: 'Ek ücretler',
    additionalChargesDesc: 'Aşağıda gösterilen fiyat yaklaşık bir değerdir ve azami doluluğa göre yerel vergileri veya tesis ücretlerini içerebilir.',
    vat: 'KDV',
    tourismFee: 'Konaklama / Şehir vergisi',
    perNights: 'gece',
    propertyServiceCharge: 'Tesis hizmet bedeli',
    youllPay: 'Ödeyeceğiniz tutar',
    tourismFeeNote: '* Varsa şehir/turizm vergisi yerel kurallara göre uygulanır',
    finalPriceNote: 'Gösterilen nihai tutar, tesise doğrudan ödeyeceğiniz bedeldir.',
    bookingNoCharge: 'Booking.com konuklardan hiçbir rezervasyon veya işlem ücreti talep etmez.',
    foreignTransaction: 'Kartınızı veren banka yabancı para işlem ücreti uygulayabilir.',
    paymentInfo: 'Ödeme Bilgileri',
    handlesPayments: 'tüm ödemeleri yönetmektedir.',
    acceptedPayments: 'Bu tesis şu ödeme yöntemlerini kabul etmektedir: Nakit, Kredi Kartı',
    currencyExchange: 'Para Birimi ve Döviz Kuru Bilgisi',
    youllPayIn: 'Ödemenizi şu tesise yapacaksınız:',
    inCurrency: 'para birimiyle:',
    exchangeRateNote: 'ödeme günündeki döviz kuruna göre tahsil edilir.',
    estimateNote: 'EGP olarak gösterilen tutar yalnızca bugünkü döviz kuruna dayalı bir tahmindir:',
    additionalInfo: 'Ek Bilgiler',
    extraBedNote: 'İlave hizmetlerin (örn. ekstra yatak) bu toplama dahil olmadığını lütfen unutmayın.',
    cancelTaxNote: 'İptal durumunda yürürlükteki vergiler tesis tarafından tahsil edilebilir.',
    noShowNote: 'Giriş yapmaz ve önceden iptal etmezseniz tesis rezervasyon tutarının tamamını tahsil edebilir.',
    readImportant: 'Aşağıdaki Önemli Bilgiler bölümünü okumayı unutmayın.',
    guestName: 'Konuk adı:',
    numberOfGuests: 'Konuk sayısı:',
    mealPlan: 'Öğün planı:',
    bedSize: 'Yatak boyutu:',
    bedDesc: '1 ekstra büyük çift kişilik yatak (181-210 cm genişlik)',
    prepayment: 'Ön ödeme:',
    noPrepayment: 'Ön ödeme gerekmez.',
    cancellationCost: 'İptal ücreti:',
    cancellationDeadline: 'İptal süreleri tesisin yerel saatine göredir.',
    importantInfo: 'Önemli Bilgiler',
    noParties: 'Bu tesiste bekarlığa veda veya benzeri partiler düzenlenemez.',
    damageDeposit: 'Girişte şu tutarda hasar güvence bedeli alınır:',
    isRequired: 'giriş sırasında talep edilir.',
    thatsAbout: 'Yaklaşık karşılığı:',
    depositCash: 'Nakit olarak alınır ve çıkışta tesis kontrol edildikten sonra nakit olarak iade edilir.',
    hotelPolicies: 'Tesis Kuralları',
    guestParking: 'Otopark',
    parkingNote: '• Tesis bünyesinde özel park yeri mevcuttur (rezervasyon gerekmez) ve günlük ücreti:',
    perDay: 'günlük.',
    wifiNote: '• WiFi odalarda mevcuttur ve ücretsizdir.',
    needHelp: 'Yardıma mı ihtiyacınız var?',
    viewChange: 'Rezervasyonunuzu dilediğiniz zaman online olarak görüntüleyebilir, değiştirebilir veya iptal edebilirsiniz:',
    contactProperty: 'Tesisle ilgili tüm sorularınız için doğrudan iletişime geçebilirsiniz:',
    directlyAt: 'Telefon:',
    contactUs: 'Veya bizi arayın - günün 24 saati hizmetinizdeyiz:',
    localNumber: 'Yerel numara:',
    whenAbroad: 'Yurt dışından veya şuradan:',
    travelPeace: 'Gönül rahatlığıyla seyahat edin',
    safetyInfo: 'Güvenli seyahat hakkında bilgi mi arıyorsunuz? Güvenlik merkezimiz hazırlık yapmanıza yardımcı olabilir.',
    seeSafety: 'Güvenlik merkezini görüntüle',
    emergencyInfo: 'Seyahatiniz sırasında içinizin rahat olması için yerel acil durum numaralarını derledik:',
    seeEmergency: 'Yerel acil durum servislerini gör',
    printBtn: '🖨️ Yazdır / PDF olarak kaydet',
    address: 'Adres:',
    phone: 'Telefon:',
    gpsCoordinates: 'GPS Koordinatları:',
    amenities: 'Özel banyo • Balkon • Bahçe manzarası • Dağ manzarası • Şehir manzarası • Ücretsiz banyo malzemeleri • Duş • Klima • Mutfak • Çamaşır makinesi • Tuvalet • Kanepe • Havlular • Karo/mermer zemin • Çalışma masası • Ses yalıtımı • TV • Terlik • Buzdolabı • Ütü • Mikrodalga fırın • Düz ekran TV • Saç kurutma makinesi • Mutfak eşyaları • Mutfak alanı • Elektrikli su ısıtıcısı • Bulaşık makinesi • Uyandırma servisi • Gardırop • Fırın • Yemek alanı • Yemek masası • Çamaşır askılığı • Tuvalet kağıdı • Çekyat • Hava temizleyiciler • El dezenfektanı',
    dateLocale: 'tr-TR'
  }
};

/**
 * Automatically detect the native PDF language based on hotel destination / country / city
 */
export function detectCountryLanguage(destination = '', hotelCountry = '', hotelCity = '', hotelAddress = '', hotelName = '') {
  // Comprehensive mapping of IATA airport codes to country native languages
  const IATA_MAP = {
    // Arab countries (ar)
    'DXB': 'ar', 'DWC': 'ar', 'AUH': 'ar', 'SHJ': 'ar', 'RKT': 'ar',
    'RUH': 'ar', 'JED': 'ar', 'MED': 'ar', 'DMM': 'ar', 'AHB': 'ar', 'TUU': 'ar', 'ELQ': 'ar',
    'CAI': 'ar', 'HBE': 'ar', 'ALY': 'ar', 'SSH': 'ar', 'HRG': 'ar', 'LXR': 'ar', 'ASW': 'ar',
    'DOH': 'ar', 'KWI': 'ar', 'BAH': 'ar', 'MCT': 'ar', 'SLL': 'ar',
    'AMM': 'ar', 'AQJ': 'ar', 'BEY': 'ar', 'BGW': 'ar', 'EBL': 'ar', 'BSR': 'ar',
    'CMN': 'ar', 'RAK': 'ar', 'TNG': 'ar', 'AGA': 'ar', 'FEZ': 'ar',
    'TUN': 'ar', 'MIR': 'ar', 'DJE': 'ar', 'ALG': 'ar', 'ORN': 'ar', 'CZL': 'ar',
    'KRT': 'ar', 'TIP': 'ar', 'BEN': 'ar',

    // French countries (fr)
    'CDG': 'fr', 'ORY': 'fr', 'BVA': 'fr', 'NCE': 'fr', 'LYS': 'fr', 'MRS': 'fr',
    'BOD': 'fr', 'TLS': 'fr', 'SXB': 'fr', 'LIL': 'fr', 'NTE': 'fr',
    'BRU': 'fr', 'CRL': 'fr', 'GVA': 'fr',

    // German countries (de)
    'BER': 'de', 'TXL': 'de', 'SXF': 'de', 'FRA': 'de', 'MUC': 'de', 'HAM': 'de',
    'CGN': 'de', 'DUS': 'de', 'STR': 'de', 'DRS': 'de', 'LEJ': 'de', 'HAJ': 'de', 'NUE': 'de',
    'VIE': 'de', 'SZG': 'de', 'INN': 'de', 'GRZ': 'de', 'ZRH': 'de', 'BSL': 'de', 'BRN': 'de',

    // Spanish countries (es)
    'MAD': 'es', 'BCN': 'es', 'VLC': 'es', 'AGP': 'es', 'SVQ': 'es', 'BIO': 'es',
    'GRX': 'es', 'ALC': 'es', 'IBZ': 'es', 'PMI': 'es', 'TFS': 'es', 'TFN': 'es', 'LPA': 'es', 'ACE': 'es',
    'MEX': 'es', 'CUN': 'es', 'GDL': 'es', 'EZE': 'es', 'AEP': 'es', 'BOG': 'es', 'MDE': 'es',
    'LIM': 'es', 'SCL': 'es',

    // Turkish countries (tr)
    'IST': 'tr', 'SAW': 'tr', 'ISL': 'tr', 'AYT': 'tr', 'ESB': 'tr', 'ADB': 'tr',
    'BJV': 'tr', 'DLM': 'tr', 'TZX': 'tr', 'GZT': 'tr', 'ADA': 'tr',

    // English speaking / Global fallback
    'LHR': 'en', 'LGW': 'en', 'STN': 'en', 'LTN': 'en', 'LCY': 'en', 'MAN': 'en', 'EDI': 'en', 'BHX': 'en',
    'JFK': 'en', 'EWR': 'en', 'LGA': 'en', 'LAX': 'en', 'MIA': 'en', 'MCO': 'en', 'ORD': 'en', 'LAS': 'en', 'SFO': 'en',
    'SYD': 'en', 'MEL': 'en', 'BNE': 'en', 'PER': 'en', 'YYZ': 'en', 'YVR': 'en', 'DUB': 'en',
    'KUL': 'en', 'SIN': 'en', 'BKK': 'en'
  };

  // 1. Direct match on 3-letter IATA code if provided
  const rawClean = (destination || '').trim().toUpperCase();
  if (IATA_MAP[rawClean]) {
    return IATA_MAP[rawClean];
  }

  // Check any 3-letter IATA token in inputs
  const combinedRaw = `${destination || ''} ${hotelCountry || ''} ${hotelCity || ''}`.toUpperCase();
  const tokens = combinedRaw.match(/\b[A-Z]{3}\b/g) || [];
  for (const token of tokens) {
    if (IATA_MAP[token]) {
      return IATA_MAP[token];
    }
  }

  // 2. Keyword checks across destination, hotelCountry, hotelCity, hotelAddress, hotelName
  const combined = `${destination || ''} ${hotelCountry || ''} ${hotelCity || ''} ${hotelAddress || ''} ${hotelName || ''}`.toLowerCase();

  // Arabic countries
  const arabicKeywords = [
    'saudi', 'السعودية', 'الرياض', 'مكة', 'جدة', 'المدينة', 'riyadh', 'makkah', 'mecca', 'jeddah', 'medina', 'dammam', 'ksa',
    'uae', 'emirates', 'الامارات', 'الإمارات', 'dubai', 'دبي', 'abu dhabi', 'أبوظبي', 'sharjah', 'الشارقة', 'ajman', 'عجمان', 'ras al khaimah', 'رأس الخيمة',
    'egypt', 'مصر', 'cairo', 'القاهرة', 'alexandria', 'الاسكندرية', 'الإسكندرية', 'اسكندرية', 'sharm', 'شرم', 'hurghada', 'الغردقة', 'luxor', 'الأقصر', 'aswan', 'أسوان', 'giza', 'الجيزة',
    'qatar', 'قطر', 'doha', 'الدوحة',
    'kuwait', 'الكويت',
    'bahrain', 'البحرين', 'manama', 'المنامة',
    'oman', 'عمان', 'عُمان', 'muscat', 'مسقط', 'salalah', 'صلالة',
    'jordan', 'الأردن', 'الاردن', 'amman', 'عمان', 'aqaba', 'العقبة',
    'lebanon', 'لبنان', 'beirut', 'بيروت',
    'morocco', 'المغرب', 'casablanca', 'الدار البيضاء', 'marrakech', 'مراكش', 'rabat', 'الرباط', 'tangier', 'طنجة', 'agadir', 'أكادير', 'fez', 'فاس',
    'tunisia', 'تونس', 'tunis',
    'algeria', 'الجزائر', 'algiers',
    'iraq', 'العراق', 'baghdad', 'بغداد', 'erbil', 'أربيل',
    'libya', 'ليبيا', 'tripoli', 'طرابلس',
    'sudan', 'السودان', 'khartoum', 'الخرطوم',
    'yemen', 'اليمن', 'sanaa', 'صنعاء', 'aden', 'عدن'
  ];
  if (arabicKeywords.some(k => combined.includes(k))) {
    return 'ar';
  }

  // French countries
  const frenchKeywords = [
    'france', 'فرنسا', 'paris', 'باريس', 'nice', 'نيس', 'cannes', 'كان', 'lyon', 'ليون', 'marseille', 'مارسيليا',
    'bordeaux', 'بوردو', 'strasbourg', 'ستراسبورغ', 'toulouse', 'تولوز', 'monaco', 'موناكو', 'chamonix',
    'belgium', 'بلجيكا', 'brussels', 'بروكسل',
    'switzerland', 'سويسرا', 'geneva', 'جنيف', 'lausanne', 'لوزان'
  ];
  if (frenchKeywords.some(k => combined.includes(k))) {
    return 'fr';
  }

  // German countries
  const germanKeywords = [
    'germany', 'ألمانيا', 'المانيا', 'berlin', 'برلين', 'munich', 'ميونخ', 'frankfurt', 'فرانكفورت', 'hamburg', 'هامبورغ',
    'cologne', 'كولونيا', 'düsseldorf', 'dusseldorf', 'دوسلدورف', 'stuttgart', 'شتوتغارت',
    'austria', 'النمسا', 'vienna', 'فيينا', 'salzburg', 'سالزبورغ',
    'zurich', 'زيورخ', 'basel', 'بازل'
  ];
  if (germanKeywords.some(k => combined.includes(k))) {
    return 'de';
  }

  // Spanish countries
  const spanishKeywords = [
    'spain', 'إسبانيا', 'اسبانيا', 'madrid', 'مدريد', 'barcelona', 'برشلونة', 'valencia', 'فالنسيا',
    'seville', 'sevilla', 'إشبيلية', 'malaga', 'مالقة', 'ibiza', 'إيبيزا', 'mallorca', 'مايوركا', 'canary',
    'mexico', 'المكسيك', 'argentina', 'الأرجنتين', 'colombia', 'كولومبيا', 'chile', 'تشيلي'
  ];
  if (spanishKeywords.some(k => combined.includes(k))) {
    return 'es';
  }

  // Turkish countries
  const turkishKeywords = [
    'turkey', 'türkiye', 'تركيا', 'istanbul', 'إسطنبول', 'اسطنبول', 'antalya', 'أنطاليا', 'انطاليا',
    'ankara', 'أنقرة', 'انقرة', 'izmir', 'إزمير', 'ازمير', 'bodrum', 'بودروم', 'trabzon', 'طرابزون',
    'bursa', 'بورصة', 'cappadocia', 'كابادوكيا'
  ];
  if (turkishKeywords.some(k => combined.includes(k))) {
    return 'tr';
  }

  // Default to English (UK, USA, Australia, Malaysia, Singapore, global fallback)
  return 'en';
}

/**
 * Format ISO date for clean display
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Localize room type for PDF voucher
 */
function localizeRoomType(roomType, lang) {
  if (!roomType || lang === 'en') return roomType || 'Deluxe King Room';
  const r = (roomType || '').toLowerCase();
  if (lang === 'ar') {
    if (r.includes('studio') && r.includes('balcony')) return 'استوديو مع شرفة';
    if (r.includes('studio')) return 'استوديو ديلوكس';
    if (r.includes('deluxe') && (r.includes('king') || r.includes('double'))) return 'غرفة ديلوكس كينج';
    if (r.includes('king')) return 'غرفة بسرير كينج';
    if (r.includes('standard') || r.includes('double')) return 'غرفة مزدوجة قياسية';
    if (r.includes('suite')) return 'جناح فندقي تنفيذي';
    if (r.includes('twin')) return 'غرفة توأم لشخصين';
    return roomType;
  } else if (lang === 'fr') {
    if (r.includes('studio') && r.includes('balcony')) return 'Studio avec balcon';
    if (r.includes('studio')) return 'Studio Deluxe';
    if (r.includes('deluxe') && (r.includes('king') || r.includes('double'))) return 'Chambre Lit King-Size Deluxe';
    if (r.includes('king')) return 'Chambre avec très grand lit';
    if (r.includes('standard') || r.includes('double')) return 'Chambre Double Standard';
    if (r.includes('suite')) return 'Suite Exécutive';
    if (r.includes('twin')) return 'Chambre Lits Jumeaux';
    return roomType;
  } else if (lang === 'de') {
    if (r.includes('studio') && r.includes('balcony')) return 'Studio mit Balkon';
    if (r.includes('studio')) return 'Deluxe Studio';
    if (r.includes('deluxe') && (r.includes('king') || r.includes('double'))) return 'Deluxe Doppelzimmer mit Kingsize-Bett';
    if (r.includes('king')) return 'Zimmer mit Kingsize-Bett';
    if (r.includes('standard') || r.includes('double')) return 'Standard Doppelzimmer';
    if (r.includes('suite')) return 'Executive Suite';
    if (r.includes('twin')) return 'Zweibettzimmer';
    return roomType;
  } else if (lang === 'es') {
    if (r.includes('studio') && r.includes('balcony')) return 'Estudio con balcón';
    if (r.includes('studio')) return 'Estudio Deluxe';
    if (r.includes('deluxe') && (r.includes('king') || r.includes('double'))) return 'Habitación Doble Deluxe con cama extragrande';
    if (r.includes('king')) return 'Habitación con cama extragrande';
    if (r.includes('standard') || r.includes('double')) return 'Habitación Doble Estándar';
    if (r.includes('suite')) return 'Suite Ejecutiva';
    if (r.includes('twin')) return 'Habitación con 2 camas individuales';
    return roomType;
  } else if (lang === 'tr') {
    if (r.includes('studio') && r.includes('balcony')) return 'Balkonlu Stüdyo';
    if (r.includes('studio')) return 'Deluxe Stüdyo';
    if (r.includes('deluxe') && (r.includes('king') || r.includes('double'))) return 'King Yataklı Deluxe Çift Kişilik Oda';
    if (r.includes('king')) return 'Geniş Çift Kişilik Yataklı Oda';
    if (r.includes('standard') || r.includes('double')) return 'Standart Çift Kişilik Oda';
    if (r.includes('suite')) return 'Executive Süit';
    if (r.includes('twin')) return 'İki Yataklı Oda';
    return roomType;
  }
  return roomType;
}

/**
 * Localize board basis for PDF voucher
 */
function localizeBoardBasis(boardBasis, lang) {
  if (!boardBasis || lang === 'en') return boardBasis || 'No meal is included in this room rate.';
  const b = (boardBasis || '').toLowerCase();
  if (lang === 'ar') {
    if (b.includes('breakfast') && (b.includes('included') || b.includes('free'))) return 'شامل وجبة الإفطار';
    if (b.includes('all inclusive')) return 'إقامة شاملة كلياً (جميع الوجبات)';
    if (b.includes('half board')) return 'نصف إقامة (إفطار وعشاء)';
    return 'لا تشمل هذه الأسعار أي وجبة طعام.';
  } else if (lang === 'fr') {
    if (b.includes('breakfast') && (b.includes('included') || b.includes('free'))) return 'Petit-déjeuner compris';
    if (b.includes('all inclusive')) return 'Formule tout compris';
    if (b.includes('half board')) return 'Demi-pension';
    return 'Aucun repas n\'est compris dans le tarif de cette chambre.';
  } else if (lang === 'de') {
    if (b.includes('breakfast') && (b.includes('included') || b.includes('free'))) return 'Frühstück inbegriffen';
    if (b.includes('all inclusive')) return 'All-Inclusive';
    if (b.includes('half board')) return 'Halbpension';
    return 'Keine Mahlzeiten in diesem Zimmerpreis inbegriffen.';
  } else if (lang === 'es') {
    if (b.includes('breakfast') && (b.includes('included') || b.includes('free'))) return 'Desayuno incluido';
    if (b.includes('all inclusive')) return 'Todo incluido';
    if (b.includes('half board')) return 'Media pensión';
    return 'No hay comidas incluidas en la tarifa de esta habitación.';
  } else if (lang === 'tr') {
    if (b.includes('breakfast') && (b.includes('included') || b.includes('free'))) return 'Kahvaltı dahil';
    if (b.includes('all inclusive')) return 'Her şey dahil';
    if (b.includes('half board')) return 'Yarım pansiyon';
    return 'Bu oda fiyatına herhangi bir öğün dahil değildir.';
  }
  return boardBasis;
}

/**
 * Generate and trigger international printable accommodation voucher
 */
export function printHotelVoucher(booking, pdfLang = 'auto', existingWindow = null) {
  if (!booking) return;

  const targetLang = (!pdfLang || pdfLang === 'auto')
    ? detectCountryLanguage(booking.country, booking.city, booking.hotelAddress, booking.hotelName)
    : pdfLang;

  const L = PDF_LANG[targetLang] || PDF_LANG.en;
  const isRtl = L.dir === 'rtl';
  const dateLocale = L.dateLocale || 'en-US';

  const printWindow = (existingWindow && !existingWindow.closed) ? existingWindow : window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) {
    showToast('Please allow popups to download or print the voucher PDF.', 'warning');
    return;
  }

  const inDate = new Date(booking.checkIn);
  const outDate = new Date(booking.checkOut);

  const inDayNum = inDate.getDate();
  const inMonth = inDate.toLocaleDateString(dateLocale, { month: 'long' }).toUpperCase();
  const inDayName = inDate.toLocaleDateString(dateLocale, { weekday: 'long' });

  const outDayNum = outDate.getDate();
  const outMonth = outDate.toLocaleDateString(dateLocale, { month: 'long' }).toUpperCase();
  const outDayName = outDate.toLocaleDateString(dateLocale, { weekday: 'long' });

  const nights = booking.nights || 1;
  const bookingNumber = booking.bookingNumber || (booking.bookingReference && booking.bookingReference.includes('.') ? booking.bookingReference : '5647.617.021');
  const pinCode = booking.pinCode || '0409';
  const hotelPhone = booking.hotelPhone || '+60 11 6450 6138';
  let hotelImage = booking.hotelImage || 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/891377055.webp?k=a7455032de938c25e69873b80fdd46b074e13da1320c876a55ca0d632274e054&o=';
  if (hotelImage.includes('square240') || hotelImage.includes('square60') || hotelImage.includes('square180')) {
    hotelImage = hotelImage.replace(/square(240|60|180|120)/, 'max1024x768');
  }
  const clientName = booking.clientName || 'Moustafa Elsayed Akl';
  const hotelName = booking.hotelName || 'Klcc Stay At Summer Suites';
  const hotelAddress = booking.hotelAddress || '8, Jalan Cendana, 50250 Kuala Lumpur, Malaysia';
  const rawRoomType = booking.roomType || 'Studio with Balcony';
  const rawBoardBasis = booking.boardBasis || 'No meal is included in this room rate.';
  const roomType = localizeRoomType(rawRoomType, pdfLang);
  const boardBasis = localizeBoardBasis(rawBoardBasis, pdfLang);

  const cleanDest = (booking.country || booking.city || '').toLowerCase();
  let localCurrency = 'USD';
  let localSymbol = 'US$ ';
  let exRateToEgp = 48.5;

  if (cleanDest.includes('malaysia') || cleanDest.includes('kuala lumpur')) {
    localCurrency = 'MYR';
    localSymbol = 'MYR ';
    exRateToEgp = 11.2;
  } else if (cleanDest.includes('uae') || cleanDest.includes('dubai') || cleanDest.includes('abu dhabi')) {
    localCurrency = 'AED';
    localSymbol = 'AED ';
    exRateToEgp = 13.2;
  } else if (cleanDest.includes('saudi') || cleanDest.includes('riyadh') || cleanDest.includes('makkah')) {
    localCurrency = 'SAR';
    localSymbol = 'SAR ';
    exRateToEgp = 12.9;
  } else if (cleanDest.includes('france') || cleanDest.includes('paris') || cleanDest.includes('italy') || cleanDest.includes('germany') || cleanDest.includes('spain')) {
    localCurrency = 'EUR';
    localSymbol = '€ ';
    exRateToEgp = 53.0;
  } else if (cleanDest.includes('uk') || cleanDest.includes('london') || cleanDest.includes('britain')) {
    localCurrency = 'GBP';
    localSymbol = '£ ';
    exRateToEgp = 63.5;
  } else if (cleanDest.includes('turkey') || cleanDest.includes('istanbul')) {
    localCurrency = 'TRY';
    localSymbol = 'TL ';
    exRateToEgp = 1.4;
  }

  let egpTotal = 56421;
  if (booking.price) {
    const digitsOnly = booking.price.replace(/[^\d]/g, '');
    if (digitsOnly && parseInt(digitsOnly, 10) > 0) {
      const num = parseInt(digitsOnly, 10);
      egpTotal = num > 1000 ? num : Math.round(num * exRateToEgp);
    }
  } else {
    egpTotal = Math.round(2089 * nights);
  }

  const vatAmount = Math.round(egpTotal * 0.08);
  const tourismFee = Math.round(127.09 * nights);
  const serviceCharge = Math.round(egpTotal * 0.15);
  const grandTotalEgp = egpTotal + vatAmount + tourismFee + serviceCharge;
  const localPayAmount = (grandTotalEgp / exRateToEgp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const localSubtotal = (egpTotal / exRateToEgp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let gpsCoords = 'N 003° 9.552, E 101° 42.293';
  if (cleanDest.includes('dubai')) gpsCoords = 'N 025° 12.180, E 055° 18.240';
  else if (cleanDest.includes('paris')) gpsCoords = 'N 048° 51.240, E 002° 21.070';
  else if (cleanDest.includes('london')) gpsCoords = 'N 051° 30.260, W 000° 07.390';
  else if (cleanDest.includes('riyadh')) gpsCoords = 'N 024° 42.810, E 046° 40.520';
  else if (cleanDest.includes('cairo')) gpsCoords = 'N 030° 02.880, E 031° 14.220';
  else if (cleanDest.includes('istanbul')) gpsCoords = 'N 041° 00.490, E 028° 58.330';

  const cancellationDateStr = `${inMonth} ${Math.max(1, inDayNum - 1)}, ${inDate.getFullYear()} 3:13 AM`;

  // 1:1 Pixel-Perfect Official Booking.com Confirmation PDF (Multi-Language)
  const html = `<!DOCTYPE html>
<html lang="${pdfLang}" dir="${L.dir}">
<head>
  <meta charset="UTF-8">
  <title>Booking.com: ${escapeHtml(L.bookingConfirmation)} - ${escapeHtml(hotelName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${L.fontFamily};
      color: #000000;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
      direction: ${L.dir};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      margin: 0;
      padding: 0;
    }
    .print-btn-bar {
      max-width: 800px;
      margin: 10px auto;
      text-align: ${isRtl ? 'left' : 'right'};
    }
    .print-btn {
      background: #003580;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 3px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .doc-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 10mm 12mm;
      background: #ffffff;
      box-sizing: border-box;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .logo-text {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #003580;
      font-family: Arial, sans-serif;
    }
    .logo-text span {
      color: #00BAF2;
    }
    .header-right {
      text-align: right;
      vertical-align: top;
      font-family: Arial, sans-serif;
    }
    .confirmation-title {
      font-size: 17px;
      font-weight: bold;
      color: #000000;
    }
    .conf-num-label {
      font-size: 10.5px;
      margin-top: 3px;
      color: #333333;
    }
    .conf-num-val {
      color: #0071c2;
      font-weight: bold;
      font-size: 12.5px;
    }
    .top-box-table {
      width: 100%;
      border: 1px solid #777777;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .top-box-table td {
      border: 1px solid #777777;
      padding: 8px 10px;
      vertical-align: top;
    }
    .hotel-info-col {
      width: 50%;
    }
    .hotel-info-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 3px;
      color: #000000;
    }
    .date-col {
      width: 17%;
      text-align: center;
      padding: 6px 4px !important;
    }
    .date-col-label {
      font-size: 8.5px;
      text-transform: uppercase;
      color: #666666;
    }
    .date-col-num {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.05;
      margin: 2px 0;
      color: #000000;
    }
    .date-col-month {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .date-col-day {
      font-size: 10px;
      font-style: italic;
      color: #222222;
    }
    .date-col-time {
      font-size: 9px;
      color: #555555;
      margin-top: 4px;
    }
    .rooms-col {
      width: 16%;
      text-align: center;
      padding: 6px 4px !important;
    }
    .rooms-col-header {
      font-size: 8.5px;
      color: #666666;
      display: flex;
      justify-content: space-around;
    }
    .rooms-col-val {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      margin: 2px 0;
      color: #000000;
    }
    .group-label {
      font-size: 8px;
      text-transform: uppercase;
      color: #666666;
      margin-top: 2px;
    }
    .group-val {
      font-size: 10.5px;
      font-weight: bold;
    }
    .price-box {
      border: 1px solid #777777;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .price-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 12.5px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .section-subhead {
      font-size: 11.5px;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 3px;
      color: #000000;
    }
    .room-box {
      border: 1px solid #777777;
      margin-bottom: 12px;
    }
    .room-header {
      padding: 6px 10px;
      font-size: 12.5px;
      font-weight: bold;
      border-bottom: 1px solid #777777;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .room-content-table {
      width: 100%;
      border-collapse: collapse;
    }
    .room-left {
      width: 68%;
      padding: 10px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.38;
      border-right: 1px solid #777777;
    }
    .room-right {
      width: 32%;
      padding: 10px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.4;
    }
    .bottom-boxes-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .bottom-box-left {
      width: 50%;
      border: 1px solid #777777;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.35;
    }
    .bottom-box-right {
      width: 50%;
      border: 1px solid #777777;
      border-left: none;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.35;
    }
    .doc-page-2 {
      page-break-before: always;
      break-before: page;
    }
    .need-help-header {
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .help-link {
      color: #0071c2;
      text-decoration: underline;
      cursor: pointer;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }
      .print-btn-bar {
        display: none !important;
      }
      .doc-page {
        padding: 10mm 12mm !important;
        max-width: 100% !important;
      }
      .doc-page-2 {
        page-break-before: always !important;
        break-before: page !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="print-btn" onclick="window.print()">${L.printBtn}</button>
  </div>

  <div class="doc-page doc-page-1">
    <!-- Page 1: Header -->
    <table class="header-table" role="presentation">
      <tr>
        <td style="vertical-align: middle;">
          <div class="logo-text">Booking<span>.com</span></div>
        </td>
        <td class="header-right">
          <div class="confirmation-title">${escapeHtml(L.bookingConfirmation)}</div>
          <div class="conf-num-label">${escapeHtml(L.confirmationNumber)}: <span class="conf-num-val">${escapeHtml(bookingNumber)}</span></div>
          <div class="conf-num-label">${escapeHtml(L.pinCode)}: <span class="conf-num-val">${escapeHtml(pinCode)}</span></div>
        </td>
      </tr>
    </table>

    <!-- Top Hotel & Schedule Box -->
    <table class="top-box-table" role="presentation">
      <tr>
        <td class="hotel-info-col">
          <div style="display: flex; gap: 10px;">
            ${hotelImage ? `<img src="${escapeHtml(hotelImage)}" style="width: 76px; height: 76px; object-fit: cover; border: 1px solid #ccc; flex-shrink: 0;" alt="Hotel" />` : ''}
            <div>
              <div class="hotel-info-title">${escapeHtml(hotelName)}</div>
              <div><strong>${escapeHtml(L.address)}</strong> ${escapeHtml(hotelAddress)}</div>
              <div><strong>${escapeHtml(L.phone)}</strong> ${escapeHtml(hotelPhone)}</div>
              <div><strong>${escapeHtml(L.gpsCoordinates)}</strong> ${escapeHtml(gpsCoords)}</div>
            </div>
          </div>
        </td>
        <td class="date-col">
          <div class="date-col-label">${escapeHtml(L.checkIn)}</div>
          <div class="date-col-num">${escapeHtml(String(inDayNum))}</div>
          <div class="date-col-month">${escapeHtml(inMonth)}</div>
          <div class="date-col-day">${escapeHtml(inDayName)}</div>
          <div class="date-col-time">🕒 14:00 - 23:30</div>
        </td>
        <td class="date-col">
          <div class="date-col-label">${escapeHtml(L.checkOut)}</div>
          <div class="date-col-num">${escapeHtml(String(outDayNum))}</div>
          <div class="date-col-month">${escapeHtml(outMonth)}</div>
          <div class="date-col-day">${escapeHtml(outDayName)}</div>
          <div class="date-col-time">🕒 05:00 - 12:00</div>
        </td>
        <td class="rooms-col">
          <div class="rooms-col-header">
            <span>${escapeHtml(L.rooms)}</span>
            <span>${escapeHtml(L.nights)}</span>
          </div>
          <div class="rooms-col-val">1 <span style="font-weight: 300; font-size: 22px;">/</span> ${escapeHtml(String(nights))}</div>
          <div class="group-label">${escapeHtml(L.yourGroup)}</div>
          <div class="group-val">${escapeHtml(L.adult)}</div>
        </td>
      </tr>
    </table>

    <!-- PRICE Box -->
    <div class="price-box">
      <div class="price-title-row">
        <span>${escapeHtml(L.price)}</span>
        <span>EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>${escapeHtml(L.room)}</span>
        <span>${escapeHtml(L.approx)} EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row" style="font-size: 13px; font-weight: bold; margin-top: 3px;">
        <span>${escapeHtml(L.subtotal)}</span>
        <span>${escapeHtml(L.approx)} EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row" style="color: #444;">
        <span>${escapeHtml(L.forGuest)}</span>
        <span>${localSymbol}${localSubtotal}</span>
      </div>

      <div style="font-weight: bold; margin-top: 6px; margin-bottom: 2px;">${escapeHtml(L.additionalCharges)}</div>
      <div style="color: #333; font-size: 9.5px; margin-bottom: 4px;">
        ${escapeHtml(L.additionalChargesDesc)}
      </div>
      <div class="price-row">
        <span>${escapeHtml(L.vat)} (8.0%)</span>
        <span>EGP ${vatAmount.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>${escapeHtml(L.tourismFee)} (EGP 127.09 × ${nights} ${escapeHtml(L.perNights)})</span>
        <span>EGP ${tourismFee.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>${escapeHtml(L.propertyServiceCharge)} (15.0%)</span>
        <span>EGP ${serviceCharge.toLocaleString()}</span>
      </div>
      <div class="price-row" style="font-size: 13px; font-weight: bold; margin-top: 6px; border-top: 1px solid #777; padding-top: 4px;">
        <span>${escapeHtml(L.price)}</span>
        <span>${escapeHtml(L.approx)} EGP ${grandTotalEgp.toLocaleString()}*</span>
      </div>
      <div style="text-align: ${isRtl ? 'left' : 'right'}; font-weight: bold; font-size: 12px; margin-top: 2px;">
        ${escapeHtml(L.youllPay)} ${localSymbol}${localPayAmount}.
      </div>
      <div style="font-size: 9px; color: #555; margin-top: 2px;">
        ${escapeHtml(L.tourismFeeNote)}
      </div>
      <div style="font-weight: bold; margin-top: 6px;">
        ${escapeHtml(L.finalPriceNote)}
      </div>
      <div style="font-size: 9.5px; color: #333;">
        ${escapeHtml(L.bookingNoCharge)}<br>
        ${escapeHtml(L.foreignTransaction)}
      </div>

      <div class="section-subhead">${escapeHtml(L.paymentInfo)}</div>
      <div>${escapeHtml(hotelName)} ${escapeHtml(L.handlesPayments)}</div>
      <div>${escapeHtml(L.acceptedPayments)}</div>

      <div class="section-subhead">${escapeHtml(L.currencyExchange)}</div>
      <div>${escapeHtml(L.youllPayIn)} ${escapeHtml(hotelName)} ${escapeHtml(L.inCurrency)} ${localCurrency} ${escapeHtml(L.exchangeRateNote)}</div>
      <div>${escapeHtml(L.estimateNote)} ${localCurrency}.</div>

      <div class="section-subhead">${escapeHtml(L.additionalInfo)}</div>
      <div>${escapeHtml(L.extraBedNote)}</div>
      <div>${escapeHtml(L.cancelTaxNote)}</div>
      <div>${escapeHtml(L.noShowNote)}</div>
      <div>${escapeHtml(L.readImportant)}</div>
    </div>

    <!-- Room Details Box -->
    <div class="room-box">
      <div class="room-header">
        <span>${escapeHtml(roomType)}</span>
        <span>🛏️</span>
      </div>
      <table class="room-content-table" role="presentation">
        <tr>
          <td class="room-left">
            <div><strong>${escapeHtml(L.guestName)}</strong> ${escapeHtml(clientName)}</div>
            <div><strong>${escapeHtml(L.numberOfGuests)}</strong> ${escapeHtml(L.adult)}</div>
            <div style="margin-bottom: 4px;"><strong>${escapeHtml(L.mealPlan)}</strong> ${escapeHtml(boardBasis)}</div>
            <div style="color: #222; margin-bottom: 6px;">
              ${escapeHtml(L.amenities)}
            </div>
            <div><strong>${escapeHtml(L.bedSize)}</strong> ${escapeHtml(L.bedDesc)}</div>
          </td>
          <td class="room-right">
            <div><strong>${escapeHtml(L.prepayment)}</strong> ${escapeHtml(L.noPrepayment)}</div>
            <div style="margin-top: 8px;"><strong>${escapeHtml(L.cancellationCost)}</strong></div>
            <div style="color: #008009; font-weight: bold;">from ${escapeHtml(cancellationDateStr)}: ${localCurrency} 0</div>
            <div style="font-size: 9px; color: #555; margin-top: 8px;">${escapeHtml(L.cancellationDeadline)}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Important Information & Hotel Policies (Bottom of Page 1) -->
    <table class="bottom-boxes-table" role="presentation">
      <tr>
        <td class="bottom-box-left">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>ℹ️</span> <strong>${escapeHtml(L.importantInfo)}</strong>
          </div>
          <div>${escapeHtml(L.noParties)}</div>
          <div style="margin-top: 4px;">
            ${escapeHtml(L.damageDeposit)} ${localCurrency} 100 ${escapeHtml(L.isRequired)} ${escapeHtml(L.thatsAbout)} EGP ${Math.round(100 * exRateToEgp)}. ${escapeHtml(L.depositCash)}
          </div>
        </td>
        <td class="bottom-box-right">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>📋</span> <strong>${escapeHtml(L.hotelPolicies)}</strong>
          </div>
          <div><strong>${escapeHtml(L.guestParking)}</strong></div>
          <div>${escapeHtml(L.parkingNote)} ${localCurrency} 15 ${escapeHtml(L.perDay)}</div>
          <div style="margin-top: 3px;">${escapeHtml(L.wifiNote)}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Page 2: Need Help? -->
  <div class="doc-page doc-page-2">
    <div style="font-size: 11px; line-height: 1.45;">
      <div class="need-help-header">
        <span>⚙️</span>
        <span>${escapeHtml(L.needHelp)}</span>
      </div>
      <div><strong>${escapeHtml(L.viewChange)}</strong></div>
      <div class="help-link" style="margin-bottom: 6px;">your.booking.com</div>

      <div style="margin-top: 6px;">${escapeHtml(L.contactProperty)} ${escapeHtml(hotelName)} ${escapeHtml(L.directlyAt)} <strong>${escapeHtml(hotelPhone)}</strong></div>

      <div style="margin-top: 8px;"><strong>${escapeHtml(L.contactUs)}</strong></div>
      <div>${escapeHtml(L.localNumber)} 0800 0000 457</div>
      <div>${escapeHtml(L.whenAbroad)} ${escapeHtml(booking.country || 'abroad')}: +44 20 3320 2643</div>

      <div style="margin-top: 12px; font-weight: bold; color: #003580;">${escapeHtml(L.travelPeace)}</div>
      <div>${escapeHtml(L.safetyInfo)}</div>
      <div class="help-link">${escapeHtml(L.seeSafety)}</div>

      <div style="margin-top: 8px;">${escapeHtml(L.emergencyInfo)} ${escapeHtml(booking.country || 'your destination')}.</div>
      <div class="help-link">${escapeHtml(L.seeEmergency)}</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    printWindow.location.href = blobUrl;
  } catch (_) {
    printWindow.document.documentElement.innerHTML = html;
  }
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (_) {}
  }, 60000);
}

/**
 * Render the full Hotels page
 */
export function renderHotelsPage() {
  const isAr = i18n.getLanguage() === 'ar';

  // Calculate default dates (tomorrow and +3 days)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkout = new Date(tomorrow);
  checkout.setDate(checkout.getDate() + 3);

  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const checkoutStr = checkout.toISOString().slice(0, 10);

  return `
    <div class="page-container page-hotels">
      ${renderPageHeader({
        title: t('hotels.title'),
        subtitle: t('hotels.subtitle'),
        breadcrumbs: [
          { label: t('nav.dashboard'), href: '/dashboard' },
          { label: t('hotels.title') }
        ]
      })}

      <!-- Top AI Generator Card -->
      <div class="card mb-lg" style="border: 1px solid var(--color-border); position: relative; overflow: hidden;">
        <div style="position: absolute; top:0; left:0; right:0; height: 3px; background: linear-gradient(90deg, #b38d4f, #2563eb, #b38d4f);"></div>
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm">
          <div>
            <h3 class="card-title d-flex align-items-center gap-xs">
              <span style="color: #b38d4f;">${icons.sparkles('w-5 h-5')}</span>
              ${escapeHtml(t('hotels.generateTitle'))}
            </h3>
            <p class="text-xs text-muted mt-xxs">${escapeHtml(t('hotels.generateSubtitle'))}</p>
          </div>
          <span class="badge badge-primary">Python Live & AI Powered ✦</span>
        </div>

        <div class="card-body">
          <form id="hotel-ai-form" class="d-flex flex-column gap-md" onsubmit="return false;">
            <div class="form-grid-3">
              <!-- Field 1: Client Name with Autocomplete -->
              <div class="form-group" style="position: relative;">
                <label class="form-label" for="hotel-client-name">
                  ${escapeHtml(t('hotels.clientName'))} *
                </label>
                <div class="input-with-icon">
                  <input
                    type="text"
                    id="hotel-client-name"
                    class="form-control"
                    placeholder="${escapeHtml(t('hotels.clientNamePlaceholder'))}"
                    autocomplete="off"
                    required
                  />
                </div>
                <div id="customer-autocomplete-list" class="autocomplete-dropdown" style="display: none;"></div>
                <input type="hidden" id="hotel-customer-id" value="" />
              </div>

              <!-- Field 2: Country / Destination -->
              <div class="form-group">
                <label class="form-label" for="hotel-destination">
                  ${escapeHtml(t('hotels.destination'))} *
                </label>
                <input
                  type="text"
                  id="hotel-destination"
                  class="form-control"
                  placeholder="${escapeHtml(t('hotels.destinationPlaceholder'))}"
                  required
                />
              </div>

              <!-- Field 3: Dates (Check-in & Check-out) -->
              <div class="form-group">
                <div class="form-grid-2">
                  <div>
                    <label class="form-label" for="hotel-checkin">
                      ${escapeHtml(t('hotels.checkIn'))} *
                    </label>
                    <input
                      type="date"
                      id="hotel-checkin"
                      class="form-control"
                      value="${tomorrowStr}"
                      required
                    />
                  </div>
                  <div>
                    <label class="form-label" for="hotel-checkout">
                      ${escapeHtml(t('hotels.checkOut'))} *
                    </label>
                    <input
                      type="date"
                      id="hotel-checkout"
                      class="form-control"
                      value="${checkoutStr}"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Field 4: PDF Language Selection -->
            <div class="form-grid-3" style="margin-top: 4px;">
              <div class="form-group">
                <label class="form-label" for="hotel-pdf-lang">
                  ${isAr ? 'لغة الـ PDF' : 'PDF Language'} 🌐
                </label>
                <select id="hotel-pdf-lang" class="form-control">
                  <option value="auto" selected>🌐 ${isAr ? 'تلقائي حسب لغة دولة الفندق (الأصلية)' : 'Auto by Hotel Country (Native)'}</option>
                  <option value="ar">🇸🇦 العربية (Arabic)</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="fr">🇫🇷 Français (French)</option>
                  <option value="de">🇩🇪 Deutsch (German)</option>
                  <option value="es">🇪🇸 Español (Spanish)</option>
                  <option value="tr">🇹🇷 Türkçe (Turkish)</option>
                </select>
              </div>
            </div>

            <!-- Quick destination chips -->
            <div class="d-flex align-items-center gap-xs flex-wrap">
              <span class="text-xs text-muted">${isAr ? 'وجهات سريعة:' : 'Quick Destinations:'}</span>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="دبي, الإمارات">دبي (Dubai)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="الرياض, السعودية">الرياض (Riyadh)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="مكة المكرمة, السعودية">مكة المكرمة (Makkah)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="إسطنبول, تركيا">إسطنبول (Istanbul)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="لندن, بريطانيا">لندن (London)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="باريس, فرنسا">باريس (Paris)</button>
            </div>

            <!-- Generate Action -->
            <div class="d-flex justify-content-end mt-xs">
              <button type="button" id="btn-generate-hotel" class="btn btn-primary d-flex align-items-center gap-xs" style="min-width: 220px;">
                <span class="btn-icon">${icons.sparkles('w-4 h-4')}</span>
                <span id="btn-generate-text">${escapeHtml(t('hotels.generateBtn'))}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Generated Voucher Preview Container -->
      <div id="hotel-preview-section" style="display: none;" class="mb-lg">
        <!-- Rendered dynamically upon generation -->
      </div>

      <!-- Saved Bookings Archive Table Card -->
      <div class="card">
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm">
          <div>
            <h3 class="card-title d-flex align-items-center gap-xs">
              ${icons.hotel('w-5 h-5')}
              ${escapeHtml(t('hotels.archiveTitle'))}
            </h3>
            <p class="text-xs text-muted mt-xxs">${escapeHtml(t('hotels.archiveSubtitle'))}</p>
          </div>
          <div class="d-flex align-items-center gap-xs">
            <input
              type="text"
              id="search-hotel-archive"
              class="form-control"
              placeholder="${isAr ? 'بحث في الحجوزات...' : 'Search bookings...'}"
              style="width: 240px; font-size: 13px;"
            />
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive desktop-table-view">
            <table class="data-table" id="hotels-archive-table">
              <thead>
                <tr>
                  <th style="min-width: 140px;">${isAr ? 'كود المرجع' : 'Booking Ref'}</th>
                  <th style="min-width: 160px;">${escapeHtml(t('hotels.clientName'))}</th>
                  <th style="min-width: 180px;">${escapeHtml(t('hotels.hotelName'))}</th>
                  <th style="min-width: 140px;">${escapeHtml(t('hotels.destination'))}</th>
                  <th style="min-width: 160px;">${isAr ? 'فترة الإقامة' : 'Stay Dates'}</th>
                  <th style="min-width: 100px;">${escapeHtml(t('hotels.nights'))}</th>
                  <th style="min-width: 120px;">${escapeHtml(t('hotels.status'))}</th>
                  <th style="min-width: 120px; text-align: right;">${isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody id="hotels-table-body">
                <tr>
                  <td colspan="8" class="text-center p-xl text-muted" style="padding: 40px 16px;">
                    ${isAr ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the Preview Card for the generated hotel booking
 */
function renderPreviewCard(booking) {
  const isAr = i18n.getLanguage() === 'ar';
  const starsCount = Math.min(5, Math.max(1, parseInt(booking.hotelStars || 5, 10)));
  const starsHtml = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  const bookingNumber = booking.bookingNumber || (booking.bookingReference && booking.bookingReference.includes('.') ? booking.bookingReference : '4829.391.820');
  const pinCode = booking.pinCode || '4829';
  const priceText = booking.price || 'US$ 450';
  const hotelPhone = booking.hotelPhone || '+971 4 430 4528';
  const reviewScore = booking.reviewScore || '9.1 Superb · 3,150 reviews';
  const hotelImage = booking.hotelImage || '';

  const isPython = booking.source === 'BOOKING_LIVE' || booking.provider === 'PYTHON_SCRAPER';
  const sourceBadge = isPython
    ? `<span class="badge" style="background: #10b981; color: white; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
        ${isAr ? 'بيانات حية مباشرة من Booking.com' : 'Live from Booking.com'}
       </span>`
    : `<span class="badge" style="background: #00BAF2; color: #003580; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        ✦ ${isAr ? 'كتالوج بوكينج المعتمد' : 'Booking.com Catalog'}
       </span>`;

  return `
    <div class="card" style="border: 2px solid #003580; background: var(--color-surface); box-shadow: 0 4px 12px rgba(0, 53, 128, 0.1);">
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm" style="background: #003580; color: #ffffff;">
        <div class="d-flex align-items-center gap-sm">
          <div style="background: #ffffff; color: #003580; width: 38px; height: 38px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">
            B.
          </div>
          <div>
            <div class="d-flex align-items-center gap-xs">
              <h4 class="card-title" style="margin: 0; color: #ffffff; font-weight: 800; font-size: 16px;">
                Booking<span style="color: #00BAF2;">.com</span> Confirmation
              </h4>
              ${sourceBadge}
            </div>
            <p class="text-xs" style="margin: 0; color: #dbeafe;">${escapeHtml(t('hotels.previewSubtitle'))}</p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-xs">
          <button type="button" id="btn-toggle-edit-hotel" class="btn btn-sm btn-secondary d-flex align-items-center gap-xxs" style="background: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.3);">
            ${icons.pencil ? icons.pencil('w-3.5 h-3.5') : '✏️'}
            <span>${escapeHtml(t('hotels.quickEdit'))}</span>
          </button>
          <button type="button" id="btn-print-voucher-now" class="btn btn-sm d-flex align-items-center gap-xxs" style="background: #febb02; color: #0f172a; font-weight: 700; border: none;">
            ${icons.print ? icons.print('w-3.5 h-3.5') : '🖨️'}
            <span>${isAr ? 'طباعة تأكيد بوكينج (PDF)' : 'Print Booking.com PDF'}</span>
          </button>
          <button type="button" id="btn-save-hotel-db" class="btn btn-sm btn-outline d-flex align-items-center gap-xxs" style="color: #ffffff; border-color: rgba(255,255,255,0.4);">
            ${icons.check ? icons.check('w-3.5 h-3.5') : '💾'}
            <span id="save-btn-text">${escapeHtml(t('hotels.saveToSystem'))}</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Display Details Mode -->
        <div id="preview-display-mode">
          <!-- Top Status & Identifiers Bar -->
          <div style="background: #ebf3ff; border: 1px solid #c7e0ff; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap-sm;">
            <div class="d-flex align-items-center gap-xs">
              <span style="background: #008009; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">✓</span>
              <div>
                <strong style="color: #008009; font-size: 14px;">Booking Confirmed</strong>
                <span class="text-xs text-muted d-block">${escapeHtml(booking.clientName)} · 1 Room, ${escapeHtml(String(booking.nights || 1))} Night(s)</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="text-xs text-muted">CONFIRMATION: <strong style="color: #003580; font-family: monospace; font-size: 13px;" id="prev-booking-num">${escapeHtml(bookingNumber)}</strong></div>
              <div class="text-xs text-muted">PIN CODE: <strong style="color: #003580; font-family: monospace; font-size: 13px; letter-spacing: 1px;" id="prev-pin-code">${escapeHtml(pinCode)}</strong></div>
            </div>
          </div>

          <div style="background: var(--color-background); border: 1px solid var(--color-border); border-radius: 8px; padding: 16px;" class="mb-md">
            <div class="d-flex align-items-start justify-content-between flex-wrap gap-sm mb-sm">
              <div style="flex: 1;">
                <div class="d-flex align-items-center gap-xs flex-wrap">
                  <h4 style="margin: 0; font-size: 18px; color: #003580; font-weight: 800;" id="prev-hotel-name">${escapeHtml(booking.hotelName)}</h4>
                  <span style="color: #febb02; font-size: 15px;" id="prev-stars">${starsHtml}</span>
                </div>
                <p class="text-xs text-muted mt-xxs mb-xxs" id="prev-address">📍 ${escapeHtml(booking.hotelAddress || 'City Center')}</p>
                <div class="text-xs text-muted mb-xs" id="prev-phone">📞 Phone: <strong style="color: var(--color-text);">${escapeHtml(hotelPhone)}</strong></div>
                <div class="d-flex align-items-center gap-xs">
                  <span class="badge" style="background: #003580; color: #ffffff; font-weight: 800; font-size: 12px; padding: 2px 6px;">${escapeHtml((reviewScore.match(/\d+\.\d+/) || ['9.0'])[0])}</span>
                  <span class="text-xs font-semibold" style="color: #003580;">${escapeHtml(reviewScore)}</span>
                </div>
              </div>

              <img id="prev-hotel-img" src="${escapeHtml(hotelImage)}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border); ${hotelImage ? '' : 'display: none;'}" alt="${escapeHtml(booking.hotelName)}" />
            </div>

            <div class="form-grid-4 text-xs pt-xs" style="border-top: 1px solid var(--color-border);">
              <div>
                <span class="text-muted d-block">CHECK-IN:</span>
                <strong id="prev-checkin">${formatDateDisplay(booking.checkIn)} (from 15:00)</strong>
              </div>
              <div>
                <span class="text-muted d-block">CHECK-OUT:</span>
                <strong id="prev-checkout">${formatDateDisplay(booking.checkOut)} (until 12:00)</strong>
              </div>
              <div>
                <span class="text-muted d-block">ROOM CATEGORY:</span>
                <strong id="prev-room">${escapeHtml(booking.roomType)}</strong>
              </div>
              <div>
                <span class="text-muted d-block">TOTAL PRICE:</span>
                <strong style="color: #003580; font-size: 13px;" id="prev-price">${escapeHtml(priceText)}</strong>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center text-xs text-muted flex-wrap gap-xs">
            <div>
              MEAL: <strong style="color: #008009;" id="prev-board">${escapeHtml(booking.boardBasis)}</strong> |
              SPECIAL REQUESTS: <span id="prev-requests">${escapeHtml(booking.specialRequests || 'Non-smoking, high floor')}</span>
            </div>
            <div>
              <span style="color: #008009; font-weight: 700;">✓ PAID ONLINE — Fully Prepaid on Booking.com</span>
            </div>
          </div>
        </div>

        <!-- Inline Quick Edit Mode (Hidden by default) -->
        <div id="preview-edit-mode" style="display: none;">
          <div class="form-grid-3 mb-sm">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.hotelName'))}</label>
              <input type="text" id="edit-hotel-name" class="form-control" value="${escapeHtml(booking.hotelName)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.roomType'))}</label>
              <input type="text" id="edit-room-type" class="form-control" value="${escapeHtml(booking.roomType)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.boardBasis'))}</label>
              <input type="text" id="edit-board-basis" class="form-control" value="${escapeHtml(booking.boardBasis)}" />
            </div>
          </div>

          <div class="form-grid-4 mb-sm">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.address'))}</label>
              <input type="text" id="edit-hotel-address" class="form-control" value="${escapeHtml(booking.hotelAddress || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Hotel Phone</label>
              <input type="text" id="edit-hotel-phone" class="form-control" value="${escapeHtml(hotelPhone)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Price (USD / EUR / Local)</label>
              <input type="text" id="edit-hotel-price" class="form-control" value="${escapeHtml(priceText)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.stars'))} (1-5)</label>
              <input type="number" id="edit-hotel-stars" class="form-control" min="1" max="5" value="${starsCount}" />
            </div>
          </div>

          <div class="form-grid-3 mb-sm">
            <div class="form-group">
              <label class="form-label">Booking.com Confirmation Number</label>
              <input type="text" id="edit-booking-number" class="form-control" value="${escapeHtml(bookingNumber)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Booking.com PIN Code</label>
              <input type="text" id="edit-pin-code" class="form-control" value="${escapeHtml(pinCode)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${isAr ? 'رابط صورة الفندق (Booking.com)' : 'Hotel Image URL'}</label>
              <input type="text" id="edit-hotel-image" class="form-control" value="${escapeHtml(hotelImage)}" />
            </div>
          </div>

          <div class="d-flex justify-content-end gap-xs">
            <button type="button" id="btn-cancel-edit" class="btn btn-sm btn-secondary">${isAr ? 'إلغاء' : 'Cancel'}</button>
            <button type="button" id="btn-save-inline-edit" class="btn btn-sm btn-primary">${isAr ? 'تطبيق التعديلات' : 'Apply Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render archive table rows
 */
function renderArchiveRows(bookings = []) {
  const isAr = i18n.getLanguage() === 'ar';
  if (!bookings || bookings.length === 0) {
    return `
      <tr>
        <td colspan="8" class="text-center p-xl text-muted" style="padding: 48px 16px;">
          <div class="d-flex flex-column align-items-center justify-content-center gap-xs">
            <span style="font-size: 32px; opacity: 0.5;">🏨</span>
            <div style="font-weight: 600; font-size: 15px; color: var(--color-text);">${escapeHtml(t('hotels.noBookings'))}</div>
            <div class="text-xs text-muted" style="max-width: 420px; text-align: center; line-height: 1.5;">${escapeHtml(t('hotels.noBookingsDesc'))}</div>
          </div>
        </td>
      </tr>
    `;
  }

  return bookings.map(b => {
    const starsCount = Math.min(5, Math.max(1, parseInt(b.hotelStars || 5, 10)));
    const starsHtml = '★'.repeat(starsCount);
    return `
      <tr data-booking-id="${b.id}">
        <td><strong class="tabular-nums">${escapeHtml(b.bookingReference)}</strong></td>
        <td>
          <div class="font-medium">${escapeHtml(b.clientName)}</div>
          ${b.customer ? `<span class="text-xs text-muted">${escapeHtml(b.customer.phone || '')}</span>` : ''}
        </td>
        <td>
          <div class="font-medium">${escapeHtml(b.hotelName)}</div>
          <span style="color: #f59e0b; font-size: 11px;">${starsHtml}</span>
        </td>
        <td>${escapeHtml(b.city)}, ${escapeHtml(b.country)}</td>
        <td class="text-xs">
          ${formatDateDisplay(b.checkIn)} → ${formatDateDisplay(b.checkOut)}
        </td>
        <td><span class="badge badge-secondary">${escapeHtml(String(b.nights))} ${escapeHtml(t('hotels.nights'))}</span></td>
        <td><span class="badge badge-success">${escapeHtml(b.status || 'CONFIRMED')}</span></td>
        <td style="text-align: right;">
          <div class="d-flex align-items-center justify-content-end gap-xxs">
            <button type="button" class="btn btn-xs btn-primary btn-reprint-voucher" data-id="${b.id}" title="${escapeHtml(t('hotels.reprint'))}">
              ${icons.print ? icons.print('w-3.5 h-3.5') : '🖨️'}
              <span>${isAr ? 'طباعة' : 'Print'}</span>
            </button>
            <button type="button" class="btn btn-xs btn-danger btn-delete-booking" data-id="${b.id}" title="${escapeHtml(t('hotels.deleteBooking'))}">
              ${icons.trash ? icons.trash('w-3.5 h-3.5') : '🗑️'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Fetch and refresh saved hotel bookings
 */
async function loadSavedBookings(root) {
  const container = root || document;
  try {
    const res = await HotelService.getBookings({ search: currentSearch });
    cachedBookings = res.data || [];
    const tbody = container.querySelector('#hotels-table-body') || document.getElementById('hotels-table-body');
    if (tbody) {
      tbody.innerHTML = renderArchiveRows(cachedBookings);
    }
  } catch (err) {
    console.error('[HotelsPage] Failed to load bookings:', err);
    const tbody = container.querySelector('#hotels-table-body') || document.getElementById('hotels-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center p-md text-danger">
            ${escapeHtml(err.message || 'Failed to load hotel bookings')}
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Bind interactive events on the Hotels Page
 */
export function initHotelsPage(container) {
  const root = container || document;
  const isAr = i18n.getLanguage() === 'ar';
  const aiForm = root.querySelector('#hotel-ai-form') || document.getElementById('hotel-ai-form');
  const btnGen = root.querySelector('#btn-generate-hotel') || document.getElementById('btn-generate-hotel');
  const clientNameInput = root.querySelector('#hotel-client-name') || document.getElementById('hotel-client-name');
  const destinationInput = root.querySelector('#hotel-destination') || document.getElementById('hotel-destination');
  const checkinInput = root.querySelector('#hotel-checkin') || document.getElementById('hotel-checkin');
  const checkoutInput = root.querySelector('#hotel-checkout') || document.getElementById('hotel-checkout');
  const customerIdInput = root.querySelector('#hotel-customer-id') || document.getElementById('hotel-customer-id');
  const autocompleteList = root.querySelector('#customer-autocomplete-list') || document.getElementById('customer-autocomplete-list');
  const previewSection = root.querySelector('#hotel-preview-section') || document.getElementById('hotel-preview-section');
  const searchInput = root.querySelector('#search-hotel-archive') || document.getElementById('search-hotel-archive');
  const pdfLangSelect = root.querySelector('#hotel-pdf-lang') || document.getElementById('hotel-pdf-lang');

  // Load initial saved bookings list
  loadSavedBookings(root);

  // 1. Customer Autocomplete
  if (clientNameInput && autocompleteList) {
    clientNameInput.addEventListener('input', () => {
      const q = clientNameInput.value.trim().toLowerCase();
      if (!q || q.length < 1) {
        autocompleteList.style.display = 'none';
        autocompleteList.innerHTML = '';
        return;
      }

      const allCustomers = CustomerService.getAllCustomers();
      const matches = allCustomers.filter(c => c.name && c.name.toLowerCase().includes(q)).slice(0, 6);

      if (matches.length === 0) {
        autocompleteList.style.display = 'none';
        return;
      }

      autocompleteList.innerHTML = matches.map(c => `
        <div class="autocomplete-item p-xs cursor-pointer d-flex justify-content-between align-items-center"
             style="border-bottom: 1px solid var(--color-border); font-size: 13px; padding: 8px 12px;"
             data-id="${c.id}" data-name="${escapeHtml(c.name)}">
          <div>
            <strong>${escapeHtml(c.name)}</strong>
            ${c.passport ? `<span class="text-xs text-muted d-block">Passport: ${escapeHtml(c.passport)}</span>` : ''}
          </div>
          <span class="badge badge-secondary text-xs">${escapeHtml(c.phone || 'Customer')}</span>
        </div>
      `).join('');

      autocompleteList.style.display = 'block';
    });

    autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        clientNameInput.value = item.dataset.name;
        if (customerIdInput) customerIdInput.value = item.dataset.id;
        autocompleteList.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#hotel-client-name') && !e.target.closest('#customer-autocomplete-list')) {
        autocompleteList.style.display = 'none';
      }
    });
  }

  // 2. Quick Destination Chips
  root.querySelectorAll('.quick-dest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (destinationInput) {
        destinationInput.value = chip.dataset.dest || '';
        destinationInput.focus();
      }
    });
  });

  // 3. AI Generation Handler (safe from any page reload)
  const handleGenerate = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isGenerating) return false;

    const clientName = clientNameInput?.value.trim();
    const country = destinationInput?.value.trim();
    const checkIn = checkinInput?.value;
    const checkOut = checkoutInput?.value;
    const customerId = customerIdInput?.value || null;
    const langSelect = root.querySelector('#hotel-pdf-lang') || document.getElementById('hotel-pdf-lang');
    const selectedLang = langSelect ? langSelect.value : 'en';

    if (!clientName || !country || !checkIn || !checkOut) {
      showToast(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', 'warning');
      return false;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      showToast(isAr ? 'تاريخ الخروج يجب أن يكون بعد تاريخ الدخول' : 'Check-out date must be after check-in date', 'warning');
      return false;
    }

    isGenerating = true;
    const btnGenText = root.querySelector('#btn-generate-text') || document.getElementById('btn-generate-text');
    if (btnGen) btnGen.disabled = true;
    if (btnGenText) btnGenText.textContent = t('hotels.generating');

    // Pre-open print window on user gesture to avoid popup blocker
    let printWindow = null;
    try {
      printWindow = window.open('', '_blank', 'width=950,height=1000');
      if (printWindow) {
        printWindow.document.documentElement.innerHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Booking.com</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 85vh;
                margin: 0;
                color: #003580;
                text-align: center;
                background: #f8fafc;
              }
              .spinner {
                border: 4px solid #e2e8f0;
                border-top: 4px solid #003580;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div style="font-size: 38px; font-weight: 800; margin-bottom: 12px;">Booking<span style="color: #00BAF2;">.com</span></div>
            <div class="spinner"></div>
            <div style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 6px;">
              ${isAr ? 'جاري جلب تفاصيل الفندق الحقيقية من Booking.com...' : 'Fetching authentic hotel details from Booking.com...'}
            </div>
            <div style="font-size: 13px; color: #64748b;">
              ${isAr ? 'سيتم فتح ملف الـ PDF الرسمي تلقائياً فور اكتمال الجلب.' : 'The official PDF confirmation will open automatically once ready.'}
            </div>
          </body>
          </html>
        `;
      }
    } catch (_) {}

    try {
      const res = await HotelService.generateAiBooking({
        clientName,
        country,
        checkIn,
        checkOut,
        customerId
      });

      currentGeneratedBooking = res.data;
      if (previewSection) {
        previewSection.innerHTML = renderPreviewCard(currentGeneratedBooking);
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        bindPreviewEvents(root);
      }

      // Automatically print the official PDF confirmation in the user's selected language
      printHotelVoucher(currentGeneratedBooking, selectedLang, printWindow);

      showToast(isAr ? 'تم جلب بيانات الفندق وطباعة تأكيد بوكينج بنجاح!' : 'Hotel booking generated and PDF opened successfully!', 'success');
    } catch (err) {
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.close();
        } catch (_) {}
      }
      console.error('[HotelsPage] AI generation error:', err);
      showToast(err.message || (isAr ? 'تعذر جلب بيانات الفندق من Booking.com. يرجى المحاولة مرة أخرى.' : 'Failed to generate hotel booking'), 'error');
    } finally {
      isGenerating = false;
      if (btnGen) btnGen.disabled = false;
      if (btnGenText) btnGenText.textContent = t('hotels.generateBtn');
    }
    return false;
  };

  if (aiForm) {
    aiForm.addEventListener('submit', handleGenerate);
  }
  if (btnGen) {
    btnGen.addEventListener('click', handleGenerate);
  }

  // 4. Search Archive
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        loadSavedBookings(root);
      }, 300);
    });
  }

  // 5. Delegate Reprint & Delete actions on Table
  const table = root.querySelector('#hotels-archive-table') || document.getElementById('hotels-archive-table');
  if (table) {
    table.addEventListener('click', async (e) => {
      const reprintBtn = e.target.closest('.btn-reprint-voucher');
      if (reprintBtn) {
        const id = reprintBtn.dataset.id;
        const booking = cachedBookings.find(b => b.id === id);
        if (booking) {
          printHotelVoucher(booking);
        }
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete-booking');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm(t('hotels.deleteConfirm'))) return;
        try {
          await HotelService.deleteBooking(id);
          showToast(isAr ? 'تم حذف الحجز بنجاح' : 'Hotel booking deleted successfully', 'success');
          loadSavedBookings(root);
        } catch (err) {
          showToast(err.message || 'Failed to delete booking', 'error');
        }
      }
    });
  }
}

/**
 * Bind events inside the dynamically rendered Preview Card
 */
function bindPreviewEvents(root) {
  const container = root || document;
  const isAr = i18n.getLanguage() === 'ar';
  const printBtn = container.querySelector('#btn-print-voucher-now') || document.getElementById('btn-print-voucher-now');
  const saveBtn = container.querySelector('#btn-save-hotel-db') || document.getElementById('btn-save-hotel-db');
  const toggleEditBtn = container.querySelector('#btn-toggle-edit-hotel') || document.getElementById('btn-toggle-edit-hotel');
  const displayMode = container.querySelector('#preview-display-mode') || document.getElementById('preview-display-mode');
  const editMode = container.querySelector('#preview-edit-mode') || document.getElementById('preview-edit-mode');
  const cancelEditBtn = container.querySelector('#btn-cancel-edit') || document.getElementById('btn-cancel-edit');
  const applyEditBtn = container.querySelector('#btn-save-inline-edit') || document.getElementById('btn-save-inline-edit');

  // Print voucher button
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (currentGeneratedBooking) {
        const langSelect = container.querySelector('#hotel-pdf-lang') || document.getElementById('hotel-pdf-lang');
        const selectedLang = langSelect ? langSelect.value : 'auto';
        printHotelVoucher(currentGeneratedBooking, selectedLang);
      }
    });
  }

  // Save to DB button
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!currentGeneratedBooking || isSaving) return;
      isSaving = true;
      saveBtn.disabled = true;
      const saveText = container.querySelector('#save-btn-text') || document.getElementById('save-btn-text');
      if (saveText) saveText.textContent = t('hotels.saving');

      try {
        await HotelService.createBooking(currentGeneratedBooking);
        showToast(t('hotels.savedSuccess'), 'success');
        saveBtn.classList.remove('btn-outline');
        saveBtn.classList.add('btn-success');
        if (saveText) saveText.textContent = isAr ? '✓ تم الحفظ' : '✓ Saved';
        loadSavedBookings(container);
      } catch (err) {
        showToast(err.message || 'Failed to save booking', 'error');
        saveBtn.disabled = false;
        if (saveText) saveText.textContent = t('hotels.saveToSystem');
      } finally {
        isSaving = false;
      }
    });
  }

  // Toggle quick inline edit
  if (toggleEditBtn && displayMode && editMode) {
    toggleEditBtn.addEventListener('click', () => {
      displayMode.style.display = 'none';
      editMode.style.display = 'block';
    });
  }

  if (cancelEditBtn && displayMode && editMode) {
    cancelEditBtn.addEventListener('click', () => {
      editMode.style.display = 'none';
      displayMode.style.display = 'block';
    });
  }

  if (applyEditBtn && displayMode && editMode) {
    applyEditBtn.addEventListener('click', () => {
      const editHotelName = (container.querySelector('#edit-hotel-name') || document.getElementById('edit-hotel-name'))?.value.trim();
      const editRoomType = (container.querySelector('#edit-room-type') || document.getElementById('edit-room-type'))?.value.trim();
      const editBoardBasis = (container.querySelector('#edit-board-basis') || document.getElementById('edit-board-basis'))?.value.trim();
      const editAddress = (container.querySelector('#edit-hotel-address') || document.getElementById('edit-hotel-address'))?.value.trim();
      const editStars = parseInt((container.querySelector('#edit-hotel-stars') || document.getElementById('edit-hotel-stars'))?.value || '5', 10);
      const editPhone = (container.querySelector('#edit-hotel-phone') || document.getElementById('edit-hotel-phone'))?.value.trim();
      const editPrice = (container.querySelector('#edit-hotel-price') || document.getElementById('edit-hotel-price'))?.value.trim();
      const editBookingNum = (container.querySelector('#edit-booking-number') || document.getElementById('edit-booking-number'))?.value.trim();
      const editPinCode = (container.querySelector('#edit-pin-code') || document.getElementById('edit-pin-code'))?.value.trim();
      const editHotelImage = (container.querySelector('#edit-hotel-image') || document.getElementById('edit-hotel-image'))?.value.trim();

      if (editHotelName) currentGeneratedBooking.hotelName = editHotelName;
      if (editRoomType) currentGeneratedBooking.roomType = editRoomType;
      if (editBoardBasis) currentGeneratedBooking.boardBasis = editBoardBasis;
      if (editAddress) currentGeneratedBooking.hotelAddress = editAddress;
      if (editStars) currentGeneratedBooking.hotelStars = editStars;
      if (editPhone) currentGeneratedBooking.hotelPhone = editPhone;
      if (editPrice) currentGeneratedBooking.price = editPrice;
      if (editHotelImage) currentGeneratedBooking.hotelImage = editHotelImage;
      if (editBookingNum) {
        currentGeneratedBooking.bookingNumber = editBookingNum;
        currentGeneratedBooking.bookingReference = editBookingNum;
      }
      if (editPinCode) {
        currentGeneratedBooking.pinCode = editPinCode;
        currentGeneratedBooking.confirmationNumber = editPinCode;
      }

      // Update preview card displays
      const nameEl = container.querySelector('#prev-hotel-name') || document.getElementById('prev-hotel-name');
      const roomEl = container.querySelector('#prev-room') || document.getElementById('prev-room');
      const boardEl = container.querySelector('#prev-board') || document.getElementById('prev-board');
      const addrEl = container.querySelector('#prev-address') || document.getElementById('prev-address');
      const starsEl = container.querySelector('#prev-stars') || document.getElementById('prev-stars');
      const phoneEl = container.querySelector('#prev-phone') || document.getElementById('prev-phone');
      const priceEl = container.querySelector('#prev-price') || document.getElementById('prev-price');
      const bNumEl = container.querySelector('#prev-booking-num') || document.getElementById('prev-booking-num');
      const pinEl = container.querySelector('#prev-pin-code') || document.getElementById('prev-pin-code');
      const imgEl = container.querySelector('#prev-hotel-img') || document.getElementById('prev-hotel-img');

      if (nameEl) nameEl.textContent = currentGeneratedBooking.hotelName;
      if (roomEl) roomEl.textContent = currentGeneratedBooking.roomType;
      if (boardEl) boardEl.textContent = currentGeneratedBooking.boardBasis;
      if (addrEl) addrEl.textContent = `📍 ${currentGeneratedBooking.hotelAddress}`;
      if (starsEl) starsEl.textContent = '★'.repeat(currentGeneratedBooking.hotelStars);
      if (phoneEl) phoneEl.innerHTML = `📞 Phone: <strong style="color: var(--color-text);">${currentGeneratedBooking.hotelPhone}</strong>`;
      if (priceEl) priceEl.textContent = currentGeneratedBooking.price;
      if (bNumEl) bNumEl.textContent = currentGeneratedBooking.bookingNumber;
      if (pinEl) pinEl.textContent = currentGeneratedBooking.pinCode;
      if (imgEl && currentGeneratedBooking.hotelImage) {
        imgEl.src = currentGeneratedBooking.hotelImage;
        imgEl.style.display = 'block';
      }

      editMode.style.display = 'none';
      displayMode.style.display = 'block';
      showToast(isAr ? 'تم تطبيق التعديلات بنجاح' : 'Changes applied', 'info');
    });
  }
}

export const HotelsPage = {
  render: renderHotelsPage,
  afterRender(container) {
    initHotelsPage(container);
  },
  init: initHotelsPage
};


